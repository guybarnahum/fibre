import {
  InfraImmutableObjectConflictError,
  requireInfraCapabilities,
} from "@fibre/infra";
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

function resumableSupport(provider) {
  return Object.freeze({
    hasStart: typeof provider?.startOperation === "function",
    hasResume: typeof provider?.resumeOperation === "function",
  });
}

function providerAdapterId(provider) {
  return typeof provider?.providerId === "string" && provider.providerId.trim() !== ""
    ? provider.providerId
    : null;
}

async function loadProviderOperation(objects, {
  job,
  jobDigest,
  throughAttemptNumber,
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
      || checkpoint.providerProfile !== job.providerProfile) {
      throw new InfraImmutableObjectConflictError(`provider operation ${objectRef} is bound to a different job or provider profile`);
    }
    if (stored.metadata?.kind !== "provider_operation_checkpoint"
      || stored.metadata?.jobId !== job.jobId
      || stored.metadata?.jobDigest !== jobDigest
      || stored.metadata?.attemptNumber !== candidate
      || stored.metadata?.providerAdapterId !== checkpoint.providerAdapterId
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

function incompatibleAcceptedOperation(loaded, currentProviderAdapterId) {
  const expected = loaded.checkpoint.providerAdapterId;
  const actual = currentProviderAdapterId ?? "non-resumable provider";
  return new AssetGenerationError(
    `accepted provider operation ${loaded.checkpoint.operation.providerRequestId} requires resumable adapter ${expected}; active adapter is ${actual}`,
    {
      phase: "reuse_lookup",
      category: "unsupported_capability",
      retryable: false,
      provider: currentProviderAdapterId,
      model: loaded.checkpoint.operation.model,
      providerRequestId: loaded.checkpoint.operation.providerRequestId,
      providerOperationDurable: true,
      safeDetail: `durable accepted provider operation requires adapter ${expected}; active adapter is ${actual}`,
    },
  );
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
  const job = normalizeAssetGenerationJob(rawJob);
  const jobDigest = await assetGenerationJobDigest(job);
  const currentProviderAdapterId = providerAdapterId(provider);
  const support = resumableSupport(provider);

  let loaded;
  try {
    loaded = await loadProviderOperation(infra.objects, {
      job,
      jobDigest,
      throughAttemptNumber: checkedAttemptNumber,
    });
  } catch (error) {
    throw toAssetGenerationError(error, {
      phase: "reuse_lookup",
      provider: currentProviderAdapterId,
      providerOperationDurable: false,
    });
  }

  if (loaded !== null && (
    !support.hasStart
    || !support.hasResume
    || currentProviderAdapterId !== loaded.checkpoint.providerAdapterId
  )) {
    throw incompatibleAcceptedOperation(loaded, currentProviderAdapterId);
  }

  if (support.hasStart !== support.hasResume) {
    throw new TypeError("resumable media provider must implement both startOperation and resumeOperation");
  }
  if (!support.hasStart) {
    return Object.freeze({
      provider,
      attemptNumber: checkedAttemptNumber,
      observation() { return null; },
    });
  }

  const activeProviderAdapterId = currentProviderAdapterId
    ?? (() => { throw new TypeError("resumable media provider.providerId must be a non-empty string"); })();

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
          providerAdapterId: activeProviderAdapterId,
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
        if (loaded !== null && error instanceof TypeError) {
          throw new AssetGenerationError(
            `accepted provider operation ${active.checkpoint.operation.providerRequestId} cannot be resumed by adapter ${activeProviderAdapterId}`,
            {
              phase: "provider_generation",
              category: "unsupported_capability",
              retryable: false,
              provider: activeProviderAdapterId,
              model: active.checkpoint.operation.model,
              providerRequestId: active.checkpoint.operation.providerRequestId,
              providerOperationDurable: true,
              safeDetail: `durable accepted provider operation cannot be resumed by adapter ${activeProviderAdapterId}`,
              cause: error,
            },
          );
        }
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
