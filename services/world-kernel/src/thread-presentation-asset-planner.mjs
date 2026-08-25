import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  normalizeAssetGenerationReceipt,
} from "#services/asset-generator/src/index.mjs";
import {
  presentationAssetSourceDigest,
  reconcilePresentationAssets,
} from "./presentation-asset-demand.mjs";

export const THREAD_PRESENTATION_ASSET_PLAN_VERSION = "thread-presentation-asset-plan-v0.1";

function unique(values) { return [...new Set(values)]; }

function placeBrief(place) {
  return {
    description: [
      "Generated environmental reconstruction for a Thread presentation.",
      `${place.displayName}${place.region ? ` — ${place.region}` : ""}.`,
      place.summary,
    ].join(" "),
    constraints: [
      "This is a generated reconstruction, not documentary or historical photographic evidence.",
      "Use only the supplied place description as factual grounding.",
      "Do not invent a canonical appearance for the Thread or other identifiable people.",
      "Avoid text overlays, labels, signatures, or claims of exact historical capture.",
    ],
  };
}

function memoryBrief(memory) {
  const uncertainty = memory.uncertainty.length > 0
    ? `Uncertain details that must not be rendered as exact facts: ${memory.uncertainty.join("; ")}.`
    : "No additional uncertainty list was supplied.";
  return {
    description: [
      "Generated reconstruction of an autobiographical memory for a Thread presentation.",
      `${memory.title}.`,
      memory.rememberedContent,
      uncertainty,
    ].join(" "),
    constraints: [
      "This is a reconstruction of remembered content, not a documentary photograph or historical fact record.",
      "Do not add facts that are absent from the remembered content.",
      "Do not convert uncertainty into precise visual claims.",
      "Do not invent a canonical facial likeness when embodiment is not supplied.",
      "Avoid text overlays, labels, signatures, or claims that the image is authentic evidence.",
    ],
  };
}

function baseAssetSource(asset) {
  return {
    mediaId: asset.mediaId,
    kind: asset.kind,
    role: asset.role,
    sourceReferences: asset.sourceReferences,
    provenanceRef: asset.provenanceRef,
  };
}

export function planThreadPresentationAssetSlots({
  bundle,
  snapshotObjectRef,
  snapshotDigest,
}) {
  const normalized = normalizeThreadPresentationBundle(bundle);
  const { presentation, media } = normalized;
  const slots = [];

  for (const asset of media.assets) {
    let entityKind = "thread";
    let entityRef = presentation.manifest.threadId;
    let semanticSource = baseAssetSource(asset);
    let brief = null;
    let deferredReason = null;

    if (asset.role === "place") {
      const place = presentation.places.find((item) => item.mediaRefs.includes(asset.mediaId));
      if (place) {
        entityKind = "place";
        entityRef = place.placeRef;
        semanticSource = { asset: baseAssetSource(asset), place };
        brief = placeBrief(place);
      }
    } else if (asset.role === "memory_reconstruction") {
      const memory = presentation.memories.find((item) => item.mediaRefs.includes(asset.mediaId));
      if (memory) {
        entityKind = "memory";
        entityRef = memory.memoryRef;
        semanticSource = { asset: baseAssetSource(asset), memory };
        brief = memoryBrief(memory);
      }
    } else if (asset.role === "primary_portrait") {
      // The current presentation contract has no authorized embodiment/visual-identity
      // projection. A plausible face is not a substitute for that authority.
      deferredReason = "deferred_missing_embodiment_brief";
    }

    let status;
    if (asset.status === "ready") status = "ready";
    else if (asset.status === "unavailable") status = "unavailable";
    else if (asset.kind !== "image") {
      status = "deferred";
      deferredReason = "deferred_non_image_asset";
    } else if (deferredReason !== null) status = "deferred";
    else if (brief === null) {
      status = "deferred";
      deferredReason = "deferred_missing_generation_brief";
    } else status = "missing";

    slots.push({
      slotKey: `thread:${presentation.manifest.threadId}:media:${asset.mediaId}`,
      entityKind,
      entityRef,
      mediaId: asset.mediaId,
      assetKind: asset.kind,
      role: asset.role,
      variant: "default",
      status,
      brief: status === "missing" ? brief : null,
      inputReferences: unique([
        presentation.manifest.presentationId,
        media.mediaPacketId,
        snapshotObjectRef,
        ...asset.sourceReferences,
        ...(semanticSource.place?.sourceReferences ?? []),
        ...(semanticSource.memory?.sourceReferences ?? []),
      ]),
      referenceObjectRefs: [],
      sourceDigest: presentationAssetSourceDigest(semanticSource),
      provenanceRef: asset.provenanceRef,
      deferredReason: status === "deferred" ? deferredReason : null,
      context: {
        kind: "thread_presentation_media",
        threadId: presentation.manifest.threadId,
        presentationId: presentation.manifest.presentationId,
        mediaPacketId: media.mediaPacketId,
        mediaId: asset.mediaId,
        provenanceRef: asset.provenanceRef,
        snapshotObjectRef,
        snapshotDigest,
      },
    });
  }

  return Object.freeze({
    threadId: presentation.manifest.threadId,
    presentationId: presentation.manifest.presentationId,
    snapshotObjectRef,
    snapshotDigest,
    slots: Object.freeze(slots),
  });
}

