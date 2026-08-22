import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  normalizeCredentialEmbedResult,
  normalizeCredentialVerification,
  normalizeEmbeddedAssetProvenance,
} from "./asset-provenance-domain.mjs";

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

async function postJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`content credential service returned non-JSON response (${response.status})`); }
  if (!response.ok) throw new Error(`content credential service failed: ${payload?.error ?? `HTTP ${response.status}`}`);
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
      });
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
      });
      return normalizeCredentialVerification(payload);
    },
  });
}
