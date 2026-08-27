import {
  InfraImmutableObjectConflictError,
  requireInfraCapabilities,
} from "../../../packages/infra/src/infra-driver.mjs";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { assetGenerationJobDigest } from "./asset-generation-attempt.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import {
  createProviderOperationCheckpoint,
  normalizeProviderOperationCheckpoint,
  normalizeProviderOperationStart,
  providerOperationObjectRef,
} from "./asset-generation-provider-operation.mjs";

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

async function sha256(bytes) {
  const input = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const normalized = input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", normalized);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function storedBytes(stored) {
  return typeof stored.bytes === "string" ? new TextEncoder().encode(stored.bytes) : stored.bytes;
}

async function parseStoredJson(stored, label) {
  const bytes = storedBytes(stored);
  if (await sha256(bytes) !== stored.digest) throw new Error(`${label} digest does not match stored bytes`);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error(`${label} contains invalid JSON`); }
}

function positiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("attemptNumber must be a positive safe integer");
  return value;
}

function supportsResumableOperations(provider) {
  const hasStart = typeof provider?.startOperation === "function";
  const hasResume = typeof provider?.resumeOperation === "function";
  if (hasStart !== hasResume) {
    throw new TypeError("resumable media provider must implement both startOperation and resumeOperation");
  }
  return hasStart;
}

async function loadProviderOperation(objects, {
  job,
  jobDigest,
  throughAttemptNumber,
  providerAdapterId,
}) {
  for (let candidate = 1; candidate <= throughAttemptNumber; candidate += 1) {
    const objectRef = providerOperationObjectRef(jobDigest, candidate);
    const stored = await objects.get(objectRef);
    if (stored === null) continue;
    const checkpoint = normalizeProviderOperationCheckpoint(await parseStoredJson(
      stored,
      `provider operation ${objectRef}`,
    ));
    if (checkpoint.jobId !== job.jobId
      || checkpoint.jobDigest !== jobDigest
      || checkpoint.providerProfile !== job.providerProfile
      || checkpoint.providerAdapterId !== providerAdapterId) {
      throw new InfraImmutableObjectConflictError(`provider operation ${objectRef} is bound to a different job or provider`);
    }
    if (stored.metadata?.kind !== "provider_operation_checkpoint"
      || stored.metadata?.jobId !== job.jobId
      || stored.metadata?.jobDigest !== jobDigest
      || stored.metadata?.attemptNumber !== candidate
      || stored.metadata?.providerAdapterId !== providerAdapterId
      || stored.metadata?.providerRequestId !== checkpoint.operation.providerRequestId) {
      throw new InfraImmutableObjectConflictError(`provider operation metadata for ${objectRef} is inconsistent`);
    }
    return { checkpoint, objectRef, digest: stored.digest };
  }
  return null;
}

async function persistProviderOperation(objects, checkpoint) {
  const bytes = new TextEncoder().encode(canonicalJson(checkpoint));
  const digest = await sha256(bytes);
  await objects.putImmutable(checkpoint.operationId, bytes, digest, {
    kind: "provider_operation_checkpoint",
    jobId: checkpoint.jobId,
    jobDigest: checkpoint.jobDigest,
    attemptNumber: checkpoint.attemptNumber,
    providerProfile: checkpoint.providerProfile,
    providerAdapterId: checkpoint.providerAdapterId,
    provider: checkpoint.operation.provider,
    model: checkpoint.operation.model,
    providerRequestId: checkpoint.operation.providerRequestId,
    providerRequestDigest: checkpoint.providerRequestDigest,
  });
  return { checkpoint, objectRef: checkpoint.operationId, digest };
}

export async function prepareResumableProviderExecution({
  infra,
  provider,
  job: rawJob,
  attemptNumber = 1,
  now = () => new Date().toISOString(),
}) {
  requireInfraCapabilities(infra, "objects");
  const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
  if (!supportsResumableOperations(provider)) {
    return Object.freeze({
      provider,
      attemptNumber: checkedAttemptNumber,
      observation() { return null; },
    });
  }

  const job = normalizeAssetGenerationJob(rawJob);
  const providerAdapterId = typeof provider.providerId === "string" && provider.providerId.trim() !== ""
    ? provider.providerId
    : (() => { throw new TypeError("resumable media provider.providerId must be a non-empty string"); })();
  const jobDigest = await assetGenerationJobDigest(job);
  let loaded;
  try {
    loaded = await loadProviderOperation(infra.objects, {
      job,
      jobDigest,
      throughAttemptNumber: checkedAttemptNumber,
      providerAdapterId,
    });
  } catch (error) {
    throw toAssetGenerationError(error, {
      phase: "reuse_lookup",
      provider: providerAdapterId,
      providerOperationDurable: false,
    });
  }

  let active = loaded;
  let used = false;
  let resumed = loaded !== null;

  const wrappedProvider = Object.freeze({
    ...provider,
    async generate(request) {
      used = true;
      if (active === null) {
        const started = normalizeProviderOperationStart(await provider.startOperation(request));
        const providerRequestDigest = await sha256(canonicalJson(started.requestWitness));
        const checkpoint = createProviderOperationCheckpoint({
          job,
          jobDigest,
          attemptNumber: checkedAttemptNumber,
          providerAdapterId,
          providerRequestWitness: started.requestWitness,
          providerRequestDigest,
          operation: started.operation,
          acceptedAt: now(),
        });
        try {
          active = await persistProviderOperation(infra.objects, checkpoint);
        } catch (error) {
          throw new AssetGenerationError(
            `provider operation ${checkpoint.operation.providerRequestId} was accepted but could not be staged durably`,
            {
              phase: "provider_operation_staging",
              category: "storage_transient",
              retryable: true,
              provider: checkpoint.operation.provider,
              model: checkpoint.operation.model,
              providerRequestId: checkpoint.operation.providerRequestId,
              providerOperationDurable: false,
              safeDetail: `provider operation ${checkpoint.operation.providerRequestId} was accepted but could not be staged durably`,
              cause: error,
            },
          );
        }
        resumed = false;
      }

      try {
        const result = await provider.resumeOperation(active.checkpoint.operation);
        return {
          requestWitness: active.checkpoint.providerRequestWitness,
          result,
        };
      } catch (error) {
        throw toAssetGenerationError(error, {
          phase: "provider_generation",
          provider: active.checkpoint.operation.provider,
          model: active.checkpoint.operation.model,
          providerOperationDurable: true,
        });
      }
    },
  });

  return Object.freeze({
    provider: wrappedProvider,
    attemptNumber: loaded?.checkpoint.attemptNumber ?? checkedAttemptNumber,
    observation() {
      if (!used || active === null) return null;
      return Object.freeze({
        checkpoint: active.checkpoint,
        objectRef: active.objectRef,
        digest: active.digest,
        resumed,
      });
    },
  });
}
