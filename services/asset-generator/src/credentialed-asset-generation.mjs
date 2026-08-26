import { InfraImmutableObjectConflictError } from "../../../packages/infra/src/infra-driver.mjs";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { assetGenerationJobDigest } from "./asset-generation-attempt.mjs";
import { toAssetGenerationError } from "./asset-generation-error.mjs";
import {
  buildEmbeddedAssetProvenance,
  normalizeGenerationRecord,
  normalizePromptDisclosurePolicy,
  normalizeStoredAssetReceipt,
} from "./asset-provenance-domain.mjs";
import { createAssetGenerationReuse } from "./asset-generation-reuse.mjs";
import { createGenerationAttemptObjectPort } from "./generation-attempt-object-port.mjs";
import {
  executeCredentialedAssetGenerationJob as executeCore,
  verifyCredentialedAssetForPublication as verifyCore,
} from "./credentialed-asset-generation-service.mjs";

function withGenerationAttemptObjects(infra) {
  if (!infra || typeof infra !== "object") throw new TypeError("infra is required");
  return {
    ...infra,
    objects: createGenerationAttemptObjectPort(infra.objects),
  };
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
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("stored object bytes are not byte-like");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", bytes(value));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function parseStoredJson(stored, label) {
  if (await sha256(stored.bytes) !== stored.digest) {
    throw new InfraImmutableObjectConflictError(`${label} digest does not match stored bytes`);
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes(stored.bytes)));
  } catch {
    throw new InfraImmutableObjectConflictError(`${label} is not valid JSON`);
  }
}

function assertReceiptMatchesJob(receipt, job) {
  if (receipt.jobId !== job.jobId
    || receipt.assetKind !== job.assetKind
    || receipt.role !== job.role
    || receipt.variant !== job.variant
    || receipt.objectRef !== job.outputObjectRef
    || canonicalJson(receipt.inputReferences) !== canonicalJson(job.inputReferences)
    || canonicalJson(receipt.context) !== canonicalJson(job.context)) {
    throw new InfraImmutableObjectConflictError(
      `completed receipt ${job.receiptObjectRef} belongs to a different exact job witness`,
    );
  }
}

async function completedAssetReuse({
  infra,
  credentialSigner,
  job,
  jobDigest,
  disclosure,
}) {
  const receiptStored = await infra.objects.get(job.receiptObjectRef);
  if (receiptStored === null) return null;
  if (receiptStored.metadata?.kind !== "stored_asset_receipt"
    || receiptStored.metadata?.jobId !== job.jobId) {
    throw new InfraImmutableObjectConflictError(
      `completed receipt object ${job.receiptObjectRef} has inconsistent metadata`,
    );
  }

  const receipt = normalizeStoredAssetReceipt(await parseStoredJson(
    receiptStored,
    `stored asset receipt ${job.receiptObjectRef}`,
  ));
  assertReceiptMatchesJob(receipt, job);

  const generationStored = await infra.objects.get(receipt.generationRecordObjectRef);
  if (generationStored === null || generationStored.digest !== receipt.generationRecordDigest) {
    throw new InfraImmutableObjectConflictError(
      `completed receipt ${job.receiptObjectRef} has inconsistent generation-record linkage`,
    );
  }
  const generationRecord = normalizeGenerationRecord(await parseStoredJson(
    generationStored,
    `stored generation record ${receipt.generationRecordObjectRef}`,
  ));
  const storedJobDigest = await assetGenerationJobDigest(generationRecord.job);
  if (storedJobDigest !== jobDigest || canonicalJson(generationRecord.job) !== canonicalJson(job)) {
    throw new InfraImmutableObjectConflictError(
      `completed receipt ${job.receiptObjectRef} has the same short identity but a different exact job digest`,
    );
  }

  const proof = await verifyCore({
    infra,
    credentialSigner,
    receipt,
  });
  const expectedAssertion = buildEmbeddedAssetProvenance({
    generationRecord: proof.generationRecord,
    generationRecordDigest: receipt.generationRecordDigest,
    promptDisclosurePolicy: disclosure,
  });
  if (canonicalJson(proof.verification.assertion) !== canonicalJson(expectedAssertion)) {
    throw new InfraImmutableObjectConflictError(
      `completed asset ${receipt.objectRef} was finalized under a different prompt-disclosure policy`,
    );
  }

  const generationAttempt = proof.generationAttempt?.attempt ?? null;
  return {
    receipt,
    receiptObjectRef: job.receiptObjectRef,
    receiptDigest: receiptStored.digest,
    generationRecord: proof.generationRecord,
    generationRecordObjectRef: receipt.generationRecordObjectRef,
    generationRecordDigest: receipt.generationRecordDigest,
    generationAttempt,
    generationAttemptObjectRef: proof.generationAttempt?.attemptObjectRef ?? null,
    generationAttemptDigest: proof.generationAttempt?.attemptDigest ?? null,
    providerOutputObjectRef: proof.generationAttempt?.providerOutputObjectRef ?? null,
    providerOutputDigest: receipt.providerOutputDigest,
    providerOutputResumed: false,
    finalAssetDigest: receipt.sha256,
    finalAssetReused: true,
    verification: proof.verification,
    reuse: createAssetGenerationReuse({
      mode: "completed_asset",
      jobDigest,
      generationAttemptId: generationAttempt?.attemptId ?? null,
    }),
  };
}

export async function executeCredentialedAssetGenerationJob(options) {
  const infra = withGenerationAttemptObjects(options?.infra);
  const job = normalizeAssetGenerationJob(options?.job);
  const disclosure = normalizePromptDisclosurePolicy(options?.promptDisclosurePolicy);
  const jobDigest = await assetGenerationJobDigest(job);

  try {
    const completed = await completedAssetReuse({
      infra,
      credentialSigner: options?.credentialSigner,
      job,
      jobDigest,
      disclosure,
    });
    if (completed !== null) return completed;
  } catch (error) {
    throw toAssetGenerationError(error, {
      phase: "reuse_lookup",
      providerOutputDurable: false,
    });
  }

  const result = await executeCore({
    ...options,
    infra,
    job,
    promptDisclosurePolicy: disclosure,
  });
  const mode = result.providerOutputResumed === true ? "staged_provider_output" : "none";
  return {
    ...result,
    reuse: createAssetGenerationReuse({
      mode,
      jobDigest,
      generationAttemptId: result.generationAttempt?.attemptId ?? null,
    }),
  };
}

export function verifyCredentialedAssetForPublication(options) {
  return verifyCore({
    ...options,
    infra: withGenerationAttemptObjects(options?.infra),
  });
}