export function planThreadPresentationAssetGeneration({
  bundle,
  snapshotObjectRef,
  snapshotDigest,
  requestedAt,
  providerProfile = "presentation-image-default-v1",
  existingDemands = [],
  regenerationKey = null,
}) {
  const slotPlan = planThreadPresentationAssetSlots({
    bundle,
    snapshotObjectRef,
    snapshotDigest,
  });
  const reconciliation = reconcilePresentationAssets({
    slots: slotPlan.slots,
    existingDemands,
    requestedAt,
    providerProfile,
    regenerationKey,
  });

  return {
    planVersion: THREAD_PRESENTATION_ASSET_PLAN_VERSION,
    threadId: slotPlan.threadId,
    presentationId: slotPlan.presentationId,
    snapshotObjectRef,
    snapshotDigest,
    requestedAt,
    providerProfile,
    jobs: reconciliation.jobs,
    deferred: reconciliation.deferredSlots.map((slot) => ({
      mediaId: slot.mediaId,
      reason: slot.deferredReason,
    })),
    reconciliation,
  };
}

export function assetGenerationReceiptToPresentationEventInput(rawReceipt, {
  channelId,
  occurredAt,
  emittedAt,
}) {
  const receipt = normalizeAssetGenerationReceipt(rawReceipt);
  if (receipt.context?.kind !== "thread_presentation_media") {
    throw new TypeError("asset generation receipt is not for Thread presentation media");
  }
  const effectiveOccurredAt = occurredAt ?? receipt.completedAt;
  const effectiveEmittedAt = emittedAt ?? receipt.completedAt;
  const common = {
    streamVersion: "thread-presentation-stream-v0.1",
    eventId: `presasset_${sha256(canonicalJson({ jobId: receipt.jobId, status: receipt.status }))}`,
    threadId: receipt.context.threadId,
    channelId,
    occurredAt: effectiveOccurredAt,
    emittedAt: effectiveEmittedAt,
    kind: receipt.status === "ready" ? "media.ready" : "media.unavailable",
    provenanceRef: receipt.context.provenanceRef,
    sourceReferences: receipt.inputReferences,
  };
  if (receipt.status === "ready") {
    return {
      ...common,
      payload: {
        mediaId: receipt.context.mediaId,
        objectRef: receipt.objectRef,
        mediaType: receipt.mediaType,
        digest: receipt.sha256,
      },
    };
  }
  return {
    ...common,
    payload: {
      mediaId: receipt.context.mediaId,
      reason: receipt.unavailableReason,
    },
  };
}
