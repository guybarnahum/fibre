import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertInfraDriver } from "../src/infra-driver.mjs";
import {
  createMemoryInfraDriver,
  InfraIdempotencyConflictError,
  InfraImmutableObjectConflictError,
  InfraSequenceConflictError,
} from "../src/infra-memory-driver.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";
import { normalizeThreadPresentationEventInput } from "../src/thread-presentation-stream-domain.mjs";

function messageEvent({
  eventId = "evt_presentation_test_1",
  channelId = "channel_presentation_test",
  threadId = "thr_presentation_test",
  kind = "conversation.message.started",
  payload = { messageId: "msg_presentation_test_1", speaker: "fixture" },
} = {}) {
  return {
    streamVersion: "thread-presentation-stream-v0.1",
    eventId,
    threadId,
    channelId,
    occurredAt: "2026-08-21T19:07:24.000Z",
    emittedAt: "2026-08-21T19:07:24.000Z",
    kind,
    provenanceRef: "prov_fixture",
    sourceReferences: ["src_fixture"],
    payload,
  };
}

async function p2Bundle() {
  const base = new URL("../../../artifacts/validation/thread-presentation/p2/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

test("memory InfraDriver advertises the capabilities PresentationServer needs", () => {
  const infra = createMemoryInfraDriver();
  assert.doesNotThrow(() => assertInfraDriver(infra, { required: ["streams", "objects", "catalog", "realtime"] }));
  assert.equal(infra.driverId, "memory-v1");
});

test("presentation stream v0.1 refuses capability names whose Fibre producer is still deferred", () => {
  const candidate = messageEvent({ kind: "meaning.revised", payload: { meaningRef: "meaning_1" } });
  assert.throws(() => normalizeThreadPresentationEventInput(candidate), /unsupported presentation event kind/);
});

test("PresentationServer durably appends before realtime observers receive an event", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const observed = [];
  await server.subscribe("channel_presentation_test", async (event) => {
    const replay = await server.readEvents({ channelId: event.channelId, after: 0 });
    observed.push({ event, replay });
  });
  const result = await server.appendEvent(messageEvent(), { expectedSequence: 0 });
  assert.equal(result.event.sequence, 1);
  assert.equal(observed.length, 1);
  assert.equal(observed[0].replay.length, 1);
  assert.deepEqual(observed[0].replay[0], result.event);
});

test("duplicate event admission is idempotent and is not broadcast twice", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  let broadcasts = 0;
  await server.subscribe("channel_presentation_test", async () => { broadcasts += 1; });
  const first = await server.appendEvent(messageEvent());
  const second = await server.appendEvent(messageEvent());
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.event.sequence, 1);
  assert.equal(broadcasts, 1);
});

test("reusing an event id for different presentation content fails closed", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  await server.appendEvent(messageEvent());
  const changed = messageEvent({
    kind: "conversation.message.delta",
    payload: { messageId: "msg_presentation_test_1", text: "different" },
  });
  await assert.rejects(() => server.appendEvent(changed), InfraIdempotencyConflictError);
});

test("stream ordering uses expected-sequence concurrency rather than caller-assigned sequence", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  await server.appendEvent(messageEvent(), { expectedSequence: 0 });
  const next = messageEvent({
    eventId: "evt_presentation_test_2",
    kind: "conversation.message.delta",
    payload: { messageId: "msg_presentation_test_1", text: "hello" },
  });
  await assert.rejects(() => server.appendEvent(next, { expectedSequence: 0 }), InfraSequenceConflictError);
  const accepted = await server.appendEvent(next, { expectedSequence: 1 });
  assert.equal(accepted.event.sequence, 2);
  const replay = await server.readEvents({ channelId: "channel_presentation_test", after: 0 });
  assert.deepEqual(replay.map((event) => event.sequence), [1, 2]);
});

test("InfraDriver object port preserves immutable Fibre object identity", async () => {
  const infra = createMemoryInfraDriver();
  await infra.objects.putImmutable("obj_fixture_1", "first", "sha256:first", { kind: "fixture" });
  const duplicate = await infra.objects.putImmutable("obj_fixture_1", "first", "sha256:first", { kind: "fixture" });
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(
    () => infra.objects.putImmutable("obj_fixture_1", "second", "sha256:second", { kind: "fixture" }),
    InfraImmutableObjectConflictError,
  );
});

test("PresentationServer publishes and reloads the validated P2 snapshot without cloud-native identifiers", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const bundle = await p2Bundle();
  const result = await server.publishSnapshot({
    channelId: "channel_thr_pr39_g2_04",
    objectRef: "obj_thr_pr39_g2_04_presentation_v1",
    snapshotVersion: "fixture-v1",
    bundle,
    expectedSequence: 0,
    catalog: { visibility: "fixture_only" },
  });
  assert.equal(result.snapshot.cursor, 0);
  assert.match(result.digest, /^sha256:[0-9a-f]{64}$/);
  const loaded = await server.getSnapshot("channel_thr_pr39_g2_04");
  assert.equal(loaded.snapshot.presentation.manifest.threadId, "thr_pr39_g2_04");
  assert.equal(loaded.pointer.objectRef, "obj_thr_pr39_g2_04_presentation_v1");
  assert.equal(JSON.stringify(loaded.snapshot).includes("r2://"), false);
  assert.equal(JSON.stringify(loaded.snapshot).includes("durableObjectId"), false);
  const indexed = await infra.catalog.get("channel_thr_pr39_g2_04");
  assert.equal(indexed.latestSnapshotDigest, result.digest);
});
