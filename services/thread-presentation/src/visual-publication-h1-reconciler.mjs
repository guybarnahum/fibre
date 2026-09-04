import { createThreadPresentationVisualPublicationReconciler as createCoreReconciler } from "./visual-publication-reconciler.mjs";

const SLICE_H1_FAULT_PREFIX = "slice-h1-fault-after-workflow-before-demand:";

function h1FaultKey(value) {
  return typeof value === "string" && value.startsWith(SLICE_H1_FAULT_PREFIX);
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

export function createThreadPresentationVisualPublicationReconciler(options = {}) {
  const suppliedPlanSlots = options.planSlots;
  if (typeof suppliedPlanSlots !== "function") {
    return createCoreReconciler(options);
  }

  let forceH1Generation = false;
  const core = createCoreReconciler({
    ...options,
    planSlots(input) {
      if (!forceH1Generation) return suppliedPlanSlots(input);
      return suppliedPlanSlots({
        ...input,
        bundle: forceOfficialPhotoMissing(input.bundle),
      });
    },
  });

  return Object.freeze({
    async reconcileAvailableEmbodiment(args = {}) {
      forceH1Generation = h1FaultKey(args.regenerationKey);
      try {
        return await core.reconcileAvailableEmbodiment(args);
      } finally {
        forceH1Generation = false;
      }
    },
  });
}
