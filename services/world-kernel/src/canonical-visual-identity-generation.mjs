import {
  ASSET_GENERATION_JOB_VERSION,
  normalizeAssetGenerationJob,
  normalizeStoredAssetReceipt,
} from "./presentation-asset-demand.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION,
  canonicalVisualAppearanceLayers,
} from "./canonical-visual-identity-from-physical-genome.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "./visual-identity-reference-domain.mjs";

export const CANONICAL_VISUAL_IDENTITY_PROVIDER_PROFILE = "openai-gpt-image-2-medium-v1";
export const CANONICAL_VISUAL_IDENTITY_GEOMETRY_ROLE = "canonical_visual_identity_geometry_anchor";
export const CANONICAL_VISUAL_IDENTITY_ROLE = "canonical_visual_identity_reference";
const MIN_CANONICAL_IDENTITY_BRIEF_BYTES = 240;
const UTF8 = new TextEncoder();

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values)];
}

function utf8ByteLength(value) {
  return UTF8.encode(value).byteLength;
}

function richEnough(embodiment) {
  const text = `${embodiment.specification.subject.description}\n${embodiment.specification.description}`;
  if (utf8ByteLength(text) < MIN_CANONICAL_IDENTITY_BRIEF_BYTES) {
    throw new TypeError(
      `canonical visual identity specification must contain at least ${MIN_CANONICAL_IDENTITY_BRIEF_BYTES} UTF-8 bytes of concrete appearance detail`,
    );
  }
}

function assertVerifiedGenerationProof(proof, receipt, label="canonical visual identity") {
  if (!proof?.generationRecord || proof.receipt?.sha256 !== receipt.sha256) {
    throw new TypeError(`${label} completion requires verified Fibre generation provenance`);
  }
}

function identity(embodiment, phase, extra = {}) {
  return sha256(canonicalJson({
    phase,
    appearanceLayerVersion: CANONICAL_VISUAL_APPEARANCE_LAYER_VERSION,
    embodimentId: embodiment.embodimentId,
    embodimentRevision: embodiment.revision,
    specificationDigest: embodiment.specificationDigest,
    referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
    ...extra,
  })).slice(0, 32);
}

function sourceReferences(embodiment) {
  return unique([
    embodiment.embodimentId,
    ...embodiment.sourceReferences,
    ...embodiment.permissionReferences,
  ]);
}

function layersFor(embodiment) {
  return canonicalVisualAppearanceLayers(embodiment.specification.subject.description);
}

export function requiresCanonicalVisualIdentityGeometryAnchor(embodimentCandidate) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if(layersFor(embodiment)===null){
    throw new TypeError("synthetic canonical visual identity requires layered Human Appearance specification");
  }
  return true;
}

export function canonicalVisualIdentityGeometryObjectRef(embodimentCandidate) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (layersFor(embodiment) === null) {
    throw new TypeError("canonical visual geometry anchor requires layered Human Appearance specification");
  }
  return `visual_identity_geometry_${identity(embodiment,"geometry")}`;
}

export function canonicalVisualIdentityGeometryBrief(embodimentCandidate) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (embodiment.kind !== "portrait") throw new TypeError("canonical visual identity generation requires portrait embodiment");
  if (embodiment.representationKind !== "synthetic_generation") {
    throw new TypeError("geometry-first canonical visual identity requires synthetic_generation embodiment");
  }
  richEnough(embodiment);
  const layers=layersFor(embodiment);
  if(layers===null)throw new TypeError("canonical visual geometry anchor requires layered Human Appearance specification");

  return Object.freeze({
    description:[
      "Create the geometry anchor for this Fibre Thread's canonical visual identity.",
      `Reference-age convention: depict the person at ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} years old.`,
      `Sex: ${layers.sex}.`,
      `Structural morphology: ${layers.geometryDescription}`,
      `Reference geometry state: ${layers.geometryStateDescription}`,
      "This is an intermediate identity-geometry scaffold; surface phenotype will be applied in a separate reference-conditioned pass.",
    ].join(" "),
    constraints:[
      "Lock the complete facial structure: face proportions, eyes/orbits, nose/perioral geometry, jaw/chin, body structure, facial fullness, and ordinary asymmetry.",
      "Render a neutral monochrome photographic head-and-shoulders geometry study with medium-neutral grayscale skin, brows, eyes, and simple close-to-head hair as temporary scaffolding.",
      "Do not infer ancestry, ethnicity, nationality, or a racial template from geometry.",
      "Do not introduce distinctive pigmentation, hair color, hair texture, cosmetics, facial hair, or styling; those belong to the later surface pass.",
      "Use a neutral expression, mostly frontal pose, even natural lighting, ordinary lens perspective, and no glamour or stylization.",
      "This geometry anchor is generation scaffolding only and is not the admitted canonical reference image.",
    ],
  });
}

