import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const EMBODIMENT_KINDS = Object.freeze(["portrait", "voice"]);
export const EMBODIMENT_REPRESENTATION_KINDS = Object.freeze([
  "synthetic_generation",
  "captured_source",
  "human_source_derivative",
]);
export const EMBODIMENT_TRUTH_STATUSES = Object.freeze([
  "synthetic_representation_not_historical_evidence",
  "captured_source_evidence",
  "source_derivative_not_historical_evidence",
]);
export const EMBODIMENT_RIGHTS_BASES = Object.freeze([
  "generated_no_human_source",
  "thread_self_owned",
  "explicit_consent",
  "public_domain_source",
]);
export const EMBODIMENT_STATUSES = Object.freeze([
  "pending_generation",
  "available",
  "unavailable_with_reason",
]);
export const EMBODIMENT_VISIBILITIES = Object.freeze(["public", "restricted", "private"]);

const ASSET_REF_PATTERN = /^(?:cache|asset):\/\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]+$/;
const MIN_SUBJECT_DESCRIPTION_BYTES = 40;
const MIN_RENDER_DESCRIPTION_BYTES = 24;
const MAX_CANONICAL_DESCRIPTION_BYTES = 4000;

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function assertBoundedDescription(name, value, { minimum, maximum }) {
  assertNonEmpty(name, value);
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < minimum) throw new TypeError(`${name} must contain at least ${minimum} UTF-8 bytes`);
  if (bytes > maximum) throw new TypeError(`${name} exceeds ${maximum} UTF-8 bytes`);
}

function normalizeRefs(name, refs, { allowEmpty = false } = {}) {
  assertStringArray(name, refs);
  if (!allowEmpty && refs.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(refs).size !== refs.length) throw new TypeError(`${name} must be unique`);
  refs.forEach((ref, index) => assertId(`${name}[${index}]`, ref));
  return [...refs];
}

function normalizeSubject(value) {
  assertPlainObject("embodiment.specification.subject", value);
  assertExactKeys("embodiment.specification.subject", value, ["partyId", "description"]);
  assertId("embodiment.specification.subject.partyId", value.partyId);
  assertBoundedDescription("embodiment.specification.subject.description", value.description, {
    minimum: MIN_SUBJECT_DESCRIPTION_BYTES,
    maximum: MAX_CANONICAL_DESCRIPTION_BYTES,
  });
  return { partyId: value.partyId, description: value.description };
}

function normalizeSpecification(value, kind) {
  assertPlainObject("embodiment.specification", value);
  assertExactKeys("embodiment.specification", value, ["subject", "method", "description", "model"]);
  const subject = normalizeSubject(value.subject);
  for (const required of ["method", "description", "model"]) {
    assertNonEmpty(`embodiment.specification.${required}`, value[required]);
  }
  assertBoundedDescription("embodiment.specification.description", value.description, {
    minimum: MIN_RENDER_DESCRIPTION_BYTES,
    maximum: MAX_CANONICAL_DESCRIPTION_BYTES,
  });
  if (kind === "portrait" && /\bvoice\b/i.test(value.method)) {
    throw new TypeError("portrait specification method cannot describe voice acquisition");
  }
  if (kind === "voice" && /\bportrait\b|\bimage\b/i.test(value.method)) {
    throw new TypeError("voice specification method cannot describe portrait/image acquisition");
  }
  return { subject, method: value.method, description: value.description, model: value.model };
}

function normalizeRespecification(value, revision) {
  if (value === null) return null;
  if (revision === 1) throw new TypeError("embodiment revision 1 cannot carry respecification");
  assertPlainObject("embodiment.respecification", value);
  assertExactKeys("embodiment.respecification", value, ["reason", "priorSpecificationDigest", "evidenceReferences"]);
  assertBoundedDescription("embodiment.respecification.reason", value.reason, { minimum: 16, maximum: 1000 });
  if (!/^sha256:[0-9a-f]{64}$/.test(value.priorSpecificationDigest)) {
    throw new TypeError("embodiment.respecification.priorSpecificationDigest is invalid");
  }
  return {
    reason: value.reason,
    priorSpecificationDigest: value.priorSpecificationDigest,
    evidenceReferences: normalizeRefs("embodiment.respecification.evidenceReferences", value.evidenceReferences),
  };
}

