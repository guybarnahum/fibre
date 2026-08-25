import { createCloudflareInfraDriver } from "../../../../packages/infra/src/cloudflare-v1.mjs";
import { executeCredentialedAssetGenerationJob } from "../credentialed-asset-generation-service.mjs";
import { createHttpContentCredentialSigner } from "../http-content-credential-signer.mjs";
import { createOpenAIImageProvider } from "../providers/openai-image-provider.mjs";

const CREDENTIAL_SIGNER_ID = "fibre-c2pa-node-local-v1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function createCloudflareAssetGenerationRuntime(env, {
  createInfra = createCloudflareInfraDriver,
  createProvider = createOpenAIImageProvider,
  createCredentialSigner = createHttpContentCredentialSigner,
  executeJob = executeCredentialedAssetGenerationJob,
} = {}) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare asset generation env is required");
  if (!env.ASSET_OBJECTS) throw new TypeError("ASSET_OBJECTS binding is required");

  const infra = createInfra({ objectBucket: env.ASSET_OBJECTS });
  const provider = createProvider({ apiKey: nonEmpty("OPENAI_API_KEY", env.OPENAI_API_KEY) });
  const credentialSigner = createCredentialSigner({
    baseUrl: nonEmpty("C2PA_SIGNER_URL", env.C2PA_SIGNER_URL),
    signerId: CREDENTIAL_SIGNER_ID,
  });

  return Object.freeze({
    async execute(job) {
      const result = await executeJob({
        infra,
        provider,
        credentialSigner,
        job,
      });
      return Object.freeze({
        receipt: result.receipt,
        receiptObjectRef: result.receiptObjectRef,
        receiptDigest: result.receiptDigest,
        generationRecordObjectRef: result.generationRecordObjectRef,
        generationRecordDigest: result.generationRecordDigest,
        providerOutputDigest: result.providerOutputDigest,
        finalAssetDigest: result.finalAssetDigest,
      });
    },
  });
}
