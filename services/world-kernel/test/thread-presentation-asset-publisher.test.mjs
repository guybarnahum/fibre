import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  ASSET_GENERATION_JOB_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  executeProvenancedAssetGenerationJob,
} from "#services/asset-generator/src/index.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";
import { createThreadPresentationAssetPublisher } from "../src/thread-presentation-asset-publisher.mjs";

const encoder = new TextEncoder();

function provider() {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-publisher-provider",
    capabilities: ["image"],
    async generate(request) {
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { prompt: `compiled: ${request.brief.description}`, model: "fixture-v2" },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode("publisher-fixture-image"),
          mediaType: "image/webp",
          width: 512,
          height: 512,
          durationMs: null,
          provider: "fixture",
          model: "fixture-v2",
          providerRequestId: "req_publisher_1",
          generatedAt: "2026-08-21T21:20:00Z",
          configuration: {},
        },
      };
    },
  };
}

function job({ role = "place", mediaId = "media_place_1", suffix = "1" } = {}) {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: `asset_job_publisher_${suffix}`,
    assetKind: "image",
    role,
    variant: "default",
    brief: {
      description: `A generated reconstruction for ${role}.`,
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1", "source_1"],
    referenceObjectRefs: [],
    outputObjectRef: `asset_publisher_${suffix}`,
    receiptObjectRef: `asset_publisher_receipt_${suffix}`,
    requestedAt: "2026-08-21T21:19:59Z",
    providerProfile: "presentation-image-default-v1",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_1",
      mediaId,
      role,
      provenanceRef: "prov_generated_reconstruction",
    },
  };
}

async function generated(infra, generationJob = job()) {
  return executeProvenancedAssetGenerationJob({
    infra,
    provider: provider(),
    job: generationJob,
    now: () => "2026-08-21T21:20:03Z",
  });
}

test("Thread presentation publishes media.ready only after stored Fibre provenance verification", async () => {
  const infra = createMemoryInfraDriver();
  const result = await generated(infra);
  const presentationServer = createThreadPresentationServer({ infra });
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    presentationServer,
    now: () => "2026-08-21T21:20:04Z",
  });
  const accepted = await publisher.publishReady({
    receipt: result.receipt,
    channelId: "channel_thr_1",
    expectedSequence: 0,
  });

  assert.equal(accepted.event.kind, "media.ready");
  assert.equal(accepted.event.payload.objectRef, result.receipt.objectRef);
  assert.equal(accepted.event.payload.digest, result.receipt.sha256);
  assert.equal(accepted.proof.generationRecord.jobId, result.receipt.jobId);
  assert.equal(accepted.proof.generationRecord.providerOutputDigest, result.receipt.providerOutputDigest);
  assert.equal((await presentationServer.getHead("channel_thr_1")).sequence, 1);

  const publicMedia = await infra.catalog.get(`media:${result.receipt.objectRef}`);
  assert.deepEqual(publicMedia, {
    kind: "public_presentation_media",
    publiclyVisible: true,
    identityCredentialMedia: false,
    threadId: "thr_1",
    mediaId: "media_place_1",
    role: "place",
    objectRef: result.receipt.objectRef,
    digest: result.receipt.sha256,
    mediaType: "image/webp",
    provenanceClass: "generated_reconstruction",
    eventId: accepted.event.eventId,
    eventSequence: 1,
  });
});

test("private official ID photo can become media.ready without becoming public media", async () => {
  const infra = createMemoryInfraDriver();
  const generationJob = job({
    role: "official_id_photo",
    mediaId: "media_official_id_photo",
    suffix: "official",
  });
  const result = await generated(infra, generationJob);
  const acceptedEvents = [];
  const projectedSnapshots = [];
  const presentationServer = {
    async getSnapshot() {
      return {
        pointer: {
          threadId: "thr_1",
          snapshotDigest: "sha256:fixture-private-id-snapshot",
        },
        snapshot: {
          presentation: {
            manifest: { generatedAt: "2026-08-21T21:19:58Z" },
            identityCard: {
              officialPhotoMediaRef: "media_official_id_photo",
              visibility: "private",
            },
          },
          media: {
            generatedAt: "2026-08-21T21:19:58Z",
            assets: [{
              mediaId: "media_official_id_photo",
              role: "official_id_photo",
              kind: "image",
              status: "placeholder",
            }],
          },
          provenance: { generatedAt: "2026-08-21T21:19:58Z" },
        },
      };
    },
    async appendEvent(event) {
      const accepted = { ...event, sequence: 1 };
      acceptedEvents.push(accepted);
      return { event: accepted, duplicate: false };
    },
    async publishSnapshot(input) {
      projectedSnapshots.push(input);
      return { pointer: { threadId: "thr_1" }, snapshot: input.bundle };
    },
  };
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    presentationServer,
    now: () => "2026-08-21T21:20:04Z",
  });
  const accepted = await publisher.publishReady({
    receipt: result.receipt,
    channelId: "channel_thr_1",
  });

  assert.equal(accepted.event.kind, "media.ready");
  assert.equal(acceptedEvents.length, 1);
  assert.equal(projectedSnapshots.length, 1);
  assert.equal(projectedSnapshots[0].bundle.media.assets[0].status, "ready");
  const catalog = await infra.catalog.get(`media:${result.receipt.objectRef}`);
  assert.equal(catalog.publiclyVisible, false);
  assert.equal(catalog.identityCredentialMedia, false);
  assert.equal(catalog.role, "official_id_photo");
});

test("publisher requires snapshot projection capability", () => {
  const infra = createMemoryInfraDriver();
  assert.throws(() => createThreadPresentationAssetPublisher({
    infra,
    presentationServer: {
      async getSnapshot() { return null; },
      async appendEvent() { return null; },
    },
  }), /appendEvent, getSnapshot, and publishSnapshot/);
});

test("receipt tampering blocks media.ready and public-media projection", async () => {
  const infra = createMemoryInfraDriver();
  const result = await generated(infra);
  const presentationServer = createThreadPresentationServer({ infra });
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    presentationServer,
    now: () => "2026-08-21T21:20:04Z",
  });
  const tampered = {
    ...result.receipt,
    sha256: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  };

  await assert.rejects(
    () => publisher.publishReady({
      receipt: tampered,
      channelId: "channel_thr_1",
      expectedSequence: 0,
    }),
    /final asset digest does not match stored asset receipt/,
  );
  assert.equal((await presentationServer.getHead("channel_thr_1")).sequence, 0);
  assert.equal(await infra.catalog.get(`media:${result.receipt.objectRef}`), null);
});
