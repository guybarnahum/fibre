import { requireInfraCapabilities } from "#packages/infra/src/infra-driver.mjs";
import { publishAssetGenerationCompletion } from "./asset-generation-completion.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import { executeCredentialedAssetGenerationJob } from "./credentialed-asset-generation-service.mjs";

export const ASSET_GENERATION_RUNTIME_INFRA_PROFILE = Object.freeze(["objects", "queues"]);

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
        if (error instanceof AssetGenerationError) throw error;
        throw toAssetGenerationError(error, {
          phase: "unknown",
          category: "unknown",
          retryable: true,
        });
      }
    },

    async publishCompletion(completion) {
      try {
        return await publishAssetGenerationCompletion({ infra, completion });
      } catch (error) {
        if (error instanceof AssetGenerationError) throw error;
        throw toAssetGenerationError(error, { phase: "completion_publication" });
      }
    },
  });
}
