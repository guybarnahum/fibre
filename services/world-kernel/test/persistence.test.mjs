import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {THREAD_EVENT_COLUMNS,THREAD_EVENT_TYPES} from "../src/thread-event-schema.mjs";

import {
  IdempotencyConflictError,
  IntegrityError,
  LifecycleCommandError,
  MAX_COMMAND_PAYLOAD_BYTES,
  StaleThreadVersionError,
  WORLD_STORE_SCHEMA_VERSION,
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    assert.throws(() => openWorldStore(localWorldStateStorage(databasePath)), /Unsupported world-store schema version 99/);
  }));

test("seeds Mina with normalized projection metadata and an append-only event", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
    const seeded = store.seedThread(source);
    assert.match(seeded.thread.provenance.lastEventId, /^evt_thr_mina_001_seed_/);
    assert.deepEqual(store.getThread(source.threadId), seeded.thread);
    assert.deepEqual(store.replayThread(source.threadId), seeded.thread);
    store.close();
  }));

test("applies a validated self-model command atomically and preserves lifecycle status", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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

test("event schema upgrade from inline kinds preserves command-linked history, and new kinds need no rebuild",()=>
  withDatabase(databasePath=>{
    const store=openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(store);
    const command=store.applyCommand(updateSelfModelCommand());
    store.close();

    // Recreate the prior table, whose kinds were listed inline, without
    // changing referential semantics. The next World open must upgrade it.
    const database=rawDatabase(databasePath);
    let beforeEvents,beforeCommands;
    try{
      beforeEvents=database.prepare(
        "SELECT event_id,event_type FROM thread_events ORDER BY sequence",
      ).all();
      beforeCommands=database.prepare(
        "SELECT command_id,event_id FROM commands",
      ).all();
      assert.equal(beforeCommands[0]?.event_id,command.event.eventId,
        "fixture lacks a command-linked event");

      const current=database.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='thread_events'",
      ).get().sql;
      const kinds=Object.keys(THREAD_EVENT_TYPES).map(kind=>`'${kind}'`).join(",");
      const legacy=current.replace("event_type TEXT NOT NULL,",`event_type TEXT NOT NULL CHECK (event_type IN (${kinds})),`);
      assert.notEqual(legacy,current,"fixture did not create an older event constraint");
      const holding=legacy.replace('"thread_events"','"thread_events_legacy_fixture"');
      database.exec("BEGIN IMMEDIATE");
      try{
        database.exec("PRAGMA defer_foreign_keys=ON");
        database.exec("DROP TRIGGER thread_events_no_update; DROP TRIGGER thread_events_no_delete; DROP TRIGGER thread_events_known_kind");
        database.exec(holding);
        database.exec(`
          INSERT INTO thread_events_legacy_fixture (${THREAD_EVENT_COLUMNS})
            SELECT ${THREAD_EVENT_COLUMNS} FROM thread_events;
          DROP TABLE thread_events;
        `);
        database.exec(legacy);
        database.exec(`
          INSERT INTO thread_events (${THREAD_EVENT_COLUMNS})
            SELECT ${THREAD_EVENT_COLUMNS} FROM thread_events_legacy_fixture;
          DROP TABLE thread_events_legacy_fixture;
        `);
        database.exec("COMMIT");
      }catch(error){database.exec("ROLLBACK");throw error;}
      assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys,1,
        "fixture disabled foreign-key enforcement");
    }finally{database.close();}

    const reopened=openWorldStore(localWorldStateStorage(databasePath));
    reopened.close();
    const checked=rawDatabase(databasePath);
    try{
        assert.deepEqual(checked.prepare(
          "SELECT event_id,event_type FROM thread_events ORDER BY sequence",
        ).all(),beforeEvents,"event upgrade lost Thread history");
        assert.deepEqual(checked.prepare(
          "SELECT command_id,event_id FROM commands",
        ).all(),beforeCommands,"event upgrade lost accepted commands");
        assert.deepEqual(checked.prepare("PRAGMA foreign_key_check").all(),[],
          "event upgrade broke command references");
        assert.ok(!checked.prepare("SELECT sql FROM sqlite_master WHERE name='thread_events'").get().sql
          .includes("event_type IN ("),"the upgraded table still lists its kinds inline");
        const insert=(kind,commandId)=>checked.prepare(`INSERT INTO thread_events (${THREAD_EVENT_COLUMNS})
          VALUES (?,?,99,98,99,?,?,?,'{}','{}','2026-11-10T00:00:00Z','sha256:x',NULL,'c','c',1,'{}')`)
          .run(`evt_kind_${kind}`,fixture.threadId,kind,commandId,commandId===null?null:"sha256:d");
        assert.throws(()=>insert("THREAD_INVENTED",null),/event kind/,"an unknown kind entered Thread history");
        assert.throws(()=>insert("THREAD_SEEDED","cmd_forged"),/event kind/,"an uncommanded kind carried a command");
        assert.throws(()=>insert("SELF_MODEL_UPDATED",null),/event kind/,"a commanded kind lost its command");
        // A kind admitted later is one row, not a rebuild of history.
        checked.prepare("INSERT INTO thread_event_types(event_type,commanded) VALUES ('THREAD_LATER_KIND',0)").run();
        assert.doesNotThrow(()=>insert("THREAD_LATER_KIND",null),"a newly admitted kind was refused");
    }finally{checked.close();}
  }));

