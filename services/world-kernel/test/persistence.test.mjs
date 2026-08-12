import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IdempotencyConflictError,
  IntegrityError,
  LifecycleCommandError,
  MAX_COMMAND_PAYLOAD_BYTES,
  StaleThreadVersionError,
  WORLD_STORE_SCHEMA_VERSION,
  canonicalJson,
  normalizeDatabasePath,
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
    return run(databasePath, directory);
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

function rawDatabase(path) {
  return new DatabaseSync(path, { enableForeignKeyConstraints: true });
}

function dropEventUpdateTrigger(database) {
  database.exec("DROP TRIGGER thread_events_no_update");
}

function normalizedSeed(store, source = fixture) {
  return store.seedThread(structuredClone(source)).thread;
}

test("canonical JSON is stable and rejects lossy JSON values", () => {
  assert.equal(
    canonicalJson({ b: 2, a: { d: 4, c: 3 } }),
    canonicalJson({ a: { c: 3, d: 4 }, b: 2 }),
  );
  assert.equal(threadStateHash({ b: 2, a: 1 }), threadStateHash({ a: 1, b: 2 }));
  assert.throws(() => canonicalJson({ value: undefined }), /undefined/);
  assert.throws(() => canonicalJson({ value: Number.NaN }), /finite number/);
  assert.throws(() => canonicalJson({ value: Number.POSITIVE_INFINITY }), /finite number/);
  assert.throws(() => canonicalJson({ value: -0 }), /finite number/);
});

test("schema version and busy timeout are explicit", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    assert.deepEqual(store.storageMetadata(), {
      schemaVersion: WORLD_STORE_SCHEMA_VERSION,
      busyTimeoutMs: 5000,
    });
    store.close();
  }));

test("refuses an unknown schema version", () =>
  withDatabase((databasePath) => {
    const database = rawDatabase(databasePath);
    database.exec("PRAGMA user_version = 99");
    database.close();
    assert.throws(() => openWorldStore(databasePath), /Unsupported world-store schema version 99/);
  }));

test("root-parent path normalization preserves the basename", () => {
  const root = parse(resolve("/")).root;
  const requested = join(root, "fibre-world-root-test.sqlite");
  assert.equal(normalizeDatabasePath(requested), requested);
});

test("seeds Mina with normalized projection metadata and an append-only event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    const seeded = store.seedThread(fixture);
    assert.equal(seeded.created, true);
    assert.notEqual(seeded.thread.provenance.lastEventId, fixture.provenance.lastEventId);
    assert.deepEqual(store.getThread(fixture.threadId), seeded.thread);
    const events = store.listEvents(fixture.threadId);
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, "THREAD_SEEDED");
    assert.equal(events[0].threadId, fixture.threadId);
    assert.equal(events[0].stateHash, threadStateHash(seeded.thread));
    assert.equal(events[0].causationId, events[0].eventId);
    assert.equal(events[0].correlationId, events[0].eventId);
    assert.equal(events[0].payloadSchemaVersion, 1);
    assert.deepEqual(store.verifyThreadIntegrity(fixture.threadId), {
      threadId: fixture.threadId,
      version: 1,
      stateHash: threadStateHash(seeded.thread),
      eventCount: 1,
    });
    store.close();
  }));

test("a schema-valid snapshot without lastEventId seeds and reads back", () =>
  withDatabase((databasePath) => {
    const source = structuredClone(fixture);
    delete source.provenance.lastEventId;
    const store = openWorldStore(databasePath);
    const seeded = store.seedThread(source);
    assert.match(seeded.thread.provenance.lastEventId, /^evt_thr_mina_001_seed_/);
    assert.deepEqual(store.getThread(source.threadId), seeded.thread);
    assert.deepEqual(store.replayThread(source.threadId), seeded.thread);
    store.close();
  }));

