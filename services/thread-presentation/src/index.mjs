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
  THREAD_PRESENTATION_PACKET_VERSION,
  normalizePresentationProvenance,
  normalizeThreadMediaPacket,
  normalizeThreadPresentationBundle,
  normalizeThreadPresentationPacket,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "../../world-kernel/src/thread-presentation-domain.mjs";
