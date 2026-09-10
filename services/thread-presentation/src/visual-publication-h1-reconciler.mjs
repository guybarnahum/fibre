import { THREAD_PRESENTATION_STREAM_VERSION } from "#services/world-kernel/src/thread-presentation-stream-domain.mjs";
import { planCurrentPresentDepiction } from "./current-present-depiction.mjs";
import { createThreadPresentationVisualPublicationReconciler as createCoreReconciler } from "./visual-publication-reconciler.mjs";
import { threadPresentationChannelId } from "./public-asset-resolver.mjs";

const SLICE_H1_FAULT_PREFIX = "slice-h1-fault-after-workflow-before-demand:";
const SLICE_H2_FAULT_PREFIX = "slice-h2-provider-transient:";
const SLICE_H1_PRECONDITION_PREFIX = "sliceh1precondition_";
const SLICE_H2_PRECONDITION_PREFIX = "sliceh2precondition_";
const CURRENT_PRESENT_CATALOG_PREFIX = "current-present:";

function faultDescriptor(value) {
  if (typeof value !== "string") return null;
  let kind = null;
  let prefix = null;
  let markerPrefix = null;
  if (value.startsWith(SLICE_H1_FAULT_PREFIX)) {
    kind = "h1";
    prefix = SLICE_H1_FAULT_PREFIX;
    markerPrefix = SLICE_H1_PRECONDITION_PREFIX;
  } else if (value.startsWith(SLICE_H2_FAULT_PREFIX)) {
    kind = "h2";
    prefix = SLICE_H2_FAULT_PREFIX;
    markerPrefix = SLICE_H2_PRECONDITION_PREFIX;
  } else {
    return null;
  }
  const suffix = value.slice(prefix.length);
  if (!/^[A-Za-z0-9._:-]+$/.test(suffix) || suffix.length === 0) {
    throw new TypeError(`Slice ${kind.toUpperCase()} fault regeneration key suffix must be a non-empty Fibre-safe id`);
  }
  return Object.freeze({ kind, suffix, markerPrefix });
}

function forceOfficialPhotoMissing(bundle) {
  const media = bundle?.media;
  if (!media || !Array.isArray(media.assets)) return bundle;
  let changed = false;
  const assets = media.assets.map((asset) => {
    if (asset?.role !== "official_id_photo" || asset.status !== "ready") return asset;
    changed = true;
    return {
      ...asset,
      status: "placeholder",
      locator: null,
      mediaType: null,
      sha256: null,
      width: null,
      height: null,
      durationMs: null,
      posterRef: null,
      unavailableReason: null,
    };
  });
  if (!changed) return bundle;
  return {
    ...bundle,
    media: {
      ...media,
      assets,
    },
  };
}

async function ensureDurableFailurePrecondition(options, args, descriptor) {
  if (descriptor === null) return;

  const catalog = options.infra?.catalog;
  const presentationServer = options.presentationServer;
  if (!catalog || typeof catalog.get !== "function" || typeof catalog.upsert !== "function") {
    throw new TypeError(`Slice ${descriptor.kind.toUpperCase()} precondition requires infra.catalog get/upsert`);
  }
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.getHead !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError(`Slice ${descriptor.kind.toUpperCase()} precondition requires presentation snapshot read/write and head read`);
  }

  const markerKey = `${descriptor.markerPrefix}${descriptor.suffix}`;
  if (await catalog.get(markerKey) !== null) return;

  const channelId = threadPresentationChannelId(args.threadId);
  const current = await presentationServer.getSnapshot(channelId);
  if (current === null) throw new Error(`Slice ${descriptor.kind.toUpperCase()} precondition requires existing Thread presentation ${args.threadId}`);

  const bundle = {
    presentation: current.snapshot.presentation,
    media: current.snapshot.media,
    provenance: current.snapshot.provenance,
  };
  const pendingBundle = forceOfficialPhotoMissing(bundle);
  if (pendingBundle !== bundle) {
    const safeSuffix = descriptor.suffix.replace(/[^A-Za-z0-9_-]/g, "_");
    const head = await presentationServer.getHead(channelId);
    await presentationServer.publishSnapshot({
      channelId,
      objectRef: `snapshot_${descriptor.kind}_pending_${safeSuffix}`,
      snapshotVersion: `${descriptor.kind}-pending-${safeSuffix}`,
      expectedSequence: head.sequence,
      bundle: pendingBundle,
      catalog: {
        projectionKind: `slice_${descriptor.kind}_precondition`,
        sliceFailureRegenerationKey: args.regenerationKey,
      },
    });
  }

  await catalog.upsert(markerKey, {
    kind: `slice_${descriptor.kind}_precondition_marker`,
    threadId: args.threadId,
    regenerationKey: args.regenerationKey,
    applied: true,
  });
}

