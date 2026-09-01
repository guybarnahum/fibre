import {
  InfraImmutableObjectConflictError,
  requireInfraCapabilities,
} from "#infra";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import {
  assetGenerationJobDigest,
  createGenerationAttempt,
  generationAttemptObjectRef,
  normalizeGenerationAttempt,
} from "./asset-generation-attempt.mjs";
import { toAssetGenerationError } from "./asset-generation-error.mjs";
import { createGenerationAttemptObjectPort } from "./generation-attempt-object-port.mjs";
import {
  GENERATION_RECORD_VERSION,
  STORED_ASSET_RECEIPT_VERSION,
  assertWitnessedMediaGenerationProvider,
  generationRecordObjectRefs,
  normalizeGenerationRecord,
  normalizeStoredAssetReceipt as normalizeCredentialedStoredAssetReceipt,
  normalizeWitnessedMediaGenerationResult,
} from "./asset-provenance-domain.mjs";
import { createAssetGenerationReuse } from "./asset-generation-reuse.mjs";
import {
  executeCredentialedAssetGenerationJob,
  verifyCredentialedAssetForPublication,
} from "./credentialed-asset-generation.mjs";
import { prepareResumableProviderExecution } from "./resumable-provider-operation.mjs";

export const PROVENANCED_ASSET_RECEIPT_VERSION = "stored-asset-receipt-v0.2";
export const PROVENANCED_ASSET_PUBLICATION_PROOF_VERSION = "provenanced-asset-publication-proof-v0.1";

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/u;

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function digest(name, value) {
  if (typeof value !== "string" || !SHA256_DIGEST.test(value)) throw new TypeError(`${name} must be a sha256 digest`);
  return value;
}

function timestamp(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return value;
}

function positiveIntegerOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer or null`);
  return value;
}

function stringArray(name, value, { required = false } = {}) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const result = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (required && result.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result;
}

function jsonValue(name, value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") throw new TypeError(`${name} must be JSON-compatible`);
  if (seen.has(value)) throw new TypeError(`${name} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => jsonValue(`${name}[${index}]`, item, seen));
  else {
    plain(name, value);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) throw new TypeError(`${name}.${key} is undefined`);
      jsonValue(`${name}.${key}`, item, seen);
    }
  }
  seen.delete(value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function bytes(value) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value.slice();
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  throw new TypeError("stored object bytes are not byte-like");
}

