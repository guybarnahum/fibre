import { verifyCredentialedAssetForPublication } from "#services/asset-generator/src/index.mjs";
import { requireInfraCapabilities } from "@fibre/infra";
import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";
import { THREAD_PRESENTATION_STREAM_VERSION } from "./thread-presentation-stream-domain.mjs";

function unique(values) {
  return [...new Set(values)];
}

export function createThreadPresentationAssetPublisher({
  infra,
  credentialSigner,
  presentationServer,
  now = () => new Date().toISOString(),
}) {
  requireInfraCapabilities(infra, "catalog");
  if (!presentationServer || typeof presentationServer.appendEvent !== "function" || typeof presentationServer.getSnapshot !== "function") {
    throw new TypeError("presentationServer must provide appendEvent and getSnapshot");
  }

  return Object.freeze({
    async publishReady({ receipt, channelId, expectedSequence } = {}) {
      assertId("channelId", channelId);
      const proof = await verifyCredentialedAssetForPublication({
        infra,
        credentialSigner,
        receipt,
      });
      const stored = proof.receipt;
      const context = stored.context;
      if (context.kind !== "thread_presentation_media") {
        throw new TypeError("stored asset receipt is not Thread presentation media");
      }
      for (const [name, value] of Object.entries({
        threadId: context.threadId,
        mediaId: context.mediaId,
        provenanceRef: context.provenanceRef,
      })) {
        assertId(name, value);
      }

      let identityCredentialMedia = false;
      let publiclyVisible = true;
      if (stored.role === "official_id_photo") {
        const current = await presentationServer.getSnapshot(channelId);
        if (current === null || current.pointer.threadId !== context.threadId) {
          throw new TypeError("official ID photo requires the current matching Thread presentation snapshot");
        }
        const slot = current.snapshot.media.assets.find((asset) => asset.mediaId === context.mediaId);
        const card = current.snapshot.presentation.identityCard ?? null;
        if (!slot || slot.role !== "official_id_photo" || slot.kind !== "image") {
          throw new TypeError("official ID photo receipt does not match the current media slot");
        }
        if (card === null || card.officialPhotoMediaRef !== context.mediaId) {
          throw new TypeError("official ID photo receipt is not referenced by the current identity card");
        }
        identityCredentialMedia = true;
        publiclyVisible = card.visibility === "public";
      }

      const emittedAt = now();
      if (Date.parse(emittedAt) < Date.parse(stored.completedAt)) {
        throw new TypeError("presentation asset event cannot be emitted before asset completion");
      }
      const eventId = `presasset_${sha256(canonicalJson({
        jobId: stored.jobId,
        finalAssetDigest: stored.sha256,
        generationRecordDigest: stored.generationRecordDigest,
      }))}`;
      const eventInput = {
        streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
        eventId,
        threadId: context.threadId,
        channelId,
        occurredAt: stored.completedAt,
        emittedAt,
        kind: "media.ready",
        provenanceRef: context.provenanceRef,
        sourceReferences: unique([
          ...stored.inputReferences,
          stored.generationRecordObjectRef,
        ]),
        payload: {
          mediaId: context.mediaId,
          objectRef: stored.objectRef,
          mediaType: stored.mediaType,
          digest: stored.sha256,
        },
      };
      const accepted = await presentationServer.appendEvent(eventInput, { expectedSequence });

      // This is a serving projection, not publication authority. Identity-credential
      // media defaults closed and becomes public only when the immutable current
      // presentation card explicitly authorizes public visibility.
      await infra.catalog.upsert(`media:${stored.objectRef}`, {
        kind: "public_presentation_media",
        publiclyVisible,
        identityCredentialMedia,
        threadId: context.threadId,
        mediaId: context.mediaId,
        role: stored.role,
        objectRef: stored.objectRef,
        digest: stored.sha256,
        mediaType: stored.mediaType,
        provenanceClass: "generated_reconstruction",
        eventId,
        eventSequence: accepted.event.sequence,
      });

      return { ...accepted, proof };
    },
  });
}
