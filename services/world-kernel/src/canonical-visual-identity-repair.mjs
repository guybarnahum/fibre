import {
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "./embodiment-domain.mjs";

function assertRepairableCanonicalPortrait(embodiment) {
  if (
    embodiment.kind !== "portrait"
    || embodiment.representationKind !== "synthetic_generation"
    || embodiment.visibility !== "public"
    || embodiment.status !== "available"
    || embodiment.asset === null
  ) {
    throw new TypeError("visual identity repair requires the available canonical synthetic portrait");
  }
}

export function repairCanonicalVisualIdentity({
  currentEmbodiment: candidate,
  correctedSpecification,
  reason,
  evidenceReferences,
  recordedAt,
} = {}) {
  const current = normalizeEmbodimentRepresentation(candidate);
  assertRepairableCanonicalPortrait(current);

  if (typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))) {
    throw new TypeError("visual identity repair recordedAt must be an ISO timestamp");
  }
  if (Date.parse(recordedAt) < Date.parse(current.recordedAt)) {
    throw new TypeError("visual identity repair cannot predate the current embodiment");
  }

  const specificationDigest = embodimentSpecificationDigest(correctedSpecification);
  return normalizeEmbodimentRepresentation({
    ...current,
    revision: current.revision + 1,
    supersedesRevision: current.revision,
    specification: correctedSpecification,
    specificationDigest,
    respecification: {
      reason,
      priorSpecificationDigest: current.specificationDigest,
      evidenceReferences,
    },
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    recordedAt,
  });
}
