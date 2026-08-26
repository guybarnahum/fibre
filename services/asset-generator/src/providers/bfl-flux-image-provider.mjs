import {
  AssetGenerationError,
  parseRetryAfterMs,
  toAssetGenerationError,
} from "../asset-generation-error.mjs";
import {
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
} from "../asset-provenance-domain.mjs";

const DEFAULT_MODEL = "flux-2-pro";
const DEFAULT_BASE_ENDPOINT = "https://api.bfl.ai/v1";
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_SAFETY_TOLERANCE = 2;
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_MAX_POLL_ATTEMPTS = 240;
const DEFAULT_MAX_DOWNLOAD_ATTEMPTS = 4;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function positiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive safe integer`);
  return value;
}

function boundedInteger(name, value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function header(response, name) {
  return response?.headers?.get?.(name) ?? null;
}

function payloadText(payload) {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") return payload;
  try { return JSON.stringify(payload); }
  catch { return String(payload); }
}

function bflCategory(status, payload) {
  const text = payloadText(payload).toLowerCase();
  if (/request moderated|content moderated|moderation|safety/.test(text)) return "moderation_rejected";
  if (/credit|quota|billing|insufficient/.test(text) || status === 402) return "quota_exhausted";
  if (status === 401 || status === 403) return "authentication";
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status >= 500 && status <= 599) return "provider_unavailable";
  if ([400, 404, 409, 413, 422].includes(status)) return "invalid_request";
  return "unknown";
}

function bflHttpError({ response, payload, model, providerRequestId = null, retryable = null }) {
  const category = bflCategory(response.status, payload);
  const detail = payloadText(payload) || `HTTP ${response.status}`;
  return new AssetGenerationError(`BFL FLUX image generation failed: ${detail}`, {
    phase: "provider_generation",
    category,
    retryable: retryable ?? undefined,
    provider: "bfl",
    model,
    httpStatus: response.status,
    providerRequestId,
    retryAfterMs: parseRetryAfterMs(header(response, "retry-after")),
    safeDetail: `BFL FLUX image generation failed: ${detail}`,
  });
}

function endpointPath(baseEndpoint, model) {
  return `${baseEndpoint.replace(/\/$/, "")}/${encodeURIComponent(model)}`;
}

function isAllowedPollingUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && ["api.bfl.ai", "api.eu.bfl.ai", "api.us.bfl.ai"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isAllowedDeliveryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname.startsWith("delivery.")
      && url.hostname.endsWith(".bfl.ai");
  } catch {
    return false;
  }
}

function outputMediaType(outputFormat) {
  if (outputFormat === "jpeg") return "image/jpeg";
  if (outputFormat === "webp") return "image/webp";
  return "image/png";
}

async function responseJson(response) {
  try { return await response.json(); }
  catch { return null; }
}

function moderationStatus(status) {
  return status === "Request Moderated" || status === "Content Moderated";
}

function pendingStatus(status) {
  return ["Pending", "Reasoning", "Generating"].includes(status);
}

export function compileBflFluxImagePrompt({ brief, role }) {
  plain("brief", brief);
  nonEmpty("brief.description", brief.description);
  if (!Array.isArray(brief.constraints)) throw new TypeError("brief.constraints must be an array");
  const constraints = brief.constraints.map((value, index) => nonEmpty(`brief.constraints[${index}]`, value));
  return [
    brief.description.trim(),
    "",
    `Asset role: ${nonEmpty("role", role)}.`,
    "Rendering constraints:",
    ...constraints.map((value) => `- ${value}`),
    "- Render a plausible reconstruction only; do not add captions, watermarks, labels, signatures, or metadata text into the pixels.",
  ].join("\n");
}

export function createBflFluxImageProvider({
  apiKey,
  model = DEFAULT_MODEL,
  baseEndpoint = DEFAULT_BASE_ENDPOINT,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  outputFormat = DEFAULT_OUTPUT_FORMAT,
  safetyTolerance = DEFAULT_SAFETY_TOLERANCE,
  disablePromptUpsampling = true,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
  maxDownloadAttempts = DEFAULT_MAX_DOWNLOAD_ATTEMPTS,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date().toISOString(),
} = {}) {
  nonEmpty("BFL API key", apiKey);
  nonEmpty("BFL FLUX model", model);
  nonEmpty("BFL API base endpoint", baseEndpoint);
  positiveInteger("BFL image width", width);
  positiveInteger("BFL image height", height);
  if (!new Set(["jpeg", "png", "webp"]).has(outputFormat)) throw new TypeError("BFL outputFormat is unsupported");
  boundedInteger("BFL safetyTolerance", safetyTolerance, 0, 6);
  if (typeof disablePromptUpsampling !== "boolean") throw new TypeError("disablePromptUpsampling must be boolean");
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 0) throw new TypeError("pollIntervalMs must be a non-negative safe integer");
  positiveInteger("maxPollAttempts", maxPollAttempts);
  positiveInteger("maxDownloadAttempts", maxDownloadAttempts);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (typeof sleep !== "function") throw new TypeError("sleep must be a function");
  if (typeof now !== "function") throw new TypeError("now must be a function");
  const endpoint = endpointPath(baseEndpoint, model);

  return Object.freeze({
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "bfl-flux-image-v1",
    capabilities: ["image"],

    async generate(request) {
      try {
        plain("BFL FLUX image request", request);
        if (request.assetKind !== "image") {
          throw new AssetGenerationError("BFL FLUX provider supports only image jobs", {
            phase: "validation",
            category: "unsupported_capability",
            provider: "bfl",
            model,
          });
        }
        if (request.referenceObjects?.length) {
          throw new AssetGenerationError(
            "BFL FLUX text-to-image profile does not yet bind Fibre reference objects to FLUX input_image fields",
            {
              phase: "validation",
              category: "unsupported_capability",
              provider: "bfl",
              model,
            },
          );
        }

        const body = {
          prompt: compileBflFluxImagePrompt({ brief: request.brief, role: request.role }),
          disable_pup: disablePromptUpsampling,
          width,
          height,
          safety_tolerance: safetyTolerance,
          output_format: outputFormat,
        };

        let submission;
        try {
          submission = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              accept: "application/json",
              "x-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
        } catch (error) {
          throw new AssetGenerationError("BFL FLUX submission transport failed with ambiguous acceptance", {
            phase: "provider_generation",
            category: error?.name === "AbortError" ? "provider_timeout" : "network",
            retryable: false,
            provider: "bfl",
            model,
            safeDetail: `BFL FLUX submission transport failed with ambiguous acceptance: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          });
        }

        const submissionPayload = await responseJson(submission);
        if (!submission.ok) {
          const explicitRetrySafe = submission.status === 429;
          throw bflHttpError({
            response: submission,
            payload: submissionPayload,
            model,
            retryable: explicitRetrySafe ? true : false,
          });
        }

        const providerRequestId = typeof submissionPayload?.id === "string" ? submissionPayload.id : null;
        const pollingUrl = typeof submissionPayload?.polling_url === "string" ? submissionPayload.polling_url : null;
        if (providerRequestId === null || pollingUrl === null || !isAllowedPollingUrl(pollingUrl)) {
          throw new AssetGenerationError("BFL FLUX submission returned an invalid task identity or polling URL", {
            phase: "provider_generation",
            category: "unknown",
            retryable: false,
            provider: "bfl",
            model,
            httpStatus: submission.status,
            providerRequestId,
          });
        }

        for (let pollAttempt = 1; pollAttempt <= maxPollAttempts; pollAttempt += 1) {
          if (pollIntervalMs > 0) await sleep(pollIntervalMs);
          let pollResponse;
          try {
            pollResponse = await fetchImpl(pollingUrl, {
              method: "GET",
              headers: {
                accept: "application/json",
                "x-key": apiKey,
              },
            });
          } catch {
            continue;
          }

          const pollPayload = await responseJson(pollResponse);
          if (!pollResponse.ok) {
            const category = bflCategory(pollResponse.status, pollPayload);
            if (["authentication", "quota_exhausted", "invalid_request", "moderation_rejected"].includes(category)) {
              throw bflHttpError({
                response: pollResponse,
                payload: pollPayload,
                model,
                providerRequestId,
                retryable: false,
              });
            }
            continue;
          }

          const status = pollPayload?.status;
          if (moderationStatus(status)) {
            throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} was moderated`, {
              phase: "provider_generation",
              category: "moderation_rejected",
              retryable: false,
              provider: "bfl",
              model,
              providerRequestId,
            });
          }
          if (status === "Task not found") {
            throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} was not found after submission`, {
              phase: "provider_generation",
              category: "provider_unavailable",
              retryable: false,
              provider: "bfl",
              model,
              providerRequestId,
            });
          }
          if (status === "Error" || status === "Failed") {
            const category = bflCategory(200, pollPayload);
            throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} failed: ${payloadText(pollPayload)}`, {
              phase: "provider_generation",
              category,
              retryable: false,
              provider: "bfl",
              model,
              providerRequestId,
            });
          }
          if (status === "Ready") {
            const sampleUrl = typeof pollPayload?.result?.sample === "string" ? pollPayload.result.sample : null;
            if (sampleUrl === null || !isAllowedDeliveryUrl(sampleUrl)) {
              throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} returned an invalid delivery URL`, {
                phase: "provider_generation",
                category: "unknown",
                retryable: false,
                provider: "bfl",
                model,
                providerRequestId,
              });
            }

            for (let downloadAttempt = 1; downloadAttempt <= maxDownloadAttempts; downloadAttempt += 1) {
              let assetResponse;
              try {
                assetResponse = await fetchImpl(sampleUrl, { method: "GET" });
              } catch {
                if (downloadAttempt < maxDownloadAttempts && pollIntervalMs > 0) await sleep(pollIntervalMs);
                continue;
              }
              if (!assetResponse.ok) {
                if (downloadAttempt < maxDownloadAttempts && pollIntervalMs > 0) await sleep(pollIntervalMs);
                continue;
              }
              const bytes = new Uint8Array(await assetResponse.arrayBuffer());
              if (bytes.length === 0) {
                throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} returned empty image bytes`, {
                  phase: "provider_generation",
                  category: "unknown",
                  retryable: false,
                  provider: "bfl",
                  model,
                  providerRequestId,
                });
              }
              return {
                requestWitness: {
                  mediaType: "application/json",
                  body,
                  secretsRemoved: true,
                },
                result: {
                  assetKind: "image",
                  bytes,
                  mediaType: header(assetResponse, "content-type") ?? outputMediaType(outputFormat),
                  width,
                  height,
                  durationMs: null,
                  provider: "bfl",
                  model,
                  providerRequestId,
                  generatedAt: now(),
                  configuration: {
                    endpoint: `/v1/${model}`,
                    asyncResult: true,
                    width,
                    height,
                    safetyTolerance,
                    outputFormat,
                    disablePromptUpsampling,
                  },
                },
              };
            }

            throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} completed but image retrieval did not succeed`, {
              phase: "provider_generation",
              category: "provider_timeout",
              retryable: false,
              provider: "bfl",
              model,
              providerRequestId,
            });
          }
          if (!pendingStatus(status)) {
            throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} returned unsupported status ${String(status)}`, {
              phase: "provider_generation",
              category: "unknown",
              retryable: false,
              provider: "bfl",
              model,
              providerRequestId,
            });
          }
        }

        throw new AssetGenerationError(`BFL FLUX task ${providerRequestId} did not complete within the polling budget`, {
          phase: "provider_generation",
          category: "provider_timeout",
          retryable: false,
          provider: "bfl",
          model,
          providerRequestId,
        });
      } catch (error) {
        throw toAssetGenerationError(error, {
          phase: "validation",
          provider: "bfl",
          model,
        });
      }
    },
  });
}
