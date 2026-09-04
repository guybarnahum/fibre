import {
  InfraWorkflowConflictError,
  requireInfraCapabilities,
} from "#infra";
import {
  ASSET_GENERATION_RECEIPT_VERSION,
  assertMediaGenerationProvider,
  normalizeAssetGenerationJob,
  normalizeAssetGenerationReceipt,
  normalizeMediaGenerationResult,
} from "./asset-generation-domain.mjs";

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function jobReplayIdentity(job) {
  const normalized = normalizeAssetGenerationJob(job);
  return canonicalize({ ...normalized, requestedAt: null });
}

function sameJobExceptRequestedAt(left, right) {
  return JSON.stringify(jobReplayIdentity(left)) === JSON.stringify(jobReplayIdentity(right));
}

function adoptedWorkflowInstance(existing) {
  return {
    workflowName: existing.workflowName,
    instanceId: existing.instanceId,
    status: existing.status,
    error: existing.error ?? null,
    duplicate: true,
  };
}

async function persistReceipt(objects, job, receipt) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(receipt)));
  const digest = await sha256(bytes);
  await objects.putImmutable(job.receiptObjectRef, bytes, digest, {
    kind: "asset_generation_receipt",
    jobId: job.jobId,
    status: receipt.status,
    assetKind: job.assetKind,
    role: job.role,
  });
  return { receipt, receiptObjectRef: job.receiptObjectRef, receiptDigest: digest };
}

export function createAssetGenerationService({ infra, workflowName = "asset_generation_v1" }) {
  requireInfraCapabilities(infra, "workflows");
  const workflows = infra.workflows;
  return Object.freeze({
    async request(rawJob) {
      const job = normalizeAssetGenerationJob(rawJob);
      try {
        const instance = await workflows.start(workflowName, job.jobId, job);
        return { job, instance };
      } catch (error) {
        if (!(error instanceof InfraWorkflowConflictError)) throw error;
        const existing = await workflows.get(workflowName, job.jobId);
        if (existing === null || existing.input === undefined) throw error;
        const existingJob = normalizeAssetGenerationJob(existing.input);
        if (!sameJobExceptRequestedAt(job, existingJob)) throw error;

        // The Workflow input witness is authoritative for a start that committed
        // before its calling projection persisted. Adopt the exact durable input so
        // the caller can persist it and all future retries become byte-identical.
        if (rawJob && typeof rawJob === "object" && !Object.isFrozen(rawJob)) {
          rawJob.requestedAt = existingJob.requestedAt;
        }
        return { job: existingJob, instance: adoptedWorkflowInstance(existing), adopted: true };
      }
    },
    async status(jobId) {
      return workflows.get(workflowName, jobId);
    },
  });
}

export async function executeAssetGenerationJob({
  infra,
  provider,
  job: rawJob,
  now = () => new Date().toISOString(),
}) {
  requireInfraCapabilities(infra, "objects");
  const objects = infra.objects;
  const job = normalizeAssetGenerationJob(rawJob);
  const checkedProvider = assertMediaGenerationProvider(provider);

  if (!checkedProvider.capabilities.includes(job.assetKind)) {
    const receipt = normalizeAssetGenerationReceipt({
      receiptVersion: ASSET_GENERATION_RECEIPT_VERSION,
      jobId: job.jobId,
      job,
      status: "unavailable",
      assetKind: job.assetKind,
      role: job.role,
      objectRef: null,
      sha256: null,
      mediaType: null,
      width: null,
      height: null,
      durationMs: null,
      completedAt: now(),
      generation: null,
      inputReferences: job.inputReferences,
      context: job.context,
      unavailableReason: `provider ${checkedProvider.providerId} does not support ${job.assetKind}`,
    });
    return persistReceipt(objects, job, receipt);
  }

  const referenceObjects = [];
  for (const objectRef of job.referenceObjectRefs) {
    const stored = await objects.get(objectRef);
    if (stored === null) throw new TypeError(`reference object ${objectRef} does not exist`);
    referenceObjects.push({ objectRef, ...stored });
  }

  const generated = normalizeMediaGenerationResult(await checkedProvider.generate({
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    brief: job.brief,
    inputReferences: job.inputReferences,
    referenceObjects,
    providerProfile: job.providerProfile,
    context: job.context,
  }), { expectedKind: job.assetKind });

  const digest = await sha256(generated.bytes);
  await objects.putImmutable(job.outputObjectRef, generated.bytes, digest, {
    kind: "generated_media",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    provider: generated.provider,
    model: generated.model,
    generatedAt: generated.generatedAt,
    inputReferences: job.inputReferences,
    referenceObjectRefs: job.referenceObjectRefs,
  });

  const receipt = normalizeAssetGenerationReceipt({
    receiptVersion: ASSET_GENERATION_RECEIPT_VERSION,
    jobId: job.jobId,
    job,
    status: "ready",
    assetKind: job.assetKind,
    role: job.role,
    objectRef: job.outputObjectRef,
    sha256: digest,
    mediaType: generated.mediaType,
    width: generated.width,
    height: generated.height,
    durationMs: generated.durationMs,
    completedAt: now(),
    generation: {
      provider: generated.provider,
      model: generated.model,
      providerRequestId: generated.providerRequestId,
      generatedAt: generated.generatedAt,
      configuration: generated.configuration,
    },
    inputReferences: job.inputReferences,
    context: job.context,
    unavailableReason: null,
  });

  return persistReceipt(objects, job, receipt);
}
