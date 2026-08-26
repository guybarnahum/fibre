import {
  AssetGenerationError,
  parseRetryAfterMs,
  toAssetGenerationError,
} from "../asset-generation-error.mjs";
import {
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
} from "../asset-provenance-domain.mjs";

const DEFAULT_MODEL = "gpt-image-2-2026-04-21";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/images/generations";

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

function decodeBase64(value) {
  nonEmpty("image base64", value);
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function dimensions(size) {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) throw new TypeError(`unsupported image size ${size}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function header(response, name) {
  return response?.headers?.get?.(name) ?? null;
}

function openAIErrorCategory(status, payload) {
  const error = payload?.error ?? {};
  const text = [error.code, error.type, error.message].filter((value) => typeof value === "string").join(" ").toLowerCase();
  if (/content[_ -]?policy|moderation|safety/.test(text)) return "moderation_rejected";
  if (/insufficient[_ -]?quota|quota|billing|credit/.test(text)) return "quota_exhausted";
  if (/unsupported|not[_ -]?supported/.test(text)) return "unsupported_capability";
  if (status === 401 || status === 403) return "authentication";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "provider_unavailable";
  if ([400, 404, 409, 413, 422].includes(status)) return "invalid_request";
  return "unknown";
}

function openAIHttpError({ response, payload, model }) {
  const category = openAIErrorCategory(response.status, payload);
  const providerMessage = typeof payload?.error?.message === "string"
    ? payload.error.message
    : `HTTP ${response.status}`;
  return new AssetGenerationError(`OpenAI image generation failed: ${providerMessage}`, {
    phase: "provider_generation",
    category,
    provider: "openai",
    model,
    httpStatus: response.status,
    providerRequestId: header(response, "x-request-id"),
    retryAfterMs: parseRetryAfterMs(header(response, "retry-after")),
    safeDetail: `OpenAI image generation failed: ${providerMessage}`,
  });
}

export function compileOpenAIImagePrompt({ brief, role }) {
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

export function createOpenAIImageProvider({
  apiKey,
  model = DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  size = "1024x1024",
  quality = "medium",
  outputFormat = "png",
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
} = {}) {
  nonEmpty("OpenAI API key", apiKey);
  nonEmpty("OpenAI image model", model);
  nonEmpty("OpenAI image endpoint", endpoint);
  nonEmpty("OpenAI image size", size);
  nonEmpty("OpenAI image quality", quality);
  nonEmpty("OpenAI image output format", outputFormat);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const { width, height } = dimensions(size);

  return Object.freeze({
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "openai-image-v1",
    capabilities: ["image"],

    async generate(request) {
      try {
        plain("OpenAI image request", request);
        if (request.assetKind !== "image") {
          throw new AssetGenerationError("OpenAI image provider supports only image jobs", {
            phase: "validation",
            category: "unsupported_capability",
            provider: "openai",
            model,
          });
        }
        if (request.referenceObjects?.length) {
          throw new AssetGenerationError(
            "OpenAI image generation v1 does not yet accept reference objects; use a future edit provider profile",
            {
              phase: "validation",
              category: "unsupported_capability",
              provider: "openai",
              model,
            },
          );
        }
        const prompt = compileOpenAIImagePrompt({ brief: request.brief, role: request.role });
        const body = {
          model,
          prompt,
          n: 1,
          size,
          quality,
          output_format: outputFormat,
        };
        let response;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
        } catch (error) {
          throw new AssetGenerationError("OpenAI image generation network failure", {
            phase: "provider_generation",
            category: error?.name === "AbortError" ? "provider_timeout" : "network",
            provider: "openai",
            model,
            safeDetail: `OpenAI image generation network failure: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          });
        }

        let payload = null;
        try { payload = await response.json(); }
        catch (error) {
          if (!response.ok) throw openAIHttpError({ response, payload: null, model });
          throw new AssetGenerationError(`OpenAI image generation returned non-JSON response (${response.status})`, {
            phase: "provider_generation",
            category: "unknown",
            retryable: false,
            provider: "openai",
            model,
            httpStatus: response.status,
            providerRequestId: header(response, "x-request-id"),
            safeDetail: `OpenAI image generation returned non-JSON response (${response.status})`,
            cause: error,
          });
        }
        if (!response.ok) throw openAIHttpError({ response, payload, model });

        const item = payload?.data?.[0];
        if (!item || typeof item.b64_json !== "string") {
          throw new AssetGenerationError("OpenAI image generation response did not include data[0].b64_json", {
            phase: "provider_generation",
            category: "unknown",
            retryable: false,
            provider: "openai",
            model,
            httpStatus: response.status,
            providerRequestId: header(response, "x-request-id"),
          });
        }
        const bytes = decodeBase64(item.b64_json);
        const generatedAt = Number.isFinite(payload.created)
          ? new Date(payload.created * 1000).toISOString()
          : now();
        const mediaType = outputFormat === "jpeg" ? "image/jpeg" : `image/${outputFormat}`;

        return {
          requestWitness: {
            mediaType: "application/json",
            body,
            secretsRemoved: true,
          },
          result: {
            assetKind: "image",
            bytes,
            mediaType,
            width,
            height,
            durationMs: null,
            provider: "openai",
            model,
            providerRequestId: header(response, "x-request-id"),
            generatedAt,
            configuration: {
              endpoint: "/v1/images/generations",
              size,
              quality,
              outputFormat,
            },
          },
        };
      } catch (error) {
        throw toAssetGenerationError(error, {
          phase: "validation",
          provider: "openai",
          model,
        });
      }
    },
  });
}
