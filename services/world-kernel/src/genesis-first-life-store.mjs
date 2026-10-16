import { openWorldStateDatabase } from "./world-state-storage.mjs";

export function createGenesisFirstLifeTables(database){
  database.exec(`
    CREATE TABLE IF NOT EXISTS genesis_first_life_work (
      thread_id TEXT PRIMARY KEY REFERENCES threads(thread_id),
      due_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      blocked_reason TEXT,
      first_established_at TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_genesis_first_life_due
      ON genesis_first_life_work(due_at,thread_id) WHERE due_at IS NOT NULL;
  `);
}

// Birth queues this obligation in its own atomic World transaction. A completed
// row remains as an inspectable witness; no population scan or time tick.
export function openGenesisFirstLifeStore(storage){
  const database=openWorldStateDatabase(storage,{storeName:"GenesisFirstLifeStore"});
  try{
    if(!storage.schemaReady)createGenesisFirstLifeTables(database);
  }catch(error){database.close();throw error;}
  return Object.freeze({
    nextDueAt(){
      return database.prepare(`
        SELECT due_at FROM genesis_first_life_work
        WHERE due_at IS NOT NULL ORDER BY due_at LIMIT 1
      `).get()?.due_at??null;
    },
    due(at){
      return database.prepare(`
        SELECT thread_id,attempts FROM genesis_first_life_work
        WHERE due_at IS NOT NULL AND due_at<=?
        ORDER BY due_at,thread_id LIMIT 1
      `).get(at)??null;
    },
    complete(threadId,establishedAt){
      database.prepare(`
        UPDATE genesis_first_life_work
        SET due_at=NULL,blocked_reason=NULL,first_established_at=?
        WHERE thread_id=? AND due_at IS NOT NULL
      `).run(establishedAt,threadId);
    },
    fail(threadId,at,message){
      const attempts=database.prepare(`
        SELECT attempts FROM genesis_first_life_work
        WHERE thread_id=? AND due_at IS NOT NULL
      `).get(threadId)?.attempts;
      if(attempts===undefined)return {blocked:true};
      const blocked=attempts>=2;
      database.prepare(`
        UPDATE genesis_first_life_work
        SET attempts=attempts+1,blocked_reason=?,
            due_at=?
        WHERE thread_id=? AND due_at IS NOT NULL
      `).run(message,blocked?null:new Date(Date.parse(at)+300_000).toISOString(),threadId);
      return {blocked,attempts:attempts+1};
    },
    block(threadId,message){
      database.prepare(`
        UPDATE genesis_first_life_work
        SET due_at=NULL,blocked_reason=?
        WHERE thread_id=? AND due_at IS NOT NULL
      `).run(message,threadId);
    },
    inspect(threadId){
      const row=database.prepare(`
        SELECT due_at,attempts,blocked_reason,first_established_at
        FROM genesis_first_life_work WHERE thread_id=?
      `).get(threadId);
      return row??null;
    },
    close(){database.close();},
  });
}
