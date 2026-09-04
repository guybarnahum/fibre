import { createThreadPresentationVisualPublicationReconciler as createCoreReconciler } from "./visual-publication-reconciler.mjs";
import { threadPresentationChannelId } from "./public-asset-resolver.mjs";

const SLICE_H1_FAULT_PREFIX = "slice-h1-fault-after-workflow-before-demand:";
const SLICE_H1_PRECONDITION_PREFIX = "sliceh1precondition_";

function h1FaultSuffix(value) {
  if (typeof value !== "string" || !value.startsWith(SLICE_H1_FAULT_PREFIX)) return null;
  const suffix = value.slice(SLICE_H1_FAULT_PREFIX.length);
  if (!/^[A-Za-z0-9._:-]+$/.test(suffix) || suffix.length === 0) {
    throw new TypeError("Slice H1 fault regeneration key suffix must be a non-empty Fibre-safe id");
  }
  return suffix;
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

async function ensureDurableH1Precondition(options, args) {
  const suffix = h1FaultSuffix(args.regenerationKey);
  if (suffix === null) return;

  const catalog = options.infra?.catalog;
  const presentationServer = options.presentationServer;
  if (!catalog || typeof catalog.get !== "function" || typeof catalog.upsert !== "function") {
    throw new TypeError("Slice H1 precondition requires infra.catalog get/upsert");
  }
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.getHead !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("Slice H1 precondition requires presentation snapshot/head read and snapshot write");
  }

  const markerKey = `${SLICE_H1_PRECONDITION_PREFIX}${suffix}`;
  if (await catalog.get(markerKey) !== null) return;

  const channelId = threadPresentationChannelId(args.threadId);
  const current = await presentationServer.getSnapshot(channelId);
  if (current === null) throw new Error(`Slice H1 precondition requires existing Thread presentation ${args.threadId}`);

  const bundle = {
    presentation: current.snapshot.presentation,
    media: current.snapshot.media,
    provenance: current.snapshot.provenance,
  };
  const pendingBundle = forceOfficialPhotoMissing(bundle);
  if (pendingBundle !== bundle) {
    const safeSuffix = suffix.replace(/[^A-Za-z0-9_-]/g, "_");
    const head = await presentationServer.getHead(channelId);
    await presentationServer.publishSnapshot({
      channelId,
      objectRef: `snapshot_h1_pending_${safeSuffix}`,
      snapshotVersion: `h1-pending-${safeSuffix}`,
      expectedSequence: head.sequence,
      bundle: pendingBundle,
      catalog: {
        projectionKind: "slice_h1_precondition",
        sliceH1RegenerationKey: args.regenerationKey,
      },
    });
  }

  await catalog.upsert(markerKey, {
    kind: "slice_h1_precondition_marker",
    threadId: args.threadId,
    regenerationKey: args.regenerationKey,
    applied: true,
  });
}

export function createThreadPresentationVisualPublicationReconciler(options = {}) {
  const core = createCoreReconciler(options);
  return Object.freeze({
    async reconcileAvailableEmbodiment(args = {}) {
      await ensureDurableH1Precondition(options, args);
      return core.reconcileAvailableEmbodiment(args);
    },
  });
}