export function canonicalVisualIdentityBrief(embodimentCandidate) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (embodiment.kind !== "portrait") throw new TypeError("canonical visual identity generation requires portrait embodiment");
  if (embodiment.representationKind !== "synthetic_generation") {
    throw new TypeError("geometry-first canonical visual identity requires synthetic_generation embodiment");
  }
  richEnough(embodiment);
  const layers=layersFor(embodiment);
  if(layers===null)throw new TypeError("synthetic canonical visual identity requires layered Human Appearance specification");

  return Object.freeze({
    description:[
      "Using the supplied geometry anchor, create the final canonical visual-identity reference portrait for this Fibre Thread.",
      `Reference-age convention: depict the person at ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} years old.`,
      `Sex: ${layers.sex}.`,
      `Inherited surface phenotype: ${layers.surfaceDescription}`,
      `Reference surface state: ${layers.surfaceStateDescription}`,
      "The geometry anchor already defines the person's facial and body structure. Apply surface phenotype and ordinary presentation without redesigning that person.",
    ].join(" "),
    constraints:[
      "Preserve the supplied geometry anchor's face shape, facial proportions, eye placement/opening, nose geometry, jaw/chin, facial fullness, and asymmetry exactly enough to remain the same recognizable person.",
      "Apply only the specified pigmentation, eye color, hair color/texture/density, skin texture, hairline, hairstyle, and facial-hair presentation.",
      "Never use pigmentation, hair, eye color, or grooming as permission to replace the anchor with a racial, ethnic, national, beauty, or stock-face template.",
      "Do not slim, symmetrize, beautify, retouch, glamourize, or fashion-model the person.",
      "Use a neutral head-and-shoulders reference composition, mostly front-facing, even daylight-balanced illumination, ordinary perspective, and a neutral natural expression.",
      "The result is a synthetic identity reference, not documentary, historical, autobiographical, or captured-source evidence.",
    ],
  });
}
export function planCanonicalVisualIdentityGeometryGeneration({
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
  const brief=canonicalVisualIdentityGeometryBrief(embodiment);
  const suffix=identity(embodiment,"geometry");
  const outputObjectRef=`visual_identity_geometry_${suffix}`;
  return normalizeAssetGenerationJob({
    jobVersion:ASSET_GENERATION_JOB_VERSION,
    jobId:`asset_job_visual_identity_geometry_${suffix}`,
    assetKind:"image",
    role:CANONICAL_VISUAL_IDENTITY_GEOMETRY_ROLE,
    variant:`geometry-reference-age-${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}`,
    brief,
    inputReferences:sourceReferences(embodiment),
    referenceObjectRefs:[],
    outputObjectRef,
    receiptObjectRef:`asset_receipt_visual_identity_geometry_${suffix}`,
    requestedAt,
    providerProfile,
    context:{
      kind:"thread_embodiment_canonical_visual_identity_geometry",
      threadId:embodiment.threadId,
      embodimentId:embodiment.embodimentId,
      embodimentRevision:embodiment.revision,
      specificationDigest:embodiment.specificationDigest,
      referenceAgeYears:CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
    },
  });
}

export function planCanonicalVisualIdentityGeneration({
  embodiment: embodimentCandidate,
  requestedAt,
  geometryAnchorObjectRef = null,
  providerProfile = CANONICAL_VISUAL_IDENTITY_PROVIDER_PROFILE,
} = {}) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  assertIsoTimestamp("requestedAt", requestedAt);
  if (embodiment.kind !== "portrait") throw new TypeError("canonical visual identity generation requires portrait embodiment");
  if (embodiment.status !== "pending_generation" || embodiment.asset !== null) {
    throw new TypeError("canonical visual identity generation requires pending_generation embodiment without an asset");
  }
  const expectedGeometry=canonicalVisualIdentityGeometryObjectRef(embodiment);
  if(geometryAnchorObjectRef!==expectedGeometry){
    throw new TypeError("canonical visual identity final pass requires its geometry anchor");
  }
  const brief = canonicalVisualIdentityBrief(embodiment);
  const suffix=identity(embodiment,"final",{geometryAnchorObjectRef});
  const outputObjectRef = `visual_identity_reference_${suffix}`;

  return normalizeAssetGenerationJob({
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: `asset_job_visual_identity_${suffix}`,
    assetKind: "image",
    role: CANONICAL_VISUAL_IDENTITY_ROLE,
    variant: `reference-age-${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}`,
    brief,
    inputReferences: sourceReferences(embodiment),
    referenceObjectRefs: [geometryAnchorObjectRef],
    outputObjectRef,
    receiptObjectRef: `asset_receipt_visual_identity_${suffix}`,
    requestedAt,
    providerProfile,
    context: {
      kind: "thread_embodiment_canonical_visual_identity",
      threadId: embodiment.threadId,
      embodimentId: embodiment.embodimentId,
      embodimentRevision: embodiment.revision,
      specificationDigest: embodiment.specificationDigest,
      referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
      geometryAnchorObjectRef,
    },
  });
}

