import { requireInfraCapabilities } from "#packages/infra/src/infra-driver.mjs";
import { publishAssetGenerationCompletion } from "./asset-generation-completion.mjs";
import { executeCredentialedAssetGenerationJob } from "./credentialed-asset-generation-service.mjs";

export const ASSET_GENERATION_RUNTIME_INFRA_PROFILE = Object.freeze(["objects", "queues"]);

export class AssetGenerationAttemptFailed extends Error {
  constructor(message, { cause = null } = {}) {
    super(message, cause === null ? undefined : { cause });
    this.name = "AssetGenerationAttemptFailed";
    this.retryable = false;
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function createAssetGenerationRuntime({
  infra,
  provider,
  credentialSigner,
  executeJob = executeCredentialedAssetGenerationJob,
} = {}) {
  requireInfraCapabilities(infra, ASSET_GENERATION_RUNTIME_INFRA_PROFILE);
  if (typeof executeJob !== "function") throw new TypeError("executeJob must be a function");

  return Object.freeze({
    async execute(job) {
      try {
        const result = await executeJob({ infra, provider, credentialSigner, job });
        return Object.freeze({
          receipt: result.receipt,
          receiptObjectRef: result.receiptObjectRef,
          receiptDigest: result.receiptDigest,
          generationRecordObjectRef: result.generationRecordObjectRef,
          generationRecordDigest: result.generationRecordDigest,
          providerOutputDigest: result.providerOutputDigest,
          finalAssetDigest: result.finalAssetDigest,
        });
      } catch (error) {
        if (error instanceof AssetGenerationAttemptFailed) throw error;
        throw new AssetGenerationAttemptFailed(errorMessage(error), { cause: error });
      }
    },

    async publishCompletion(completion) {
      return publishAssetGenerationCompletion({ infra, completion });
    },
  });
}
