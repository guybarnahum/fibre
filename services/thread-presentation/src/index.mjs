// Stable provider-neutral consumer seam for Thread Presentation.
//
// Packet normalization still delegates to World Kernel while that authority is
// physically implemented there. Consumers must import this service boundary so
// the implementation can move without coupling them to kernel-private paths.

export {
  PRESENTATION_LIFECYCLE_STATUSES,
  PRESENTATION_MEDIA_KINDS,
  PRESENTATION_MEDIA_STATUSES,
  PRESENTATION_PROVENANCE_KINDS,
  PRESENTATION_PROVENANCE_VERSION,
  THREAD_MEDIA_PACKET_VERSION,
  THREAD_PRESENTATION_PACKET_CURRENT_VERSION,
  THREAD_PRESENTATION_PACKET_LEGACY_VERSION,
  THREAD_PRESENTATION_PACKET_VERSION,
  THREAD_PRESENTATION_PACKET_VERSIONS,
  normalizePresentationProvenance,
  normalizeThreadMediaPacket,
  normalizeThreadPresentationBundle,
  normalizeThreadPresentationPacket,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "../../world-kernel/src/thread-presentation-domain.mjs";

export {
  FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
  FIBRE_IDENTITY_CARD_DATE_KINDS,
  FIBRE_IDENTITY_CARD_STATUSES,
  THREAD_VISUAL_IDENTITY_PROJECTION_VERSION,
  assertFibreIdentityNumberFormat,
  fibreIdentityCardDisplayData,
  normalizeFibreIdentityCard,
  normalizePresentationCivilIdentity,
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "../../world-kernel/src/thread-presentation-identity-domain.mjs";
