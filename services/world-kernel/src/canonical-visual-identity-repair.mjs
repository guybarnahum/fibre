import {
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "./embodiment-domain.mjs";
import { assertId } from "./persistence-common.mjs";

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


function currentCanonicalPortrait(embodimentStore, threadId) {
  const portraits = embodimentStore.listCurrent(threadId).filter((entry) => (
    entry.kind === "portrait"
    && entry.representationKind === "synthetic_generation"
    && entry.visibility === "public"
  ));
  if (portraits.length !== 1) {
    throw new TypeError(`visual identity repair requires exactly one current canonical portrait for Thread ${threadId}`);
  }
  return portraits[0];
}

export function createCanonicalVisualIdentityRepairService({
  embodimentStore,
  now = () => new Date().toISOString(),
} = {}) {
  if (!embodimentStore
    || typeof embodimentStore.listCurrent !== "function"
    || typeof embodimentStore.record !== "function") {
    throw new TypeError("canonical visual identity repair requires writable Embodiment authority");
  }
  if (typeof now !== "function") throw new TypeError("canonical visual identity repair now must be a function");

  return Object.freeze({
    repair({
      threadId,
      operationKey,
      correctedSpecification,
      reason,
      evidenceReferences = [],
    } = {}) {
      assertId("threadId", threadId);
      assertId("operationKey", operationKey);
      if (!Array.isArray(evidenceReferences)) {
        throw new TypeError("visual identity repair evidenceReferences must be an array");
      }

      const current = currentCanonicalPortrait(embodimentStore, threadId);
      const rootRef = current.asset?.referenceObjectRef ?? null;
      if (typeof rootRef !== "string" || rootRef === "") {
        throw new TypeError("visual identity repair requires the admitted canonical root");
      }

      const repaired = repairCanonicalVisualIdentity({
        currentEmbodiment: current,
        correctedSpecification,
        reason,
        evidenceReferences: [...new Set([...current.sourceReferences, ...evidenceReferences])],
        recordedAt: now(),
      });
      const embodiment = embodimentStore.record(repaired);

      return Object.freeze({
        threadId,
        operationKey,
        previous: Object.freeze({
          revision: current.revision,
          specificationDigest: current.specificationDigest,
          referenceObjectRef: rootRef,
        }),
        embodiment,
      });
    },
  });
}
