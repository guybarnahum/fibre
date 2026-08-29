import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { THREAD_PRESENTATION_STREAM_VERSION } from "#services/world-kernel/src/thread-presentation-stream-domain.mjs";
import { createPresentationReadApi, channelIdForThread } from "../../src/http/read-api.mjs";

async function p2Bundle() {
  const base = new URL("../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

async function privateIdentityBundle() {
  const bundle = await p2Bundle();
  bundle.presentation.schemaVersion = "thread-presentation-packet-v0.2";
  bundle.presentation.manifest = {
    ...bundle.presentation.manifest,
    lifecycleStatus: "active",
    fixture: false,
  };
  bundle.provenance.entries.push(
    {
      provenanceId: "prov_read_civil",
      kind: "authoritative_fact",
      sourceReferences: ["registration_read", "birth_read", "world_read"],
      note: "Read-only civil registration projection.",
    },
    {
      provenanceId: "prov_read_card",
      kind: "fibre_projection",
      sourceReferences: ["registration_read", "card_read"],
      note: "Private identity-card presentation.",
    },
  );
  bundle.media.assets = bundle.media.assets.map((asset) =>
    asset.mediaId === "media_portrait_primary" ? { ...asset, role: "official_id_photo" } : asset);
  bundle.presentation.civilIdentity = {
    fibreIdentityNumber: "7K3M-2Q-8W5R",
    registrationId: "registration_read",
    registeredAt: "2026-08-25T10:00:00Z",
    birthEventRef: "birth_read",
    worldRef: "world_read",
    issuer: "fibre_civil_registry",
    sourceReferences: ["registration_read", "birth_read", "world_read"],
    provenanceRef: "prov_read_civil",
  };
  bundle.presentation.visualIdentity = null;
  bundle.presentation.identityCard = {
    credentialVersion: "fibre-identity-card-credential-v0.1",
    credentialId: "fibre_card_read",
    cardSerial: "FIC-READ-1",
    revision: 1,
    supersedesCredentialId: null,
    registrationId: "registration_read",
    displayName: null,
    dateField: { kind: "birth_date", value: bundle.presentation.subject.birthDate },
    issuedAt: "2026-08-25T10:05:00Z",
    expiresAt: null,
    status: "active",
    visibility: "private",
    officialPhotoMediaRef: "media_portrait_primary",
    machineReadableCredentialRef: null,
    sourceReferences: ["registration_read", "card_read"],
    provenanceRef: "prov_read_card",
  };
  return bundle;
}

async function fixture({ publiclyVisible = true, bundle = null } = {}) {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const resolvedBundle = bundle ?? await p2Bundle();
  const threadId = resolvedBundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  await presentationServer.publishSnapshot({
    channelId,
    objectRef: "snapshot_can_tho_api_v1",
    snapshotVersion: "p3-api-v1",
    bundle: resolvedBundle,
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
  return { infra, presentationServer, bundle: resolvedBundle, threadId, channelId, api, opened };
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
    role: "place",
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

test("catalog mistakes cannot expose a private Fibre identity card or its official photo", async () => {
  const current = await fixture({ publiclyVisible: true, bundle: await privateIdentityBundle() });

  const snapshotResponse = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/snapshot`,
  ));
  assert.equal(snapshotResponse.status, 404, "immutable private card visibility must override public channel catalog error");

  const bytes = new TextEncoder().encode("private-official-photo");
  const digest = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
  await current.infra.objects.putImmutable("asset_private_id_photo", bytes, digest, { kind: "credentialed_generated_media" });
  await current.infra.catalog.upsert("media:asset_private_id_photo", {
    kind: "public_presentation_media",
    publiclyVisible: true,
    threadId: current.threadId,
    mediaId: "media_portrait_primary",
    role: "place",
    objectRef: "asset_private_id_photo",
    digest,
    mediaType: "image/png",
    provenanceClass: "generated_reconstruction",
    eventId: "event_private_photo_catalog_mistake",
    eventSequence: 1,
  });

  const photoResponse = await current.api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${current.threadId}/media/asset_private_id_photo`,
  ));
  assert.equal(photoResponse.status, 404, "immutable identity-card mediaRef must defeat catalog role/publicity mistakes");
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
