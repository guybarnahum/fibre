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
const DEFAULT_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";
const MAX_REFERENCE_IMAGES = 16;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

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

function referenceBytes(value, index) {
  const bytes = value?.bytes;
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TypeError(`OpenAI image referenceObjects[${index}].bytes must be bytes`);
}

function base64Encode(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const d = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const value = (a << 16) | (b << 8) | d;
    result += BASE64_ALPHABET[(value >>> 18) & 63];
    result += BASE64_ALPHABET[(value >>> 12) & 63];
    result += index + 1 < bytes.length ? BASE64_ALPHABET[(value >>> 6) & 63] : "=";
    result += index + 2 < bytes.length ? BASE64_ALPHABET[value & 63] : "=";
  }
  return result;
}

function normalizeReferenceObjects(raw) {
  const values = raw ?? [];
  if (!Array.isArray(values)) throw new TypeError("OpenAI image referenceObjects must be an array");
  if (values.length > MAX_REFERENCE_IMAGES) {
    throw new AssetGenerationError(`OpenAI image edits support at most ${MAX_REFERENCE_IMAGES} reference images`, {
      phase:"validation",
      category:"unsupported_capability",
      provider:"openai",
    });
  }
  return values.map((value, index) => {
    plain(`OpenAI image referenceObjects[${index}]`, value);
    const objectRef = nonEmpty(`OpenAI image referenceObjects[${index}].objectRef`, value.objectRef);
    const digest = nonEmpty(`OpenAI image referenceObjects[${index}].digest`, value.digest);
    const bytes = referenceBytes(value, index);
    const mediaType = typeof value.metadata?.mediaType === "string" && value.metadata.mediaType.startsWith("image/")
      ? value.metadata.mediaType
      : "image/png";
    return Object.freeze({ objectRef, digest, bytes, mediaType });
  });
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
  editEndpoint = DEFAULT_EDIT_ENDPOINT,
  size = "1024x1024",
  quality = "medium",
  outputFormat = "png",
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
} = {}) {
  nonEmpty("OpenAI API key", apiKey);
  nonEmpty("OpenAI image model", model);
  nonEmpty("OpenAI image endpoint", endpoint);
  nonEmpty("OpenAI image edit endpoint", editEndpoint);
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
        const references = normalizeReferenceObjects(request.referenceObjects);
        const prompt = compileOpenAIImagePrompt({ brief: request.brief, role: request.role });
        const editing = references.length > 0;
        const body = editing
          ? {
              model,
              images:references.map((reference) => ({
                image_url:`data:${reference.mediaType};base64,${base64Encode(reference.bytes)}`,
              })),
              prompt,
              n:1,
              size,
              quality,
              output_format:outputFormat,
            }
          : {
              model,
              prompt,
              n:1,
              size,
              quality,
              output_format:outputFormat,
            };
        const requestEndpoint = editing ? editEndpoint : endpoint;
        let response;
        try {
          response = await fetchImpl(requestEndpoint, {
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
            mediaType:"application/json",
            body:editing
              ? {
                  ...body,
                  images:references.map(({ objectRef, digest, mediaType }) => ({ objectRef, digest, mediaType })),
                }
              : body,
            secretsRemoved:true,
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
              endpoint:editing ? "/v1/images/edits" : "/v1/images/generations",
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
