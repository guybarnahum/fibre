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

const COMPANION_ID_PATTERN = /^mvis_[0-9a-f]{64}$/;
const PHOTO_PROMPT_MIN_BYTES = 700;
const PHOTO_PROMPT_REQUIRED_SECTIONS = Object.freeze([
  "MEMORY MOMENT",
  "THREAD CONTINUITY",
  "SCENE",
  "EMOTIONAL TEXTURE",
  "COMPOSITION",
  "GROUNDING",
  "TRUTH BOUNDARY",
  "REGENERATION",
]);
const MEMORY_CACHE_LOCATOR_SCHEMES = new Set(["cache", "s3"]);

export const MEMORY_VISUAL_COMPANION_POLICY = Object.freeze({
  id: "memory_visual_companion",
  version: "1",
});

export const MEMORY_PHOTO_PROMPT_POLICY = Object.freeze({
  id: "memory_photo_prompt",
  version: "1",
});

export const MEMORY_VISUAL_STATUSES = Object.freeze([
  "pending_generation",
  "available",
  "unavailable_with_reason",
]);

export const MEMORY_VISUAL_REPRESENTATION_KINDS = Object.freeze([
  "synthetic_reconstruction",
  "captured_photo",
]);

export const MEMORY_VISUAL_TRUTH_STATUSES = Object.freeze([
  "synthetic_representation_not_historical_evidence",
  "captured_source_evidence",
]);

