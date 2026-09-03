import { threadPresentationChannelId } from "./public-asset-resolver.mjs";

const TERMINAL_WORKFLOW_STATUSES = new Set(["errored", "terminated"]);
const ASSET_GENERATION_WORKFLOW = "asset_generation_v1";

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

function optionalRegenerationKey(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("regenerationKey must be a non-empty string when supplied");
  }
  return value.trim();
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

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runChangedStage(activity, metadata, operation, changed) {
  try {
    const result = await operation();
    if (changed(result)) {
      await bestEffortRecord(activity, { ...metadata, status: "succeeded" });
    }
    return result;
  } catch (error) {
    await bestEffortRecord(activity, {
      ...metadata,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      error: { category: "reconciliation", code: "PRESENTATION_RECONCILIATION_FAILED", retryable: true },
    });
    throw error;
  }
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

async function terminalWorkflowError({ infra, threadId, mediaId, active }) {
  const status = active?.dispatch?.workflowStatus;
  if (!TERMINAL_WORKFLOW_STATUSES.has(status)) return null;
  let workflow = null;
  if (typeof infra?.workflows?.get === "function") {
    try {
      workflow = await infra.workflows.get(ASSET_GENERATION_WORKFLOW, active.demand.job.jobId);
    } catch {}
  }
  const detail = workflow?.error?.message ?? "no workflow failure detail reported";
  const error = new Error(
    `Thread ${threadId} official identity-photo workflow ${active.demand.job.jobId} ended as ${status}: ${detail}`,
  );
  error.name = "PresentationAssetWorkflowTerminalError";
  error.code = "PRESENTATION_ASSET_WORKFLOW_TERMINAL";
  error.activityCategory = "reconciliation";
  error.retryable = false;
  error.threadId = threadId;
  error.mediaId = mediaId;
  error.jobId = active.demand.job.jobId;
  error.workflowStatus = status;
  return error;
}

function reconciliationFailure(error) {
  const code = typeof error?.code === "string" && error.code !== ""
    ? error.code
    : "PRESENTATION_RECONCILIATION_FAILED";
  return Object.freeze({
    category: "reconciliation",
    code,
    retryable: error?.retryable === true,
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
    async reconcileAvailableEmbodiment({
      threadId,
      embodiment: candidate,
      observedAt,
      activityContext = {},
      regenerationKey = null,
    } = {}) {
      assertId("threadId", threadId);
      assertIsoTimestamp("observedAt", observedAt);
      const normalizedRegenerationKey = optionalRegenerationKey(regenerationKey);
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
      const visual = await runChangedStage(activity, {
        ...context,
        stage: "presentation.visual_identity.project",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId },
      }, async () => visualRewrite.project({
        channelId,
        embodimentId: embodiment.embodimentId,
      }), (entry) => entry?.reused !== true);
      const projected = await presentationServer.getSnapshot(channelId);
      if (projected === null) {
        throw new Error(`Thread ${threadId} presentation disappeared during visual identity projection`);
      }
      const issuedAt = latestIsoTimestamp("identity media issuance authority time", [
        observedAt,
        projected.snapshot.presentation?.manifest?.generatedAt,
        projected.snapshot.presentation?.civilIdentity?.registeredAt,
      ]);
      const identity = await runChangedStage(activity, {
        ...context,
        stage: "presentation.identity_media.ensure",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId },
      }, async () => identityRewrite.ensureOfficialIdentityMedia({
        channelId,
        issuedAt,
      }), (entry) => entry?.reused !== true);
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
        regenerationKey: normalizedRegenerationKey,
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
      const activityMetadata = {
        ...context,
        stage: "presentation.media_demand.reconcile",
        attempt: 1,
        evidence: { embodimentId: embodiment.embodimentId, regenerationKey: normalizedRegenerationKey },
      };
      let demand;
      let active;
      try {
        demand = await demandService.reconcile({
          scope: { entityKind: "thread", entityRef: threadId },
          slots: [slot],
          requestedAt: issuedAt,
          providerProfile,
          regenerationKey: normalizedRegenerationKey,
        });
        active = demand.projection.demands.find((entry) => (
          entry.demand.current
          && entry.demand.job.context?.kind === "thread_presentation_media"
          && entry.demand.job.context.mediaId === mediaId
        ));
        if (!active) throw new Error(`Thread ${threadId} official identity-photo demand did not become current`);
        const terminal = await terminalWorkflowError({ infra, threadId, mediaId, active });
        if (terminal !== null) throw terminal;
        if (demand.changed === true) {
          await bestEffortRecord(activity, { ...activityMetadata, status: "succeeded" });
        }
      } catch (error) {
        if (demand?.changed === true || demand === undefined) {
          await bestEffortRecord(activity, {
            ...activityMetadata,
            status: "failed",
            message: error instanceof Error ? error.message : String(error),
            error: reconciliationFailure(error),
          });
        }
        throw error;
      }

      return result(false, "official_photo_pending", {
        ...common,
        providerProfile,
        demandId: active.demand.demandId,
        jobId: active.demand.job.jobId,
        workflowStatus: active.dispatch?.workflowStatus ?? null,
      });
    },
  });
}
