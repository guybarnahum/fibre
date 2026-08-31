import { verifyCredentialedAssetForPublication } from "#services/asset-generator/src/index.mjs";
import { requireInfraCapabilities } from "#infra";
import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";
import { THREAD_PRESENTATION_STREAM_VERSION } from "./thread-presentation-stream-domain.mjs";

function unique(values) {
  return [...new Set(values)];
}

function latestTimestamp(...values) {
  return values.reduce((latest, value) => (
    Date.parse(value) > Date.parse(latest) ? value : latest
  ));
}

function mediaReadySnapshotIdentity(current, event) {
  const digest = sha256(canonicalJson({
    priorSnapshotDigest: current.pointer.snapshotDigest,
    eventId: event.eventId,
    eventSequence: event.sequence,
    mediaId: event.payload.mediaId,
    objectRef: event.payload.objectRef,
    digest: event.payload.digest,
  }));
  return Object.freeze({
    objectRef: `snapshot_media_ready_${digest}`,
    snapshotVersion: `media-ready-${digest.slice(0, 24)}`,
  });
}

async function projectMediaReadySnapshot(presentationServer, current, event, proof) {
  if (current === null) return null;
  const assets = current.snapshot.media.assets;
  const index = assets.findIndex((asset) => asset.mediaId === event.payload.mediaId);
  if (index < 0) return null;

  const prior = assets[index];
  if (prior.status === "ready") {
    if (prior.locator !== event.payload.objectRef
      || prior.mediaType !== event.payload.mediaType
      || prior.sha256 !== event.payload.digest) {
      throw new TypeError(`media.ready conflicts with already-ready media ${event.payload.mediaId}`);
    }
    return current;
  }

  const receipt = proof.receipt;
  const generation = proof.generationRecord.generation;
  const generatedAt = latestTimestamp(
    current.snapshot.presentation.manifest.generatedAt,
    current.snapshot.media.generatedAt,
    current.snapshot.provenance.generatedAt,
    event.emittedAt,
  );
  const nextAssets = assets.map((asset, assetIndex) => (
    assetIndex === index
      ? {
          ...asset,
          status: "ready",
          locator: event.payload.objectRef,
          mediaType: event.payload.mediaType,
          sha256: event.payload.digest,
          width: receipt.width,
          height: receipt.height,
          durationMs: receipt.durationMs,
          unavailableReason: null,
          generation: {
            provider: generation.provider,
            model: generation.model,
            generatedAt: generation.generatedAt,
            inputReferences: [...receipt.inputReferences],
          },
        }
      : asset
  ));
  const identity = mediaReadySnapshotIdentity(current, event);
  return presentationServer.publishSnapshot({
    channelId: event.channelId,
    objectRef: identity.objectRef,
    snapshotVersion: identity.snapshotVersion,
    expectedSequence: event.sequence,
    bundle: {
      presentation: {
        ...current.snapshot.presentation,
        manifest: {
          ...current.snapshot.presentation.manifest,
          generatedAt,
        },
      },
      media: {
        ...current.snapshot.media,
        generatedAt,
        assets: nextAssets,
      },
      provenance: {
        ...current.snapshot.provenance,
        generatedAt,
      },
    },
    catalog: {
      projectionKind: "media_ready",
      mediaId: event.payload.mediaId,
      mediaObjectRef: event.payload.objectRef,
    },
  });
}

export function createThreadPresentationAssetPublisher({
  infra,
  credentialSigner,
  presentationServer,
  now = () => new Date().toISOString(),
}) {
  requireInfraCapabilities(infra, "catalog");
  if (!presentationServer
    || typeof presentationServer.appendEvent !== "function"
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("presentationServer must provide appendEvent, getSnapshot, and publishSnapshot");
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

      const currentSnapshot = await presentationServer.getSnapshot(channelId);
      let identityCredentialMedia = false;
      let publiclyVisible = true;
      if (stored.role === "official_id_photo") {
        const current = currentSnapshot;
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
      const snapshotProjection = accepted.duplicate
        ? currentSnapshot
        : await projectMediaReadySnapshot(presentationServer, currentSnapshot, accepted.event, proof);

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

      return { ...accepted, proof, snapshotProjection };
    },
  });
}