test("every reference to a Thread event is indexed, so rebuilding history costs what it copies",()=>
  withDatabase(databasePath=>{
    openWorldStore(localWorldStateStorage(databasePath)).close();
    const database=rawDatabase(databasePath);
    try{
      const referring=database.prepare(`SELECT name FROM sqlite_master WHERE type='table'
        AND name<>'thread_events' AND instr(lower(sql),'thread_events')>0`).all().map(row=>row.name);
      assert.ok(referring.includes("commands"),"fixture lacks the commands that refer to events");
      for(const table of referring){
        for(const key of database.prepare(`PRAGMA foreign_key_list("${table}")`).all()
          .filter(item=>item.table==="thread_events")){
          const plan=database.prepare(`EXPLAIN QUERY PLAN SELECT 1 FROM "${table}" WHERE "${key.from}"=?`)
            .all("evt").map(row=>row.detail).join(" ");
          assert.match(plan,/USING (COVERING )?INDEX/u,`${table}.${key.from} would be scanned per event`);
        }
      }
    }finally{database.close();}
  }));

test("UPDATE_SELF_MODEL permits dormant Threads without waking them", () =>
  withDatabase((databasePath) => {
    const dormant = structuredClone(fixture);
    dormant.status = "dormant";
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
      const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const firstStore = openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(firstStore);
    const result = firstStore.applyCommand(updateSelfModelCommand());
    const beforeRestart = firstStore.verifyThreadIntegrity(fixture.threadId);
    firstStore.close();

    const restartedStore = openWorldStore(localWorldStateStorage(databasePath));
    assert.deepEqual(restartedStore.getThread(fixture.threadId), result.thread);
    assert.deepEqual(restartedStore.verifyThreadIntegrity(fixture.threadId), beforeRestart);
    restartedStore.close();
  }));

test("database triggers enforce append-only events and commands", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
    const store = openWorldStore(localWorldStateStorage(databasePath));
    const seeded = normalizedSeed(store);
    store.close();

    const forged = structuredClone(seeded);
    forged.threadId = "thr_attacker_001";
    const database = rawDatabase(databasePath);
    database
      .prepare("UPDATE threads SET state_json = ?, state_hash = ? WHERE thread_id = ?")
      .run(canonicalJson(forged), threadStateHash(forged), fixture.threadId);
    database.close();

    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.getThread(fixture.threadId), /projection contains identity/);
    assert.throws(() => reopened.verifyThreadIntegrity(fixture.threadId), IntegrityError);
    reopened.close();
  }));

test("replay rejects a seed payload whose identity differs from event.thread_id", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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

    const reopened = openWorldStore(localWorldStateStorage(databasePath));
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
      const store = openWorldStore(localWorldStateStorage(databasePath));
      normalizedSeed(store);
      store.close();
      const database = rawDatabase(databasePath);
      mutate(database);
      database.close();
      const reopened = openWorldStore(localWorldStateStorage(databasePath));
      assert.throws(() => reopened.getThread(fixture.threadId), IntegrityError);
      reopened.close();
    });
  }
});

test("repairs a forged projection from immutable event history", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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

    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.getThread(fixture.threadId), /last event/);
    const repaired = reopened.repairThreadProjection(fixture.threadId);
    assert.equal(repaired.repaired, true);
    assert.deepEqual(repaired.thread, result.thread);
    assert.deepEqual(reopened.getThread(fixture.threadId), result.thread);
    reopened.close();
  }));

test("detects coherent history rewriting through command digest and command witness", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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

    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.verifyThreadIntegrity(fixture.threadId), /command digest/);
    reopened.close();
  }));

test("detects a missing command witness", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(store);
    store.applyCommand(updateSelfModelCommand());
    store.close();
    const database = rawDatabase(databasePath);
    database.exec("DROP TRIGGER commands_no_delete");
    database.exec("DELETE FROM commands");
    database.close();
    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.replayThread(fixture.threadId), /no accepted command witness/);
    reopened.close();
  }));

test("detects replay sequence gaps", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(store);
    const result = store.applyCommand(updateSelfModelCommand());
    store.close();
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET sequence = 3 WHERE event_id = ?")
      .run(result.event.eventId);
    database.close();
    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.replayThread(fixture.threadId), /sequence has a gap/);
    reopened.close();
  }));

test("detects invalid seed version metadata", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(store);
    const seedEvent = store.listEvents(fixture.threadId)[0];
    store.close();
    const database = rawDatabase(databasePath);
    dropEventUpdateTrigger(database);
    database
      .prepare("UPDATE thread_events SET expected_version = 1 WHERE event_id = ?")
      .run(seedEvent.eventId);
    database.close();
    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(() => reopened.replayThread(fixture.threadId), /invalid version metadata/);
    reopened.close();
  }));

test("stored-data corruption is reported as IntegrityError", () =>
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
    normalizedSeed(store);
    store.close();
    const database = rawDatabase(databasePath);
    database.exec("PRAGMA ignore_check_constraints = ON");
    database.exec("UPDATE threads SET state_json = '{\"version\":1}'");
    database.close();
    const reopened = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => reopened.getThread(fixture.threadId),
      (error) => error instanceof IntegrityError && /Stored Thread/.test(error.message),
    );
    reopened.close();
  }));

test("Thread snapshots reject unknown top-level obligation-shaped fields", () => {
  withDatabase((databasePath) => {
    const store = openWorldStore(localWorldStateStorage(databasePath));
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