function withH2FaultContext(slot, activeDescriptor) {
  if (activeDescriptor?.kind !== "h2" || slot?.status !== "missing") return slot;
  return {
    ...slot,
    context: {
      ...slot.context,
      sliceH2ProviderTransientFailure: true,
    },
  };
}

async function retainLatestPresent(catalog, channelId, event) {
  const key = `${CURRENT_PRESENT_CATALOG_PREFIX}${channelId}`;
  const prior = await catalog.get(key);
  if (Number.isSafeInteger(prior?.sequence) && prior.sequence > event.sequence) return prior;
  const record = Object.freeze({
    kind: "current_public_present",
    publiclyVisible: true,
    threadId: event.threadId,
    channelId,
    sequence: event.sequence,
    event,
  });
  await catalog.upsert(key, record);
  return record;
}

async function publishCurrentPresent(options, args) {
  const infra = options.infra;
  const presentationServer = options.presentationServer;
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
  if (typeof options.createDemandService !== "function" || typeof options.selectProviderProfile !== "function") {
    throw new TypeError("current present depiction requires presentation asset generation dependencies");
  }

  const threadId = args?.threadId;
  const present = args?.present;
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
    streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
    eventId: `present_${present?.situationId ?? "invalid"}`,
    threadId,
    channelId,
    occurredAt: present?.establishedAt,
    emittedAt: present?.establishedAt,
    kind: "present.updated",
    provenanceRef: present?.situationId,
    sourceReferences: [present?.situationId],
    payload: present,
  });
  await retainLatestPresent(infra.catalog, channelId, accepted.event);

  const slot = planCurrentPresentDepiction({
    present: accepted.event.payload,
    presentation: current.snapshot.presentation,
  });
  const providerProfile = options.selectProviderProfile({
    requiresReferenceObjects: slot.referenceObjectRefs.length > 0,
  });
  const demandService = options.createDemandService({ infra });
  const depiction = await demandService.reconcile({
    scope: { entityKind: "experience", entityRef: accepted.event.payload.situationId },
    slots: [slot],
    requestedAt: accepted.event.payload.establishedAt,
    providerProfile,
  });

  return Object.freeze({
    event: accepted.event,
    duplicate: accepted.duplicate,
    depiction,
  });
}

export function createThreadPresentationVisualPublicationReconciler(options = {}) {
  const suppliedPlanSlots = options.planSlots;
  let activeDescriptor = null;
  const core = createCoreReconciler({
    ...options,
    ...(typeof suppliedPlanSlots === "function"
      ? {
          planSlots(input) {
            const planned = suppliedPlanSlots(input);
            if (activeDescriptor?.kind !== "h2") return planned;
            return {
              ...planned,
              slots: planned.slots.map((slot) => withH2FaultContext(slot, activeDescriptor)),
            };
          },
        }
      : {}),
  });

  return Object.freeze({
    async reconcileAvailableEmbodiment(args = {}) {
      const descriptor = faultDescriptor(args.regenerationKey);
      await ensureDurableFailurePrecondition(options, args, descriptor);
      activeDescriptor = descriptor;
      try {
        return await core.reconcileAvailableEmbodiment(args);
      } finally {
        activeDescriptor = null;
      }
    },
    publishCurrentPresent(args = {}) {
      return publishCurrentPresent(options, args);
    },
  });
}
