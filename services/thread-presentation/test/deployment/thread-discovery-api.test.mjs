import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { THREAD_PRESENTATION_STREAM_VERSION } from "#services/world-kernel/src/thread-presentation-stream-domain.mjs";
import { createPresentationReadApi, channelIdForThread } from "../../src/http/read-api.mjs";
import { publicBirthPlaceFromPresentation, reindexPublishedBirthplaces } from "../../src/thread-directory.mjs";

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

async function catalogDiscoveryFixture(records) {
  const infra = createMemoryInfraDriver();
  const snapshots = new Map();
  for (const {
    threadId,
    publiclyVisible = true,
    identityVisibility = "public",
  } of records) {
    const channelId = channelIdForThread(threadId);
    await infra.catalog.upsert(channelId, {
      channelId,
      threadId,
      lifecycleStatus: "alive",
      publiclyVisible,
    });
    snapshots.set(channelId, {
      pointer: {
        threadId,
        snapshotVersion: "discovery-v1",
        snapshotDigest: `sha256:${threadId}`,
      },
      snapshot: {
        presentation: {
          identityCard: identityVisibility === null ? null : { visibility: identityVisibility },
        },
      },
    });
  }
  const presentationServer = {
    async getSnapshot(channelId) { return snapshots.get(channelId) ?? null; },
    async readEvents() { return []; },
    async getHead() { return { sequence: 0 }; },
  };
  return createPresentationReadApi({
    infra,
    presentationServer,
    viewerOrigin: "https://insidefibre.com",
    async openStream() { return new Response(null, { status: 426 }); },
  });
}

test("directory birthplace is admitted public birth, not inferred residence or work",()=>{
  const presentation={
    places:[
      {placeRef:"place_current_work_gen_1",displayName:"Nairobi, Kenya"},
      {placeRef:"place_birth_gen_1",displayName:"An unmapped village"},
    ],
    subject:{homePlaceRef:null},
  };
  assert.deepEqual(publicBirthPlaceFromPresentation(presentation),{
    displayName:"An unmapped village",
  },"unknown birthplace must not be assigned fabricated coordinates");
  assert.equal(publicBirthPlaceFromPresentation({
    ...presentation,places:[presentation.places[0]],
  }),null,"work city is not evidence of birthplace");
});

test("published birthplaces reindex without changing history or inventing a home",async()=>{
  const infra=createMemoryInfraDriver();
  const key="presentation:thr_born";
  const original={
    channelId:key,threadId:"thr_born",publiclyVisible:true,
    latestSnapshotDigest:"sha256:existing",
    publicDirectory:{displayName:"Ari",homePlaceRef:null},
  };
  await infra.catalog.upsert(key,original);
  await infra.catalog.upsert("presentation:thr_private",{
    channelId:"presentation:thr_private",threadId:"thr_private",
    publiclyVisible:false,publicDirectory:{displayName:"Private"},
  });
  let opened=0;
  const presentationServer={
    async getSnapshot(channelId){
      opened+=1;
      assert.equal(channelId,key,"private history must not be scanned");
      return {
        pointer:{threadId:"thr_born",snapshotDigest:"sha256:existing"},
        snapshot:{presentation:{places:[{
          placeRef:"place_birth_ari",displayName:"Los Angeles, California",
        }]}},
      };
    },
  };
  const repaired=await reindexPublishedBirthplaces({
    infra,presentationServer,limit:25,
  });
  assert.equal(repaired.updated,1,"published birthplace was not reindexed");
  const actual=await infra.catalog.get(key);
  assert.equal(actual.publicDirectory.birthPlace.displayName,"Los Angeles, California");
  assert.equal(actual.publicDirectory.birthPlace.lat,34.05223);
  assert.equal(actual.publicDirectory.homePlaceRef,null,
    "birthplace must never imply where the Thread lives now");
  assert.equal(actual.latestSnapshotDigest,original.latestSnapshotDigest,
    "index repair must preserve the immutable public snapshot witness");
  assert.equal((await infra.catalog.get("presentation:thr_private"))
    .publicDirectory.birthPlace,undefined,
    "private identity must not be published by reindex");
  const retry=await reindexPublishedBirthplaces({infra,presentationServer,limit:25});
  assert.equal(retry.updated,0,"reindex must converge");
  assert.equal(opened,1,"reindex must not reopen already-indexed snapshots");
});

