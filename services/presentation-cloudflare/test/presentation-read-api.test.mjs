import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "../../../packages/infra/src/memory-driver.mjs";
import { createThreadPresentationServer } from "../../world-kernel/src/thread-presentation-server.mjs";
import { THREAD_PRESENTATION_STREAM_VERSION } from "../../world-kernel/src/thread-presentation-stream-domain.mjs";
import { createPresentationReadApi, channelIdForThread } from "../src/presentation-read-api.mjs";

async function p2Bundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

async function fixture({ publiclyVisible = true } = {}) {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const bundle = await p2Bundle();
  const threadId = bundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  await presentationServer.publishSnapshot({
    channelId,
    objectRef: "snapshot_can_tho_api_v1",
    snapshotVersion: "p3-api-v1",
    bundle,
    catalog: { publiclyVisible },
  });
  const opened = [];
  const api = createPresentationReadApi({
    infra,
    presentationServer,
    viewerOrigin: "https://insidefibre.com",
    async openStream(input) {
      opened.push(input.channelId);
      return new Response("fixture-stream", { status: 200 });
    },
  });
  return { infra, presentationServer, bundle, threadId, channelId, api, opened };
}

test("read API exposes only explicitly public presentation snapshots", async () => {
  const visible = await fixture();
  const response = await visible.api.fetch(new Request(`https://api.insidefibre.com/api/threads/${visible.threadId}/snapshot`));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.pointer.threadId, visible.threadId);
  assert.equal(body.snapshot.presentation.manifest.lifecycleStatus, "genesis_candidate");

  const hidden = await fixture({ publiclyVisible: false });
  const hiddenResponse = await hidden.api.fetch(new Request(`https://api.insidefibre.com/api/threads/${hidden.threadId}/snapshot`));
  assert.equal(hiddenResponse.status, 404);
});

test("read API returns ordered presentation replay and delegates websocket only after public-channel check", async () => {
  const current = await fixture();
  await current.presentationServer.appendEvent({
    streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
    eventId: "event_snapshot_changed_1",
    threadId: current.threadId,
    channelId: current.channelId,
    occurredAt: "2026-08-21T21:30:00Z",
    emittedAt: "2026-08-21T21:30:00Z",
    kind: "presentation.snapshot.changed",
    provenanceRef: "prov_fixture_presentation",
    sourceReferences: ["snapshot_can_tho_api_v1"],
    payload: {
      snapshotVersion: "p3-api-v2",
      snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      objectRef: "snapshot_can_tho_api_v2",
    },
  }, { expectedSequence: 0 });

  const replayResponse = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/events?after=0&limit=10`,
  ));
  assert.equal(replayResponse.status, 200);
  const replay = await replayResponse.json();
  assert.equal(replay.head, 1);
  assert.equal(replay.events.length, 1);
  assert.equal(replay.events[0].sequence, 1);

  const streamResponse = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/stream?after=1`,
    { headers: { Upgrade: "websocket" } },
  ));
  assert.equal(streamResponse.status, 200);
  assert.deepEqual(current.opened, [current.channelId]);
});

test("media route requires verified public-media catalog projection rather than object possession", async () => {
  const current = await fixture();
  const bytes = new TextEncoder().encode("credentialed-image-fixture");
  const digest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  await current.infra.objects.putImmutable("asset_public_1", bytes, digest, { kind: "credentialed_generated_media" });

  const before = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/media/asset_public_1`,
  ));
  assert.equal(before.status, 404, "knowing a Fibre objectRef must not make it public");

  await current.infra.catalog.upsert("media:asset_public_1", {
    kind: "public_presentation_media",
    publiclyVisible: true,
    threadId: current.threadId,
    mediaId: "media_place_market",
    objectRef: "asset_public_1",
    digest,
    mediaType: "image/webp",
    provenanceClass: "generated_reconstruction",
    eventId: "event_media_ready_1",
    eventSequence: 1,
  });
  const after = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/media/asset_public_1`,
  ));
  assert.equal(after.status, 200);
  assert.equal(after.headers.get("Content-Type"), "image/webp");
  assert.equal(after.headers.get("X-Fibre-Provenance"), "generated_reconstruction");
  assert.equal(new TextDecoder().decode(await after.arrayBuffer()), "credentialed-image-fixture");
});

test("read API rejects unapproved browser origins before revealing public presentation data", async () => {
  const current = await fixture();
  const rejected = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/snapshot`,
    { headers: { Origin: "https://attacker.example" } },
  ));
  assert.equal(rejected.status, 403);

  const accepted = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/snapshot`,
    { headers: { Origin: "https://insidefibre.com" } },
  ));
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("Access-Control-Allow-Origin"), "https://insidefibre.com");
});
