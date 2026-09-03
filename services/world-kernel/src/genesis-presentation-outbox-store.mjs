import { assertId } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

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

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, {
      storeName: "GenesisPresentationOutboxStore",
    });
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
      retryable: error?.retryable !== false,
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
