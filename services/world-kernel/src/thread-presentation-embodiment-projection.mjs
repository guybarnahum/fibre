import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import {
  THREAD_VISUAL_IDENTITY_PROJECTION_VERSION,
  normalizeThreadVisualIdentityProjection,
} from "./thread-presentation-identity-domain.mjs";

/**
 * Convert one committed canonical portrait Embodiment record into the bounded
 * authority projection Thread Presentation is allowed to consume.
 *
 * The textual embodiment specification defines the person, but does not by
 * itself establish a usable visual reference. Public visual identity appears
 * only after the canonical reference image has been generated, verified, and
 * bound back to the Embodiment as an immutable Asset Generator object ref.
 */
export function projectPublicEmbodimentVisualIdentity(
  embodimentCandidate,
  { provenanceRef } = {},
) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (
    embodiment.kind !== "portrait"
    || embodiment.visibility !== "public"
    || embodiment.status !== "available"
    || embodiment.asset?.referenceObjectRef === null
  ) {
    return null;
  }

  return normalizeThreadVisualIdentityProjection({
    projectionVersion: THREAD_VISUAL_IDENTITY_PROJECTION_VERSION,
    authority: "authorized_embodiment_projection",
    embodimentId: embodiment.embodimentId,
    embodimentRevision: embodiment.revision,
    specificationDigest: embodiment.specificationDigest,
    subjectDescription: embodiment.specification.subject.description,
    renderDescription: embodiment.specification.description,
    sourceReferences: [embodiment.embodimentId, ...embodiment.sourceReferences],
    permissionReferences: embodiment.permissionReferences,
    referenceObjectRefs: [embodiment.asset.referenceObjectRef],
    provenanceRef,
  });
}
