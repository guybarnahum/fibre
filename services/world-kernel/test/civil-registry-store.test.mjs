import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import {
  CivilRegistryStore,
  createCivilRegistryTables,
  persistCivilRegistrationInTransaction,
} from "../src/civil-registry-store.mjs";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-fin-store-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      CREATE TABLE threads(thread_id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE thread_events(
        event_id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
      ) STRICT;
    `);
    createCivilRegistryTables(database);
    const result = run({ databasePath, database });
    database.close();
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function seedThread(database, threadId, eventId) {
  database.prepare("INSERT INTO threads(thread_id) VALUES (?)").run(threadId);
  database.prepare(
    "INSERT INTO thread_events(event_id,thread_id,event_type) VALUES (?,?,'THREAD_SEEDED')",
  ).run(eventId, threadId);
}

function registration({
  threadId = "thr_fin_store_001",
  payload = "123456789",
  eventId = "evt_fin_store_001",
  worldRef = "world_fin_store_001",
} = {}) {
  return buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload(payload),
    registeredAt: "2026-08-25T16:55:00Z",
    birthEventRef: eventId,
    worldRef,
  });
}

test("World Kernel registration store resolves the same immutable record by FIN and Thread", () =>
  withDatabase(({ databasePath, database }) => {
    const record = registration();
    seedThread(database, record.threadId, record.birthEventRef);
    const stored = persistCivilRegistrationInTransaction(database, record);
    assert.equal(stored.idempotent, false);

    const registry = new CivilRegistryStore(databasePath);
    assert.deepEqual(registry.getCivilRegistrationByFin(record.fibreIdentityNumber), record);
    assert.deepEqual(registry.getCivilRegistrationByThreadId(record.threadId), record);
    registry.close();
  }));

test("registration persistence requires the canonical seed event for the same Thread", () =>
  withDatabase(({ database }) => {
    const record = registration();
    database.prepare("INSERT INTO threads(thread_id) VALUES (?)").run(record.threadId);
    assert.throws(
      () => persistCivilRegistrationInTransaction(database, record),
      /seed event .* does not exist/,
    );

    database.prepare(
      "INSERT INTO thread_events(event_id,thread_id,event_type) VALUES (?,?,'THREAD_LIFE_EPISODE_RECORDED')",
    ).run(record.birthEventRef, record.threadId);
    assert.throws(
      () => persistCivilRegistrationInTransaction(database, record),
      /not the Thread's canonical seed event/,
    );
  }));

test("FIN and Thread mappings are one-to-one and registry rows are immutable", () =>
  withDatabase(({ database }) => {
    const first = registration();
    seedThread(database, first.threadId, first.birthEventRef);
    persistCivilRegistrationInTransaction(database, first);

    const otherThread = "thr_fin_store_002";
    const otherEvent = "evt_fin_store_002";
    seedThread(database, otherThread, otherEvent);
    const duplicateFin = buildFibreCivilRegistration({
      threadId: otherThread,
      fibreIdentityNumber: first.fibreIdentityNumber,
      registeredAt: "2026-08-25T16:56:00Z",
      birthEventRef: otherEvent,
      worldRef: "world_fin_store_002",
    });
    assert.throws(
      () => persistCivilRegistrationInTransaction(database, duplicateFin),
      /already assigned/,
    );

    assert.throws(
      () => database.prepare(
        "UPDATE fibre_civil_registrations SET world_ref='changed' WHERE thread_id=?",
      ).run(first.threadId),
      /immutable/,
    );
    assert.throws(
      () => database.prepare(
        "DELETE FROM fibre_civil_registrations WHERE thread_id=?",
      ).run(first.threadId),
      /immutable/,
    );
  }));

test("read-only registry returns null for an unregistered Thread or FIN when requested", () =>
  withDatabase(({ databasePath }) => {
    const registry = new CivilRegistryStore(databasePath);
    assert.equal(registry.getCivilRegistrationByThreadId("thr_missing", { required: false }), null);
    assert.equal(
      registry.getCivilRegistrationByFin(fibreIdentityNumberFromPayload("ABCDEFGHJ"), { required: false }),
      null,
    );
    registry.close();
  }));
