
import {
  IntegrityError,
  assertId,
  assertNonEmpty,
} from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

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

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { readOnly: true, storeName: "CausalContextStore" });
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

export function openCausalContextStore(storage) {
  return new CausalContextStore(storage);
}
