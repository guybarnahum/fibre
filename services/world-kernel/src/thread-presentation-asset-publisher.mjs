import { verifyCredentialedAssetForPublication } from "../../asset-generator/src/credentialed-asset-generation-service.mjs";
import { requireInfraCapabilities } from "../../../packages/infra/src/infra-driver.mjs";
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
  if (!presentationServer || typeof presentationServer.appendEvent !== "function") {
    throw new TypeError("presentationServer.appendEvent must be a function");
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

      // This is a public-serving projection, not publication authority. The verified
      // event is admitted first; a failed catalog mirror can be retried without
      // creating a second semantic event.
      await infra.catalog.upsert(`media:${stored.objectRef}`, {
        kind: "public_presentation_media",
        publiclyVisible: true,
        threadId: context.threadId,
        mediaId: context.mediaId,
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
