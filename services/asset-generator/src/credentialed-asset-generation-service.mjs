import {
  InfraImmutableObjectConflictError,
  requireInfraCapabilities,
} from "@fibre/infra";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import {
  AssetGenerationError,
  toAssetGenerationError,
} from "./asset-generation-error.mjs";
import {
  assetGenerationJobDigest,
  createGenerationAttempt,
  generationAttemptObjectRef,
  normalizeGenerationAttempt,
} from "./asset-generation-attempt.mjs";
import {
  GENERATION_RECORD_VERSION,
  STORED_ASSET_RECEIPT_VERSION,
  assertContentCredentialSigner,
  assertWitnessedMediaGenerationProvider,
  buildEmbeddedAssetProvenance,
  generationRecordObjectRefs,
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

function storedBytes(stored) {
  return typeof stored.bytes === "string" ? new TextEncoder().encode(stored.bytes) : stored.bytes;
}

async function parseStoredJson(stored, label) {
  const bytes = storedBytes(stored);
  const computed = await sha256(bytes);
  if (computed !== stored.digest) throw new Error(`${label} digest does not match stored bytes`);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`${label} contains invalid JSON`);
  }
}

async function persistJsonImmutable(objects, objectRef, value, metadata) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await sha256(bytes);
  await objects.putImmutable(objectRef, bytes, digest, metadata);
  return { objectRef, digest, bytes };
}

async function persistGenerationRecord(objects, { bytes, digest, metadata }) {
  for (const objectRef of generationRecordObjectRefs(digest)) {
    try {
      await objects.putImmutable(objectRef, bytes, digest, metadata);
      return objectRef;
    } catch (error) {
      if (!(error instanceof InfraImmutableObjectConflictError)) throw error;
    }
  }
  throw new InfraImmutableObjectConflictError("generation record 12-hex ID candidates are exhausted");
}

