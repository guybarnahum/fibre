import {
  embodimentId,
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "./embodiment-domain.mjs";
import {
  assertExactKeys,
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";

export const GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY = "fibre_genesis_canonical_visual_identity_v1";

function normalizeSpecificationForThread(specification, threadId) {
  const candidate = normalizeEmbodimentRepresentation({
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: ["evt_genesis_visual_identity_validation"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt: "1970-01-01T00:00:00.000Z",
  });
  return candidate.specification;
}

export function normalizeGenesisCanonicalVisualIdentity(candidate, { threadId } = {}) {
  assertId("canonical visual identity threadId", threadId);
  assertPlainObject("canonicalVisualIdentity", candidate);
  assertExactKeys("canonicalVisualIdentity", candidate, ["policyRef", "specification"]);
  if (candidate.policyRef !== GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY) {
    throw new TypeError("canonicalVisualIdentity.policyRef is invalid");
  }
  return Object.freeze({
    policyRef: candidate.policyRef,
    specification: normalizeSpecificationForThread(candidate.specification, threadId),
  });
}

export function pendingCanonicalVisualIdentityEmbodiment({
  threadId,
  canonicalVisualIdentity,
  originEventRef,
  recordedAt,
} = {}) {
  assertId("threadId", threadId);
  assertId("originEventRef", originEventRef);
  const visualIdentity = normalizeGenesisCanonicalVisualIdentity(canonicalVisualIdentity, { threadId });
  const specification = visualIdentity.specification;
  return normalizeEmbodimentRepresentation({
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: [originEventRef],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt,
  });
}

function currentCanonicalPortrait(embodimentStore, threadId) {
  const portraits = embodimentStore.listCurrent(threadId).filter((entry) => (
    entry.kind === "portrait"
    && entry.representationKind === "synthetic_generation"
    && entry.visibility === "public"
  ));
  if (portraits.length > 1) {
    throw new Error(`Thread ${threadId} has multiple current public synthetic portrait embodiments`);
  }
  return portraits[0] ?? null;
}

export function createGenesisCanonicalEmbodimentMaterializer({
  worldStore,
  embodimentStore,
} = {}) {
  if (!worldStore || typeof worldStore.getThread !== "function" || typeof worldStore.listEvents !== "function") {
    throw new TypeError("Genesis canonical Embodiment materializer requires World Thread/event authority");
  }
  if (!embodimentStore || typeof embodimentStore.listCurrent !== "function" || typeof embodimentStore.record !== "function") {
    throw new TypeError("Genesis canonical Embodiment materializer requires writable Embodiment authority");
  }

  return Object.freeze({
    materialize({ threadId } = {}) {
      assertId("threadId", threadId);
      const existing = currentCanonicalPortrait(embodimentStore, threadId);
      if (existing !== null) return Object.freeze({ state: "ready", embodiment: existing, created: false });

      const thread = worldStore.getThread(threadId, { required: false });
      if (thread === null) return Object.freeze({ state: "pending", reason: "awaiting_published_genesis" });
      const canonicalVisualIdentity = thread.identity?.canonicalVisualIdentity;
      if (canonicalVisualIdentity === undefined) {
        return Object.freeze({ state: "pending", reason: "awaiting_canonical_visual_identity" });
      }
      const originEvent = worldStore.listEvents(threadId)[0];
      if (!originEvent) return Object.freeze({ state: "pending", reason: "awaiting_origin_event" });

      const embodiment = embodimentStore.record(pendingCanonicalVisualIdentityEmbodiment({
        threadId,
        canonicalVisualIdentity,
        originEventRef: originEvent.eventId,
        recordedAt: originEvent.occurredAt,
      }));
      return Object.freeze({ state: "ready", embodiment, created: true });
    },
  });
}
