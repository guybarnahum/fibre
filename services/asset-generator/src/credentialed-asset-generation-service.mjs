import { requireInfraCapabilities } from "@fibre/infra";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import {
  GENERATION_RECORD_VERSION,
  STORED_ASSET_RECEIPT_VERSION,
  assertContentCredentialSigner,
  assertWitnessedMediaGenerationProvider,
  buildEmbeddedAssetProvenance,
  generationRecordObjectRef,
  normalizeCredentialEmbedResult,
  normalizeCredentialVerification,
  normalizeGenerationRecord,
  normalizePromptDisclosurePolicy,
  normalizeStoredAssetReceipt,
  normalizeWitnessedMediaGenerationResult,
} from "./asset-provenance-domain.mjs";

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

async function persistJsonImmutable(objects, objectRef, value, metadata) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await sha256(bytes);
  await objects.putImmutable(objectRef, bytes, digest, metadata);
  return { objectRef, digest, bytes };
}

async function resolveReferenceObjects(objects, refs) {
  const result = [];
  for (const objectRef of refs) {
    const stored = await objects.get(objectRef);
    if (stored === null) throw new TypeError(`reference object ${objectRef} does not exist`);
    result.push({ objectRef, ...stored });
  }
  return result;
}

async function validateGenerationRecordDigests(record) {
  const semanticBriefDigest = await sha256(canonicalJson(record.semanticBrief));
  const providerRequestDigest = await sha256(canonicalJson(record.providerRequestWitness));
  if (semanticBriefDigest !== record.semanticBriefDigest) throw new Error("generation record semantic brief digest mismatch");
  if (providerRequestDigest !== record.providerRequestDigest) throw new Error("generation record provider request digest mismatch");
}

function assertVerificationMatchesRecord(verification, record, expectedAssertion) {
  if (!verification.valid) throw new Error(`content credential verification failed: ${verification.failureReason}`);
  if (canonicalJson(verification.assertion) !== canonicalJson(expectedAssertion)) {
    throw new Error("content credential assertion does not match generation record");
  }
  if (verification.assertion.generationRecordDigest !== expectedAssertion.generationRecordDigest
    || verification.assertion.providerOutputDigest !== record.providerOutputDigest) {
    throw new Error("content credential assertion digest linkage is invalid");
  }
}

