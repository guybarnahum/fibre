import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi, channelIdForThread } from "../../src/http/read-api.mjs";

async function presentationBundle() {
  const base = new URL("../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

async function discoveryFixture({ publiclyVisible = true } = {}) {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const bundle = await presentationBundle();
  const threadId = bundle.presentation.manifest.threadId;
  await presentationServer.publishSnapshot({
    channelId: channelIdForThread(threadId),
    objectRef: "snapshot_discovery_fixture_v1",
    snapshotVersion: "discovery-v1",
    bundle,
    catalog: { publiclyVisible },
  });
  await infra.catalog.upsert("media:unrelated_asset", {
    kind: "public_presentation_media",
    publiclyVisible: true,
  });
  const api = createPresentationReadApi({
    infra,
    presentationServer,
    viewerOrigin: "https://insidefibre.com",
    async openStream() { return new Response(null, { status: 426 }); },
  });
  return { api, threadId };
}

test("GET /api/threads discovers only explicitly public Thread presentations", async () => {
  const visible = await discoveryFixture();
  const response = await visible.api.fetch(new Request("https://api.insidefibre.com/api/threads"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    threads: [{
      threadId: visible.threadId,
      lifecycleStatus: "genesis_candidate",
      snapshotVersion: "discovery-v1",
      snapshotDigest: body.threads[0].snapshotDigest,
    }],
    nextCursor: null,
  });
  assert.match(body.threads[0].snapshotDigest, /^sha256:[0-9a-f]{64}$/);

  const hidden = await discoveryFixture({ publiclyVisible: false });
  const hiddenResponse = await hidden.api.fetch(new Request("https://api.insidefibre.com/api/threads"));
  assert.equal(hiddenResponse.status, 200);
  assert.deepEqual(await hiddenResponse.json(), { threads: [], nextCursor: null });
});

test("Thread discovery validates pagination input and browser origin", async () => {
  const current = await discoveryFixture();
  const invalid = await current.api.fetch(new Request("https://api.insidefibre.com/api/threads?limit=0"));
  assert.equal(invalid.status, 400);

  const rejected = await current.api.fetch(new Request(
    "https://api.insidefibre.com/api/threads",
    { headers: { Origin: "https://attacker.example" } },
  ));
  assert.equal(rejected.status, 403);

  const accepted = await current.api.fetch(new Request(
    "https://api.insidefibre.com/api/threads?limit=10",
    { headers: { Origin: "https://insidefibre.com" } },
  ));
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("Access-Control-Allow-Origin"), "https://insidefibre.com");
});
