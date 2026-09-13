import { requireInfraCapabilities } from "#infra";
import { publishAssetGenerationCompletion } from "./asset-generation-completion.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import { executeProvenancedAssetGenerationJob } from "./provenanced-asset-generation.mjs";
import { prepareResumableProviderExecution } from "./resumable-provider-operation.mjs";

export const ASSET_GENERATION_RUNTIME_INFRA_PROFILE = Object.freeze(["objects"]);
const ACTIVITY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

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

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Asset generation activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation(Object.freeze({ operationId: null }));
  return activity.runStage(metadata, operation);
}

function safeActivityCause(value) {
  return typeof value === "string" && ACTIVITY_ID_PATTERN.test(value) ? value : null;
}

function jobCause(job, supplied) {
  return safeActivityCause(supplied.causationId)
    ?? safeActivityCause(job?.context?.embodimentId)
    ?? safeActivityCause(job?.referenceObjectRefs?.[0]);
}

function activityIdentity(job, supplied = {}) {
  const context = job?.context ?? {};
  return Object.freeze({
    requestId: supplied.requestId ?? context.requestId ?? null,
    genesisId: supplied.genesisId ?? context.genesisId ?? null,
    threadId: supplied.threadId ?? context.threadId ?? null,
    correlationId: supplied.correlationId ?? null,
    causationId: jobCause(job, supplied),
    parentOperationId: supplied.parentOperationId ?? null,
  });
}

function jobEvidence(job) {
  const evidence = {};
  if (typeof job?.outputObjectRef === "string" && job.outputObjectRef !== "") evidence.objectRef = job.outputObjectRef;
  if (typeof job?.context?.embodimentId === "string" && job.context.embodimentId !== "") {
    evidence.embodimentId = job.context.embodimentId;
  }
  return evidence;
}

function completionEvidence(completion) {
  const objectRef = completion?.receiptObjectRef;
  return typeof objectRef === "string" && objectRef !== "" ? { objectRef } : {};
}

function activityCategoryForAssetError(error) {
  switch (error?.category) {
    case "provider_timeout": return "timeout";
    case "network": return "network";
    case "storage_transient": return "storage";
    case "invalid_request": return "validation";
    case "authentication": return "authorization";
    case "immutable_conflict": return "conflict";
    case "rate_limited":
    case "provider_unavailable":
    case "unsupported_capability":
    case "moderation_rejected":
    case "missing_reference":
    case "quota_exhausted": return "provider";
    default: return "unknown";
  }
}

function annotateActivityError(error) {
  if (!(error instanceof AssetGenerationError)) return error;
  error.activityCategory = activityCategoryForAssetError(error);
  error.code = `ASSET_${String(error.category).toUpperCase()}`;
  return error;
}

export function createAssetGenerationRuntime({
  infra,
  provider,
  credentialSigner = null,
  activityRecorder = null,
  executeJob = executeProvenancedAssetGenerationJob,
} = {}) {
  requireInfraCapabilities(infra, ASSET_GENERATION_RUNTIME_INFRA_PROFILE);
  const activity = optionalActivityRecorder(activityRecorder);
  if (typeof executeJob !== "function") throw new TypeError("executeJob must be a function");

  return Object.freeze({
    async execute(job, { attemptNumber = 1, activityContext = {} } = {}) {
      const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
      const context = activityIdentity(job, activityContext);
      const evidence = jobEvidence(job);
      if (checkedAttemptNumber > 1) {
        await bestEffortRecord(activity, {
          ...context,
          stage: "asset.request.execute",
          status: "retrying",
          attempt: checkedAttemptNumber,
          message: "Retrying asset generation execution",
          evidence,
        });
      }
      return runActivityStage(activity, {
        ...context,
        stage: "asset.request.execute",
        attempt: checkedAttemptNumber,
        evidence,
      }, async () => {
        try {
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
          const normalized = error instanceof AssetGenerationError
            ? error
            : toAssetGenerationError(error, {
                phase: "unknown",
                category: "unknown",
                retryable: true,
              });
          throw annotateActivityError(normalized);
        }
      });
    },

    async publishCompletion(completion, { activityContext = {} } = {}) {
      const context = activityIdentity(completion, activityContext);
      return runActivityStage(activity, {
        ...context,
        stage: "asset.completion.publish",
        attempt: 1,
        evidence: completionEvidence(completion),
      }, async () => {
        try {
          return await publishAssetGenerationCompletion({ infra, completion });
        } catch (error) {
          const normalized = error instanceof AssetGenerationError
            ? toAssetGenerationError(error, { providerOutputDurable: true })
            : toAssetGenerationError(error, {
                phase: "completion_publication",
                providerOutputDurable: true,
              });
          throw annotateActivityError(normalized);
        }
      });
    },
  });
}
