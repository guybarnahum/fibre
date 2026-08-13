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

export const MEMORY_VISUAL_COMPANION_POLICY = Object.freeze({
  id: "memory_visual_companion",
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

export function memoryVisualCompanionId(threadId, memoryRef) {
  assertId("threadId", threadId);
  assertId("memoryRef", memoryRef);
  return `mvis_${sha256(canonicalJson({ threadId, memoryRef }))}`;
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
    assertNonEmpty("memory visual companion.assetRef", candidate.assetRef);
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

export function pendingMemoryVisualCompanion({
  threadId,
  memoryRef,
  recordedAt,
  eventId,
  evidenceRefs = [],
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
  return normalizeMemoryVisualCompanion({
    companionId: memoryVisualCompanionId(threadId, memoryRef),
    revision: 1,
    memoryRef,
    threadId,
    status: "pending_generation",
    representationKind: "synthetic_reconstruction",
    truthStatus: "synthetic_representation_not_historical_evidence",
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
