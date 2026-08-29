import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi, channelIdForThread } from "../../src/http/read-api.mjs";

async function p2Bundle() {
  const base = new URL("../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

async function fixture() {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const bundle = await p2Bundle();
  const threadId = bundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  await presentationServer.publishSnapshot({
    channelId,
    objectRef: "snapshot_generic_asset_route",
    snapshotVersion: "generic-asset-route-v1",
    bundle,
    catalog: { publiclyVisible: true },
  });
  const api = createPresentationReadApi({
    infra,
    presentationServer,
    async openStream() { return new Response("unused"); },
  });
  return { infra, threadId, api };
}

test("generic asset route and Thread compatibility route resolve the same published Fibre asset", async () => {
  const current = await fixture();
  const objectRef = "asset_generic_route_demo";
  const bytes = new TextEncoder().encode("generic-route-image");
  const digest = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

  await current.infra.objects.putImmutable(
    objectRef,
    bytes,
    digest,
    { kind: "credentialed_generated_media" },
  );

  const before = await current.api.fetch(new Request(`https://api.insidefibre.com/api/assets/${objectRef}`));
  assert.equal(before.status, 404, "immutable object existence alone must not create a public asset");

  await current.infra.catalog.upsert(`media:${objectRef}`, {
    kind: "public_presentation_media",
    publiclyVisible: true,
    identityCredentialMedia: false,
    threadId: current.threadId,
    mediaId: "media_place_market",
    role: "place",
    objectRef,
    digest,
    mediaType: "image/webp",
    provenanceClass: "generated_reconstruction",
    eventId: "event_generic_asset_route_demo",
    eventSequence: 1,
  });

  const generic = await current.api.fetch(new Request(`https://api.insidefibre.com/api/assets/${objectRef}`));
  const compatibility = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/media/${objectRef}`,
  ));

  assert.equal(generic.status, 200);
  assert.equal(compatibility.status, 200);
  assert.equal(generic.headers.get("Content-Type"), "image/webp");
  assert.equal(generic.headers.get("ETag"), compatibility.headers.get("ETag"));
  assert.equal(generic.headers.get("X-Fibre-Provenance"), "generated_reconstruction");
  assert.equal(
    new TextDecoder().decode(await generic.arrayBuffer()),
    new TextDecoder().decode(await compatibility.arrayBuffer()),
  );
});
