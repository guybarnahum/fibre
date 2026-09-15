import { assertId } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const TABLE = "thread_visual_publication_work";

function errorJson(error) {
  return JSON.stringify({
    code: typeof error?.code === "string" ? error.code : null,
    message: error?.message ?? String(error ?? "visual publication retry"),
    retryable: error?.retryable !== false,
  });
}

export class ThreadVisualPublicationWorksetStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadVisualPublicationWorksetStore" });
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        thread_id TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('pending','complete','dead_letter')),
        last_error_json TEXT CHECK (last_error_json IS NULL OR json_valid(last_error_json)),
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_thread_visual_publication_work_pending
        ON ${TABLE}(state, updated_at, thread_id);
    `);
  }

  close() { this.#database.close(); }

  enqueue(threadId, { updatedAt = new Date().toISOString() } = {}) {
    assertId("threadId", threadId);
    const result = this.#database.prepare(`
      INSERT OR IGNORE INTO ${TABLE}(thread_id,state,last_error_json,updated_at)
      VALUES (?,'pending',NULL,?)
    `).run(threadId, updatedAt);
    return Number(result.changes) === 1;
  }

  listThreadIds({ limit = 100 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new TypeError("visual publication workset limit must be an integer from 1 through 1000");
    }
    return this.#database.prepare(`
      SELECT thread_id FROM ${TABLE}
      WHERE state='pending'
      ORDER BY updated_at ASC, thread_id ASC
      LIMIT ?
    `).all(limit).map((row) => row.thread_id);
  }

  hasPending() {
    return this.#database.prepare(`SELECT 1 AS present FROM ${TABLE} WHERE state='pending' LIMIT 1`).get() !== undefined;
  }

  complete(threadId, { updatedAt = new Date().toISOString() } = {}) {
    assertId("threadId", threadId);
    this.#database.prepare(`
      UPDATE ${TABLE}
      SET state='complete', last_error_json=NULL, updated_at=?
      WHERE thread_id=? AND state='pending'
    `).run(updatedAt, threadId);
  }

  retry(threadId, error, { updatedAt = new Date().toISOString() } = {}) {
    assertId("threadId", threadId);
    const serialized = errorJson(error);
    this.#database.prepare(`
      UPDATE ${TABLE}
      SET last_error_json=?, updated_at=?
      WHERE thread_id=? AND state='pending'
        AND (last_error_json IS NULL OR last_error_json<>?)
    `).run(serialized, updatedAt, threadId, serialized);
  }

  deadLetter(threadId, error, { updatedAt = new Date().toISOString() } = {}) {
    assertId("threadId", threadId);
    this.#database.prepare(`
      UPDATE ${TABLE}
      SET state='dead_letter', last_error_json=?, updated_at=?
      WHERE thread_id=? AND state='pending'
    `).run(errorJson(error), updatedAt, threadId);
  }

  requeue(threadId, { updatedAt = new Date().toISOString() } = {}) {
    assertId("threadId", threadId);
    const result = this.#database.prepare(`
      UPDATE ${TABLE}
      SET state='pending', last_error_json=NULL, updated_at=?
      WHERE thread_id=? AND state='dead_letter'
    `).run(updatedAt, threadId);
    return Number(result.changes) === 1;
  }
}
