import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { ASSET_GENERATION_JOB_VERSION } from "../../asset-generator/src/asset-generation-domain.mjs";

export const THREAD_PRESENTATION_ASSET_PLAN_VERSION = "thread-presentation-asset-plan-v0.1";

function unique(values) { return [...new Set(values)]; }

function makeJobId(seed) {
  return `assetjob_${sha256(canonicalJson(seed))}`;
}

function makeOutputObjectRef(jobId) {
  return `asset_${sha256(canonicalJson({ jobId }))}`;
}

function makeReceiptObjectRef(jobId) {
  return `assetreceipt_${sha256(canonicalJson({ jobId }))}`;
}

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

export function planThreadPresentationAssetGeneration({
  bundle,
  snapshotObjectRef,
  snapshotDigest,
  requestedAt,
  providerProfile = "presentation-image-default-v1",
}) {
  const normalized = normalizeThreadPresentationBundle(bundle);
  const { presentation, media } = normalized;
  const jobs = [];
  const deferred = [];

  for (const asset of media.assets) {
    if (asset.status === "ready" || asset.status === "unavailable") continue;

    if (asset.kind !== "image") {
      deferred.push({ mediaId: asset.mediaId, reason: "deferred_non_image_asset" });
      continue;
    }

    let brief = null;
    if (asset.role === "place") {
      const place = presentation.places.find((item) => item.mediaRefs.includes(asset.mediaId));
      if (place) brief = placeBrief(place);
    } else if (asset.role === "memory_reconstruction") {
      const memory = presentation.memories.find((item) => item.mediaRefs.includes(asset.mediaId));
      if (memory) brief = memoryBrief(memory);
    } else if (asset.role === "primary_portrait") {
      deferred.push({ mediaId: asset.mediaId, reason: "deferred_missing_embodiment_brief" });
      continue;
    }

    if (brief === null) {
      deferred.push({ mediaId: asset.mediaId, reason: "deferred_missing_generation_brief" });
      continue;
    }

    const inputReferences = unique([
      presentation.manifest.presentationId,
      media.mediaPacketId,
      snapshotObjectRef,
      ...asset.sourceReferences,
    ]);
    const seed = {
      threadId: presentation.manifest.threadId,
      presentationId: presentation.manifest.presentationId,
      mediaId: asset.mediaId,
      snapshotDigest,
      providerProfile,
      brief,
    };
    const jobId = makeJobId(seed);
    jobs.push({
      jobVersion: ASSET_GENERATION_JOB_VERSION,
      jobId,
      assetKind: asset.kind,
      role: asset.role,
      brief,
      inputReferences,
      outputObjectRef: makeOutputObjectRef(jobId),
      receiptObjectRef: makeReceiptObjectRef(jobId),
      requestedAt,
      providerProfile,
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

  return {
    planVersion: THREAD_PRESENTATION_ASSET_PLAN_VERSION,
    threadId: presentation.manifest.threadId,
    presentationId: presentation.manifest.presentationId,
    snapshotObjectRef,
    snapshotDigest,
    requestedAt,
    providerProfile,
    jobs,
    deferred,
  };
}

export function assetGenerationReceiptToPresentationEventInput(receipt, {
  channelId,
  occurredAt = receipt.completedAt,
  emittedAt = receipt.completedAt,
}) {
  if (receipt.context?.kind !== "thread_presentation_media") {
    throw new TypeError("asset generation receipt is not for Thread presentation media");
  }
  const common = {
    streamVersion: "thread-presentation-stream-v0.1",
    eventId: `presasset_${sha256(canonicalJson({ jobId: receipt.jobId, status: receipt.status }))}`,
    threadId: receipt.context.threadId,
    channelId,
    occurredAt,
    emittedAt,
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
