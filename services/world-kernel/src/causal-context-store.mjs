import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertNonEmpty,
} from "./persistence-common.mjs";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";

function parseEvidence(memoryId, value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new TypeError("evidence refs must be an array of strings");
    }
    return parsed;
  } catch (error) {
    throw new IntegrityError(`memory ${memoryId} evidence is invalid: ${error.message}`);
  }
}

export class CausalContextStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath));
    this.#database.exec("PRAGMA query_only = ON; PRAGMA busy_timeout = 5000;");
  }

  close() {
    this.#database.close();
  }

  listThreadIds() {
    return this.#database
      .prepare("SELECT thread_id FROM threads ORDER BY thread_id")
      .all()
      .map((row) => row.thread_id);
  }

  listMemoryRecords(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT memory_id,thread_id,event_id,session_id,summary,evidence_refs_json,created_at
      FROM thread_memories
      WHERE thread_id=?
      ORDER BY created_at,memory_id
    `).all(threadId).map((row) => ({
      memoryId: row.memory_id,
      threadId: row.thread_id,
      eventId: row.event_id,
      sessionId: row.session_id,
      summary: row.summary,
      evidenceRefs: parseEvidence(row.memory_id, row.evidence_refs_json),
      createdAt: row.created_at,
    }));
  }
}

export function openCausalContextStore(databasePath) {
  return new CausalContextStore(databasePath);
}