async function resolveReferenceObjects(objects, refs) {
  const result = [];
  for (const objectRef of refs) {
    const stored = await objects.get(objectRef);
    if (stored === null) {
      throw new AssetGenerationError(`reference object ${objectRef} does not exist`, {
        phase: "reference_loading",
        category: "missing_reference",
      });
    }
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

function assertPositiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("attemptNumber must be a positive safe integer");
  return value;
}

async function loadGenerationAttempt(objects, objectRef) {
  const stored = await objects.get(objectRef);
  if (stored === null) return null;
  const attempt = normalizeGenerationAttempt(await parseStoredJson(stored, `generation attempt ${objectRef}`));
  return { attempt, objectRef, digest: stored.digest };
}

function witnessedFromStagedAttempt({ attempt, bytes, job }) {
  return normalizeWitnessedMediaGenerationResult({
    requestWitness: attempt.providerRequestWitness,
    result: {
      assetKind: job.assetKind,
      bytes,
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

async function loadStagedProviderOutput(objects, {
  job,
  jobDigest,
  throughAttemptNumber,
}) {
  for (let candidate = 1; candidate <= throughAttemptNumber; candidate += 1) {
    const attemptObjectRef = generationAttemptObjectRef(jobDigest, candidate);
    const loaded = await loadGenerationAttempt(objects, attemptObjectRef);
    if (loaded === null) continue;
    const { attempt } = loaded;
    if (attempt.jobId !== job.jobId || attempt.jobDigest !== jobDigest) {
      throw new InfraImmutableObjectConflictError(`generation attempt ${attemptObjectRef} is bound to a different job`);
    }

    const output = await objects.get(attempt.providerOutputObjectRef);
    if (output === null) {
      if (candidate === throughAttemptNumber) {
        throw new AssetGenerationError(`generation attempt ${attempt.attemptId} has no durable provider output`, {
          phase: "provider_output_staging",
          category: "storage_transient",
          provider: attempt.generation.provider,
          model: attempt.generation.model,
          providerRequestId: attempt.generation.providerRequestId,
          providerOutputDurable: false,
        });
      }
      continue;
    }
    const outputDigest = await sha256(storedBytes(output));
    if (output.digest !== attempt.providerOutputDigest || outputDigest !== attempt.providerOutputDigest) {
      throw new InfraImmutableObjectConflictError(`staged provider output for ${attempt.attemptId} has a digest mismatch`);
    }
    if (output.metadata?.kind !== "staged_provider_output"
      || output.metadata?.generationAttemptId !== attempt.attemptId
      || output.metadata?.generationAttemptDigest !== loaded.digest
      || output.metadata?.jobId !== job.jobId
      || output.metadata?.jobDigest !== jobDigest) {
      throw new InfraImmutableObjectConflictError(`staged provider output metadata for ${attempt.attemptId} is inconsistent`);
    }
    return {
      ...loaded,
      output,
      witnessed: witnessedFromStagedAttempt({ attempt, bytes: storedBytes(output), job }),
      resumed: true,
    };
  }
  return null;
}

async function stageProviderOutput({
  objects,
  job,
  jobDigest,
  attemptNumber,
  providerAdapterId,
  witnessed,
  now,
}) {
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
  return {
    attempt,
    objectRef: persistedAttempt.objectRef,
    digest: persistedAttempt.digest,
    witnessed,
    resumed: false,
  };
}

async function generationRecordFromStaged({ objects, job, staged }) {
  const generated = staged.witnessed.result;
  const attempt = staged.attempt;
  const semanticBriefDigest = await sha256(canonicalJson(job.brief));
  const providerRequestDigest = await sha256(canonicalJson(staged.witnessed.requestWitness));
  const providerOutputDigest = await sha256(generated.bytes);
  if (providerRequestDigest !== attempt.providerRequestDigest
    || providerOutputDigest !== attempt.providerOutputDigest) {
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
  await validateGenerationRecordDigests(generationRecord);

  const generationRecordBytes = new TextEncoder().encode(canonicalJson(generationRecord));
  const generationRecordDigest = await sha256(generationRecordBytes);
  const generationRecordObjectRef = await persistGenerationRecord(objects, {
    bytes: generationRecordBytes,
    digest: generationRecordDigest,
    metadata: {
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
    },
  });
  return {
    generationRecord,
    generationRecordObjectRef,
    generationRecordDigest,
    providerOutputDigest,
  };
}

function assertFinalAssetMetadata(metadata, {
  job,
  staged,
  generationRecordObjectRef,
  generationRecordDigest,
  providerOutputDigest,
}) {
  if (!metadata || metadata.kind !== "credentialed_generated_media"
    || metadata.jobId !== job.jobId
    || metadata.generationAttemptId !== staged.attempt.attemptId
    || metadata.generationAttemptObjectRef !== staged.objectRef
    || metadata.generationAttemptDigest !== staged.digest
    || metadata.providerOutputObjectRef !== staged.attempt.providerOutputObjectRef
    || metadata.providerOutputDigest !== providerOutputDigest
    || metadata.generationRecordObjectRef !== generationRecordObjectRef
    || metadata.generationRecordDigest !== generationRecordDigest) {
    throw new InfraImmutableObjectConflictError("existing final asset metadata does not match the staged generation attempt");
  }
  for (const key of [
    "mediaType", "provider", "model", "credentialFormat", "credentialSignerId",
    "credentialManifestDigest", "credentialEmbeddedAt", "credentialVerifiedAt", "finalizedAt",
  ]) {
    if (typeof metadata[key] !== "string" || metadata[key].length === 0) {
      throw new InfraImmutableObjectConflictError(`existing final asset metadata is missing ${key}`);
    }
  }
}

async function finalizeCredentialedAsset({
  objects,
  signer,
  job,
  staged,
  generationRecord,
  generationRecordObjectRef,
  generationRecordDigest,
  providerOutputDigest,
  disclosure,
  now,
  setPhase,
}) {
  const generated = staged.witnessed.result;
  const existing = await objects.get(job.outputObjectRef);
  if (existing !== null) {
    assertFinalAssetMetadata(existing.metadata, {
      job,
      staged,
      generationRecordObjectRef,
      generationRecordDigest,
      providerOutputDigest,
    });
    const finalAssetDigest = await sha256(storedBytes(existing));
    if (finalAssetDigest !== existing.digest) {
      throw new InfraImmutableObjectConflictError("existing final asset digest does not match its bytes");
    }
    setPhase("credential_verification");
    const verification = normalizeCredentialVerification(await signer.verify({
      bytes: storedBytes(existing),
      mediaType: existing.metadata.mediaType,
    }));
    if (verification.signerId !== existing.metadata.credentialSignerId
      || verification.format !== existing.metadata.credentialFormat
      || verification.manifestDigest !== existing.metadata.credentialManifestDigest) {
      throw new Error("content credential verification does not match existing final asset metadata");
    }
    const assertion = buildEmbeddedAssetProvenance({
      generationRecord,
      generationRecordDigest,
      promptDisclosurePolicy: disclosure,
    });
    assertVerificationMatchesRecord(verification, generationRecord, assertion);
    return {
      finalAssetDigest,
      verification,
      credential: {
        format: existing.metadata.credentialFormat,
        signerId: existing.metadata.credentialSignerId,
        manifestDigest: existing.metadata.credentialManifestDigest,
        embeddedAt: existing.metadata.credentialEmbeddedAt,
        verifiedAt: existing.metadata.credentialVerifiedAt,
      },
      finalizedAt: existing.metadata.finalizedAt,
      reusedFinalAsset: true,
    };
  }

  const assertion = buildEmbeddedAssetProvenance({
    generationRecord,
    generationRecordDigest,
    promptDisclosurePolicy: disclosure,
  });

  setPhase("credential_signing");
  const embedded = normalizeCredentialEmbedResult(await signer.embed({
    bytes: generated.bytes,
    mediaType: generated.mediaType,
    assertion,
  }));
  if (embedded.signerId !== signer.signerId || embedded.format !== signer.format) {
    throw new Error("content credential embed result does not match signer");
  }

  setPhase("credential_verification");
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
  const finalizedAt = now();
  setPhase("storage_finalization");
  await objects.putImmutable(job.outputObjectRef, embedded.bytes, finalAssetDigest, {
    kind: "credentialed_generated_media",
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
    generationRecordObjectRef,
    generationRecordDigest,
    providerOutputDigest,
    credentialFormat: embedded.format,
    credentialSignerId: embedded.signerId,
    credentialManifestDigest: embedded.manifestDigest,
    credentialEmbeddedAt: embedded.embeddedAt,
    credentialVerifiedAt: verification.verifiedAt,
    finalizedAt,
  });
  return {
    finalAssetDigest,
    verification,
    credential: {
      format: embedded.format,
      signerId: embedded.signerId,
      manifestDigest: embedded.manifestDigest,
      embeddedAt: embedded.embeddedAt,
      verifiedAt: verification.verifiedAt,
    },
    finalizedAt,
    reusedFinalAsset: false,
  };
}

async function verifyGenerationAttemptLink({ objects, generationStored, generationRecord }) {
  const metadata = generationStored.metadata ?? {};
  const attemptObjectRef = metadata.generationAttemptObjectRef;
  const attemptDigest = metadata.generationAttemptDigest;
  if (attemptObjectRef === undefined && attemptDigest === undefined) return null;
  if (typeof attemptObjectRef !== "string" || typeof attemptDigest !== "string") {
    throw new Error("stored generation record has incomplete generation attempt linkage");
  }
  const loaded = await loadGenerationAttempt(objects, attemptObjectRef);
  if (loaded === null) throw new Error("stored generation record references a missing generation attempt");
  if (loaded.digest !== attemptDigest) throw new Error("stored generation attempt digest does not match generation record metadata");
  const jobDigest = await assetGenerationJobDigest(generationRecord.job);
  if (loaded.attempt.jobId !== generationRecord.jobId
    || loaded.attempt.jobDigest !== jobDigest
    || loaded.attempt.providerRequestDigest !== generationRecord.providerRequestDigest
    || loaded.attempt.providerOutputDigest !== generationRecord.providerOutputDigest) {
    throw new Error("stored generation attempt does not match generation record provenance");
  }
  const output = await objects.get(loaded.attempt.providerOutputObjectRef);
  if (output === null) throw new Error("stored generation attempt references a missing staged provider output");
  const outputDigest = await sha256(storedBytes(output));
  if (output.digest !== loaded.attempt.providerOutputDigest || outputDigest !== loaded.attempt.providerOutputDigest) {
    throw new Error("staged provider output digest does not match generation attempt");
  }
  return Object.freeze({
    attempt: loaded.attempt,
    attemptObjectRef,
    attemptDigest,
    providerOutputObjectRef: loaded.attempt.providerOutputObjectRef,
  });
}

export async function executeCredentialedAssetGenerationJob({
  infra,
  provider,
  credentialSigner,
  job: rawJob,
  attemptNumber = 1,
  promptDisclosurePolicy = { mode: "digest_only", authorizationRef: null },
  now = () => new Date().toISOString(),
}) {
  let phase = "validation";
  let providerName = null;
  let modelName = null;
  let providerOutputDurable = false;
  const setPhase = (value) => { phase = value; };
  try {
    requireInfraCapabilities(infra, "objects");
    const objects = infra.objects;
    const job = normalizeAssetGenerationJob(rawJob);
    const checkedAttemptNumber = assertPositiveAttemptNumber(attemptNumber);
    const checkedProvider = assertWitnessedMediaGenerationProvider(provider);
    providerName = checkedProvider.providerId;
    const signer = assertContentCredentialSigner(credentialSigner);
    const disclosure = normalizePromptDisclosurePolicy(promptDisclosurePolicy);
    const jobDigest = await assetGenerationJobDigest(job);

    if (!checkedProvider.capabilities.includes(job.assetKind)) {
      throw new AssetGenerationError(`provider ${checkedProvider.providerId} does not support ${job.assetKind}`, {
        phase: "validation",
        category: "unsupported_capability",
        provider: checkedProvider.providerId,
      });
    }

    phase = "reference_loading";
    const referenceObjects = await resolveReferenceObjects(objects, job.referenceObjectRefs);

    let staged = await loadStagedProviderOutput(objects, {
      job,
      jobDigest,
      throughAttemptNumber: checkedAttemptNumber,
    });
    if (staged === null) {
      phase = "provider_generation";
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
      providerName = witnessed.result.provider;
      modelName = witnessed.result.model;

      phase = "provider_output_staging";
      staged = await stageProviderOutput({
        objects,
        job,
        jobDigest,
        attemptNumber: checkedAttemptNumber,
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
    const finalized = await finalizeCredentialedAsset({
      objects,
      signer,
      job,
      staged,
      generationRecord: generation.generationRecord,
      generationRecordObjectRef: generation.generationRecordObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      providerOutputDigest: generation.providerOutputDigest,
      disclosure,
      now,
      setPhase,
    });

    phase = "storage_finalization";
    const generated = staged.witnessed.result;
    const receipt = normalizeStoredAssetReceipt({
      receiptVersion: STORED_ASSET_RECEIPT_VERSION,
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
      providerOutputDigest: generation.providerOutputDigest,
      credential: finalized.credential,
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
    });

    return {
      receipt,
      receiptObjectRef: persistedReceipt.objectRef,
      receiptDigest: persistedReceipt.digest,
      generationRecord: generation.generationRecord,
      generationRecordObjectRef: generation.generationRecordObjectRef,
      generationRecordDigest: generation.generationRecordDigest,
      generationAttempt: staged.attempt,
      generationAttemptObjectRef: staged.objectRef,
      generationAttemptDigest: staged.digest,
      providerOutputObjectRef: staged.attempt.providerOutputObjectRef,
      providerOutputDigest: generation.providerOutputDigest,
      providerOutputResumed: staged.resumed,
      finalAssetDigest: finalized.finalAssetDigest,
      finalAssetReused: finalized.reusedFinalAsset,
      verification: finalized.verification,
    };
  } catch (error) {
    throw toAssetGenerationError(error, {
      phase,
      provider: providerName,
      model: modelName,
      providerOutputDurable,
    });
  }
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
  const generationRecord = normalizeGenerationRecord(await parseStoredJson(
    generationStored,
    "stored generation record",
  ));
  await validateGenerationRecordDigests(generationRecord);
  if (generationRecord.providerOutputDigest !== receipt.providerOutputDigest) {
    throw new Error("stored asset receipt provider output digest does not match generation record");
  }
  const generationAttempt = await verifyGenerationAttemptLink({
    objects,
    generationStored,
    generationRecord,
  });

  const assetStored = await objects.get(receipt.objectRef);
  if (assetStored === null) throw new Error("stored asset receipt references a missing final asset");
  const finalDigest = await sha256(storedBytes(assetStored));
  if (assetStored.digest !== receipt.sha256 || finalDigest !== receipt.sha256) {
    throw new Error("final asset digest does not match stored asset receipt");
  }

  const verification = normalizeCredentialVerification(await signer.verify({
    bytes: storedBytes(assetStored),
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
    generationAttempt,
    verification,
  });
}