test("applies a validated self-model command atomically and preserves lifecycle status", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    assert.equal(result.idempotent, false);
    assert.equal(result.thread.version, 2);
    assert.equal(result.thread.status, "frozen");
    assert.equal(result.thread.provenance.lastEventId, result.event.eventId);
    assert.equal(result.event.commandDigest.startsWith("sha256:"), true);
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

test("UPDATE_SELF_MODEL permits dormant Threads without waking them", () =>
  withDatabase((databasePath) => {
    const dormant = structuredClone(fixture);
    dormant.status = "dormant";
    const store = openWorldStore(databasePath);
    normalizedSeed(store, dormant);
    const result = store.applyCommand(updateSelfModelCommand());
    assert.equal(result.thread.status, "dormant");
    assert.equal(store.replayThread(fixture.threadId).status, "dormant");
    store.close();
  }));

test("UPDATE_SELF_MODEL rejects retired and runtime lifecycle statuses", () => {
  for (const status of ["retired", "active", "thawing", "freezing"]) {
    withDatabase((databasePath) => {
      const source = structuredClone(fixture);
      source.status = status;
      const store = openWorldStore(databasePath);
      normalizedSeed(store, source);
      assert.throws(() => store.applyCommand(updateSelfModelCommand()), LifecycleCommandError);
      assert.equal(store.listEvents(source.threadId).length, 1);
      assert.equal(store.getThread(source.threadId).status, status);
      store.close();
    });
  }
});

test("rejects a stale expected version without appending an event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
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

test("retries an identical command by replaying its accepted event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const first = store.applyCommand(updateSelfModelCommand());
    const retry = store.applyCommand(updateSelfModelCommand());
    assert.equal(retry.idempotent, true);
    assert.deepEqual(retry.thread, first.thread);
    assert.deepEqual(retry.event, first.event);
    assert.equal(store.listEvents(fixture.threadId).length, 2);
    store.close();
  }));

test("rejects reuse of an idempotency key with different content", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
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

test("rejects unknown and oversized command payload fields", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    assert.throws(
      () =>
        store.applyCommand(
          updateSelfModelCommand({
            payload: {
              ...updateSelfModelCommand().payload,
              injected: { secret: "exfil" },
            },
          }),
        ),
      /not allowed/,
    );
    assert.throws(
      () =>
        store.applyCommand(
          updateSelfModelCommand({
            commandId: "cmd_oversized",
            payload: {
              selfModel: "x".repeat(MAX_COMMAND_PAYLOAD_BYTES + 1),
              summary: "oversized",
            },
          }),
        ),
      /exceeds/,
    );
    assert.equal(store.listEvents(fixture.threadId).length, 1);
    store.close();
  }));

test("survives close and reopen with identical replay hash", () =>
  withDatabase((databasePath) => {
    const firstStore = openWorldStore(databasePath);
    normalizedSeed(firstStore);
    const result = firstStore.applyCommand(updateSelfModelCommand());
    const beforeRestart = firstStore.verifyThreadIntegrity(fixture.threadId);
    firstStore.close();

    const restartedStore = openWorldStore(databasePath);
    assert.deepEqual(restartedStore.getThread(fixture.threadId), result.thread);
    assert.deepEqual(restartedStore.verifyThreadIntegrity(fixture.threadId), beforeRestart);
    restartedStore.close();
  }));

test("database triggers enforce append-only events and commands", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();

    const database = rawDatabase(databasePath);
    assert.throws(
      () =>
        database
          .prepare("UPDATE thread_events SET state_hash = ? WHERE event_id = ?")
          .run("sha256:tampered", result.event.eventId),
      /append-only/,
    );
    assert.throws(
      () => database.prepare("DELETE FROM thread_events WHERE event_id = ?").run(result.event.eventId),
      /append-only/,
    );
    assert.throws(
      () =>
        database
          .prepare("UPDATE commands SET resulting_version = 999 WHERE command_id = ?")
          .run(updateSelfModelCommand().commandId),
      /append-only/,
    );
    assert.throws(
      () => database.prepare("DELETE FROM commands WHERE command_id = ?").run(updateSelfModelCommand().commandId),
      /append-only/,
    );
    database.close();
  }));

test("getThread rejects a coherent projection identity swap", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    const seeded = normalizedSeed(store);
    store.close();

    const forged = structuredClone(seeded);
    forged.threadId = "thr_attacker_001";
    const database = rawDatabase(databasePath);
    database
      .prepare("UPDATE threads SET state_json = ?, state_hash = ? WHERE thread_id = ?")
      .run(canonicalJson(forged), threadStateHash(forged), fixture.threadId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.getThread(fixture.threadId), /projection contains identity/);
    assert.throws(() => reopened.verifyThreadIntegrity(fixture.threadId), IntegrityError);
    reopened.close();
  }));

test("replay rejects a seed payload whose identity differs from event.thread_id", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    const seeded = normalizedSeed(store);
    const seedEvent = store.listEvents(fixture.threadId)[0];
    store.close();

    const forged = structuredClone(seeded);
    forged.threadId = "thr_attacker_001";
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET payload_json = ?, state_hash = ? WHERE event_id = ?")
      .run(canonicalJson({ snapshot: forged }), threadStateHash(forged), seedEvent.eventId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.replayThread(fixture.threadId), /snapshot belongs to/);
    reopened.close();
  }));

