import { openWorldStateDatabase } from "./world-state-storage.mjs";

export class ThreadDirectoryStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, {
      readOnly: true,
      storeName: "ThreadDirectoryStore",
    });
  }

  close() { this.#database.close(); }

  listThreadIds({ limit = 5000 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5000) {
      throw new TypeError("Thread directory limit must be between 1 and 5000");
    }
    return this.#database.prepare(
      "SELECT thread_id FROM threads ORDER BY thread_id ASC LIMIT ?",
    ).all(limit).map((row) => row.thread_id);
  }
}
