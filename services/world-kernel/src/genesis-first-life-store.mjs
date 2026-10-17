import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { assertId,assertIsoTimestamp } from "./persistence-common.mjs";

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
    // Operator-only, read-only backlog inspection. A published birth,
    // blocked obligation and missing obligation are different diagnoses.
    unstarted(){
      return database.prepare(`
        SELECT t.thread_id AS threadId,
          CASE
            WHEN b.thread_id IS NULL THEN 'no_birth_publication'
            WHEN w.thread_id IS NULL THEN 'missing_obligation'
            WHEN w.first_established_at IS NOT NULL THEN 'completed_without_current'
            WHEN w.due_at IS NOT NULL THEN 'pending'
            WHEN w.blocked_reason IS NOT NULL THEN 'blocked'
            ELSE 'inactive'
          END AS state,
          b.published_at AS publishedAt,
          w.due_at AS dueAt,
          w.attempts,
          w.blocked_reason AS blockedReason,
          w.first_established_at AS firstEstablishedAt,
          EXISTS (
            SELECT 1 FROM situated_life_current c
            JOIN place_episode_records p
              ON p.episode_id=c.lineage_id AND p.revision=c.revision
            WHERE c.thread_id=t.thread_id AND c.ledger_kind='place_episode'
              AND COALESCE(json_extract(p.record_json,'$.status'),'current')
                IN ('current','corrected')
              AND (json_extract(p.record_json,'$.startAt') IS NULL
                OR json_extract(p.record_json,'$.startAt')<=?)
          ) AS hasGroundedPlace
        FROM threads t
        LEFT JOIN genesis_birth_publications b ON b.thread_id=t.thread_id
        LEFT JOIN genesis_first_life_work w ON w.thread_id=t.thread_id
        LEFT JOIN current_situation_frontier f ON f.thread_id=t.thread_id
        WHERE t.status<>'retired' AND f.thread_id IS NULL
        ORDER BY t.thread_id
        LIMIT 500
      `).all(new Date().toISOString()).map(row=>({
        ...row,hasGroundedPlace:row.hasGroundedPlace===1,
      }));
    },
    enqueueMissing(threadIds,at){
      assertIsoTimestamp("first-life recovery time",at);
      if(!Array.isArray(threadIds)||threadIds.length===0||threadIds.length>20
        ||new Set(threadIds).size!==threadIds.length){
        throw new TypeError("first-life recovery requires 1–20 distinct Thread IDs");
      }
      for(const threadId of threadIds)assertId("first-life Thread",threadId);
      return database.transaction(()=>{
        const eligible=database.prepare(`
          SELECT 1 FROM genesis_birth_publications b
          JOIN threads t ON t.thread_id=b.thread_id
          LEFT JOIN genesis_first_life_work w ON w.thread_id=b.thread_id
          LEFT JOIN current_situation_frontier f ON f.thread_id=b.thread_id
          WHERE b.thread_id=? AND t.status<>'retired'
            AND b.published_at<=? AND w.thread_id IS NULL AND f.thread_id IS NULL
            AND EXISTS (
              SELECT 1 FROM situated_life_current c
              JOIN place_episode_records p
                ON p.episode_id=c.lineage_id AND p.revision=c.revision
              WHERE c.thread_id=b.thread_id AND c.ledger_kind='place_episode'
                AND COALESCE(json_extract(p.record_json,'$.status'),'current')
                  IN ('current','corrected')
                AND (json_extract(p.record_json,'$.startAt') IS NULL
                  OR json_extract(p.record_json,'$.startAt')<=?)
            )
        `);
        const insert=database.prepare(`
          INSERT INTO genesis_first_life_work(thread_id,due_at) VALUES(?,?)
        `);
        for(const threadId of threadIds){
          if(!eligible.get(threadId,at,at)){
            throw new Error("first-life recovery requires an unstarted published life with a grounded place: "+threadId);
          }
          insert.run(threadId,at);
        }
        return {enqueued:threadIds.length};
      });
    },
    close(){database.close();},
  });
}
