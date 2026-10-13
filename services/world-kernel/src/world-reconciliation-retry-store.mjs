import { openWorldStateDatabase } from "./world-state-storage.mjs";

export function openWorldReconciliationRetryStore(storage) {
  const database = openWorldStateDatabase(storage, {
    storeName:"WorldReconciliationRetryStore",
  });
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS world_reconciliation_retry (
        scope_id TEXT PRIMARY KEY,
        retry_streak INTEGER NOT NULL CHECK (retry_streak >= 0)
      ) STRICT;
    `);
  } catch (error) {
    database.close();
    throw error;
  }
  return Object.freeze({
    async get(scopeId) {
      const row = database.prepare(
        "SELECT retry_streak FROM world_reconciliation_retry WHERE scope_id=?",
      ).get(scopeId);
      return row === undefined ? 0 : Number(row.retry_streak);
    },
    async set(scopeId, value) {
      database.prepare(`
        INSERT INTO world_reconciliation_retry(scope_id,retry_streak)
        VALUES(?,?)
        ON CONFLICT(scope_id) DO UPDATE SET retry_streak=excluded.retry_streak
      `).run(scopeId, value);
    },
    close() { database.close(); },
  });
}
