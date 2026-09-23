import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function entryId({ threadId, commitmentId }) {
  return `fc_${sha256(canonicalJson({ threadId, commitmentId })).slice(0, 48)}`;
}

function normalizeEntry(candidate) {
  assertPlainObject("Fibre Credit entry", candidate);
  assertId("Fibre Credit entry.threadId", candidate.threadId);
  assertId("Fibre Credit entry.commitmentId", candidate.commitmentId);
  assertId("Fibre Credit entry.encounterStoryId", candidate.encounterStoryId);
  assertIsoTimestamp("Fibre Credit entry.occurredAt", candidate.occurredAt);
  if (!Number.isSafeInteger(candidate.amount) || candidate.amount < 1) {
    throw new TypeError("Fibre Credit entry amount must be a positive integer");
  }
  const normalized = Object.freeze({
    entryId:entryId(candidate),
    kind:"inside_fibre_work_compensation",
    threadId:candidate.threadId,
    commitmentId:candidate.commitmentId,
    encounterStoryId:candidate.encounterStoryId,
    occurredAt:candidate.occurredAt,
    amount:candidate.amount,
  });
  if (candidate.entryId !== undefined && candidate.entryId !== normalized.entryId) {
    throw new TypeError("Fibre Credit entry ID does not match its work commitment");
  }
  return normalized;
}

function rowToEntry(row) {
  let record;
  try {
    record = JSON.parse(row.record_json);
  } catch (error) {
    throw new IntegrityError(`Fibre Credit entry ${row.entry_id} is not valid JSON: ${error.message}`);
  }
  const normalized = normalizeEntry(record);
  if (
    normalized.entryId !== row.entry_id
    || normalized.threadId !== row.thread_id
    || normalized.commitmentId !== row.commitment_id
    || normalized.encounterStoryId !== row.encounter_story_id
    || normalized.occurredAt !== row.occurred_at
    || normalized.amount !== Number(row.amount)
  ) {
    throw new IntegrityError(`Fibre Credit entry ${row.entry_id} column witness mismatch`);
  }
  if (digest(normalized) !== row.record_digest) {
    throw new IntegrityError(`Fibre Credit entry ${row.entry_id} digest failed`);
  }
  return normalized;
}

export class FibreCreditStore {
  #database;
  #worldReader;

  constructor(storage, { worldReader }) {
    if (!worldReader || typeof worldReader.getThread !== "function") {
      throw new TypeError("FibreCreditStore requires worldReader.getThread()");
    }
    this.#worldReader = worldReader;
    this.#database = openWorldStateDatabase(storage, { storeName:"FibreCreditStore" });
    try {
      migrateDatabase(this.#database);
      this.#database.exec(`
        CREATE TABLE IF NOT EXISTS fibre_credit_entries (
          entry_id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          commitment_id TEXT NOT NULL UNIQUE,
          encounter_story_id TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          amount INTEGER NOT NULL CHECK (amount > 0),
          record_json TEXT NOT NULL CHECK (json_valid(record_json)),
          record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
          FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
        ) STRICT;

        CREATE INDEX IF NOT EXISTS idx_fibre_credit_entries_thread_time
          ON fibre_credit_entries(thread_id,occurred_at,entry_id);

        CREATE TRIGGER IF NOT EXISTS fibre_credit_entries_no_update
          BEFORE UPDATE ON fibre_credit_entries BEGIN
            SELECT RAISE(ABORT, 'fibre_credit_entries is append-only');
          END;
        CREATE TRIGGER IF NOT EXISTS fibre_credit_entries_no_delete
          BEFORE DELETE ON fibre_credit_entries BEGIN
            SELECT RAISE(ABORT, 'fibre_credit_entries is append-only');
          END;
      `);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  listEntries(threadId) {
    assertId("Fibre Credit threadId", threadId);
    return this.#database.prepare(`
      SELECT entry_id,thread_id,commitment_id,encounter_story_id,occurred_at,amount,record_json,record_digest
      FROM fibre_credit_entries
      WHERE thread_id=?
      ORDER BY occurred_at,entry_id
    `).all(threadId).map(rowToEntry);
  }

  balance(threadId) {
    assertId("Fibre Credit threadId", threadId);
    const thread = this.#worldReader.getThread(threadId, { required:false });
    if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
    const opening = thread.accounts?.fibreCredits ?? 0;
    if (!Number.isSafeInteger(opening) || opening < 0) {
      throw new IntegrityError(`Thread ${threadId} has an invalid opening Fibre Credit balance`);
    }
    const earned = Number(this.#database.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM fibre_credit_entries WHERE thread_id=?",
    ).get(threadId).total);
    return opening + earned;
  }

  recordWorkCompensation(candidate) {
    const record = normalizeEntry(candidate);
    const prior = this.#database.prepare(`
      SELECT entry_id,thread_id,commitment_id,encounter_story_id,occurred_at,amount,record_json,record_digest
      FROM fibre_credit_entries WHERE commitment_id=?
    `).get(record.commitmentId);
    if (prior !== undefined) {
      const existing = rowToEntry(prior);
      if (canonicalJson(existing) !== canonicalJson(record)) {
        throw new IntegrityError(`work commitment ${record.commitmentId} already settled differently`);
      }
      return Object.freeze({ entry:existing, created:false });
    }

    const thread = this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(record.threadId);
    if (thread === undefined) throw new TypeError(`Thread ${record.threadId} was not found`);

    try {
      this.#database.prepare(`
        INSERT INTO fibre_credit_entries(
          entry_id,thread_id,commitment_id,encounter_story_id,occurred_at,amount,
          record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        record.entryId,
        record.threadId,
        record.commitmentId,
        record.encounterStoryId,
        record.occurredAt,
        record.amount,
        canonicalJson(record),
        digest(record),
      );
      return Object.freeze({ entry:record, created:true });
    } catch (error) {
      throw translateStorageError(error);
    }
  }
}

export function openFibreCreditStore(storage, options) {
  return new FibreCreditStore(storage, options);
}