test("GET /api/threads discovers only explicitly public Thread presentations", async () => {
  const visible = await discoveryFixture();
  const response = await visible.api.fetch(new Request("https://api.insidefibre.com/api/threads"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.threads.length, 1);
  assert.equal(body.threads[0].threadId, visible.threadId);
  assert.equal(body.threads[0].lifecycleStatus, "genesis_candidate");
  assert.equal(body.threads[0].displayName, null, "unnamed Threads must stay unnamed");
  assert.equal(body.threads[0].currentPresent, null);
  assert.match(body.threads[0].snapshotDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(body.nextCursor, null);

  const hidden = await discoveryFixture({ publiclyVisible: false });
  const hiddenResponse = await hidden.api.fetch(new Request("https://api.insidefibre.com/api/threads"));
  assert.equal(hiddenResponse.status, 200);
  assert.deepEqual(await hiddenResponse.json(), { threads: [], nextCursor: null });
});

test("Thread roster reads current identity and presence without reopening snapshots", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const bundle = await presentationBundle();
  const threadId = bundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  await presentationServer.publishSnapshot({
    channelId,
    objectRef:"snapshot_roster_projection_v1",
    snapshotVersion:"roster-v1",
    bundle,
    catalog:{ publiclyVisible:true },
  });
  const accepted = await presentationServer.appendEvent({
    streamVersion:THREAD_PRESENTATION_STREAM_VERSION,
    eventId:"present_roster_projection_001",
    threadId,
    channelId,
    occurredAt:"2026-09-17T18:00:00Z",
    emittedAt:"2026-09-17T18:00:00Z",
    kind:"present.updated",
    provenanceRef:"sit_roster_projection_001",
    sourceReferences:["sit_roster_projection_001"],
    payload:{
      presentVersion:"thread-public-present-v0.1",
      situationId:"sit_roster_projection_001",
      establishedAt:"2026-09-17T18:00:00Z",
      phase:"at_place",
      location:{ kind:"place", place:{ displayName:"Harbor café", region:"Haifa District" } },
      mediatedContext:null,
      activity:"Sketching the boats",
      reason:null,
      participants:[],
      depictionMediaId:"media_present_roster_projection_001",
    },
  });
  const channel = await infra.catalog.get(channelId);
  await infra.catalog.upsert(channelId, {
    ...channel,
    currentPresent:{ sequence:accepted.event.sequence, event:accepted.event },
  });

  const api = createPresentationReadApi({
    infra,
    presentationServer:{
      ...presentationServer,
      async getSnapshot() { throw new Error("roster reopened a snapshot"); },
    },
    viewerOrigin:"https://insidefibre.com",
    async openStream() { return new Response(null, { status:426 }); },
  });

  const response = await api.fetch(new Request("https://api.insidefibre.com/api/threads"));
  assert.equal(response.status, 200);
  const roster = await response.json();
  assert.equal(roster.threads[0].displayName, bundle.presentation.subject.displayName);
  assert.equal(roster.threads[0].currentPresent.payload.location.place.displayName, "Harbor café");
  assert.equal(roster.threads[0].currentPresent.payload.activity, "Sketching the boats");
});

test("snapshot witness stays on the current Presentation projection", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const bundle = await presentationBundle();
  const threadId = bundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  const published = await presentationServer.publishSnapshot({
    channelId,
    objectRef:"snapshot_health_witness_v1",
    snapshotVersion:"health-witness-v1",
    bundle,
    catalog:{ publiclyVisible:true },
  });
  const api = createPresentationReadApi({
    infra,
    presentationServer:{
      ...presentationServer,
      async getSnapshot() { throw new Error("snapshot witness reopened Presentation"); },
    },
    viewerOrigin:"https://insidefibre.com",
    async openStream() { return new Response(null, { status:426 }); },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${encodeURIComponent(threadId)}/snapshot`,
    { method:"HEAD" },
  ));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-fibre-snapshot-digest"), published.pointer.snapshotDigest);
});

test("Thread discovery pages public Threads across hidden catalog entries", async () => {
  const api = await catalogDiscoveryFixture([
    { threadId: "thr_a" },
    { threadId: "thr_b", publiclyVisible: false },
    { threadId: "thr_c" },
    { threadId: "thr_d", identityVisibility: "private" },
  ]);

  const firstResponse = await api.fetch(new Request("https://api.insidefibre.com/api/threads?limit=1"));
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();
  assert.deepEqual(first.threads.map(({ threadId }) => threadId), ["thr_a"]);
  assert.equal(first.nextCursor, "presentation:thr_a");

  const secondResponse = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads?limit=1&cursor=${encodeURIComponent(first.nextCursor)}`,
  ));
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();
  assert.deepEqual(second.threads.map(({ threadId }) => threadId), ["thr_c"]);
  assert.equal(second.nextCursor, "presentation:thr_c");

  const finalResponse = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads?limit=1&cursor=${encodeURIComponent(second.nextCursor)}`,
  ));
  assert.equal(finalResponse.status, 200);
  assert.deepEqual(await finalResponse.json(), { threads: [], nextCursor: null });
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
