import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createMemoryInfraDriver,
  InfraImmutableObjectConflictError,
} from "#infra/providers/local";
import {
  normalizeThreadPresentationBundle,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "#services/thread-presentation/src/index.mjs";
import { channelIdForThread } from "#services/thread-presentation/src/http/read-api.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";

const workerUrl = new URL("../worker.mjs", import.meta.url);

async function p2Bundle() {
  const base = new URL("../../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

async function fixturePublisherFromWorker() {
  const source = await readFile(workerUrl, "utf8");
  const digestStart = source.indexOf("function fixtureBundleDigests(bundle)");
  const slotStart = source.indexOf("async function p3Slot(", digestStart);
  const publishStart = source.indexOf("async function publishP3Fixture(", slotStart);
  const scheduleStart = source.indexOf("async function scheduleP3Media(", publishStart);
  assert.ok(digestStart >= 0 && slotStart > digestStart && publishStart > slotStart && scheduleStart > publishStart,
    "fixture seam functions must remain discoverable in the deployment worker");

  const seamSource = `${source.slice(digestStart, slotStart)}\n${source.slice(publishStart, scheduleStart)}`;
  const createPublisher = new Function(
    "normalizeThreadPresentationBundle",
    "presentationProvenanceDigest",
    "threadMediaPacketDigest",
    "threadPresentationPacketDigest",
    "channelIdForThread",
    "nonEmpty",
    `${seamSource}\nreturn publishP3Fixture;`,
  );
  return createPublisher(
    normalizeThreadPresentationBundle,
    presentationProvenanceDigest,
    threadMediaPacketDigest,
    threadPresentationPacketDigest,
    channelIdForThread,
    nonEmpty,
  );
}

function streamAdvanceEvent({ threadId, channelId }) {
  return {
    streamVersion: "thread-presentation-stream-v0.1",
    eventId: "evt_fixture_reseed_head_advance",
    threadId,
    channelId,
    occurredAt: "2026-08-26T20:00:00.000Z",
    emittedAt: "2026-08-26T20:00:00.000Z",
    kind: "conversation.message.started",
    provenanceRef: "prov_fixture",
    sourceReferences: ["src_fixture"],
    payload: {
      messageId: "msg_fixture_reseed_head_advance",
      speaker: "fixture",
    },
  };
}

test("Cloudflare live fixture harness is generic, repeatable and remains explicitly dev-only", async () => {
  const source = await readFile(workerUrl, "utf8");

  assert.match(source, /env\.P3_FIXTURE_MODE !== "1"/);
  assert.match(source, /\/__p3\/fixtures\/thread/);
  assert.match(source, /\/__p3\/fixtures\/generate/);
  assert.match(source, /body\.threadId/);
  assert.match(source, /body\.mediaId/);
  assert.match(source, /presentation\?\.manifest\?\.fixture !== true/);
  assert.match(source, /normalizeThreadPresentationBundle/);
  assert.match(source, /threadPresentationPacketDigest/);
  assert.match(source, /threadMediaPacketDigest/);
  assert.match(source, /presentationProvenanceDigest/);
  assert.match(source, /presentationServer\.getSnapshot\(channelId\)/);
  assert.match(source, /reused: true/,
    "re-seeding an identical fixture must reuse the existing immutable snapshot even after stream events advance");
  assert.match(source, /already seeded with different content/,
    "the repeatable fixture seam must still reject a different bundle under the same fixture Thread");
  assert.match(source, /\/__p3\/fixtures\/can-tho\/generate-market/,
    "existing Cần Thơ P3 endpoint should remain as a compatibility alias");
});

test("fixture reseed reuses the existing immutable snapshot after the Presentation stream advances", async () => {
  const publishP3Fixture = await fixturePublisherFromWorker();
  const bundle = await p2Bundle();
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  let snapshotWrites = 0;
  const presentationServer = {
    getSnapshot(channelId) {
      return server.getSnapshot(channelId);
    },
    async publishSnapshot(input) {
      snapshotWrites += 1;
      return server.publishSnapshot(input);
    },
  };

  const first = await publishP3Fixture({ bundle, presentationServer });
  assert.equal(first.reused, false);
  assert.equal(snapshotWrites, 1);

  const threadId = bundle.presentation.manifest.threadId;
  const channelId = channelIdForThread(threadId);
  const initialSnapshot = await server.getSnapshot(channelId);
  assert.equal(initialSnapshot.snapshot.cursor, 0);

  await server.appendEvent(streamAdvanceEvent({ threadId, channelId }), { expectedSequence: 0 });
  assert.equal((await server.getHead(channelId)).sequence, 1);

  const second = await publishP3Fixture({ bundle, presentationServer });
  assert.equal(second.reused, true);
  assert.equal(snapshotWrites, 1, "identical reseed must not attempt another immutable snapshot write");
  assert.equal(second.snapshotDigest, first.snapshotDigest);

  const reusedSnapshot = await server.getSnapshot(channelId);
  assert.equal(reusedSnapshot.pointer.objectRef, initialSnapshot.pointer.objectRef);
  assert.equal(reusedSnapshot.pointer.snapshotDigest, initialSnapshot.pointer.snapshotDigest);
  assert.equal(reusedSnapshot.snapshot.cursor, 0,
    "stream advancement must not rewrite the immutable fixture snapshot cursor");

  const changed = structuredClone(bundle);
  changed.presentation.introduction.summary += " Different fixture content.";
  await assert.rejects(
    () => publishP3Fixture({ bundle: changed, presentationServer }),
    /already seeded with different content/,
  );
  assert.equal(snapshotWrites, 1, "conflicting fixture identity must fail before immutable storage");

  await assert.rejects(
    () => infra.objects.putImmutable(
      initialSnapshot.pointer.objectRef,
      new TextEncoder().encode("different immutable snapshot bytes"),
      "sha256:different",
      { kind: "thread_presentation_snapshot" },
    ),
    InfraImmutableObjectConflictError,
    "fixture idempotency must not weaken immutable object semantics",
  );
});
