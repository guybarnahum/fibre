import {
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "#services/world-kernel/src/thread-presentation-identity-domain.mjs";
import {
  presentationAssetSourceDigest,
} from "#services/world-kernel/src/presentation-asset-demand.mjs";
import {
  CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  ageYearsAt,
} from "#services/world-kernel/src/visual-identity-reference-domain.mjs";

function sceneLocation(location) {
  if (location.kind === "place") {
    return location.place === null
      ? "at a current place whose identity is not public"
      : `at ${location.place.displayName}${location.place.region ? ` — ${location.place.region}` : ""}`;
  }
  const from = location.from?.displayName ?? "a non-public origin";
  const to = location.to?.displayName ?? "a non-public destination";
  return `in transit from ${from} toward ${to}`;
}

function presentBrief(present, visualIdentity, targetAgeYears) {
  const people = present.participants.length === 0
    ? "No other publicly named participant is established in this scene."
    : `Publicly named participants: ${present.participants.join(", ")}.`;
  return {
    description: [
      "Generated current-scene reconstruction for a public Thread presentation.",
      `The Thread is ${sceneLocation(present.location)}.`,
      `Current activity: ${present.activity}`,
      ...(present.reason === null ? [] : [`Observed situation context: ${present.reason}`]),
      ...(present.mediatedContext === null ? [] : [`Mediated presence: ${present.mediatedContext}`]),
      people,
      `Authorized subject appearance: ${visualIdentity.subjectDescription}`,
      `Authorized rendering continuity: ${visualIdentity.renderDescription}`,
      targetAgeYears === null
        ? `The canonical identity reference depicts the same person at normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}; preserve identity without asserting an unsupported exact age.`
        : `Preserve the canonical identity while age-transforming naturally from normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} to ${targetAgeYears} years old for this scene.`,
    ].join(" "),
    constraints: [
      "This image is a generated presentation reconstruction of an enacted current situation, not World evidence or a documentary photograph.",
      "Use only the supplied public scene facts; do not infer or depict private plans, regulation, emotion, memory, relationship meaning, or hidden participants.",
      "Observed situation context is not a claim about the Thread's private motive or feeling.",
      "Use the supplied canonical visual-identity reference as the Thread's identity anchor; do not materially redesign the person.",
      "Do not add identifiable people beyond the publicly named participants.",
      "Avoid text overlays, labels, signatures, watermarks, or claims of authentic capture.",
    ],
  };
}

export function planCurrentPresentDepiction({ present, presentation }) {
  if (!present || typeof present !== "object" || Array.isArray(present)) {
    throw new TypeError("public present is required");
  }
  if (!presentation || typeof presentation !== "object" || Array.isArray(presentation)) {
    throw new TypeError("Thread presentation is required");
  }
  const threadId = presentation.manifest?.threadId;
  if (typeof threadId !== "string" || threadId === "") throw new TypeError("Thread presentation threadId is required");
  const visualIdentity = normalizeThreadVisualIdentityProjection(presentation.visualIdentity ?? null);
  const referenceReady = visualIdentity !== null && visualIdentity.referenceObjectRefs.length === 1;
  const targetAgeYears = referenceReady
    ? ageYearsAt(presentation.subject?.birthDate ?? null, present.establishedAt)
    : null;
  const visualIdentityDigest = referenceReady
    ? threadVisualIdentityProjectionDigest(visualIdentity)
    : null;
  const source = {
    threadId,
    present,
    visualIdentityDigest,
    targetAgeYears,
  };

  return Object.freeze({
    slotKey: `present:${present.situationId}:media:${present.depictionMediaId}`,
    entityKind: "experience",
    entityRef: present.situationId,
    mediaId: present.depictionMediaId,
    assetKind: "image",
    role: "present_scene",
    variant: "current",
    status: referenceReady ? "missing" : "deferred",
    brief: referenceReady ? presentBrief(present, visualIdentity, targetAgeYears) : null,
    inputReferences: referenceReady
      ? [...new Set([
          present.situationId,
          visualIdentity.embodimentId,
          visualIdentity.provenanceRef,
          ...visualIdentity.sourceReferences,
          ...visualIdentity.permissionReferences,
        ])]
      : [present.situationId],
    referenceObjectRefs: referenceReady ? [...visualIdentity.referenceObjectRefs] : [],
    sourceDigest: presentationAssetSourceDigest(source),
    provenanceRef: present.situationId,
    deferredReason: referenceReady ? null : "deferred_missing_visual_identity_reference",
    context: {
      kind: "experience_presentation_media",
      eventRef: present.situationId,
      threadId,
      mediaId: present.depictionMediaId,
      provenanceRef: present.situationId,
      currentPresent: true,
    },
  });
}