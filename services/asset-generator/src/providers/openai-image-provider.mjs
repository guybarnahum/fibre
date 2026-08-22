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
      plain("OpenAI image request", request);
      if (request.assetKind !== "image") throw new TypeError("OpenAI image provider supports only image jobs");
      if (request.referenceObjects?.length) {
        throw new TypeError("OpenAI image generation v1 does not yet accept reference objects; use a future edit provider profile");
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
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const requestId = response.headers?.get?.("x-request-id") ?? null;
      let payload;
      try { payload = await response.json(); }
      catch { throw new Error(`OpenAI image generation returned non-JSON response (${response.status})`); }
      if (!response.ok) {
        const message = payload?.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`OpenAI image generation failed: ${message}`);
      }
      const item = payload?.data?.[0];
      if (!item || typeof item.b64_json !== "string") {
        throw new Error("OpenAI image generation response did not include data[0].b64_json");
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
          providerRequestId: requestId,
          generatedAt,
          configuration: {
            endpoint: "/v1/images/generations",
            size,
            quality,
            outputFormat,
          },
        },
      };
    },
  });
}
