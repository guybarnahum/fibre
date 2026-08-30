import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import {
  THREAD_VISUAL_IDENTITY_PROJECTION_VERSION,
  normalizeThreadVisualIdentityProjection,
} from "./thread-presentation-identity-domain.mjs";

/**
 * Convert one committed canonical portrait Embodiment record into the bounded
 * authority projection Thread Presentation is allowed to consume.
 *
 * This function does not decide layout, identity-card policy, media demand, or
 * public presentation structure. It only carries authoritative appearance
 * semantics across the World Kernel -> Thread Presentation boundary.
 *
 * Non-public, non-portrait, and unavailable embodiments intentionally produce
 * no public visual-identity authority projection.
 */
export function projectPublicEmbodimentVisualIdentity(
  embodimentCandidate,
  { provenanceRef } = {},
) {
  const embodiment = normalizeEmbodimentRepresentation(embodimentCandidate);
  if (
    embodiment.kind !== "portrait"
    || embodiment.visibility !== "public"
    || embodiment.status === "unavailable_with_reason"
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
    // Embodiment asset locators are World-owned opaque cache:// / asset://
    // references, not Thread Presentation object-store references. Do not leak
    // or reinterpret them as presentation object refs here.
    referenceObjectRefs: [],
    provenanceRef,
  });
}
