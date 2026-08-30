import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import { threadVisualIdentityProjectionDigest } from "./thread-presentation-identity-domain.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  normalizeAssetGenerationReceipt,
} from "#services/asset-generator/src/index.mjs";
import {
  presentationAssetSourceDigest,
  reconcilePresentationAssets,
} from "./presentation-asset-demand.mjs";
import {
  CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  ageYearsAt,
} from "./visual-identity-reference-domain.mjs";

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

function ageInstruction(targetAgeYears) {
  return targetAgeYears === null
    ? `The supplied canonical identity reference depicts the same person at normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}; preserve identity without asserting an unsupported exact scene age.`
    : `The supplied canonical identity reference depicts the same person at normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}; preserve that person's identity while age-transforming them naturally to ${targetAgeYears} years old for this image.`;
}

function memoryBrief(memory, {
  visualIdentity = null,
  targetAgeYears = null,
  depictsThread = false,
} = {}) {
  const uncertainty = memory.uncertainty.length > 0
    ? `Uncertain details that must not be rendered as exact facts: ${memory.uncertainty.join("; ")}.`
    : "No additional uncertainty list was supplied.";
  const hasIdentityReference = visualIdentity?.referenceObjectRefs?.length === 1;
  return {
    description: [
      "Generated reconstruction of an autobiographical memory for a Thread presentation.",
      `${memory.title}.`,
      memory.rememberedContent,
      uncertainty,
      ...(hasIdentityReference ? [ageInstruction(targetAgeYears)] : []),
    ].join(" "),
    constraints: [
      "This is a reconstruction of remembered content, not a documentary photograph or historical fact record.",
      "Do not add facts that are absent from the remembered content.",
      "Do not convert uncertainty into precise visual claims.",
      ...(hasIdentityReference
        ? [
            "The backed life-event participation record establishes that the Thread is present in this scene; use the supplied canonical visual-identity reference as that person's facial/physical identity anchor.",
            "Age, expression, clothing, and scene may change, but the Thread must remain recognizably the same identity.",
            "Do not copy the canonical reference portrait's neutral pose or background unless the memory itself calls for them; it is an identity reference, not scene composition evidence.",
          ]
        : depictsThread
          ? ["Do not generate this self-depicting scene without the admitted canonical visual-identity reference."]
          : ["The backed life-event participation record does not establish the Thread as depicted; do not insert the Thread or invent/use a canonical likeness merely because this is the Thread's memory."]),
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
  return options[Number.parseInt(visualIdentityDigest.at(-1), 16) % options.length];
}

function officialIdPhotoBrief(visualIdentity, targetAgeYears) {
  const identityDigest = threadVisualIdentityProjectionDigest(visualIdentity);
  return {
    description: [
      "Generated official identity photograph derived only from an authorized Thread visual-identity projection and its canonical reference image.",
      `Authorized subject appearance: ${visualIdentity.subjectDescription}`,
      `Authorized rendering continuity: ${visualIdentity.renderDescription}`,
      ageInstruction(targetAgeYears),
      officialPhotoAwkwardness(identityDigest),
    ].join(" "),
    constraints: [
      "Use the supplied canonical reference image as the identity anchor; do not invent or materially redesign the person's face or body.",
      "Age-transform naturally to the requested target age while preserving identity-defining proportions, asymmetries, and distinctive marks.",
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

function baseAssetSource(asset) {
  return {
    mediaId: asset.mediaId,
    kind: asset.kind,
    role: asset.role,
    sourceReferences: asset.sourceReferences,
    provenanceRef: asset.provenanceRef,
  };
}

function memoryDepictionContext(presentation, memory) {
  const sceneEvents = presentation.life.timeline.filter((item) =>
    memory.sourceReferences.includes(item.eventRef));
  const threadSceneEvents = sceneEvents.filter((item) =>
    item.participantRefs.includes(presentation.manifest.threadId));
  const depictsThread = threadSceneEvents.length > 0;

  let targetAgeYears = null;
  if (depictsThread && presentation.subject.birthDate !== null) {
    const ages = threadSceneEvents
      .map((item) => ageYearsAt(presentation.subject.birthDate, item.occurredAt))
      .filter((age) => age !== null);
    const uniqueAges = [...new Set(ages)];
    if (ages.length === threadSceneEvents.length && uniqueAges.length === 1) {
      [targetAgeYears] = uniqueAges;
    }
  }

  return Object.freeze({ sceneEvents, threadSceneEvents, depictsThread, targetAgeYears });
}

function eventInputReferences(events) {
  return unique(events.flatMap((event) => [
    event.eventRef,
    event.provenanceRef,
    ...event.sourceReferences,
  ]));
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
    let referenceObjectRefs = [];
    let extraInputReferences = [];
    let stableContext = null;

    if (asset.role === "official_id_photo") {
      const identityCard = presentation.identityCard ?? null;
      const visualIdentity = presentation.visualIdentity ?? null;
      if (identityCard === null || identityCard.officialPhotoMediaRef !== asset.mediaId) {
        deferredReason = "deferred_missing_identity_card";
      } else if (visualIdentity === null) {
        deferredReason = "deferred_missing_embodiment";
      } else if (visualIdentity.referenceObjectRefs.length !== 1) {
        deferredReason = "deferred_missing_visual_identity_reference";
      } else {
        const visualIdentityDigest = threadVisualIdentityProjectionDigest(visualIdentity);
        const targetAgeYears = ageYearsAt(
          presentation.subject.birthDate,
          identityCard.issuedAt,
        );
        semanticSource = {
          asset: baseAssetSource(asset),
          identityCard: {
            credentialId: identityCard.credentialId,
            revision: identityCard.revision,
            issuedAt: identityCard.issuedAt,
            sourceReferences: identityCard.sourceReferences,
            provenanceRef: identityCard.provenanceRef,
          },
          visualIdentityDigest,
          targetAgeYears,
          referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
        };
        brief = officialIdPhotoBrief(visualIdentity, targetAgeYears);
        referenceObjectRefs = [...visualIdentity.referenceObjectRefs];
        extraInputReferences = unique([
          identityCard.credentialId,
          identityCard.provenanceRef,
          ...identityCard.sourceReferences,
          visualIdentity.embodimentId,
          ...visualIdentity.sourceReferences,
          ...visualIdentity.permissionReferences,
        ]);
        stableContext = {
          kind: "thread_presentation_media",
          threadId: presentation.manifest.threadId,
          mediaId: asset.mediaId,
          role: asset.role,
          provenanceRef: asset.provenanceRef,
          identityCardCredentialId: identityCard.credentialId,
          identityCardRevision: identityCard.revision,
          visualIdentityDigest,
          referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
          targetAgeYears,
        };
      }
    } else if (asset.role === "place") {
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
        const depiction = memoryDepictionContext(presentation, memory);
        const visualIdentity = depiction.depictsThread ? (presentation.visualIdentity ?? null) : null;
        if (depiction.depictsThread && visualIdentity === null) {
          deferredReason = "deferred_missing_embodiment";
        } else if (visualIdentity !== null && visualIdentity.referenceObjectRefs.length !== 1) {
          deferredReason = "deferred_missing_visual_identity_reference";
        } else {
          const visualIdentityDigest = visualIdentity === null
            ? null
            : threadVisualIdentityProjectionDigest(visualIdentity);
          semanticSource = {
            asset: baseAssetSource(asset),
            memory,
            sceneEvents: depiction.sceneEvents,
            depictsThread: depiction.depictsThread,
            visualIdentityDigest,
            targetAgeYears: depiction.targetAgeYears,
            referenceAgeYears: visualIdentity === null
              ? null
              : CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
          };
          brief = memoryBrief(memory, {
            visualIdentity,
            targetAgeYears: depiction.targetAgeYears,
            depictsThread: depiction.depictsThread,
          });
          extraInputReferences = eventInputReferences(depiction.sceneEvents);
          if (visualIdentity !== null) {
            referenceObjectRefs = [...visualIdentity.referenceObjectRefs];
            extraInputReferences = unique([
              ...extraInputReferences,
              visualIdentity.embodimentId,
              ...visualIdentity.sourceReferences,
              ...visualIdentity.permissionReferences,
            ]);
            stableContext = {
              kind: "thread_presentation_media",
              threadId: presentation.manifest.threadId,
              mediaId: asset.mediaId,
              role: asset.role,
              provenanceRef: asset.provenanceRef,
              visualIdentityDigest,
              referenceAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
              targetAgeYears: depiction.targetAgeYears,
            };
          }
        }
      }
    } else if (asset.role === "primary_portrait") {
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

    const inputReferences = stableContext === null
      ? unique([
          presentation.manifest.presentationId,
          media.mediaPacketId,
          snapshotObjectRef,
          ...asset.sourceReferences,
          ...(semanticSource.place?.sourceReferences ?? []),
          ...(semanticSource.memory?.sourceReferences ?? []),
          ...extraInputReferences,
        ])
      : unique([
          ...asset.sourceReferences,
          ...extraInputReferences,
        ]);

    const context = stableContext ?? {
      kind: "thread_presentation_media",
      threadId: presentation.manifest.threadId,
      presentationId: presentation.manifest.presentationId,
      mediaPacketId: media.mediaPacketId,
      mediaId: asset.mediaId,
      provenanceRef: asset.provenanceRef,
      snapshotObjectRef,
      snapshotDigest,
    };

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
      inputReferences,
      referenceObjectRefs,
      sourceDigest: presentationAssetSourceDigest(semanticSource),
      provenanceRef: asset.provenanceRef,
      deferredReason: status === "deferred" ? deferredReason : null,
      context,
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
