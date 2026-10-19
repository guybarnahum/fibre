export { normalizeThreadPresentationBundle } from "../src/thread-presentation-domain.mjs";
export {
  FIBRE_IDENTITY_CARD_CURRENT_VERSION,
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "../src/thread-presentation-identity-domain.mjs";
export {
  THREAD_PRESENTATION_STREAM_VERSION,
  normalizeThreadPresentationEvent,
} from "../src/thread-presentation-stream-domain.mjs";
export {
  CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  ageYearsAt,
} from "../src/visual-identity-reference-domain.mjs";
export {
  readVisualAgeAnchorAdmissions,
  VISUAL_AGE_ANCHOR_ADMISSION_CATALOG_PREFIX,
} from "../src/visual-age-anchor-catalog.mjs";
export {
  admittedVisualAgeAnchors,
  normalizeVisualAgeAnchorAdmission,
  resolveVisualAgeReferences,
  VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
} from "../src/visual-age-anchors.mjs";
