import {
  ASSET_GENERATION_JOB_VERSION,
  normalizeAssetGenerationJob,
  normalizeStoredAssetReceipt,
} from "#services/asset-generator/src/index.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "./visual-identity-reference-domain.mjs";

export const CANONICAL_VISUAL_IDENTITY_PROVIDER_PROFILE = "openai-gpt-image-2-medium-v1";
export const CANONICAL_VISUAL_IDENTITY_ROLE = "canonical_visual_identity_reference";
const MIN_CANONICAL_IDENTITY_BRIEF_BYTES = 240;

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values)];
}

function richEnough(embodiment) {
  const text = `${embodiment.specification.subject.description}\n${embodiment.specification.description}`;
  if (Buffer.byteLength(text, "utf8") < MIN_CANONICAL_IDENTITY_BRIEF_BYTES) {
    throw new TypeError(
      `canonical visual identity specification must contain at least ${MIN_CANONICAL_IDENTITY_BRIEF_BYTES} UTF-8 bytes of concrete appearance detail`,
    );
  }
}

export function canonicalVisualIdentityBrief(embodimentCandidate) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (embodiment.kind !== "portrait") throw new TypeError("canonical visual identity generation requires portrait embodiment");
  if (embodiment.representationKind !== "synthetic_generation") {
    throw new TypeError("text-only canonical visual identity generation requires synthetic_generation embodiment");
  }
  richEnough(embodiment);

  return Object.freeze({
    description: [
      "Create the single canonical visual-identity reference portrait for this Fibre Thread.",
      `Reference-age convention: depict the person at ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} years old. This is a normalization anchor for identity continuity, not a claim about the Thread's current or historical age.`,
      `Canonical subject identity specification: ${embodiment.specification.subject.description}`,
      `Canonical appearance and rendering specification: ${embodiment.specification.description}`,
      "The result will become the immutable reference image used to preserve this same person's likeness across later images at different ages, expressions, clothing, places, and life events.",
    ].join(" "),
    constraints: [
      "Generate from the supplied canonical identity text only; there is intentionally no prior reference image for this one root image.",
      "Depict exactly one person and preserve every concrete facial, hair, skin, body, asymmetry, and distinctive-mark detail stated in the identity specification.",
      `Depict the person at the normalized reference age of ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}, without implying that this image is a historical event or current photograph.`,
      "Use a neutral head-and-shoulders reference composition, mostly front-facing, even natural lighting, ordinary lens perspective, and enough detail to support later identity-preserving image generation.",
      "Use a neutral natural expression; avoid strong emotion, dramatic pose, stylization, glamour retouching, cinematic lighting, or fashion-editorial treatment.",
      "Keep hairline, ears, jaw, face proportions, eye spacing, nose geometry, mouth shape, skin detail, and any stated marks clearly legible as identity features.",
      "Do not invent ancestry, ethnicity, scars, tattoos, disabilities, accessories, or other identity-defining traits that are absent from the specification.",
      "Do not add text, labels, watermarks, cards, borders, signatures, or document graphics.",
      "This generated image establishes a synthetic visual reference for the Thread; it is not documentary, historical, autobiographical, or captured-source evidence.",
    ],
  });
}

