import { canonicalJson } from "./persistence-common.mjs";
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
      'thread_visual_publication_work',
      'genesis_birth_publications'
    )
  `).all().map((row) => row.name));
}

export class ThreadHealthProjectionStore {
  #database;
  #tables;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadHealthProjectionStore" });
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
    const civilSelect = this.#tables.has("fibre_civil_registrations")
      ? "(SELECT record_digest FROM fibre_civil_registrations WHERE thread_id=t.thread_id)"
      : "NULL";
    const reconciliationStateSelect = this.#tables.has("thread_visual_publication_work")
      ? "(SELECT state FROM thread_visual_publication_work WHERE thread_id=t.thread_id)"
      : "NULL";
    const reconciliationErrorSelect = this.#tables.has("thread_visual_publication_work")
      ? "(SELECT last_error_json FROM thread_visual_publication_work WHERE thread_id=t.thread_id)"
      : "NULL";
    const reconciliationUpdatedSelect = this.#tables.has("thread_visual_publication_work")
      ? "(SELECT updated_at FROM thread_visual_publication_work WHERE thread_id=t.thread_id)"
      : "NULL";
    const genesisIdSelect = this.#tables.has("genesis_birth_publications")
      ? "(SELECT genesis_id FROM genesis_birth_publications WHERE thread_id=t.thread_id LIMIT 1)"
      : "NULL";
    const genesisDigestSelect = this.#tables.has("genesis_birth_publications")
      ? "(SELECT request_digest FROM genesis_birth_publications WHERE thread_id=t.thread_id LIMIT 1)"
      : "NULL";
    const genesisPublishedSelect = this.#tables.has("genesis_birth_publications")
      ? "(SELECT published_at FROM genesis_birth_publications WHERE thread_id=t.thread_id LIMIT 1)"
      : "NULL";
    const raisedLanguagesSelect = this.#tables.has("genesis_raised_language_corrections")
      ? "(SELECT languages_json FROM genesis_raised_language_corrections WHERE thread_id=t.thread_id ORDER BY recorded_at DESC,correction_id DESC LIMIT 1)"
      : "NULL";

    const row = this.#database.prepare(`
      SELECT
        t.version,t.state_hash,t.updated_at,
        ${civilSelect} AS civil_registration_digest,
        ${reconciliationStateSelect} AS reconciliation_state,
        ${reconciliationErrorSelect} AS reconciliation_error_json,
        ${reconciliationUpdatedSelect} AS reconciliation_updated_at,
        ${genesisIdSelect} AS genesis_id,
        ${genesisDigestSelect} AS genesis_request_digest,
        ${genesisPublishedSelect} AS genesis_published_at,
        ${raisedLanguagesSelect} AS raised_languages_json
      FROM threads t
      WHERE t.thread_id=?
    `).get(threadId);
    if (row === undefined) return null;

    const embodiments = this.#tables.has("embodiment_current_heads")
      ? this.#database.prepare(`
          SELECT embodiment_id,revision,record_digest,head_digest,recorded_at
          FROM embodiment_current_heads
          WHERE thread_id=?
          ORDER BY embodiment_id
        `).all(threadId).map((entry) => Object.freeze({
          embodimentId:entry.embodiment_id,
          revision:Number(entry.revision),
          recordDigest:entry.record_digest,
          headDigest:entry.head_digest,
          recordedAt:entry.recorded_at,
        }))
      : [];

    const symbolicGenomes = this.#tables.has("symbolic_genomes")
      ? this.#database.prepare(`
          SELECT genome_id,genome_digest
          FROM symbolic_genomes
          WHERE owner_kind='thread' AND owner_id=?
          ORDER BY created_at,genome_id
        `).all(threadId).map((entry) => Object.freeze({
          genomeId:entry.genome_id,
          genomeDigest:entry.genome_digest,
        }))
      : [];

    const reconciliation = row.reconciliation_state === null ? null : Object.freeze({
      state:row.reconciliation_state,
      lastError:row.reconciliation_error_json === null ? null : parseJson(row.reconciliation_error_json),
      updatedAt:row.reconciliation_updated_at,
    });
    const genesisPublication = row.genesis_id === null ? null : Object.freeze({
      genesisId:row.genesis_id,
      requestDigest:row.genesis_request_digest,
      publishedAt:row.genesis_published_at,
    });

    return Object.freeze({
      diagnosis:Object.freeze({
        thread:Object.freeze({
          version:Number(row.version),
          stateHash:row.state_hash,
          updatedAt:row.updated_at,
        }),
        civilRegistrationDigest:row.civil_registration_digest ?? null,
        embodimentHeads:Object.freeze(embodiments),
        genesisPublication,
        raisedLanguages:row.raised_languages_json === null ? null : parseJson(row.raised_languages_json),
        symbolicGenomes:Object.freeze(symbolicGenomes),
      }),
      reconciliation,
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
