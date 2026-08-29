import {
  AssetGenerationError,
  parseRetryAfterMs,
} from "../../services/asset-generator/src/asset-generation-error.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  normalizeCredentialEmbedResult,
  normalizeCredentialVerification,
  normalizeEmbeddedAssetProvenance,
} from "../../services/asset-generator/src/asset-provenance-domain.mjs";

export const C2PA_HTTP_TRUST_POLICIES = Object.freeze([
  "development_signature_only",
  "c2pa_trust_list",
]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function optionalToken(name, value) {
  if (value === null || value === undefined) return null;
  return nonEmpty(name, value);
}

function normalizeTrustPolicy(value = "development_signature_only") {
  if (!C2PA_HTTP_TRUST_POLICIES.includes(value)) {
    throw new TypeError(`unsupported C2PA trust policy ${value}`);
  }
  return value;
}

function normalizeBaseUrl(value, { trustPolicy }) {
  const text = nonEmpty("content credential service URL", value).replace(/\/$/, "");
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new TypeError("content credential service URL must be an absolute URL");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError("content credential service URL must not contain embedded credentials");
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError("content credential service URL must not contain query or fragment components");
  }
  if (trustPolicy === "c2pa_trust_list" && parsed.protocol !== "https:") {
    throw new TypeError("production C2PA trust-list signer URL must use https");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("content credential service URL must use http or https");
  }
  return parsed.toString().replace(/\/$/, "");
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

function terminalCredentialError(message, { phase }) {
  return new AssetGenerationError(message, {
    phase,
    category: "authentication",
    retryable: false,
    safeDetail: message,
  });
}

function assertExpectedSignerId(actual, expected, { phase }) {
  if (actual !== expected) {
    throw terminalCredentialError(
      `content credential service returned unexpected signerId ${String(actual)}`,
      { phase },
    );
  }
}

function assertProductionTrust(payload, { trustPolicy }) {
  if (trustPolicy !== "c2pa_trust_list") return;
  const trust = payload?.trust;
  if (!trust || typeof trust !== "object" || Array.isArray(trust)) {
    throw terminalCredentialError(
      "content credential verifier did not return C2PA trust-list evidence",
      { phase: "credential_verification" },
    );
  }
  if (trust.policy !== "c2pa_trust_list" || typeof trust.trusted !== "boolean") {
    throw terminalCredentialError(
      "content credential verifier returned invalid C2PA trust-list evidence",
      { phase: "credential_verification" },
    );
  }
  if (payload.valid === true && trust.trusted !== true) {
    throw terminalCredentialError(
      "content credential signature is valid but signer is not trusted by the C2PA Trust List",
      { phase: "credential_verification" },
    );
  }
}

async function postJson(fetchImpl, url, body, { phase, authorizationToken }) {
  let response;
  const headers = { "Content-Type": "application/json" };
  if (authorizationToken !== null) headers.Authorization = `Bearer ${authorizationToken}`;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers,
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
  trustPolicy = "development_signature_only",
  authorizationToken = null,
  fetchImpl = fetch,
} = {}) {
  const normalizedTrustPolicy = normalizeTrustPolicy(trustPolicy);
  const normalizedBase = normalizeBaseUrl(baseUrl, { trustPolicy: normalizedTrustPolicy });
  const normalizedSignerId = nonEmpty("content credential signer id", signerId);
  const normalizedAuthorizationToken = optionalToken("content credential authorization token", authorizationToken);
  if (normalizedTrustPolicy === "c2pa_trust_list" && normalizedAuthorizationToken === null) {
    throw new TypeError("production C2PA trust-list signer requires an authorization token");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  return Object.freeze({
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: normalizedSignerId,
    format: "c2pa",
    trustPolicy: normalizedTrustPolicy,

    async embed({ bytes, mediaType, assertion }) {
      const normalizedAssertion = normalizeEmbeddedAssetProvenance(assertion);
      const payload = await postJson(fetchImpl, `${normalizedBase}/embed`, {
        bytesBase64: bytesToBase64(bytes),
        mediaType: nonEmpty("mediaType", mediaType),
        assertion: normalizedAssertion,
      }, {
        phase: "credential_signing",
        authorizationToken: normalizedAuthorizationToken,
      });
      assertExpectedSignerId(payload?.signerId, normalizedSignerId, { phase: "credential_signing" });
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
      }, {
        phase: "credential_verification",
        authorizationToken: normalizedAuthorizationToken,
      });
      assertExpectedSignerId(payload?.signerId, normalizedSignerId, { phase: "credential_verification" });
      assertProductionTrust(payload, { trustPolicy: normalizedTrustPolicy });
      return normalizeCredentialVerification({
        valid: payload.valid,
        format: payload.format,
        signerId: payload.signerId,
        manifestDigest: payload.manifestDigest,
        assertion: payload.assertion,
        verifiedAt: payload.verifiedAt,
        failureReason: payload.failureReason,
      });
    },
  });
}
