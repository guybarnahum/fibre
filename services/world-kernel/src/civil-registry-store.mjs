import {
  normalizeFibreCivilRegistration,
  normalizeFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";
import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function tableExists(database) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='fibre_civil_registrations'",
  ).get() !== undefined;
}

function parseStored(row, label) {
  let parsed;
  try { parsed = JSON.parse(row.record_json); }
  catch (error) { throw new IntegrityError(`${label} JSON is invalid: ${error.message}`); }
  const record = normalizeFibreCivilRegistration(parsed);
  if (row.record_json !== canonicalJson(record) || row.record_digest !== record.registrationDigest) {
    throw new IntegrityError(`${label} failed canonical/digest verification`);
  }
  return record;
}

export function createCivilRegistryTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS fibre_civil_registrations (
      registration_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      fibre_identity_number TEXT NOT NULL UNIQUE,
      birth_event_ref TEXT NOT NULL UNIQUE,
      world_ref TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      issuer TEXT NOT NULL,
      fin_policy_ref TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (birth_event_ref) REFERENCES thread_events(event_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS fibre_civil_registrations_no_update
      BEFORE UPDATE ON fibre_civil_registrations
      BEGIN SELECT RAISE(ABORT,'fibre_civil_registrations is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS fibre_civil_registrations_no_delete
      BEFORE DELETE ON fibre_civil_registrations
      BEGIN SELECT RAISE(ABORT,'fibre_civil_registrations is immutable'); END;
  `);
}

export function persistCivilRegistrationInTransaction(database, candidate, {
  ErrorType = TypeError,
} = {}) {
  let record;
  try { record = normalizeFibreCivilRegistration(candidate); }
  catch (error) { throw new ErrorType(`invalid Fibre registration: ${error.message}`); }

  const thread = database.prepare(
    "SELECT 1 AS present FROM threads WHERE thread_id=?",
  ).get(record.threadId);
  if (thread === undefined) throw new ErrorType(`registration Thread ${record.threadId} is not live in the transaction`);

  const seed = database.prepare(
    "SELECT thread_id,event_type FROM thread_events WHERE event_id=?",
  ).get(record.birthEventRef);
  if (seed === undefined) throw new ErrorType(`registration seed event ${record.birthEventRef} does not exist`);
  if (seed.thread_id !== record.threadId || seed.event_type !== "THREAD_SEEDED") {
    throw new ErrorType("registration seed event is not the Thread's canonical seed event");
  }

  const byThread = database.prepare(
    "SELECT record_json,record_digest FROM fibre_civil_registrations WHERE thread_id=?",
  ).get(record.threadId);
  if (byThread !== undefined) {
    const existing = parseStored(byThread, `registration for ${record.threadId}`);
    if (canonicalJson(existing) !== canonicalJson(record)) {
      throw new ErrorType(`Thread ${record.threadId} already has a different Fibre registration`);
    }
    return { record: existing, recordDigest: byThread.record_digest, idempotent: true };
  }

  const byFin = database.prepare(
    "SELECT thread_id FROM fibre_civil_registrations WHERE fibre_identity_number=?",
  ).get(record.fibreIdentityNumber);
  if (byFin !== undefined) {
    throw new ErrorType(`FIN ${record.fibreIdentityNumber} is already assigned to Thread ${byFin.thread_id}`);
  }

  database.prepare(`
    INSERT INTO fibre_civil_registrations(
      registration_id,thread_id,fibre_identity_number,birth_event_ref,world_ref,
      registered_at,issuer,fin_policy_ref,record_json,record_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    record.registrationId,
    record.threadId,
    record.fibreIdentityNumber,
    record.birthEventRef,
    record.worldRef,
    record.registeredAt,
    record.issuer,
    record.finPolicyRef,
    canonicalJson(record),
    record.registrationDigest,
  );
  return { record, recordDigest: record.registrationDigest, idempotent: false };
}

export class CivilRegistryStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, {
      readOnly: true,
      storeName: "CivilRegistryStore",
    });
  }

  close() { this.#database.close(); }

  getCivilRegistrationByFin(fin, { required = true } = {}) {
    const normalized = normalizeFibreIdentityNumber(fin);
    if (!tableExists(this.#database)) {
      if (!required) return null;
      throw new Error("Fibre registration storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM fibre_civil_registrations WHERE fibre_identity_number=?",
    ).get(normalized);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FIN ${normalized} was not found`);
    }
    return parseStored(row, `FIN ${normalized}`);
  }

  getCivilRegistrationByThreadId(threadId, { required = true } = {}) {
    if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("registry threadId is required");
    if (!tableExists(this.#database)) {
      if (!required) return null;
      throw new Error("Fibre registration storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM fibre_civil_registrations WHERE thread_id=?",
    ).get(threadId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`Thread ${threadId} has no Fibre registration`);
    }
    return parseStored(row, `registration for ${threadId}`);
  }
}
