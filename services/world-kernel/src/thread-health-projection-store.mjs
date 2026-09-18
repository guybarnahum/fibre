import { canonicalJson } from "./persistence-common.mjs";
import { migrateDatabase } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const TABLE = "thread_health_projections";

function parseJson(value) {
  try { return JSON.parse(value); }
  catch { return null; }
}

function tableNames(database) {
  return new Set(database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name IN (
      'threads',
      'fibre_civil_registrations',
      'embodiment_current_heads',
      'thread_visual_publication_work'
    )
  `).all().map((row) => row.name));
}

export class ThreadHealthProjectionStore {
  #database;
  #tables;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadHealthProjectionStore" });
    migrateDatabase(this.#database);
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        thread_id TEXT PRIMARY KEY,
        witness_json TEXT NOT NULL CHECK (json_valid(witness_json)),
        diagnosis_json TEXT NOT NULL CHECK (json_valid(diagnosis_json)),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
      ) STRICT;
    `);
    this.#tables = tableNames(this.#database);
  }

  close() { this.#database.close(); }

  worldWitness(threadId) {
    const thread = this.#database.prepare(`
      SELECT version,state_hash,updated_at
      FROM threads
      WHERE thread_id=?
    `).get(threadId);
    if (thread === undefined) return null;

    const civil = this.#tables.has("fibre_civil_registrations")
      ? this.#database.prepare(`
          SELECT record_digest
          FROM fibre_civil_registrations
          WHERE thread_id=?
        `).get(threadId)
      : undefined;

    const embodiments = this.#tables.has("embodiment_current_heads")
      ? this.#database.prepare(`
          SELECT embodiment_id,revision,record_digest,head_digest,recorded_at
          FROM embodiment_current_heads
          WHERE thread_id=?
          ORDER BY embodiment_id
        `).all(threadId).map((row) => Object.freeze({
          embodimentId:row.embodiment_id,
          revision:Number(row.revision),
          recordDigest:row.record_digest,
          headDigest:row.head_digest,
          recordedAt:row.recorded_at,
        }))
      : [];

    const reconciliation = this.#tables.has("thread_visual_publication_work")
      ? this.#database.prepare(`
          SELECT state,last_error_json,updated_at
          FROM thread_visual_publication_work
          WHERE thread_id=?
        `).get(threadId)
      : undefined;

    return Object.freeze({
      thread:Object.freeze({
        version:Number(thread.version),
        stateHash:thread.state_hash,
        updatedAt:thread.updated_at,
      }),
      civilRegistrationDigest:civil?.record_digest ?? null,
      embodimentHeads:Object.freeze(embodiments),
      reconciliation:reconciliation === undefined ? null : Object.freeze({
        state:reconciliation.state,
        lastError:reconciliation.last_error_json === null ? null : parseJson(reconciliation.last_error_json),
        updatedAt:reconciliation.updated_at,
      }),
    });
  }

  get(threadId, witness) {
    if (witness === null) return null;
    const row = this.#database.prepare(`
      SELECT witness_json,diagnosis_json
      FROM ${TABLE}
      WHERE thread_id=?
    `).get(threadId);
    if (row === undefined || row.witness_json !== canonicalJson(witness)) return null;
    return parseJson(row.diagnosis_json);
  }

  put(threadId, witness, diagnosis, { updatedAt = new Date().toISOString() } = {}) {
    if (witness === null) return diagnosis;
    const witnessJson = canonicalJson(witness);
    const diagnosisJson = canonicalJson(diagnosis);
    this.#database.prepare(`
      INSERT INTO ${TABLE}(thread_id,witness_json,diagnosis_json,updated_at)
      VALUES (?,?,?,?)
      ON CONFLICT(thread_id) DO UPDATE SET
        witness_json=excluded.witness_json,
        diagnosis_json=excluded.diagnosis_json,
        updated_at=excluded.updated_at
      WHERE ${TABLE}.witness_json<>excluded.witness_json
         OR ${TABLE}.diagnosis_json<>excluded.diagnosis_json
    `).run(threadId, witnessJson, diagnosisJson, updatedAt);
    return diagnosis;
  }
}
