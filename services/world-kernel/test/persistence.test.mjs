import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IdempotencyConflictError,
  IntegrityError,
  StaleThreadVersionError,
  canonicalJson,
  openWorldStore,
  threadStateHash,
} from "../src/persistence.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-store-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function updateSelfModelCommand(overrides = {}) {
  return {
    commandId: "cmd_mina_self_model_001",
    threadId: fixture.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel:
        "I am reliable in systems work and I explicitly seek authentication review before making identity-system commitments.",
      summary: "Mina clarified when she seeks authentication expertise.",
    },
    actor: {
      entityId: "human_guy",
      kind: "human",
      displayName: "Guy Bar-Nahum",
    },
    occurredAt: "2026-08-04T22:30:00Z",
    ...overrides,
  };
}

test("canonical JSON and state hashes ignore object key insertion order", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  assert.equal(threadStateHash({ b: 2, a: 1 }), threadStateHash({ a: 1, b: 2 }));
});

test("seeds Mina with a durable projection and append-only seed event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    const seeded = store.seedThread(fixture);
    assert.equal(seeded.created, true);
    assert.deepEqual(store.getThread(fixture.threadId), fixture);
    const events = store.listEvents(fixture.threadId);
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, "THREAD_SEEDED");
    assert.equal(events[0].stateHash, threadStateHash(fixture));
    assert.deepEqual(store.verifyThreadIntegrity(fixture.threadId), {
      threadId: fixture.threadId,
      version: 1,
      stateHash: threadStateHash(fixture),
      eventCount: 1,
    });
    store.close();
  }));

test("applies a validated self-model command atomically and advances version", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    const result = store.applyCommand(updateSelfModelCommand());
    assert.equal(result.idempotent, false);
    assert.equal(result.thread.version, 2);
    assert.equal(result.thread.provenance.lastEventId, result.event.eventId);
    assert.equal(result.event.expectedVersion, 1);
    assert.equal(result.event.resultingVersion, 2);
    assert.equal(result.event.stateHash, threadStateHash(result.thread));
    assert.equal(store.listEvents(fixture.threadId).length, 2);
    assert.deepEqual(store.verifyThreadIntegrity(fixture.threadId), {
      threadId: fixture.threadId,
      version: 2,
      stateHash: threadStateHash(result.thread),
      eventCount: 2,
    });
    store.close();
  }));

test("rejects a stale expected version without appending an event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    store.applyCommand(updateSelfModelCommand());
    assert.throws(
      () =>
        store.applyCommand(
          updateSelfModelCommand({
            commandId: "cmd_mina_stale",
            payload: {
              selfModel: "This stale write must not be accepted.",
              summary: "Attempted stale write.",
            },
          }),
        ),
      StaleThreadVersionError,
    );
    assert.equal(store.getThread(fixture.threadId).version, 2);
    assert.equal(store.listEvents(fixture.threadId).length, 2);
    store.close();
  }));

test("retries an identical command idempotently without duplicating effects", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    const first = store.applyCommand(updateSelfModelCommand());
    const retry = store.applyCommand(updateSelfModelCommand());
    assert.equal(retry.idempotent, true);
    assert.deepEqual(retry.thread, first.thread);
    assert.equal(store.listEvents(fixture.threadId).length, 2);
    assert.equal(store.getThread(fixture.threadId).version, 2);
    store.close();
  }));

test("rejects reuse of an idempotency key with different command content", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    store.applyCommand(updateSelfModelCommand());
    assert.throws(
      () =>
        store.applyCommand(
          updateSelfModelCommand({
            payload: {
              selfModel: "Different content under the same command ID.",
              summary: "Conflicting retry.",
            },
          }),
        ),
      IdempotencyConflictError,
    );
    assert.equal(store.listEvents(fixture.threadId).length, 2);
    store.close();
  }));

test("survives process-style close and reopen with identical replay hash", () =>
  withDatabase((databasePath) => {
    const firstStore = openWorldStore(databasePath);
    firstStore.seedThread(fixture);
    const result = firstStore.applyCommand(updateSelfModelCommand());
    const beforeRestart = firstStore.verifyThreadIntegrity(fixture.threadId);
    firstStore.close();

    const restartedStore = openWorldStore(databasePath);
    assert.deepEqual(restartedStore.getThread(fixture.threadId), result.thread);
    assert.deepEqual(restartedStore.verifyThreadIntegrity(fixture.threadId), beforeRestart);
    restartedStore.close();
  }));

test("database triggers enforce append-only events", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();

    const database = new DatabaseSync(databasePath);
    assert.throws(
      () =>
        database
          .prepare("UPDATE thread_events SET state_hash = ? WHERE event_id = ?")
          .run("sha256:tampered", result.event.eventId),
      /append-only/,
    );
    database.close();
  }));

test("detects event-history tampering during deterministic replay", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    store.seedThread(fixture);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();

    const database = new DatabaseSync(databasePath);
    database.exec("DROP TRIGGER thread_events_no_update");
    database
      .prepare("UPDATE thread_events SET state_hash = ? WHERE event_id = ?")
      .run("sha256:tampered", result.event.eventId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.verifyThreadIntegrity(fixture.threadId), IntegrityError);
    reopened.close();
  }));