function assertCompanionId(name, value) {
  assertNonEmpty(name, value);
  if (!COMPANION_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be mvis_ followed by 64 lowercase hex characters`);
  }
}

function assertPhotoPrompt(name, value) {
  assertNonEmpty(name, value);
  if (Buffer.byteLength(value, "utf8") < PHOTO_PROMPT_MIN_BYTES) {
    throw new TypeError(`${name} must be a rich layered prompt of at least ${PHOTO_PROMPT_MIN_BYTES} UTF-8 bytes`);
  }
  for (const section of PHOTO_PROMPT_REQUIRED_SECTIONS) {
    if (!value.includes(`\n${section}\n`)) {
      throw new TypeError(`${name} must contain the ${section} section`);
    }
  }
}

function assertCacheLocator(name, value) {
  assertNonEmpty(name, value);
  const match = /^([a-z][a-z0-9+.-]*):\/\/.+$/i.exec(value);
  if (match === null || !MEMORY_CACHE_LOCATOR_SCHEMES.has(match[1].toLowerCase())) {
    throw new TypeError(`${name} must use a supported opaque cache locator scheme`);
  }
}

export function memoryVisualCompanionId(threadId, memoryRef) {
  assertId("threadId", threadId);
  assertId("memoryRef", memoryRef);
  return `mvis_${sha256(canonicalJson({ threadId, memoryRef }))}`;
}

export function memoryPhotoPromptDigest(photoPrompt) {
  assertPhotoPrompt("memory photo prompt", photoPrompt);
  return `sha256:${sha256(photoPrompt)}`;
}

export function buildMemoryPhotoPrompt({
  threadId,
  memoryRef,
  memorySummary,
  sourceReferences,
  createdFrom,
}) {
  assertId("threadId", threadId);
  assertId("memoryRef", memoryRef);
  if (memorySummary !== undefined && memorySummary !== null) {
    assertNonEmpty("memorySummary", memorySummary);
  }
  assertStringArray("sourceReferences", sourceReferences);
  if (sourceReferences.length === 0) {
    throw new TypeError("memory photo prompt sourceReferences must not be empty");
  }
  assertNonEmpty("createdFrom", createdFrom);

  const memoryMoment = memorySummary === undefined || memorySummary === null
    ? `This is a legacy memory reference (${memoryRef}) whose persisted record does not yet contain an admitted narrative summary. Preserve the photo obligation, but do not invent specific people, place, date, action, dialogue, or outcome merely to fill the missing context. A later append-only revision may enrich this prompt from newly admitted evidence before rendering.`
    : `Reconstruct the lived moment summarized by the authoritative memory record: “${memorySummary}” Treat the summary as a semantic anchor, not as license to add unsupported biographical facts.`;

  return `MEMORY PHOTO SOURCE OF TRUTH v${MEMORY_PHOTO_PROMPT_POLICY.version}\n\nMEMORY MOMENT\n${memoryMoment}\n\nTHREAD CONTINUITY\nDepict the same persistent Thread as the memory owner. Preserve visual continuity only from identity or embodiment assertions whose exact references are explicitly bound into this companion lineage. If no such assertion is bound, keep appearance visually noncommittal rather than consulting mutable current identity or inventing continuity. Do not substitute a profession, role, stereotype, demographic guess, or generic stock character for the person. Do not silently use mutable current identity when the memory requires an earlier self.\n\nSCENE\nRender one specific, plausible lived instant rather than a montage, infographic, poster, or symbolic illustration. Prefer concrete spatial relationships, ordinary environmental detail, and a moment that could have been photographed by someone present. Do not add events or participants that are not grounded by the memory and its source references.\n\nEMOTIONAL TEXTURE\nExpress the remembered emotional texture through posture, attention, distance, gesture, light, and environment rather than labels or theatrical facial exaggeration. Preserve ambiguity where the evidence is ambiguous.\n\nCOMPOSITION\nUse a naturalistic candid-photograph language: coherent perspective, believable anatomy, physically plausible light, restrained depth of field, and scene-level detail. No captions, speech bubbles, watermarks, UI chrome, visible metadata, or explanatory text. Avoid glamour portraiture unless the memory itself calls for it.\n\nGROUNDING\nThread: ${threadId}. Memory: ${memoryRef}. Creation class: ${createdFrom}. Immutable/source references: ${sourceReferences.join(", ")}. At render time, only evidence explicitly bound to this lineage may supply identity, embodiment, relationship, geography, or historical detail. Missing detail must remain visually noncommittal rather than being fabricated.\n\nTRUTH BOUNDARY\nThis prompt describes a synthetic reconstruction of a memory. The resulting image is not historical photographic evidence and must remain labeled synthetic_representation_not_historical_evidence. A real captured photograph, if later admitted, is a different evidentiary representation and must retain captured_source_evidence truth status.\n\nREGENERATION\nThis layered prompt and its digest are the durable source of truth for a synthetic memory photo revision. The rendered image is a replaceable cache. If the cached object is missing, corrupt, expired, or deliberately invalidated, regenerate from this exact prompt and the same bound source references, append a new companion revision, and never rewrite prior prompt, provenance, truth status, or cache history.`;
}

export function normalizeMemoryVisualCompanion(candidate) {
  assertPlainObject("memory visual companion", candidate);
  assertExactKeys("memory visual companion", candidate, [
    "companionId",
    "revision",
    "memoryRef",
    "threadId",
    "status",
    "representationKind",
    "truthStatus",
    "photoPrompt",
    "photoPromptDigest",
    "assetRef",
    "visibility",
    "sourceReferences",
    "provenance",
    "recordedAt",
    "supersedesRevision",
    "unavailableReason",
  ]);
  assertCompanionId("memory visual companion.companionId", candidate.companionId);
  assertFiniteNumber("memory visual companion.revision", candidate.revision, {
    integer: true,
    minimum: 1,
  });
  assertId("memory visual companion.memoryRef", candidate.memoryRef);
  assertId("memory visual companion.threadId", candidate.threadId);
  if (candidate.companionId !== memoryVisualCompanionId(candidate.threadId, candidate.memoryRef)) {
    throw new TypeError("memory visual companion ID is not deterministic for its Thread/memory reference");
  }
  if (!MEMORY_VISUAL_STATUSES.includes(candidate.status)) {
    throw new TypeError("memory visual companion.status is invalid");
  }
  if (!MEMORY_VISUAL_REPRESENTATION_KINDS.includes(candidate.representationKind)) {
    throw new TypeError("memory visual companion.representationKind is invalid");
  }
  if (!MEMORY_VISUAL_TRUTH_STATUSES.includes(candidate.truthStatus)) {
    throw new TypeError("memory visual companion.truthStatus is invalid");
  }
  assertPhotoPrompt("memory visual companion.photoPrompt", candidate.photoPrompt);
  if (candidate.photoPromptDigest !== memoryPhotoPromptDigest(candidate.photoPrompt)) {
    throw new TypeError("memory visual companion.photoPromptDigest does not match its canonical prompt");
  }
  if (candidate.visibility !== "public" && candidate.visibility !== "restricted" && candidate.visibility !== "private") {
    throw new TypeError("memory visual companion.visibility is invalid");
  }
  assertStringArray("memory visual companion.sourceReferences", candidate.sourceReferences);
  if (candidate.sourceReferences.length === 0) {
    throw new TypeError("memory visual companion.sourceReferences must not be empty");
  }
  if (new Set(candidate.sourceReferences).size !== candidate.sourceReferences.length) {
    throw new TypeError("memory visual companion.sourceReferences must be unique");
  }
  candidate.sourceReferences.forEach((reference, index) =>
    assertId(`memory visual companion.sourceReferences[${index}]`, reference));
  assertPlainObject("memory visual companion.provenance", candidate.provenance);
  assertExactKeys("memory visual companion.provenance", candidate.provenance, [
    "policy",
    "createdFrom",
    "generatedBy",
  ]);
  assertPlainObject("memory visual companion.provenance.policy", candidate.provenance.policy);
  assertExactKeys("memory visual companion.provenance.policy", candidate.provenance.policy, ["id", "version"]);
  if (
    candidate.provenance.policy.id !== MEMORY_VISUAL_COMPANION_POLICY.id ||
    candidate.provenance.policy.version !== MEMORY_VISUAL_COMPANION_POLICY.version
  ) {
    throw new TypeError("memory visual companion provenance policy is unsupported");
  }
  assertNonEmpty("memory visual companion.provenance.createdFrom", candidate.provenance.createdFrom);
  assertNonEmpty("memory visual companion.provenance.generatedBy", candidate.provenance.generatedBy);
  assertIsoTimestamp("memory visual companion.recordedAt", candidate.recordedAt);

  if (candidate.revision === 1) {
    if (candidate.supersedesRevision !== undefined) {
      throw new TypeError("memory visual companion revision 1 cannot supersede a revision");
    }
  } else {
    assertFiniteNumber("memory visual companion.supersedesRevision", candidate.supersedesRevision, {
      integer: true,
      minimum: 1,
    });
    if (candidate.supersedesRevision !== candidate.revision - 1) {
      throw new TypeError("memory visual companion must supersede its immediate predecessor");
    }
  }

  if (candidate.status === "available") {
    assertCacheLocator("memory visual companion.assetRef", candidate.assetRef);
    if (candidate.unavailableReason !== undefined) {
      throw new TypeError("available memory visual companion cannot have unavailableReason");
    }
  } else if (candidate.status === "pending_generation") {
    if (candidate.assetRef !== null) {
      throw new TypeError("pending memory visual companion assetRef must be null");
    }
    if (candidate.representationKind !== "synthetic_reconstruction") {
      throw new TypeError("pending memory visual companion must be a synthetic reconstruction");
    }
    if (candidate.truthStatus !== "synthetic_representation_not_historical_evidence") {
      throw new TypeError("pending synthetic memory visual must not claim historical evidence");
    }
    if (candidate.unavailableReason !== undefined) {
      throw new TypeError("pending memory visual companion cannot have unavailableReason");
    }
  } else {
    if (candidate.assetRef !== null) {
      throw new TypeError("unavailable memory visual companion assetRef must be null");
    }
    assertNonEmpty("memory visual companion.unavailableReason", candidate.unavailableReason);
  }

  if (
    candidate.representationKind === "synthetic_reconstruction" &&
    candidate.truthStatus !== "synthetic_representation_not_historical_evidence"
  ) {
    throw new TypeError("synthetic reconstruction cannot be historical photo evidence");
  }
  if (
    candidate.representationKind === "captured_photo" &&
    candidate.truthStatus !== "captured_source_evidence"
  ) {
    throw new TypeError("captured photo must retain captured-source truth status");
  }

  const normalized = structuredClone(candidate);
  if (normalized.supersedesRevision === undefined) delete normalized.supersedesRevision;
  if (normalized.unavailableReason === undefined) delete normalized.unavailableReason;
  return normalized;
}

export function memoryVisualCompanionDigest(candidate) {
  return `sha256:${sha256(canonicalJson(normalizeMemoryVisualCompanion(candidate)))}`;
}

export function memoryPhotoRequirementSatisfied(candidate) {
  const companion = normalizeMemoryVisualCompanion(candidate);
  return companion.status === "available";
}

export function assertMemoryPhotoRequirementSatisfied(candidate) {
  const companion = normalizeMemoryVisualCompanion(candidate);
  if (companion.status !== "available") {
    throw new TypeError(
      `memory ${companion.memoryRef} photo requirement remains unsatisfied: ${companion.status} is transitional and cannot be a permanent photo-less state`,
    );
  }
  return companion;
}

export function pendingMemoryVisualCompanion({
  threadId,
  memoryRef,
  recordedAt,
  eventId,
  evidenceRefs = [],
  memorySummary,
  createdFrom = "persisted_autobiographical_memory",
}) {
  assertId("threadId", threadId);
  assertId("memoryRef", memoryRef);
  assertIsoTimestamp("recordedAt", recordedAt);
  if (eventId !== undefined) assertId("eventId", eventId);
  assertStringArray("evidenceRefs", evidenceRefs);
  const sourceReferences = [...new Set([
    memoryRef,
    ...(eventId === undefined ? [] : [eventId]),
    ...evidenceRefs,
  ])];
  const photoPrompt = buildMemoryPhotoPrompt({
    threadId,
    memoryRef,
    memorySummary,
    sourceReferences,
    createdFrom,
  });
  return normalizeMemoryVisualCompanion({
    companionId: memoryVisualCompanionId(threadId, memoryRef),
    revision: 1,
    memoryRef,
    threadId,
    status: "pending_generation",
    representationKind: "synthetic_reconstruction",
    truthStatus: "synthetic_representation_not_historical_evidence",
    photoPrompt,
    photoPromptDigest: memoryPhotoPromptDigest(photoPrompt),
    assetRef: null,
    visibility: "private",
    sourceReferences,
    provenance: {
      policy: { ...MEMORY_VISUAL_COMPANION_POLICY },
      createdFrom,
      generatedBy: "fibre.world-kernel",
    },
    recordedAt,
  });
}
