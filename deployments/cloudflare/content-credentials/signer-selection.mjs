import { createHttpContentCredentialSigner } from "../../../integrations/content-credentials/c2pa-http-signer.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function createCloudflareContentCredentialSigner(env) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare C2PA env is required");
  return createHttpContentCredentialSigner({
    baseUrl: nonEmpty("C2PA_SIGNER_URL", env.C2PA_SIGNER_URL),
    signerId: nonEmpty("C2PA_SIGNER_ID", env.C2PA_SIGNER_ID),
    trustPolicy: nonEmpty("C2PA_TRUST_POLICY", env.C2PA_TRUST_POLICY),
    authorizationToken: env.C2PA_SIGNER_TOKEN ?? null,
  });
}
