import { requireInfraCapabilities } from "#packages/infra/src/infra-driver.mjs";
import { publishAssetGenerationCompletion } from "./asset-generation-completion.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import { executeCredentialedAssetGenerationJob } from "./credentialed-asset-generation.mjs";

export const ASSET_GENERATION_RUNTIME_INFRA_PROFILE = Object.freeze(["objects", "queues"]);

function positiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("attemptNumber must be a positive safe integer");
  return value;
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
    async execute(job, { attemptNumber = 1 } = {}) {
      try {
        const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
        const result = await executeJob({
          infra,
          provider,
          credentialSigner,
          job,
          attemptNumber: checkedAttemptNumber,
        });
        return Object.freeze({
          receipt: result.receipt,
          receiptObjectRef: result.receiptObjectRef,
          receiptDigest: result.receiptDigest,
          generationRecordObjectRef: result.generationRecordObjectRef,
          generationRecordDigest: result.generationRecordDigest,
          generationAttempt: result.generationAttempt,
          generationAttemptObjectRef: result.generationAttemptObjectRef,
          generationAttemptDigest: result.generationAttemptDigest,
          providerOutputObjectRef: result.providerOutputObjectRef,
          providerOutputDigest: result.providerOutputDigest,
          providerOutputResumed: result.providerOutputResumed === true,
          finalAssetDigest: result.finalAssetDigest,
          finalAssetReused: result.finalAssetReused === true,
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
        if (error instanceof AssetGenerationError) {
          throw toAssetGenerationError(error, { providerOutputDurable: true });
        }
        throw toAssetGenerationError(error, {
          phase: "completion_publication",
          providerOutputDurable: true,
        });
      }
    },
  });
}