function normalizeAsset(value, kind, status) {
  if (value === null) {
    if (status === "available") throw new TypeError("available embodiment requires an asset");
    return null;
  }
  assertPlainObject("embodiment.asset", value);
  assertExactKeys("embodiment.asset", value, [
    "assetRef", "referenceObjectRef", "sha256", "mediaType", "width", "height", "durationMs",
  ]);
  assertNonEmpty("embodiment.asset.assetRef", value.assetRef);
  if (!ASSET_REF_PATTERN.test(value.assetRef)) throw new TypeError("embodiment.asset.assetRef must be an opaque cache:// or asset:// locator");
  const referenceObjectRef = value.referenceObjectRef ?? null;
  if (referenceObjectRef !== null) assertId("embodiment.asset.referenceObjectRef", referenceObjectRef);
  if (!/^sha256:[0-9a-f]{64}$/.test(value.sha256)) throw new TypeError("embodiment.asset.sha256 is invalid");
  assertNonEmpty("embodiment.asset.mediaType", value.mediaType);
  const normalized = {
    assetRef: value.assetRef,
    referenceObjectRef,
    sha256: value.sha256,
    mediaType: value.mediaType,
  };
  if (kind === "portrait") {
    if (!value.mediaType.startsWith("image/")) throw new TypeError("portrait embodiment asset must use an image media type");
    assertFiniteNumber("embodiment.asset.width", value.width, { integer: true, minimum: 1 });
    assertFiniteNumber("embodiment.asset.height", value.height, { integer: true, minimum: 1 });
    if (value.durationMs !== null) throw new TypeError("portrait embodiment cannot have durationMs");
    normalized.width = value.width;
    normalized.height = value.height;
    normalized.durationMs = null;
  } else {
    if (!value.mediaType.startsWith("audio/")) throw new TypeError("voice embodiment asset must use an audio media type");
    assertFiniteNumber("embodiment.asset.durationMs", value.durationMs, { integer: true, minimum: 1 });
    if (value.width !== null || value.height !== null) throw new TypeError("voice embodiment cannot have image dimensions");
    normalized.width = null;
    normalized.height = null;
    normalized.durationMs = value.durationMs;
  }
  return normalized;
}

export function embodimentId(seed) {
  return `emb_${sha256(canonicalJson(seed))}`;
}

export function embodimentSpecificationDigest(specification) {
  assertPlainObject("embodiment.specification", specification);
  return `sha256:${sha256(canonicalJson(specification))}`;
}

export function embodimentSubjectDigest(specification) {
  assertPlainObject("embodiment.specification", specification);
  assertPlainObject("embodiment.specification.subject", specification.subject);
  return `sha256:${sha256(canonicalJson(specification.subject))}`;
}