function assertGeometryProof({embodiment,proof}){
  const receipt=normalizeStoredAssetReceipt(proof?.receipt);
  const job=normalizeAssetGenerationJob(proof?.generationRecord?.job);
  assertVerifiedGenerationProof(proof,receipt,"canonical visual geometry");
  const expectedObjectRef=canonicalVisualIdentityGeometryObjectRef(embodiment);
  if(
    receipt.status!=="ready"
    || receipt.assetKind!=="image"
    || receipt.role!==CANONICAL_VISUAL_IDENTITY_GEOMETRY_ROLE
    || receipt.objectRef!==expectedObjectRef
    || job.jobId!==receipt.jobId
    || job.outputObjectRef!==expectedObjectRef
    || job.referenceObjectRefs.length!==0
    || job.context?.kind!=="thread_embodiment_canonical_visual_identity_geometry"
    || job.context.threadId!==embodiment.threadId
    || job.context.embodimentId!==embodiment.embodimentId
    || job.context.embodimentRevision!==embodiment.revision
    || job.context.specificationDigest!==embodiment.specificationDigest
  ){
    throw new TypeError("canonical visual geometry proof does not match pending embodiment authority");
  }
  return expectedObjectRef;
}

export function bindVerifiedCanonicalVisualIdentityProof({
  embodiment: embodimentCandidate,
  proof,
  geometryProof = null,
  recordedAt,
} = {}) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  const receipt = normalizeStoredAssetReceipt(proof?.receipt);
  const job = normalizeAssetGenerationJob(proof?.generationRecord?.job);
  assertIsoTimestamp("recordedAt", recordedAt);
  assertVerifiedGenerationProof(proof, receipt);
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

  if(layersFor(embodiment)===null){
    throw new TypeError("synthetic canonical visual identity requires layered Human Appearance specification");
  }
  if(geometryProof===null)throw new TypeError("canonical visual identity completion requires geometry-anchor proof");
  const geometryObjectRef=assertGeometryProof({embodiment,proof:geometryProof});
  if(job.referenceObjectRefs.length!==1||job.referenceObjectRefs[0]!==geometryObjectRef||job.context.geometryAnchorObjectRef!==geometryObjectRef){
    throw new TypeError("canonical visual identity final pass does not reference its verified geometry anchor");
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
    ...(Object.hasOwn(embodiment, "renewal") ? { renewal:null } : {}),
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