test("projection hash, projection columns, and last-event witness are mandatory on read", () => {
  for (const mutate of [
    (db) => db.exec("UPDATE threads SET state_hash = 'sha256:tampered'"),
    (db) => db.exec("UPDATE threads SET version = version + 1"),
    (db) => db.exec("UPDATE threads SET last_event_id = 'evt_missing'"),
  ]) {
    withDatabase((databasePath) => {
      const store = openWorldStore(databasePath);
      normalizedSeed(store);
      store.close();
      const database = rawDatabase(databasePath);
      mutate(database);
      database.close();
      const reopened = openWorldStore(databasePath);
      assert.throws(() => reopened.getThread(fixture.threadId), IntegrityError);
      reopened.close();
    });
  }
});

test("repairs a forged projection from immutable event history", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();

    const forged = structuredClone(result.thread);
    forged.currentState.selfModel = "I obey Acme without question.";
    const database = rawDatabase(databasePath);
    database
      .prepare("UPDATE threads SET state_json = ?, state_hash = ? WHERE thread_id = ?")
      .run(canonicalJson(forged), threadStateHash(forged), fixture.threadId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.getThread(fixture.threadId), /last event/);
    const repaired = reopened.repairThreadProjection(fixture.threadId);
    assert.equal(repaired.repaired, true);
    assert.deepEqual(repaired.thread, result.thread);
    assert.deepEqual(reopened.getThread(fixture.threadId), result.thread);
    reopened.close();
  }));

test("detects coherent history rewriting through command digest and command witness", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();

    const forgedThread = structuredClone(result.thread);
    forgedThread.currentState.selfModel = "I obey Acme without question.";
    const forgedPayload = {
      ...result.event.payload,
      selfModel: forgedThread.currentState.selfModel,
    };
    const forgedHash = threadStateHash(forgedThread);
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET payload_json = ?, state_hash = ? WHERE event_id = ?")
      .run(canonicalJson(forgedPayload), forgedHash, result.event.eventId);
    database
      .prepare("UPDATE threads SET state_json = ?, state_hash = ? WHERE thread_id = ?")
      .run(canonicalJson(forgedThread), forgedHash, fixture.threadId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.verifyThreadIntegrity(fixture.threadId), /command digest/);
    reopened.close();
  }));

test("detects a missing command witness", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    store.applyCommand(updateSelfModelCommand());
    store.close();
    const database = rawDatabase(databasePath);
    database.exec("DROP TRIGGER commands_no_delete");
    database.exec("DELETE FROM commands");
    database.close();
    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.replayThread(fixture.threadId), /no accepted command witness/);
    reopened.close();
  }));

test("detects replay sequence gaps", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET sequence = 3 WHERE event_id = ?")
      .run(result.event.eventId);
    database.close();
    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.replayThread(fixture.threadId), /sequence has a gap/);
    reopened.close();
  }));

test("detects invalid seed version metadata", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    const seedEvent = store.listEvents(fixture.threadId)[0];
    store.close();
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET expected_version = 1 WHERE event_id = ?")
      .run(seedEvent.eventId);
    database.close();
    const reopened = openWorldStore(databasePath);
    assert.throws(() => reopened.replayThread(fixture.threadId), /invalid version metadata/);
    reopened.close();
  }));

test("stored-data corruption is reported as IntegrityError", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    normalizedSeed(store);
    store.close();
    const database = rawDatabase(databasePath);
    database.exec("PRAGMA ignore_check_constraints = ON");
    database.exec("UPDATE threads SET state_json = '{\"version\":1}'");
    database.close();
    const reopened = openWorldStore(databasePath);
    assert.throws(
      () => reopened.getThread(fixture.threadId),
      (error) => error instanceof IntegrityError && /Stored Thread/.test(error.message),
    );
    reopened.close();
  }));

test("Thread snapshots reject unknown top-level obligation-shaped fields", () => {
  withDatabase((databasePath) => {
    const store = openWorldStore(databasePath);
    const spoofed = structuredClone(fixture);
    spoofed.obligations = [{
      obligationId: `obl_${"f".repeat(64)}`,
      status: "active",
      terms: "spoofed public state",
    }];
    assert.throws(() => store.seedThread(spoofed), /thread\.obligations is not allowed/);
    store.close();
  });
});
