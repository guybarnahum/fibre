import { DatabaseSync } from "node:sqlite";

import { assertId } from "./persistence-common.mjs";
import { normalizeDatabasePath, safeRollback } from "./persistence-sqlite.mjs";

const OUTBOX_TABLE = "genesis_presentation_outbox";

function parseJson(value) {
  if (value === null) return null;
  return JSON.parse(value);
}

function rowToRecord(row) {
  return Object.freeze({
    genesisId: row.genesis_id,
    threadId: row.thread_id,
    manifest: JSON.parse(row.manifest_json),
    publicationDigest: row.publication_digest,
    publishedAt: row.published_at,
    state: row.state,
    attemptCount: Number(row.attempt_count),
    lastAttemptAt: row.last_attempt_at,
    lastError: parseJson(row.last_error_json),
    deliveredAt: row.delivered_at,
  });
}

export class GenesisPresentationOutboxStore {
  #database;

  constructor(databasePath) {
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    try {
      this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.exec(`
        CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE} (
          genesis_id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL UNIQUE,
          manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
          publication_digest TEXT NOT NULL CHECK (publication_digest LIKE 'sha256:%'),
          published_at TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','delivered')),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          last_attempt_at TEXT,
          last_error_json TEXT CHECK (last_error_json IS NULL OR json_valid(last_error_json)),
          delivered_at TEXT
        ) STRICT;

        CREATE INDEX IF NOT EXISTS idx_genesis_presentation_outbox_pending
          ON ${OUTBOX_TABLE}(state, published_at, genesis_id);

        DROP TRIGGER IF EXISTS genesis_manifests_enqueue_presentation;
        CREATE TRIGGER genesis_manifests_enqueue_presentation
          AFTER INSERT ON genesis_manifests
          WHEN NEW.publication_status='published'
          BEGIN
            INSERT OR IGNORE INTO ${OUTBOX_TABLE}(
              genesis_id,thread_id,manifest_json,publication_digest,published_at
            ) VALUES (
              NEW.genesis_id,
              NEW.thread_id,
              NEW.record_json,
              NEW.record_digest,
              json_extract(NEW.record_json,'$.publication.publishedAt')
            );
          END;

        INSERT OR IGNORE INTO ${OUTBOX_TABLE}(
          genesis_id,thread_id,manifest_json,publication_digest,published_at
        )
        SELECT
          genesis_id,
          thread_id,
          record_json,
          record_digest,
          json_extract(record_json,'$.publication.publishedAt')
        FROM genesis_manifests
        WHERE publication_status='published';
      `);
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  listPending({ limit = 100 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new TypeError("Genesis presentation outbox limit must be an integer from 1 through 1000");
    }
    return this.#database.prepare(`
      SELECT genesis_id,thread_id,manifest_json,publication_digest,published_at,state,
             attempt_count,last_attempt_at,last_error_json,delivered_at
      FROM ${OUTBOX_TABLE}
      WHERE state='pending'
      ORDER BY published_at ASC, genesis_id ASC
      LIMIT ?
    `).all(limit).map(rowToRecord);
  }

  get(genesisId) {
    assertId("genesisId", genesisId);
    const row = this.#database.prepare(`
      SELECT genesis_id,thread_id,manifest_json,publication_digest,published_at,state,
             attempt_count,last_attempt_at,last_error_json,delivered_at
      FROM ${OUTBOX_TABLE}
      WHERE genesis_id=?
    `).get(genesisId);
    return row === undefined ? null : rowToRecord(row);
  }

  recordFailure(genesisId, error, { attemptedAt = new Date().toISOString() } = {}) {
    assertId("genesisId", genesisId);
    const errorRecord = {
      name: error?.constructor?.name ?? "Error",
      code: error?.code ?? null,
      message: error?.message ?? String(error),
    };
    const result = this.#database.prepare(`
      UPDATE ${OUTBOX_TABLE}
      SET attempt_count=attempt_count+1,
          last_attempt_at=?,
          last_error_json=?
      WHERE genesis_id=? AND state='pending'
    `).run(attemptedAt, JSON.stringify(errorRecord), genesisId);
    if (Number(result.changes) !== 1) throw new Error(`pending Genesis presentation outbox record ${genesisId} was not found`);
    return this.get(genesisId);
  }

  markDelivered(genesisId, { deliveredAt = new Date().toISOString() } = {}) {
    assertId("genesisId", genesisId);
    const result = this.#database.prepare(`
      UPDATE ${OUTBOX_TABLE}
      SET state='delivered',
          attempt_count=attempt_count+1,
          last_attempt_at=?,
          last_error_json=NULL,
          delivered_at=?
      WHERE genesis_id=? AND state='pending'
    `).run(deliveredAt, deliveredAt, genesisId);
    if (Number(result.changes) === 0) {
      const existing = this.get(genesisId);
      if (existing?.state === "delivered") return existing;
      throw new Error(`Genesis presentation outbox record ${genesisId} was not found`);
    }
    return this.get(genesisId);
  }
}