export async function executeCredentialedAssetGenerationJob({
  infra,
  provider,
  credentialSigner,
  job: rawJob,
  promptDisclosurePolicy = { mode: "digest_only", authorizationRef: null },
  now = () => new Date().toISOString(),
}) {
  requireInfraCapabilities(infra, "objects");
  const objects = infra.objects;
  const job = normalizeAssetGenerationJob(rawJob);
  const checkedProvider = assertWitnessedMediaGenerationProvider(provider);
  const signer = assertContentCredentialSigner(credentialSigner);
  const disclosure = normalizePromptDisclosurePolicy(promptDisclosurePolicy);

  if (!checkedProvider.capabilities.includes(job.assetKind)) {
    throw new TypeError(`provider ${checkedProvider.providerId} does not support ${job.assetKind}`);
  }

  const referenceObjects = await resolveReferenceObjects(objects, job.referenceObjectRefs);
  const witnessed = normalizeWitnessedMediaGenerationResult(await checkedProvider.generate({
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    brief: job.brief,
    inputReferences: job.inputReferences,
    referenceObjects,
    providerProfile: job.providerProfile,
    context: job.context,
  }), { expectedKind: job.assetKind });
  const generated = witnessed.result;

  const semanticBriefDigest = await sha256(canonicalJson(job.brief));
  const providerRequestDigest = await sha256(canonicalJson(witnessed.requestWitness));
  const providerOutputDigest = await sha256(generated.bytes);

  const generationRecord = normalizeGenerationRecord({
    recordVersion: GENERATION_RECORD_VERSION,
    jobId: job.jobId,
    job,
    semanticBrief: job.brief,
    semanticBriefDigest,
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
  await validateGenerationRecordDigests(generationRecord);

  const generationRecordBytes = new TextEncoder().encode(canonicalJson(generationRecord));
  const generationRecordDigest = await sha256(generationRecordBytes);
  const generationRecordRef = generationRecordObjectRef(generationRecordDigest);
  await objects.putImmutable(generationRecordRef, generationRecordBytes, generationRecordDigest, {
    kind: "generation_record",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    provider: generated.provider,
    model: generated.model,
  });

  const assertion = buildEmbeddedAssetProvenance({
    generationRecord,
    generationRecordDigest,
    promptDisclosurePolicy: disclosure,
  });
  const embedded = normalizeCredentialEmbedResult(await signer.embed({
    bytes: generated.bytes,
    mediaType: generated.mediaType,
    assertion,
  }));
  if (embedded.signerId !== signer.signerId || embedded.format !== signer.format) {
    throw new Error("content credential embed result does not match signer");
  }

  const verification = normalizeCredentialVerification(await signer.verify({
    bytes: embedded.bytes,
    mediaType: generated.mediaType,
  }));
  if (verification.signerId !== signer.signerId || verification.format !== signer.format) {
    throw new Error("content credential verification does not match signer");
  }
  if (verification.manifestDigest !== embedded.manifestDigest) {
    throw new Error("content credential manifest digest changed after embedding");
  }
  assertVerificationMatchesRecord(verification, generationRecord, assertion);

  const finalAssetDigest = await sha256(embedded.bytes);
  await objects.putImmutable(job.outputObjectRef, embedded.bytes, finalAssetDigest, {
    kind: "credentialed_generated_media",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    provider: generated.provider,
    model: generated.model,
    generationRecordObjectRef: generationRecordRef,
    generationRecordDigest,
    providerOutputDigest,
    credentialFormat: embedded.format,
    credentialManifestDigest: embedded.manifestDigest,
  });

  const receipt = normalizeStoredAssetReceipt({
    receiptVersion: STORED_ASSET_RECEIPT_VERSION,
    jobId: job.jobId,
    status: "ready",
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    objectRef: job.outputObjectRef,
    sha256: finalAssetDigest,
    mediaType: generated.mediaType,
    width: generated.width,
    height: generated.height,
    durationMs: generated.durationMs,
    completedAt: now(),
    generationRecordObjectRef: generationRecordRef,
    generationRecordDigest,
    providerOutputDigest,
    credential: {
      format: embedded.format,
      signerId: embedded.signerId,
      manifestDigest: embedded.manifestDigest,
      embeddedAt: embedded.embeddedAt,
      verifiedAt: verification.verifiedAt,
    },
    inputReferences: job.inputReferences,
    context: job.context,
  });
  const persistedReceipt = await persistJsonImmutable(objects, job.receiptObjectRef, receipt, {
    kind: "stored_asset_receipt",
    jobId: job.jobId,
    assetKind: job.assetKind,
    role: job.role,
    generationRecordDigest,
    finalAssetDigest,
  });

  return {
    receipt,
    receiptObjectRef: persistedReceipt.objectRef,
    receiptDigest: persistedReceipt.digest,
    generationRecord,
    generationRecordObjectRef: generationRecordRef,
    generationRecordDigest,
    providerOutputDigest,
    finalAssetDigest,
    verification,
  };
}

export async function verifyCredentialedAssetForPublication({
  infra,
  credentialSigner,
  receipt: rawReceipt,
}) {
  requireInfraCapabilities(infra, "objects");
  const objects = infra.objects;
  const signer = assertContentCredentialSigner(credentialSigner);
  const receipt = normalizeStoredAssetReceipt(rawReceipt);

  const generationStored = await objects.get(receipt.generationRecordObjectRef);
  if (generationStored === null) throw new Error("stored asset receipt references a missing generation record");
  if (generationStored.digest !== receipt.generationRecordDigest) {
    throw new Error("stored generation record digest does not match receipt");
  }
  const generationRecord = normalizeGenerationRecord(JSON.parse(
    typeof generationStored.bytes === "string"
      ? generationStored.bytes
      : new TextDecoder().decode(generationStored.bytes),
  ));
  await validateGenerationRecordDigests(generationRecord);
  if (generationRecord.providerOutputDigest !== receipt.providerOutputDigest) {
    throw new Error("stored asset receipt provider output digest does not match generation record");
  }

  const assetStored = await objects.get(receipt.objectRef);
  if (assetStored === null) throw new Error("stored asset receipt references a missing final asset");
  const finalDigest = await sha256(assetStored.bytes);
  if (assetStored.digest !== receipt.sha256 || finalDigest !== receipt.sha256) {
    throw new Error("final asset digest does not match stored asset receipt");
  }

  const verification = normalizeCredentialVerification(await signer.verify({
    bytes: assetStored.bytes,
    mediaType: receipt.mediaType,
  }));
  if (!verification.valid) throw new Error(`content credential verification failed: ${verification.failureReason}`);
  if (verification.signerId !== receipt.credential.signerId
    || verification.format !== receipt.credential.format
    || verification.manifestDigest !== receipt.credential.manifestDigest) {
    throw new Error("content credential verification does not match stored asset receipt");
  }

  const assertion = verification.assertion;
  if (assertion.generationRecordDigest !== receipt.generationRecordDigest
    || assertion.semanticBriefDigest !== generationRecord.semanticBriefDigest
    || assertion.providerRequestDigest !== generationRecord.providerRequestDigest
    || assertion.providerOutputDigest !== generationRecord.providerOutputDigest
    || assertion.assetKind !== receipt.assetKind
    || assertion.role !== receipt.role
    || assertion.variant !== receipt.variant) {
    throw new Error("content credential assertion is not linked to the stored generation record");
  }

  return Object.freeze({
    proofVersion: "credentialed-asset-publication-proof-v0.1",
    receipt,
    generationRecord,
    verification,
  });
}
