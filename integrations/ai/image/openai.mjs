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

function referenceBytes(value, index) {
  const name = `OpenAI image referenceObjects[${index}].bytes`;
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError(`${name} must be bytes`);
}

function referenceExtension(mediaType) {
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  if (mediaType === "image/gif") return "gif";
  return null;
}

function normalizeReferenceObjects(rawReferenceObjects, model) {
  const values = rawReferenceObjects === undefined ? [] : rawReferenceObjects;
  if (!Array.isArray(values)) throw new TypeError("OpenAI image referenceObjects must be an array");
  return values.map((value, index) => {
    plain(`OpenAI image referenceObjects[${index}]`, value);
    const objectRef = nonEmpty(`OpenAI image referenceObjects[${index}].objectRef`, value.objectRef);
    const digest = nonEmpty(`OpenAI image referenceObjects[${index}].digest`, value.digest);
    const bytes = referenceBytes(value.bytes, index);
    if (bytes.length === 0) throw new TypeError(`OpenAI image referenceObjects[${index}].bytes must not be empty`);
    const metadata = value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
      ? value.metadata
      : {};
    const mediaType = typeof metadata.mediaType === "string" ? metadata.mediaType.trim().toLowerCase() : "";
    const extension = referenceExtension(mediaType);
    if (extension === null) {
      throw new AssetGenerationError(`OpenAI image reference object ${objectRef} has unsupported media type ${mediaType || "unknown"}`, {
        phase: "validation",
        category: "unsupported_capability",
        retryable: false,
        provider: "openai",
        model,
      });
    }
    const kind = typeof metadata.kind === "string" && metadata.kind.trim() !== "" ? metadata.kind : null;
    return Object.freeze({ objectRef, digest, mediaType, extension, kind, bytes });
  });
}

function referenceWitness(reference) {
  return Object.freeze({
    objectRef: reference.objectRef,
    digest: reference.digest,
    mediaType: reference.mediaType,
    kind: reference.kind,
  });
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
        const references = normalizeReferenceObjects(request.referenceObjects, model);
        const prompt = compileOpenAIImagePrompt({ brief: request.brief, role: request.role });
        const logicalBody = {
          model,
          prompt,
          n: 1,
          size,
          quality,
          output_format: outputFormat,
        };
        const selectedEndpoint = references.length > 0 ? editEndpoint : endpoint;
        const requestWitness = references.length > 0
          ? {
              mediaType:"multipart/form-data",
              body:{ ...logicalBody, referenceInputs:references.map(referenceWitness) },
              secretsRemoved:true,
            }
          : {
              mediaType:"application/json",
              body:logicalBody,
              secretsRemoved:true,
            };

        let requestBody;
        const headers = { Authorization: `Bearer ${apiKey}` };
        if (references.length > 0) {
          const form = new FormData();
          for (const [key, value] of Object.entries(logicalBody)) form.append(key, String(value));
          references.forEach((reference, index) => {
            form.append(
              "image[]",
              new Blob([reference.bytes], { type:reference.mediaType }),
              `reference-${index + 1}.${reference.extension}`,
            );
          });
          requestBody = form;
        } else {
          headers["Content-Type"] = "application/json";
          requestBody = JSON.stringify(logicalBody);
        }

        let response;
        try {
          response = await fetchImpl(selectedEndpoint, {
            method: "POST",
            headers,
            body: requestBody,
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
          requestWitness,
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
              endpoint: references.length > 0 ? "/v1/images/edits" : "/v1/images/generations",
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