export function normalizeEmbodimentRepresentation(value) {
  assertPlainObject("embodiment", value);
  assertExactKeys("embodiment", value, [
    "embodimentId", "revision", "threadId", "kind", "representationKind", "truthStatus", "rightsBasis",
    "permissionReferences", "sourceReferences", "specification", "specificationDigest", "respecification",
    "status", "unavailableReason", "asset", "visibility", "recordedAt", "supersedesRevision",
  ]);
  assertId("embodiment.embodimentId", value.embodimentId);
  assertFiniteNumber("embodiment.revision", value.revision, { integer: true, minimum: 1 });
  assertId("embodiment.threadId", value.threadId);
  assertEnum("embodiment.kind", value.kind, EMBODIMENT_KINDS);
  assertEnum("embodiment.representationKind", value.representationKind, EMBODIMENT_REPRESENTATION_KINDS);
  assertEnum("embodiment.truthStatus", value.truthStatus, EMBODIMENT_TRUTH_STATUSES);
  assertEnum("embodiment.rightsBasis", value.rightsBasis, EMBODIMENT_RIGHTS_BASES);
  assertEnum("embodiment.status", value.status, EMBODIMENT_STATUSES);
  assertEnum("embodiment.visibility", value.visibility, EMBODIMENT_VISIBILITIES);

  const permissionReferences = normalizeRefs("embodiment.permissionReferences", value.permissionReferences, { allowEmpty: true });
  const sourceReferences = normalizeRefs("embodiment.sourceReferences", value.sourceReferences);
  if (["explicit_consent", "public_domain_source"].includes(value.rightsBasis) && permissionReferences.length === 0) {
    throw new TypeError(`${value.rightsBasis} embodiment requires durable rights authority references`);
  }
  if (value.representationKind === "human_source_derivative" && !["explicit_consent", "public_domain_source"].includes(value.rightsBasis)) {
    throw new TypeError("human_source_derivative embodiment requires consent or public-domain rights basis");
  }
  if (value.representationKind === "synthetic_generation" && value.truthStatus !== "synthetic_representation_not_historical_evidence") {
    throw new TypeError("synthetic embodiment cannot claim captured historical truth");
  }
  if (value.representationKind === "captured_source" && value.truthStatus !== "captured_source_evidence") {
    throw new TypeError("captured embodiment must retain captured_source_evidence truth status");
  }
  if (value.representationKind === "human_source_derivative" && value.truthStatus !== "source_derivative_not_historical_evidence") {
    throw new TypeError("human-source derivative cannot claim captured historical truth");
  }

  const specification = normalizeSpecification(value.specification, value.kind);
  if (["generated_no_human_source", "thread_self_owned"].includes(value.rightsBasis) && specification.subject.partyId !== value.threadId) {
    throw new TypeError(`${value.rightsBasis} embodiment must depict its own Thread`);
  }
  const specificationDigest = embodimentSpecificationDigest(specification);
  if (value.specificationDigest !== specificationDigest) {
    throw new TypeError("embodiment.specificationDigest does not match canonical specification");
  }
  const respecification = normalizeRespecification(value.respecification, value.revision);

  if (value.status === "unavailable_with_reason") {
    assertNonEmpty("embodiment.unavailableReason", value.unavailableReason);
  } else if (value.unavailableReason !== null) {
    throw new TypeError("embodiment.unavailableReason is only valid when unavailable");
  }
  const asset = normalizeAsset(value.asset, value.kind, value.status);
  if (value.status !== "available" && asset !== null) throw new TypeError("non-available embodiment cannot carry an asset");
  assertIsoTimestamp("embodiment.recordedAt", value.recordedAt);

  let supersedesRevision;
  if (value.revision === 1) {
    if (value.supersedesRevision !== undefined) throw new TypeError("embodiment revision 1 cannot supersede a revision");
  } else {
    assertFiniteNumber("embodiment.supersedesRevision", value.supersedesRevision, { integer: true, minimum: 1 });
    if (value.supersedesRevision !== value.revision - 1) throw new TypeError("embodiment must supersede the immediate revision");
    supersedesRevision = value.supersedesRevision;
  }

  return {
    embodimentId: value.embodimentId,
    revision: value.revision,
    threadId: value.threadId,
    kind: value.kind,
    representationKind: value.representationKind,
    truthStatus: value.truthStatus,
    rightsBasis: value.rightsBasis,
    permissionReferences,
    sourceReferences,
    specification,
    specificationDigest,
    respecification,
    status: value.status,
    unavailableReason: value.unavailableReason,
    asset,
    visibility: value.visibility,
    recordedAt: value.recordedAt,
    ...(supersedesRevision === undefined ? {} : { supersedesRevision }),
  };
}
