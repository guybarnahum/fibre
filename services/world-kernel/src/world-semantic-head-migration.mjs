import {
  createSemanticStateHeadsTable,
  installSemanticStateHeadTrigger,
} from "./semantic-state-schema.mjs";

// One-time operator repair: rebuild the small current projection from the
// immutable lineage. Ordinary World reads never enumerate historical states.
// No table renames: Cloudflare re-parses every trigger at expression depth 100.
const lineageCount=`SELECT COUNT(*) AS n FROM semantic_state_records r
  WHERE r.staleness='current' AND NOT EXISTS (
    SELECT 1 FROM semantic_state_records newer
    WHERE newer.supersedes_state_id=r.state_id)`;

export function compactSemanticStateHeads(database){
  const records=database.prepare(`SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='semantic_state_records'`).get();
  // A fresh database is initialized by its store constructor afterward.
  if(!records)return {rowsCopied:0,already:true};
  const schema=database.prepare(`SELECT sql FROM sqlite_master
    WHERE type='table' AND name='semantic_state_current_heads'`).get()?.sql;
  if(schema){
    const pk=database.prepare("PRAGMA table_info(semantic_state_current_heads)")
      .all().filter(column=>column.pk>0).sort((a,b)=>a.pk-b.pk)
      .map(column=>column.name);
    if(/\bWITHOUT\s+ROWID\b/iu.test(schema)
      &&pk.join(",")==="thread_id,state_id"){
      // A compact projection still needs its current-head trigger.
      installSemanticStateHeadTrigger(database);
      return {rowsCopied:0,already:true};
    }
  }

  let rowsCopied=0;
  database.transaction(()=>{
    database.exec("DROP TRIGGER IF EXISTS semantic_state_current_head_insert");
    database.exec("DROP INDEX IF EXISTS idx_semantic_state_current_heads_thread");
    if(schema)database.exec("DROP TABLE semantic_state_current_heads");
    createSemanticStateHeadsTable(database);
    database.exec(`INSERT INTO semantic_state_current_heads
      (thread_id,state_id,state_digest,as_of)
      SELECT r.thread_id,r.state_id,r.state_digest,r.as_of
      FROM semantic_state_records r
      WHERE r.staleness='current' AND NOT EXISTS (
        SELECT 1 FROM semantic_state_records newer
        WHERE newer.supersedes_state_id=r.state_id)`);
    rowsCopied=Number(database.prepare(`SELECT COUNT(*) AS n
      FROM semantic_state_current_heads`).get().n);
    installSemanticStateHeadTrigger(database);
    if(rowsCopied!==Number(database.prepare(lineageCount).get().n))
      throw new Error("semantic current-head migration lost lineage");
  });
  return {rowsCopied,already:false};
}
