import { threadPresentationChannelId } from "./public-asset-resolver.mjs";

function assertId(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function requireFunction(name, value) {
  if (typeof value !== "function") {
    throw new TypeError(`Thread Presentation visual reconciler requires ${name}()`);
  }
  return value;
}

function requireProviderSelector(value) {
  return requireFunction("selectProviderProfile", value);
}

function normalizeAdmittedCanonicalPortrait(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("Thread Presentation visual reconciliation requires an admitted canonical portrait");
  }
  assertId("embodiment.embodimentId", candidate.embodimentId);
  assertId("embodiment.threadId", candidate.threadId);
  if (candidate.kind !== "portrait"
    || candidate.visibility !== "public"
    || candidate.status !== "available"
    || typeof candidate.asset?.referenceObjectRef !== "string"
    || candidate.asset.referenceObjectRef.trim() === "") {
    throw new TypeError("Thread Presentation visual reconciliation requires an admitted public canonical portrait");
  }
  return candidate;
}

function result(complete, stage, detail = {}) {
  return Object.freeze({ complete, stage, detail: Object.freeze({ ...detail }) });
}

function suppliedEmbodimentReader(embodiment) {
  return Object.freeze({
    listCurrent(threadId) {
      return threadId === embodiment.threadId ? [embodiment] : [];
    },
  });
}

/**
 * Thread Presentation's idempotent half of automatic visual publication.
 *
 * The caller supplies an already-admitted canonical Embodiment projection from
 * World. Presentation may project it and request derived media, but this module
 * never writes World state and never decides canonical identity.
 *
 * Presentation-owned collaborators are injected explicitly. This keeps the
 * service independent of World Kernel private implementation modules; deployment
 * composition may wire current implementations while those presentation
 * capabilities finish migrating behind the stable service boundary.
 */
export function createThreadPresentationVisualPublicationReconciler({
  presentationServer,
  infra,
  selectProviderProfile,
  createDemandService,
  createVisualRewrite,
  createIdentityRewrite,
  planSlots,
} = {}) {
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("Thread Presentation visual reconciler requires PresentationServer");
  }
  if (!infra) throw new TypeError("Thread Presentation visual reconciler requires infra");
  requireProviderSelector(selectProviderProfile);
  requireFunction("createDemandService", createDemandService);
  requireFunction("createVisualRewrite", createVisualRewrite);
  requireFunction("createIdentityRewrite", createIdentityRewrite);
  requireFunction("planSlots", planSlots);
  const demandService = createDemandService({ infra });
  const identityRewrite = createIdentityRewrite({ presentationServer });

  return Object.freeze({
    async reconcileAvailableEmbodiment({ threadId, embodiment: candidate, observedAt } = {}) {
      assertId("threadId", threadId);
      assertIsoTimestamp("observedAt", observedAt);
      const embodiment = normalizeAdmittedCanonicalPortrait(candidate);
      if (embodiment.threadId !== threadId) {
        throw new TypeError("supplied Embodiment belongs to a different Thread");
      }

      const channelId = threadPresentationChannelId(threadId);
      const initial = await presentationServer.getSnapshot(channelId);
      if (initial === null) return result(false, "awaiting_genesis_projection");

      const visualRewrite = createVisualRewrite({
        presentationServer,
        embodimentReader: suppliedEmbodimentReader(embodiment),
      });
      const visual = await visualRewrite.project({
        channelId,
        embodimentId: embodiment.embodimentId,
      });
      const identity = await identityRewrite.ensureOfficialIdentityMedia({
        channelId,
        issuedAt: observedAt,
      });
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) throw new Error(`Thread ${threadId} presentation disappeared during visual reconciliation`);

      const slots = planSlots({
        bundle: {
          presentation: current.snapshot.presentation,
          media: current.snapshot.media,
          provenance: current.snapshot.provenance,
        },
        snapshotObjectRef: current.pointer.objectRef,
        snapshotDigest: current.pointer.snapshotDigest,
      });
      const mediaId = identity.identityCard.officialPhotoMediaRef;
      const slot = slots.slots.find((entry) => entry.mediaId === mediaId);
      if (!slot) throw new Error(`Thread ${threadId} official identity-photo slot was not planned`);

      const common = {
        officialPhotoMediaId: mediaId,
        visualReused: visual.reused === true,
        identityReused: identity.reused === true,
      };
      if (slot.status === "ready") {
        return result(true, "complete", common);
      }
      if (slot.status !== "missing") {
        return result(false, "official_photo_unavailable", {
          ...common,
          slotStatus: slot.status,
        });
      }

      const providerProfile = selectProviderProfile({
        requiresReferenceObjects: slot.referenceObjectRefs.length > 0,
      });
      const demand = await demandService.reconcile({
        scope: { entityKind: "thread", entityRef: threadId },
        slots: [slot],
        requestedAt: observedAt,
        providerProfile,
      });
      const active = demand.projection.demands.find((entry) => (
        entry.demand.current
        && entry.demand.job.context?.kind === "thread_presentation_media"
        && entry.demand.job.context.mediaId === mediaId
      ));
      if (!active) throw new Error(`Thread ${threadId} official identity-photo demand did not become current`);

      return result(false, "official_photo_pending", {
        ...common,
        providerProfile,
        demandId: active.demand.demandId,
        jobId: active.demand.job.jobId,
      });
    },
  });
}
