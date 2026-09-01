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

function latestIsoTimestamp(name, values) {
  const checked = values
    .filter((value) => value !== null && value !== undefined)
    .map((value, index) => assertIsoTimestamp(`${name}[${index}]`, value));
  if (checked.length === 0) throw new TypeError(`${name} requires at least one ISO timestamp`);
  return checked.reduce((latest, candidate) => (
    Date.parse(candidate) > Date.parse(latest) ? candidate : latest
  ));
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

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Thread Presentation activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
}

function activityIdentity(threadId, supplied = {}) {
  return Object.freeze({
    requestId: supplied.requestId ?? null,
    genesisId: supplied.genesisId ?? null,
    threadId,
  });
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

export function createThreadPresentationVisualPublicationReconciler({
  presentationServer,
  infra,
  selectProviderProfile,
  createDemandService,
  createVisualRewrite,
  createIdentityRewrite,
  planSlots,
  activityRecorder = null,
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
  const activity = optionalActivityRecorder(activityRecorder);
  const demandService = createDemandService({ infra });
  const identityRewrite = createIdentityRewrite({ presentationServer });

  return Object.freeze({
    async reconcileAvailableEmbodiment({ threadId, embodiment: candidate, observedAt, activityContext = {} } = {}) {
      assertId("threadId", threadId);
      assertIsoTimestamp("observedAt", observedAt);
      const context = activityIdentity(threadId, activityContext);
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
      const visual = await runActivityStage(activity, {
        ...context,
        stage: "presentation.visual_identity.project",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId },
      }, async () => visualRewrite.project({
        channelId,
        embodimentId: embodiment.embodimentId,
      }));
      const projected = await presentationServer.getSnapshot(channelId);
      if (projected === null) {
        throw new Error(`Thread ${threadId} presentation disappeared during visual identity projection`);
      }
      const issuedAt = latestIsoTimestamp("identity media issuance authority time", [
        observedAt,
        projected.snapshot.presentation?.manifest?.generatedAt,
        projected.snapshot.presentation?.civilIdentity?.registeredAt,
      ]);
      const identity = await runActivityStage(activity, {
        ...context,
        stage: "presentation.identity_media.ensure",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId },
      }, async () => identityRewrite.ensureOfficialIdentityMedia({
        channelId,
        issuedAt,
      }));
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
      const demand = await runActivityStage(activity, {
        ...context,
        stage: "presentation.media_demand.reconcile",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId },
      }, async () => demandService.reconcile({
        scope: { entityKind: "thread", entityRef: threadId },
        slots: [slot],
        requestedAt: issuedAt,
        providerProfile,
      }));
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
