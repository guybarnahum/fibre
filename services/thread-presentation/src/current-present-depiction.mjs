import {
  CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  ageYearsAt,
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "fibre/world-kernel/thread-presentation-contracts";
import { presentationAssetSourceDigest } from "fibre/world-kernel/presentation-asset-contracts";
import {resolveVisualAgeReferences} from "fibre/world-kernel/thread-presentation-contracts";

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

function presentBrief(present, targetAgeYears, selectedReferences = []) {
  const ageAnchors=selectedReferences.filter(reference=>reference.admissionId!==null);
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
      ...(ageAnchors.length===0?[]:[`Reference images in order: image 1 is the canonical age-${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} root; ${ageAnchors.map((anchor,index)=>`image ${index+2} is the admitted age-${anchor.targetAgeYears} portrait`).join("; ")}. Each image depicts this one Thread.`]),
      targetAgeYears === null
        ? `The canonical identity reference depicts the same person at normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS}; preserve identity without asserting an unsupported exact age.`
        : `Preserve the canonical identity while age-transforming naturally from normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} to ${targetAgeYears} years old for this scene.`,
    ].join(" "),
    constraints: [
      "This image is a generated presentation reconstruction of an enacted current situation, not World evidence or a documentary photograph.",
      "Use only the supplied public scene facts; do not infer or depict private plans, regulation, emotion, memory, relationship meaning, or hidden participants.",
      "Observed situation context is not a claim about the Thread's private motive or feeling.",
      ageAnchors.length>0
        ? "The first image is the canonical identity authority; subsequent images are approved age-local portraits of that same Thread, never separate identities. Use them to guide aging without copying their pose or background."
        : "Use the supplied canonical visual-identity reference as the complete likeness anchor; do not re-derive appearance from ancestry, family, demographic, or phenotype text.",
      "Do not add identifiable people beyond the publicly named participants.",
      "Avoid text overlays, labels, signatures, watermarks, or claims of authentic capture.",
    ],
  };
}

export function planCurrentPresentDepiction({ present, presentation, canonicalReferenceDigest = null, ageAnchorAdmissions = [] }) {
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
  const selected = referenceReady && targetAgeYears !== null && canonicalReferenceDigest !== null
    ? resolveVisualAgeReferences({
        threadId,targetAgeYears,canonicalReferenceObjectRef:visualIdentity.referenceObjectRefs[0],
        canonicalReferenceDigest,admissions:ageAnchorAdmissions,
      })
    : null;
  const references = selected?.referenceObjectRefs ?? (referenceReady ? visualIdentity.referenceObjectRefs : []);
  const source = {
    threadId,
    present,
    visualIdentityDigest,
    targetAgeYears,
    ...(selected?.references.length > 1
      ? {ageReferenceAdmissions:selected.references.filter(item=>item.admissionId!==null)
          .map(item=>({admissionId:item.admissionId,objectRef:item.objectRef,digest:item.digest}))}
      : {}),
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
    brief: referenceReady ? presentBrief(present, targetAgeYears, selected?.references ?? []) : null,
    inputReferences: referenceReady
      ? [...new Set([
          present.situationId,
          visualIdentity.embodimentId,
          visualIdentity.provenanceRef,
          ...visualIdentity.sourceReferences,
          ...visualIdentity.permissionReferences,
          ...(selected?.references.filter(item=>item.admissionId!==null).map(item=>item.admissionId)??[]),
        ])]
      : [present.situationId],
    referenceObjectRefs: [...references],
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
