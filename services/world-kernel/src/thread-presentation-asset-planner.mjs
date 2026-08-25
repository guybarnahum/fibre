import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import { threadVisualIdentityProjectionDigest } from "./thread-presentation-identity-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  ASSET_GENERATION_JOB_VERSION,
  normalizeAssetGenerationReceipt,
} from "#services/asset-generator/src/index.mjs";

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

function officialPhotoAwkwardness(visualIdentityDigest) {
  const options = [
    "Expression is carefully neutral, with the slight stiffness of trying not to smile.",
    "Expression is a little too serious for the occasion, but natural and dignified.",
    "Expression is mildly surprised by the shutter timing while remaining neutral and composed.",
    "Expression is politely neutral with a faint caught-at-the-wrong-instant quality.",
  ];
  const tail = visualIdentityDigest.at(-1);
  return options[Number.parseInt(tail, 16) % options.length];
}

function officialIdPhotoBrief(visualIdentity) {
  const identityDigest = threadVisualIdentityProjectionDigest(visualIdentity);
  return {
    description: [
      "Generated official identity photograph derived only from an authorized Thread visual-identity projection.",
      `Authorized subject appearance: ${visualIdentity.subjectDescription}`,
      `Authorized rendering continuity: ${visualIdentity.renderDescription}`,
      officialPhotoAwkwardness(identityDigest),
    ].join(" "),
    constraints: [
      "Preserve the supplied authorized visual identity; do not invent or materially redesign the person's canonical face or body.",
      "Use front-facing or almost front-facing head-and-shoulders administrative ID-photo framing.",
      "Use a plain neutral background, even boring administrative lighting, ordinary focus, and minimal styling.",
      "No cinematic depth of field, glamour treatment, dramatic pose, fashion-editorial styling, or flattering beauty retouching.",
      "The mild ID-photo awkwardness must remain subtle, affectionate, natural, and dignity-preserving.",
      "Do not make the subject cartoonish, grotesque, humiliated, distressed, intoxicated, incompetent, or visibly degraded.",
      "Do not add text, numbers, cards, badges, QR codes, signatures, watermarks, borders, or document graphics to the image itself.",
      "This generated photograph is derived presentation media, not embodiment, identity, historical, or autobiographical evidence.",
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
    let referenceObjectRefs = [];
    let extraInputReferences = [];
    let identitySeed = null;

    if (asset.role === "official_id_photo") {
      if (asset.status === "pending") {
        deferred.push({ mediaId: asset.mediaId, reason: "generation_pending" });
        continue;
      }
      const visualIdentity = presentation.visualIdentity ?? null;
      if (visualIdentity === null) {
        deferred.push({ mediaId: asset.mediaId, reason: "deferred_missing_embodiment" });
        continue;
      }
      const visualIdentityDigest = threadVisualIdentityProjectionDigest(visualIdentity);
      brief = officialIdPhotoBrief(visualIdentity);
      referenceObjectRefs = visualIdentity.referenceObjectRefs;
      extraInputReferences = [
        visualIdentity.embodimentId,
        ...visualIdentity.sourceReferences,
        ...visualIdentity.permissionReferences,
      ];
      identitySeed = {
        threadId: presentation.manifest.threadId,
        mediaId: asset.mediaId,
        role: asset.role,
        variant: "default",
        visualIdentityDigest,
        providerProfile,
        brief,
      };
    } else if (asset.role === "place") {
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
      ...extraInputReferences,
    ]);
    const variant = "default";
    const seed = identitySeed ?? {
      threadId: presentation.manifest.threadId,
      presentationId: presentation.manifest.presentationId,
      mediaId: asset.mediaId,
      variant,
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
      variant,
      brief,
      inputReferences,
      referenceObjectRefs,
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
        role: asset.role,
        provenanceRef: asset.provenanceRef,
        snapshotObjectRef,
        snapshotDigest,
        ...(asset.role === "official_id_photo" ? {
          visualIdentityDigest: threadVisualIdentityProjectionDigest(presentation.visualIdentity),
        } : {}),
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
