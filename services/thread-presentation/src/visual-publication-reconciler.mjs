import { THREAD_PRESENTATION_STREAM_VERSION } from "fibre/world-kernel/thread-presentation-contracts";
import { planCurrentPresentDepiction } from "./current-present-depiction.mjs";
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

function optionalRegenerationKey(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("regenerationKey must be a non-empty string when supplied");
  }
  return value.trim();
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
    correlationId: supplied.correlationId ?? null,
    causationId: supplied.causationId ?? null,
    parentOperationId: supplied.parentOperationId ?? null,
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

async function retainLatestPresent(catalog, channelId, event, channelRecord) {
  const prior = channelRecord?.currentPresent;
  if (Number.isSafeInteger(prior?.sequence) && prior.sequence > event.sequence) return prior;
  const currentPresent = Object.freeze({ sequence:event.sequence, event });
  await catalog.upsert(channelId, { ...channelRecord, currentPresent });
  return currentPresent;
}

async function publishCurrentPresent({
  infra,
  presentationServer,
  selectProviderProfile,
  demandService,
}, { threadId, present } = {}) {
  if (!infra?.catalog
    || typeof infra.catalog.get !== "function"
    || typeof infra.catalog.upsert !== "function") {
    throw new TypeError("current present publication requires presentation catalog access");
  }
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.appendEvent !== "function") {
    throw new TypeError("current present publication requires presentation snapshot and stream access");
  }

  const channelId = threadPresentationChannelId(threadId);
  const [current, catalog] = await Promise.all([
    presentationServer.getSnapshot(channelId),
    infra.catalog.get(channelId),
  ]);
  if (current === null || current.pointer.threadId !== threadId || catalog?.publiclyVisible !== true) {
    const error = new Error(`Thread ${threadId} does not have an admitted public presentation`);
    error.code = "THREAD_PRESENTATION_NOT_PUBLIC";
    error.retryable = true;
    throw error;
  }

  const accepted = await presentationServer.appendEvent({
    streamVersion:THREAD_PRESENTATION_STREAM_VERSION,
    eventId:`present_${present?.situationId ?? "invalid"}`,
    threadId,
    channelId,
    occurredAt:present?.establishedAt,
    emittedAt:present?.establishedAt,
    kind:"present.updated",
    provenanceRef:present?.situationId,
    sourceReferences:[present?.situationId],
    payload:present,
  });
  await retainLatestPresent(infra.catalog, channelId, accepted.event, catalog);

  const slot = planCurrentPresentDepiction({
    present:accepted.event.payload,
    presentation:current.snapshot.presentation,
  });
  const providerProfile = selectProviderProfile({
    requiresReferenceObjects:slot.referenceObjectRefs.length > 0,
  });
  const depiction = await demandService.reconcile({
    scope:{ entityKind:"experience", entityRef:accepted.event.payload.situationId },
    slots:[slot],
    requestedAt:accepted.event.payload.establishedAt,
    providerProfile,
  });

  return Object.freeze({
    event:accepted.event,
    duplicate:accepted.duplicate,
    depiction,
  });
}

export function createThreadPresentationVisualPublicationReconciler({
  presentationServer,
  infra,
  selectProviderProfile,
  createDemandService,
  createVisualRewrite,
  ensureFid,
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
  requireFunction("ensureFid", ensureFid);
  const activity = optionalActivityRecorder(activityRecorder);
  const demandService = createDemandService({ infra });

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
      const canonicalObjectRef = embodiment.asset.referenceObjectRef;

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
        evidence: { embodimentId: embodiment.embodimentId, objectRef: canonicalObjectRef },
      }, async () => visualRewrite.project({
        channelId,
        embodimentId: embodiment.embodimentId,
      }), (entry) => entry?.reused !== true);

      const fid = await ensureFid({
        threadId,
        idempotencyKey:`fid_ensure_${embodiment.embodimentId}_${embodiment.revision}`,
        canonicalReferenceObjectRef:canonicalObjectRef,
      });
      if (fid?.complete !== true) {
        return result(false, "fid_pending", {
          visualReused:visual.reused === true,
          regenerationKey:normalizedRegenerationKey,
          fidState:fid?.state ?? "pending",
          derivation:fid?.derivation ?? null,
        });
      }

      return result(true, "complete", {
        visualReused:visual.reused === true,
        regenerationKey:normalizedRegenerationKey,
        fidCredentialId:fid.credential?.credentialId ?? null,
        fidRevision:fid.credential?.revision ?? null,
      });
    },
    publishCurrentPresent(input = {}) {
      return publishCurrentPresent({
        infra,
        presentationServer,
        selectProviderProfile,
        demandService,
      }, input);
    },
  });
}
