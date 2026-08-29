import { createHttpContentCredentialSigner } from "#integrations/content-credentials/c2pa-http-signer.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function createContentCredentialSigner({
  baseUrl,
  signerId,
  trustPolicy,
  authorizationToken = null,
} = {}) {
  return createHttpContentCredentialSigner({
    baseUrl: nonEmpty("C2PA signer URL", baseUrl),
    signerId: nonEmpty("C2PA signer ID", signerId),
    trustPolicy: nonEmpty("C2PA trust policy", trustPolicy),
    authorizationToken,
  });
}
