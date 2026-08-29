import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  ASSET_GENERATION_JOB_VERSION,
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  executeCredentialedAssetGenerationJob,
  normalizeEmbeddedAssetProvenance,
} from "#services/asset-generator/src/index.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";
import { createThreadPresentationAssetPublisher } from "../src/thread-presentation-asset-publisher.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-PUBLISHER-CREDENTIAL--\n";

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function signer({ forceInvalid = false } = {}) {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-publisher-signer",
    format: "fixture-content-credential",
    async embed({ bytes, assertion }) {
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifest = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifest),
        format: "fixture-content-credential",
        signerId: "fixture-publisher-signer",
        manifestDigest: await sha256(manifest),
        embeddedAt: "2026-08-21T21:20:01Z",
      };
    },
    async verify({ bytes }) {
      if (forceInvalid) {
        return {
          valid: false,
          format: "fixture-content-credential",
          signerId: "fixture-publisher-signer",
          manifestDigest: null,
          assertion: null,
          verifiedAt: "2026-08-21T21:20:02Z",
          failureReason: "forced invalid credential",
        };
      }
      const text = decoder.decode(bytes);
      const index = text.lastIndexOf(DELIMITER);
      const assertion = normalizeEmbeddedAssetProvenance(JSON.parse(text.slice(index + DELIMITER.length)));
      const manifest = encoder.encode(JSON.stringify(assertion));
      return {
        valid: true,
        format: "fixture-content-credential",
        signerId: "fixture-publisher-signer",
        manifestDigest: await sha256(manifest),
        assertion,
        verifiedAt: "2026-08-21T21:20:02Z",
        failureReason: null,
      };
    },
  };
}

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
    brief: { description: `A generated reconstruction for ${role}.`, constraints: ["Not documentary evidence."] },
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
  return executeCredentialedAssetGenerationJob({
    infra,
    provider: provider(),
    credentialSigner: signer(),
    job: generationJob,
    now: () => "2026-08-21T21:20:03Z",
  });
}

test("Thread presentation publishes media.ready only after stored credentialed asset verification", async () => {
  const infra = createMemoryInfraDriver();
  const result = await generated(infra);
  const presentationServer = createThreadPresentationServer({ infra });
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: signer(),
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
  assert.equal(accepted.proof.verification.valid, true);
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
  const generationJob = job({ role: "official_id_photo", mediaId: "media_official_id_photo", suffix: "official" });
  const result = await generated(infra, generationJob);
  const acceptedEvents = [];
  const presentationServer = {
    async getSnapshot() {
      return {
        pointer: { threadId: "thr_1" },
        snapshot: {
          presentation: {
            identityCard: { officialPhotoMediaRef: "media_official_id_photo", visibility: "private" },
          },
          media: {
            assets: [{ mediaId: "media_official_id_photo", role: "official_id_photo", kind: "image" }],
          },
        },
      };
    },
    async appendEvent(event) {
      const accepted = { ...event, sequence: 1 };
      acceptedEvents.push(accepted);
      return { event: accepted, duplicate: false };
    },
  };
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: signer(),
    presentationServer,
    now: () => "2026-08-21T21:20:04Z",
  });
  const accepted = await publisher.publishReady({
    receipt: result.receipt,
    channelId: "channel_thr_1",
  });
  assert.equal(accepted.event.kind, "media.ready");
  assert.equal(acceptedEvents.length, 1);
  const catalog = await infra.catalog.get(`media:${result.receipt.objectRef}`);
  assert.equal(catalog.publiclyVisible, false);
  assert.equal(catalog.identityCredentialMedia, true);
  assert.equal(catalog.role, "official_id_photo");
});

test("invalid credential blocks media.ready and public-media catalog projection", async () => {
  const infra = createMemoryInfraDriver();
  const result = await generated(infra);
  const presentationServer = createThreadPresentationServer({ infra });
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: signer({ forceInvalid: true }),
    presentationServer,
    now: () => "2026-08-21T21:20:04Z",
  });
  await assert.rejects(
    () => publisher.publishReady({
      receipt: result.receipt,
      channelId: "channel_thr_1",
      expectedSequence: 0,
    }),
    /content credential verification failed/,
  );
  assert.equal((await presentationServer.getHead("channel_thr_1")).sequence, 0);
  assert.equal(await infra.catalog.get(`media:${result.receipt.objectRef}`), null);
});
