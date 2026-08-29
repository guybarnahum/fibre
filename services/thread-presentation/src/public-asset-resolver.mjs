import { requireInfraCapabilities } from "#infra";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

function assertId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function plain(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export class PublicPresentationAssetIntegrityError extends Error {}

export function threadPresentationChannelId(threadId) {
  return `presentation:${assertId("threadId", threadId)}`;
}

function normalizePublicMediaRecord(value, objectRef) {
  if (!plain(value)
    || value.kind !== "public_presentation_media"
    || value.publiclyVisible !== true
    || value.objectRef !== objectRef) {
    return null;
  }

  try {
    assertId("media.threadId", value.threadId);
    assertId("media.mediaId", value.mediaId);
    assertId("media.objectRef", value.objectRef);
    assertId("media.eventId", value.eventId);
    nonEmpty("media.role", value.role);
    nonEmpty("media.digest", value.digest);
    nonEmpty("media.mediaType", value.mediaType);
    nonEmpty("media.provenanceClass", value.provenanceClass);
    if (!Number.isSafeInteger(value.eventSequence) || value.eventSequence < 1) return null;
    if (value.identityCredentialMedia !== undefined && typeof value.identityCredentialMedia !== "boolean") return null;
  } catch {
    return null;
  }

  return Object.freeze({
    kind: value.kind,
    publiclyVisible: true,
    identityCredentialMedia: value.identityCredentialMedia === true,
    threadId: value.threadId,
    mediaId: value.mediaId,
    role: value.role,
    objectRef: value.objectRef,
    digest: value.digest,
    mediaType: value.mediaType,
    provenanceClass: value.provenanceClass,
    eventId: value.eventId,
    eventSequence: value.eventSequence,
  });
}

function identityCredentialVisible(snapshot, media) {
  const card = snapshot?.presentation?.identityCard ?? null;

  if (card !== null
    && card.officialPhotoMediaRef === media.mediaId
    && card.visibility !== "public") {
    return false;
  }

  if (media.role === "official_id_photo" || media.identityCredentialMedia) {
    return card !== null
      && card.officialPhotoMediaRef === media.mediaId
      && card.visibility === "public";
  }

  return true;
}

export function createPublicPresentationAssetResolver({
  infra,
  presentationReader,
}) {
  requireInfraCapabilities(infra, "catalog", "objects");
  if (!presentationReader
    || typeof presentationReader.getSnapshot !== "function") {
    throw new TypeError("public presentation asset resolver requires presentationReader.getSnapshot");
  }

  return Object.freeze({
    async resolve(objectRef, { expectedThreadId = null } = {}) {
      assertId("objectRef", objectRef);
      if (expectedThreadId !== null) assertId("expectedThreadId", expectedThreadId);

      const media = normalizePublicMediaRecord(
        await infra.catalog.get(`media:${objectRef}`),
        objectRef,
      );
      if (media === null) return null;
      if (expectedThreadId !== null && media.threadId !== expectedThreadId) return null;

      const channelId = threadPresentationChannelId(media.threadId);
      const channel = await infra.catalog.get(channelId);
      if (!plain(channel)
        || channel.threadId !== media.threadId
        || channel.publiclyVisible !== true) {
        return null;
      }

      const current = await presentationReader.getSnapshot(channelId);
      if (current === null || current.pointer?.threadId !== media.threadId) return null;

      const slot = current.snapshot?.media?.assets?.find((asset) => asset.mediaId === media.mediaId) ?? null;
      if (slot === null || slot.role !== media.role) return null;
      if (!identityCredentialVisible(current.snapshot, media)) return null;

      const stored = await infra.objects.get(objectRef);
      if (stored === null || stored.digest !== media.digest) {
        throw new PublicPresentationAssetIntegrityError(
          `published presentation asset ${objectRef} does not match immutable object storage`,
        );
      }

      return Object.freeze({
        objectRef,
        threadId: media.threadId,
        mediaId: media.mediaId,
        role: media.role,
        mediaType: media.mediaType,
        digest: stored.digest,
        provenanceClass: media.provenanceClass,
        eventId: media.eventId,
        eventSequence: media.eventSequence,
        bytes: stored.bytes,
      });
    },
  });
}
