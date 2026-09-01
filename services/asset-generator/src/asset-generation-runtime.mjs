import { requireInfraCapabilities } from "#infra";
import { publishAssetGenerationCompletion } from "./asset-generation-completion.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import { executeProvenancedAssetGenerationJob } from "./provenanced-asset-generation.mjs";
import { prepareResumableProviderExecution } from "./resumable-provider-operation.mjs";

export const ASSET_GENERATION_RUNTIME_INFRA_PROFILE = Object.freeze(["objects"]);

function positiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("attemptNumber must be a positive safe integer");
  return value;
}

function runtimeResult(result, providerOperation = null) {
  return Object.freeze({
    receipt: result.receipt,
    receiptObjectRef: result.receiptObjectRef,
    receiptDigest: result.receiptDigest,
    generationRecordObjectRef: result.generationRecordObjectRef,
    generationRecordDigest: result.generationRecordDigest,
    generationAttempt: result.generationAttempt,
    generationAttemptObjectRef: result.generationAttemptObjectRef,
    generationAttemptDigest: result.generationAttemptDigest,
    providerOperation: providerOperation?.checkpoint ?? result.providerOperation ?? null,
    providerOperationObjectRef: providerOperation?.objectRef ?? result.providerOperationObjectRef ?? null,
    providerOperationDigest: providerOperation?.digest ?? result.providerOperationDigest ?? null,
    providerOperationResumed: providerOperation?.resumed === true || result.providerOperationResumed === true,
    providerOutputObjectRef: result.providerOutputObjectRef,
    providerOutputDigest: result.providerOutputDigest,
    providerOutputResumed: result.providerOutputResumed === true,
    finalAssetDigest: result.finalAssetDigest,
    finalAssetReused: result.finalAssetReused === true,
    reuse: result.reuse ?? null,
  });
}

export function createAssetGenerationRuntime({
  infra,
  provider,
  credentialSigner = null,
  executeJob = executeProvenancedAssetGenerationJob,
} = {}) {
  requireInfraCapabilities(infra, ASSET_GENERATION_RUNTIME_INFRA_PROFILE);
  if (typeof executeJob !== "function") throw new TypeError("executeJob must be a function");

  return Object.freeze({
    async execute(job, { attemptNumber = 1 } = {}) {
      try {
        const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
        if (credentialSigner === null && executeJob === executeProvenancedAssetGenerationJob) {
          return runtimeResult(await executeJob({
            infra,
            provider,
            credentialSigner: null,
            job,
            attemptNumber: checkedAttemptNumber,
          }));
        }

        const prepared = await prepareResumableProviderExecution({
          infra,
          provider,
          job,
          attemptNumber: checkedAttemptNumber,
        });
        const result = await executeJob({
          infra,
          provider: prepared.provider,
          credentialSigner,
          job,
          attemptNumber: prepared.attemptNumber,
        });
        return runtimeResult(result, prepared.observation());
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
