import { openWorldStateDatabase } from "./world-state-storage.mjs";

export function openWorldReconciliationRetryStore(storage) {
  const database = openWorldStateDatabase(storage, {
    storeName:"WorldReconciliationRetryStore",
  });
  try {
    if(!storage.schemaReady)database.exec(`
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
      if(value===0){
        // Zero is also the absent-row default: no needless initial insert.
        return database.prepare(`
          UPDATE world_reconciliation_retry SET retry_streak=0
          WHERE scope_id=? AND retry_streak<>0
        `).run(scopeId).changes;
      }
      database.prepare(`
        INSERT INTO world_reconciliation_retry(scope_id,retry_streak)
        VALUES(?,?)
        ON CONFLICT(scope_id) DO UPDATE SET retry_streak=excluded.retry_streak
          WHERE retry_streak<>excluded.retry_streak
      `).run(scopeId, value).changes;
    },
    close() { database.close(); },
  });
}