export function planCanonicalVisualIdentityGeneration({
  embodiment: embodimentCandidate,
  requestedAt,
  providerProfile = CANONICAL_VISUAL_IDENTITY_PROVIDER_PROFILE,
} = {}) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  assertIsoTimestamp("requestedAt", requestedAt);
  if (embodiment.kind !== "portrait") throw new TypeError("canonical visual identity generation requires portrait embodiment");
  if (embodiment.status !== "pending_generation" || embodiment.asset !== null) {
    throw new TypeError("canonical visual identity generation requires pending_generation embodiment without an asset");
  }
  const brief = canonicalVisualIdentityBrief(embodiment);
  const identity = sha256(canonicalJson({
    embodimentId: embodiment.embodimentId,
    embodimentRevision: embodiment.revision,
    specificationDigest: embodiment.specificationDigest,
    referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  })).slice(0, 32);
  const outputObjectRef = `visual_identity_reference_${identity}`;
  const inputReferences = unique([
    embodiment.embodimentId,
    ...embodiment.sourceReferences,
    ...embodiment.permissionReferences,
  ]);

  return normalizeAssetGenerationJob({
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: `asset_job_visual_identity_${identity}`,
    assetKind: "image",
    role: CANONICAL_VISUAL_IDENTITY_ROLE,
    variant: `reference-age-${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}`,
    brief,
    inputReferences,
    referenceObjectRefs: [],
    outputObjectRef,
    receiptObjectRef: `asset_receipt_visual_identity_${identity}`,
    requestedAt,
    providerProfile,
    context: {
      kind: "thread_embodiment_canonical_visual_identity",
      threadId: embodiment.threadId,
      embodimentId: embodiment.embodimentId,
      embodimentRevision: embodiment.revision,
      specificationDigest: embodiment.specificationDigest,
      referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
    },
  });
}

export function bindVerifiedCanonicalVisualIdentityProof({
  embodiment: embodimentCandidate,
  proof,
  recordedAt,
} = {}) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  const receipt = normalizeStoredAssetReceipt(proof?.receipt);
  const job = normalizeAssetGenerationJob(proof?.generationRecord?.job);
  assertIsoTimestamp("recordedAt", recordedAt);
  if (proof?.verification?.valid !== true) {
    throw new TypeError("canonical visual identity completion requires verified credentialed generation proof");
  }
  if (embodiment.kind !== "portrait" || embodiment.status !== "pending_generation" || embodiment.asset !== null) {
    throw new TypeError("canonical visual identity completion requires pending portrait embodiment");
  }
  if (receipt.status !== "ready" || receipt.assetKind !== "image" || receipt.role !== CANONICAL_VISUAL_IDENTITY_ROLE) {
    throw new TypeError("canonical visual identity completion requires a ready canonical reference image receipt");
  }
  if (
    job.jobId !== receipt.jobId
    || job.outputObjectRef !== receipt.objectRef
    || job.role !== receipt.role
    || job.assetKind !== receipt.assetKind
    || canonicalJson(job.inputReferences) !== canonicalJson(receipt.inputReferences)
    || canonicalJson(job.context) !== canonicalJson(receipt.context)
  ) {
    throw new TypeError("canonical visual identity proof job does not match the stored receipt");
  }
  if (job.referenceObjectRefs.length !== 0) {
    throw new TypeError("canonical visual identity root image must have been generated without reference images");
  }
  const context = receipt.context;
  if (
    context?.kind !== "thread_embodiment_canonical_visual_identity"
    || context.threadId !== embodiment.threadId
    || context.embodimentId !== embodiment.embodimentId
    || context.embodimentRevision !== embodiment.revision
    || context.specificationDigest !== embodiment.specificationDigest
    || context.referenceAgeYears !== CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS
  ) {
    throw new TypeError("canonical visual identity receipt does not match the pending embodiment authority");
  }
  if (Date.parse(recordedAt) < Date.parse(receipt.completedAt)) {
    throw new TypeError("canonical visual identity embodiment cannot be recorded before generation completed");
  }

  return normalizeEmbodimentRepresentation({
    ...embodiment,
    revision: embodiment.revision + 1,
    supersedesRevision: embodiment.revision,
    respecification: null,
    status: "available",
    unavailableReason: null,
    asset: {
      assetRef: `asset://${receipt.objectRef}`,
      referenceObjectRef: receipt.objectRef,
      sha256: receipt.sha256,
      mediaType: receipt.mediaType,
      width: receipt.width,
      height: receipt.height,
      durationMs: null,
    },
    recordedAt,
  });
}
