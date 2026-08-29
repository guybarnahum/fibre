// fibre-test-lifecycle: permanent

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
  civilRegistrationToPresentationCivilIdentity,
  readPresentationCivilIdentity,
} from "#services/thread-presentation/src/index.mjs";
import {
  CivilRegistryStore,
  createCivilRegistryTables,
  persistCivilRegistrationInTransaction,
} from "../src/civil-registry-store.mjs";

function withRegistry(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-presentation-civil-registry-"));
  const databasePath = join(directory, "world.sqlite");
  let database;
  try {
    database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
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
    return run({ databasePath, database });
  } finally {
    database?.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

function register(database, {
  threadId = "thr_presentation_registry_001",
  eventId = "evt_presentation_registry_birth_001",
  worldRef = "world_presentation_registry_001",
  payload = "123456789",
} = {}) {
  database.prepare("INSERT INTO threads(thread_id) VALUES (?)").run(threadId);
  database.prepare(
    "INSERT INTO thread_events(event_id,thread_id,event_type) VALUES (?,?,'THREAD_SEEDED')",
  ).run(eventId, threadId);
  const record = buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload(payload),
    registeredAt: "2026-08-25T18:45:00Z",
    birthEventRef: eventId,
    worldRef,
  });
  persistCivilRegistrationInTransaction(database, record);
  return record;
}

test("Thread Presentation reads the real immutable Civil Registry record and emits a bounded civil projection", () =>
  withRegistry(({ databasePath, database }) => {
    const record = register(database);
    const registry = new CivilRegistryStore(databasePath);
    try {
      const projected = readPresentationCivilIdentity({
        civilRegistry: registry,
        threadId: record.threadId,
        provenanceRef: "prov_civil_registry_projection",
      });

      assert.deepEqual(projected, {
        fibreIdentityNumber: record.fibreIdentityNumber,
        registrationId: record.registrationId,
        registeredAt: record.registeredAt,
        birthEventRef: record.birthEventRef,
        worldRef: record.worldRef,
        issuer: record.issuer,
        sourceReferences: [record.registrationId, record.birthEventRef, record.worldRef],
        provenanceRef: "prov_civil_registry_projection",
      });
      assert.equal("registrationDigest" in projected, false, "presentation is a bounded projection, not a registry copy");
      assert.equal("finPolicyRef" in projected, false, "FIN policy remains Civil Registry authority");
    } finally {
      registry.close();
    }
  }));

test("unregistered Thread produces no civil-identity presentation rather than a synthetic FIN", () =>
  withRegistry(({ databasePath }) => {
    const registry = new CivilRegistryStore(databasePath);
    try {
      assert.equal(readPresentationCivilIdentity({
        civilRegistry: registry,
        threadId: "thr_unregistered_presentation",
        provenanceRef: "prov_civil_registry_projection",
      }), null);
    } finally {
      registry.close();
    }
  }));

test("presentation projection rejects tampered Civil Registry content using the canonical registry validator", () => {
  const record = buildFibreCivilRegistration({
    threadId: "thr_tamper_projection",
    fibreIdentityNumber: fibreIdentityNumberFromPayload("ABCDEFGHJ"),
    registeredAt: "2026-08-25T18:45:00Z",
    birthEventRef: "evt_tamper_projection_birth",
    worldRef: "world_tamper_projection",
  });
  const tampered = { ...record, worldRef: "world_tampered" };
  assert.throws(
    () => civilRegistrationToPresentationCivilIdentity(tampered, {
      provenanceRef: "prov_civil_registry_projection",
    }),
    /registrationDigest does not match registration content/,
  );
});

test("Civil Registry reader cannot return another Thread's valid registration into a presentation", () => {
  const other = buildFibreCivilRegistration({
    threadId: "thr_other_registered",
    fibreIdentityNumber: fibreIdentityNumberFromPayload("987654321"),
    registeredAt: "2026-08-25T18:45:00Z",
    birthEventRef: "evt_other_registered_birth",
    worldRef: "world_other_registered",
  });
  const civilRegistry = {
    getCivilRegistrationByThreadId() { return other; },
  };
  assert.throws(
    () => readPresentationCivilIdentity({
      civilRegistry,
      threadId: "thr_requested_presentation",
      provenanceRef: "prov_civil_registry_projection",
    }),
    /registration for a different Thread/,
  );
});