async function sha256(value) {
  const normalized = bytes(value);
  const digestBytes = await crypto.subtle.digest("SHA-256", normalized);
  return `sha256:${Array.from(new Uint8Array(digestBytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function parseStoredJson(stored, label) {
  if (await sha256(stored.bytes) !== stored.digest) throw new Error(`${label} digest does not match stored bytes`);
  try { return JSON.parse(new TextDecoder().decode(bytes(stored.bytes))); }
  catch { throw new Error(`${label} contains invalid JSON`); }
}

async function persistJsonImmutable(objects, objectRef, value, metadata) {
  const encoded = new TextEncoder().encode(canonicalJson(value));
  const valueDigest = await sha256(encoded);
  await objects.putImmutable(objectRef, encoded, valueDigest, metadata);
  return Object.freeze({ objectRef, digest: valueDigest, bytes: encoded });
}

function positiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("attemptNumber must be a positive safe integer");
  return value;
}

export function normalizeProvenancedAssetReceipt(value) {
  const name = "provenanced asset receipt";
  plain(name, value);
  const allowed = new Set([
    "receiptVersion", "jobId", "status", "assetKind", "role", "variant", "objectRef", "sha256",
    "mediaType", "width", "height", "durationMs", "completedAt",
    "generationRecordObjectRef", "generationRecordDigest", "providerOutputDigest",
    "credential", "inputReferences", "context",
  ]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  if (value.receiptVersion !== PROVENANCED_ASSET_RECEIPT_VERSION) throw new TypeError(`${name}.receiptVersion is unsupported`);
  if (value.status !== "ready") throw new TypeError(`${name}.status must be ready`);
  if (!["image", "audio", "video"].includes(value.assetKind)) throw new TypeError(`${name}.assetKind is unsupported`);
  nonEmpty(`${name}.jobId`, value.jobId);
  nonEmpty(`${name}.role`, value.role);
  nonEmpty(`${name}.variant`, value.variant);
  nonEmpty(`${name}.objectRef`, value.objectRef);
  digest(`${name}.sha256`, value.sha256);
  nonEmpty(`${name}.mediaType`, value.mediaType);
  positiveIntegerOrNull(`${name}.width`, value.width);
  positiveIntegerOrNull(`${name}.height`, value.height);
  positiveIntegerOrNull(`${name}.durationMs`, value.durationMs);
  timestamp(`${name}.completedAt`, value.completedAt);
  nonEmpty(`${name}.generationRecordObjectRef`, value.generationRecordObjectRef);
  digest(`${name}.generationRecordDigest`, value.generationRecordDigest);
  digest(`${name}.providerOutputDigest`, value.providerOutputDigest);
  if (value.credential !== null) throw new TypeError(`${name}.credential must be null when content credentials are disabled`);
  stringArray(`${name}.inputReferences`, value.inputReferences, { required: true });
  plain(`${name}.context`, value.context);
  jsonValue(`${name}.context`, value.context);
  return structuredClone(value);
}

export function normalizeStoredAssetReceipt(value) {
  if (value?.receiptVersion === STORED_ASSET_RECEIPT_VERSION) return normalizeCredentialedStoredAssetReceipt(value);
  return normalizeProvenancedAssetReceipt(value);
}

function withGenerationAttemptObjects(infra) {
  if (!infra || typeof infra !== "object") throw new TypeError("infra is required");
  return Object.freeze({
    ...infra,
    objects: createGenerationAttemptObjectPort(infra.objects),
  });
}

async function loadGenerationAttempt(objects, objectRef) {
  const stored = await objects.get(objectRef);
  if (stored === null) return null;
  const attempt = normalizeGenerationAttempt(await parseStoredJson(stored, `generation attempt ${objectRef}`));
  return Object.freeze({ attempt, objectRef, digest: stored.digest });
}

function witnessedFromStagedAttempt({ attempt, output, job }) {
  return normalizeWitnessedMediaGenerationResult({
    requestWitness: attempt.providerRequestWitness,
    result: {
      assetKind: job.assetKind,
      bytes: bytes(output.bytes),
      mediaType: attempt.providerOutput.mediaType,
      width: attempt.providerOutput.width,
      height: attempt.providerOutput.height,
      durationMs: attempt.providerOutput.durationMs,
      provider: attempt.generation.provider,
      model: attempt.generation.model,
      providerRequestId: attempt.generation.providerRequestId,
      generatedAt: attempt.generation.generatedAt,
      configuration: attempt.generation.configuration,
    },
  }, { expectedKind: job.assetKind });
}

async function loadStagedProviderOutput(objects, { job, jobDigest, throughAttemptNumber }) {
  for (let candidate = 1; candidate <= throughAttemptNumber; candidate += 1) {
    const attemptObjectRef = generationAttemptObjectRef(jobDigest, candidate);
    const loaded = await loadGenerationAttempt(objects, attemptObjectRef);
    if (loaded === null) continue;
    const attempt = loaded.attempt;
    if (attempt.jobId !== job.jobId || attempt.jobDigest !== jobDigest) {
      throw new InfraImmutableObjectConflictError(`generation attempt ${attemptObjectRef} is bound to a different job`);
    }
    const output = await objects.get(attempt.providerOutputObjectRef);
    if (output === null) continue;
    const outputDigest = await sha256(output.bytes);
    if (output.digest !== attempt.providerOutputDigest || outputDigest !== attempt.providerOutputDigest) {
      throw new InfraImmutableObjectConflictError(`staged provider output for ${attempt.attemptId} has a digest mismatch`);
    }
    return Object.freeze({
      ...loaded,
      output,
      witnessed: witnessedFromStagedAttempt({ attempt, output, job }),
      resumed: true,
    });
  }
  return null;
}

async function stageProviderOutput({ objects, job, jobDigest, attemptNumber, providerAdapterId, witnessed, now }) {
  const generated = witnessed.result;
  const providerRequestDigest = await sha256(canonicalJson(witnessed.requestWitness));
  const providerOutputDigest = await sha256(generated.bytes);
  const attempt = createGenerationAttempt({
    job,
    jobDigest,
    attemptNumber,
    providerAdapterId,
    providerRequestWitness: witnessed.requestWitness,
    providerRequestDigest,
    providerOutputDigest,
    providerOutput: {
      mediaType: generated.mediaType,
      width: generated.width,
      height: generated.height,
      durationMs: generated.durationMs,
    },
    generation: {
      provider: generated.provider,
      model: generated.model,
      providerRequestId: generated.providerRequestId,
      generatedAt: generated.generatedAt,
      configuration: generated.configuration,
    },
    createdAt: now(),
  });
  const persistedAttempt = await persistJsonImmutable(objects, attempt.attemptId, attempt, {
    kind: "generation_attempt",
    jobId: job.jobId,
    jobDigest,
    attemptNumber,
    providerAdapterId,
    provider: generated.provider,
    model: generated.model,
    providerOutputDigest,
  });
  await objects.putImmutable(attempt.providerOutputObjectRef, generated.bytes, providerOutputDigest, {
    kind: "staged_provider_output",
    jobId: job.jobId,
    jobDigest,
    generationAttemptId: attempt.attemptId,
    generationAttemptDigest: persistedAttempt.digest,
    attemptNumber,
    assetKind: job.assetKind,
    mediaType: generated.mediaType,
    provider: generated.provider,
    model: generated.model,
  });
  return Object.freeze({
    attempt,
    objectRef: persistedAttempt.objectRef,
    digest: persistedAttempt.digest,
    witnessed,
    resumed: false,
  });
}

async function persistGenerationRecord(objects, generationRecord, metadata) {
  const recordBytes = new TextEncoder().encode(canonicalJson(generationRecord));
  const recordDigest = await sha256(recordBytes);
  for (const objectRef of generationRecordObjectRefs(recordDigest)) {
    try {
      await objects.putImmutable(objectRef, recordBytes, recordDigest, metadata);
      return Object.freeze({ generationRecord, generationRecordObjectRef: objectRef, generationRecordDigest: recordDigest });
    } catch (error) {
      if (!(error instanceof InfraImmutableObjectConflictError)) throw error;
    }
  }
  throw new InfraImmutableObjectConflictError("generation record short-ID candidates are exhausted");
}

async function generationRecordFromStaged({ objects, job, staged }) {
  const generated = staged.witnessed.result;
  const attempt = staged.attempt;
  const semanticBriefDigest = await sha256(canonicalJson(job.brief));
  const providerRequestDigest = await sha256(canonicalJson(staged.witnessed.requestWitness));
  const providerOutputDigest = await sha256(generated.bytes);
  if (providerRequestDigest !== attempt.providerRequestDigest || providerOutputDigest !== attempt.providerOutputDigest) {
    throw new InfraImmutableObjectConflictError("staged generation attempt digest linkage is invalid");
  }
  const generationRecord = normalizeGenerationRecord({
    recordVersion: GENERATION_RECORD_VERSION,
    jobId: job.jobId,
    job,
    semanticBrief: job.brief,
    semanticBriefDigest,
    providerRequestWitness: staged.witnessed.requestWitness,
    providerRequestDigest,
    providerOutputDigest,
    providerOutput: {
      mediaType: generated.mediaType,
      width: generated.width,
      height: generated.height,
      durationMs: generated.durationMs,
    },
    generation: {
      provider: generated.provider,
      model: generated.model,
      providerRequestId: generated.providerRequestId,
      generatedAt: generated.generatedAt,
      configuration: generated.configuration,
    },
    createdAt: attempt.createdAt,
  });
  return persistGenerationRecord(objects, generationRecord, {
    kind: "generation_record",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    provider: generated.provider,
    model: generated.model,
    generationAttemptId: attempt.attemptId,
    generationAttemptObjectRef: staged.objectRef,
    generationAttemptDigest: staged.digest,
    providerOutputObjectRef: attempt.providerOutputObjectRef,
  });
}

function assertUncredentialedFinalAssetMetadata(metadata, {
  job,
  staged,
  generationRecordObjectRef,
  generationRecordDigest,
  providerOutputDigest,
}) {
  if (!metadata || metadata.kind !== "provenanced_generated_media"
    || metadata.jobId !== job.jobId
    || metadata.generationAttemptId !== staged.attempt.attemptId
    || metadata.generationAttemptObjectRef !== staged.objectRef
    || metadata.generationAttemptDigest !== staged.digest
    || metadata.providerOutputObjectRef !== staged.attempt.providerOutputObjectRef
    || metadata.providerOutputDigest !== providerOutputDigest
    || metadata.generationRecordObjectRef !== generationRecordObjectRef
    || metadata.generationRecordDigest !== generationRecordDigest
    || metadata.contentCredentialMode !== "disabled") {
    throw new InfraImmutableObjectConflictError("existing uncredentialed final asset metadata does not match the staged generation attempt");
  }
  for (const key of ["mediaType", "provider", "model", "finalizedAt"]) {
    if (typeof metadata[key] !== "string" || metadata[key].length === 0) {
      throw new InfraImmutableObjectConflictError(`existing uncredentialed final asset metadata is missing ${key}`);
    }
  }
}

async function finalizeUncredentialedAsset({ objects, job, staged, generation, now }) {
  const generated = staged.witnessed.result;
  const providerOutputDigest = generation.generationRecord.providerOutputDigest;
  const existing = await objects.get(job.outputObjectRef);
  if (existing !== null) {
    assertUncredentialedFinalAssetMetadata(existing.metadata, {
      job,
      staged,
      generationRecordObjectRef: generation.generationRecordObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      providerOutputDigest,
    });
    const finalDigest = await sha256(existing.bytes);
    if (existing.digest !== providerOutputDigest || finalDigest !== providerOutputDigest) {
      throw new InfraImmutableObjectConflictError("existing uncredentialed final asset differs from the durable provider output");
    }
    return Object.freeze({
      finalAssetDigest: providerOutputDigest,
      finalizedAt: existing.metadata.finalizedAt,
      reusedFinalAsset: true,
    });
  }

  const finalizedAt = now();
  await objects.putImmutable(job.outputObjectRef, generated.bytes, providerOutputDigest, {
    kind: "provenanced_generated_media",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    mediaType: generated.mediaType,
    width: generated.width,
    height: generated.height,
    durationMs: generated.durationMs,
    provider: generated.provider,
    model: generated.model,
    generationAttemptId: staged.attempt.attemptId,
    generationAttemptObjectRef: staged.objectRef,
    generationAttemptDigest: staged.digest,
    providerOutputObjectRef: staged.attempt.providerOutputObjectRef,
    generationRecordObjectRef: generation.generationRecordObjectRef,
    generationRecordDigest: generation.generationRecordDigest,
    providerOutputDigest,
    contentCredentialMode: "disabled",
    finalizedAt,
  });
  return Object.freeze({
    finalAssetDigest: providerOutputDigest,
    finalizedAt,
    reusedFinalAsset: false,
  });
}

async function loadGenerationProof(objects, receipt) {
  const generationStored = await objects.get(receipt.generationRecordObjectRef);
  if (generationStored === null) throw new Error("stored asset receipt references a missing generation record");
  if (generationStored.digest !== receipt.generationRecordDigest) throw new Error("stored generation record digest does not match receipt");
  const generationRecord = normalizeGenerationRecord(await parseStoredJson(generationStored, "stored generation record"));
  const semanticBriefDigest = await sha256(canonicalJson(generationRecord.semanticBrief));
  const providerRequestDigest = await sha256(canonicalJson(generationRecord.providerRequestWitness));
  if (semanticBriefDigest !== generationRecord.semanticBriefDigest) throw new Error("generation record semantic brief digest mismatch");
  if (providerRequestDigest !== generationRecord.providerRequestDigest) throw new Error("generation record provider request digest mismatch");
  if (generationRecord.providerOutputDigest !== receipt.providerOutputDigest) throw new Error("stored asset receipt provider output digest does not match generation record");

  const metadata = generationStored.metadata ?? {};
  const attemptObjectRef = metadata.generationAttemptObjectRef;
  const attemptDigest = metadata.generationAttemptDigest;
  if (typeof attemptObjectRef !== "string" || typeof attemptDigest !== "string") {
    throw new Error("stored generation record has incomplete generation attempt linkage");
  }
  const loadedAttempt = await loadGenerationAttempt(objects, attemptObjectRef);
  if (loadedAttempt === null || loadedAttempt.digest !== attemptDigest) throw new Error("stored generation attempt does not match generation record metadata");
  const jobDigest = await assetGenerationJobDigest(generationRecord.job);
  if (loadedAttempt.attempt.jobId !== generationRecord.jobId
    || loadedAttempt.attempt.jobDigest !== jobDigest
    || loadedAttempt.attempt.providerRequestDigest !== generationRecord.providerRequestDigest
    || loadedAttempt.attempt.providerOutputDigest !== generationRecord.providerOutputDigest) {
    throw new Error("stored generation attempt does not match generation record provenance");
  }
  const providerOutput = await objects.get(loadedAttempt.attempt.providerOutputObjectRef);
  if (providerOutput === null) throw new Error("stored generation attempt references a missing staged provider output");
  const providerOutputDigest = await sha256(providerOutput.bytes);
  if (providerOutput.digest !== loadedAttempt.attempt.providerOutputDigest || providerOutputDigest !== loadedAttempt.attempt.providerOutputDigest) {
    throw new Error("staged provider output digest does not match generation attempt");
  }
  return Object.freeze({ generationStored, generationRecord, generationAttempt: loadedAttempt.attempt, providerOutput });
}

export async function verifyProvenancedAssetForPublication({
  infra,
  credentialSigner = null,
  receipt: rawReceipt,
} = {}) {
  requireInfraCapabilities(infra, "objects");
  const receipt = normalizeStoredAssetReceipt(rawReceipt);
  if (receipt.receiptVersion === STORED_ASSET_RECEIPT_VERSION) {
    if (credentialSigner === null) throw new TypeError("credentialed asset publication requires a content credential signer");
    const proof = await verifyCredentialedAssetForPublication({ infra, credentialSigner, receipt });
    return Object.freeze({ ...proof, credentialMode: "content_credential" });
  }

  const objects = createGenerationAttemptObjectPort(infra.objects);
  const provenance = await loadGenerationProof(objects, receipt);
  const assetStored = await objects.get(receipt.objectRef);
  if (assetStored === null) throw new Error("stored asset receipt references a missing final asset");
  const finalDigest = await sha256(assetStored.bytes);
  if (assetStored.digest !== receipt.sha256 || finalDigest !== receipt.sha256) {
    throw new Error("final asset digest does not match stored asset receipt");
  }
  if (receipt.sha256 !== receipt.providerOutputDigest) {
    throw new Error("uncredentialed final asset digest must equal the durable provider output digest");
  }
  assertUncredentialedFinalAssetMetadata(assetStored.metadata, {
    job: provenance.generationRecord.job,
    staged: {
      attempt: provenance.generationAttempt,
      objectRef: assetStored.metadata.generationAttemptObjectRef,
      digest: assetStored.metadata.generationAttemptDigest,
    },
    generationRecordObjectRef: receipt.generationRecordObjectRef,
    generationRecordDigest: receipt.generationRecordDigest,
    providerOutputDigest: receipt.providerOutputDigest,
  });
  return Object.freeze({
    proofVersion: PROVENANCED_ASSET_PUBLICATION_PROOF_VERSION,
    receipt,
    generationRecord: provenance.generationRecord,
    generationAttempt: provenance.generationAttempt,
    verification: null,
    credentialMode: "disabled",
  });
}

async function completedUncredentialedReuse({ infra, job, jobDigest }) {
  const receiptStored = await infra.objects.get(job.receiptObjectRef);
  if (receiptStored === null) return null;
  const receipt = normalizeStoredAssetReceipt(await parseStoredJson(receiptStored, `stored asset receipt ${job.receiptObjectRef}`));
  if (receipt.receiptVersion !== PROVENANCED_ASSET_RECEIPT_VERSION) return null;
  if (receipt.jobId !== job.jobId || receipt.objectRef !== job.outputObjectRef) {
    throw new InfraImmutableObjectConflictError(`completed receipt ${job.receiptObjectRef} belongs to a different exact job witness`);
  }
  const proof = await verifyProvenancedAssetForPublication({ infra, receipt });
  const attempt = proof.generationAttempt;
  return Object.freeze({
    receipt,
    receiptObjectRef: job.receiptObjectRef,
    receiptDigest: receiptStored.digest,
    generationRecord: proof.generationRecord,
    generationRecordObjectRef: receipt.generationRecordObjectRef,
    generationRecordDigest: receipt.generationRecordDigest,
    generationAttempt: attempt,
    generationAttemptObjectRef: generationAttemptObjectRef(jobDigest, attempt.attemptNumber),
    generationAttemptDigest: null,
    providerOutputObjectRef: attempt.providerOutputObjectRef,
    providerOutputDigest: receipt.providerOutputDigest,
    providerOutputResumed: false,
    finalAssetDigest: receipt.sha256,
    finalAssetReused: true,
    verification: null,
    reuse: createAssetGenerationReuse({
      mode: "completed_asset",
      jobDigest,
      generationAttemptId: attempt.attemptId,
    }),
  });
}

export async function executeUncredentialedAssetGenerationJob({
  infra,
  provider,
  job: rawJob,
  attemptNumber = 1,
  now = () => new Date().toISOString(),
} = {}) {
  let phase = "validation";
  let providerName = null;
  let modelName = null;
  let providerOutputDurable = false;
  try {
    requireInfraCapabilities(infra, "objects");
    const checkedProvider = assertWitnessedMediaGenerationProvider(provider);
    providerName = checkedProvider.providerId;
    const job = normalizeAssetGenerationJob(rawJob);
    const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
    const jobDigest = await assetGenerationJobDigest(job);
    const completed = await completedUncredentialedReuse({ infra, job, jobDigest });
    if (completed !== null) return completed;

    const prepared = await prepareResumableProviderExecution({
      infra,
      provider: checkedProvider,
      job,
      attemptNumber: checkedAttemptNumber,
      now,
    });
    const portableInfra = withGenerationAttemptObjects(infra);
    const objects = portableInfra.objects;
    let staged = await loadStagedProviderOutput(objects, {
      job,
      jobDigest,
      throughAttemptNumber: prepared.attemptNumber,
    });
    if (staged === null) {
      phase = "provider_generation";
      const witnessed = normalizeWitnessedMediaGenerationResult(await prepared.provider.generate({
        assetKind: job.assetKind,
        role: job.role,
        variant: job.variant,
        brief: job.brief,
        inputReferences: job.inputReferences,
        referenceObjects: await Promise.all(job.referenceObjectRefs.map(async (objectRef) => {
          const stored = await objects.get(objectRef);
          if (stored === null) throw new TypeError(`reference object ${objectRef} does not exist`);
          return { objectRef, ...stored };
        })),
        providerProfile: job.providerProfile,
        context: job.context,
      }), { expectedKind: job.assetKind });
      providerName = witnessed.result.provider;
      modelName = witnessed.result.model;
      phase = "provider_output_staging";
      staged = await stageProviderOutput({
        objects,
        job,
        jobDigest,
        attemptNumber: prepared.attemptNumber,
        providerAdapterId: checkedProvider.providerId,
        witnessed,
        now,
      });
    }
    providerOutputDurable = true;
    providerName = staged.attempt.generation.provider;
    modelName = staged.attempt.generation.model;

    phase = "storage_finalization";
    const generation = await generationRecordFromStaged({ objects, job, staged });
    const finalized = await finalizeUncredentialedAsset({ objects, job, staged, generation, now });
    const generated = staged.witnessed.result;
    const receipt = normalizeProvenancedAssetReceipt({
      receiptVersion: PROVENANCED_ASSET_RECEIPT_VERSION,
      jobId: job.jobId,
      status: "ready",
      assetKind: job.assetKind,
      role: job.role,
      variant: job.variant,
      objectRef: job.outputObjectRef,
      sha256: finalized.finalAssetDigest,
      mediaType: generated.mediaType,
      width: generated.width,
      height: generated.height,
      durationMs: generated.durationMs,
      completedAt: finalized.finalizedAt,
      generationRecordObjectRef: generation.generationRecordObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      providerOutputDigest: generation.generationRecord.providerOutputDigest,
      credential: null,
      inputReferences: job.inputReferences,
      context: job.context,
    });
    const persistedReceipt = await persistJsonImmutable(objects, job.receiptObjectRef, receipt, {
      kind: "stored_asset_receipt",
      jobId: job.jobId,
      assetKind: job.assetKind,
      role: job.role,
      generationAttemptId: staged.attempt.attemptId,
      generationAttemptObjectRef: staged.objectRef,
      generationAttemptDigest: staged.digest,
      providerOutputObjectRef: staged.attempt.providerOutputObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      finalAssetDigest: finalized.finalAssetDigest,
      contentCredentialMode: "disabled",
    });
    const providerOperation = prepared.observation();
    return Object.freeze({
      receipt,
      receiptObjectRef: persistedReceipt.objectRef,
      receiptDigest: persistedReceipt.digest,
      generationRecord: generation.generationRecord,
      generationRecordObjectRef: generation.generationRecordObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      generationAttempt: staged.attempt,
      generationAttemptObjectRef: staged.objectRef,
      generationAttemptDigest: staged.digest,
      providerOperation: providerOperation?.checkpoint ?? null,
      providerOperationObjectRef: providerOperation?.objectRef ?? null,
      providerOperationDigest: providerOperation?.digest ?? null,
      providerOperationResumed: providerOperation?.resumed === true,
      providerOutputObjectRef: staged.attempt.providerOutputObjectRef,
      providerOutputDigest: generation.generationRecord.providerOutputDigest,
      providerOutputResumed: staged.resumed,
      finalAssetDigest: finalized.finalAssetDigest,
      finalAssetReused: finalized.reusedFinalAsset,
      verification: null,
      reuse: createAssetGenerationReuse({
        mode: staged.resumed ? "staged_provider_output" : "none",
        jobDigest,
        generationAttemptId: staged.attempt.attemptId,
      }),
    });
  } catch (error) {
    throw toAssetGenerationError(error, {
      phase,
      provider: providerName,
      model: modelName,
      providerOutputDurable,
    });
  }
}

export function executeProvenancedAssetGenerationJob(options = {}) {
  return options.credentialSigner === null || options.credentialSigner === undefined
    ? executeUncredentialedAssetGenerationJob(options)
    : executeCredentialedAssetGenerationJob(options);
}
