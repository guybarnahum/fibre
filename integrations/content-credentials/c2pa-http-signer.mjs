import {
  AssetGenerationError,
  parseRetryAfterMs,
} from "../asset-generation-error.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  normalizeCredentialEmbedResult,
  normalizeCredentialVerification,
  normalizeEmbeddedAssetProvenance,
} from "../asset-provenance-domain.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function bytesToBase64(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < input.length; offset += chunk) {
    binary += String.fromCharCode(...input.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  nonEmpty("base64 bytes", value);
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function header(response, name) {
  return response?.headers?.get?.(name) ?? null;
}

function categoryForStatus(status) {
  if (status === 401 || status === 403) return "authentication";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "provider_unavailable";
  if (status >= 400 && status <= 499) return "invalid_request";
  return "unknown";
}

async function postJson(fetchImpl, url, body, { phase }) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AssetGenerationError("content credential service network failure", {
      phase,
      category: error?.name === "AbortError" ? "provider_timeout" : "network",
      safeDetail: `content credential service network failure: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    });
  }

  let payload = null;
  try { payload = await response.json(); }
  catch (error) {
    if (!response.ok) {
      throw new AssetGenerationError(`content credential service failed: HTTP ${response.status}`, {
        phase,
        category: categoryForStatus(response.status),
        httpStatus: response.status,
        retryAfterMs: parseRetryAfterMs(header(response, "retry-after")),
        cause: error,
      });
    }
    throw new AssetGenerationError(`content credential service returned non-JSON response (${response.status})`, {
      phase,
      category: "unknown",
      retryable: false,
      httpStatus: response.status,
      cause: error,
    });
  }
  if (!response.ok) {
    const detail = `content credential service failed: ${payload?.error ?? `HTTP ${response.status}`}`;
    throw new AssetGenerationError(detail, {
      phase,
      category: categoryForStatus(response.status),
      httpStatus: response.status,
      retryAfterMs: parseRetryAfterMs(header(response, "retry-after")),
      safeDetail: detail,
    });
  }
  return payload;
}

export function createHttpContentCredentialSigner({
  baseUrl,
  signerId = "fibre-c2pa-node-local-v1",
  fetchImpl = fetch,
} = {}) {
  const normalizedBase = nonEmpty("content credential service URL", baseUrl).replace(/\/$/, "");
  nonEmpty("content credential signer id", signerId);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  return Object.freeze({
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId,
    format: "c2pa",

    async embed({ bytes, mediaType, assertion }) {
      const normalizedAssertion = normalizeEmbeddedAssetProvenance(assertion);
      const payload = await postJson(fetchImpl, `${normalizedBase}/embed`, {
        bytesBase64: bytesToBase64(bytes),
        mediaType: nonEmpty("mediaType", mediaType),
        assertion: normalizedAssertion,
      }, { phase: "credential_signing" });
      return normalizeCredentialEmbedResult({
        bytes: base64ToBytes(payload.bytesBase64),
        format: payload.format,
        signerId: payload.signerId,
        manifestDigest: payload.manifestDigest,
        embeddedAt: payload.embeddedAt,
      });
    },

    async verify({ bytes, mediaType }) {
      const payload = await postJson(fetchImpl, `${normalizedBase}/verify`, {
        bytesBase64: bytesToBase64(bytes),
        mediaType: nonEmpty("mediaType", mediaType),
      }, { phase: "credential_verification" });
      return normalizeCredentialVerification(payload);
    },
  });
}
