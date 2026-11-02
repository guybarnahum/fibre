const QUEUES=[
  ["thread_experience_pending_work","idx_thread_experience_pending_due"],
  ["thread_contact_pending_work","idx_thread_contact_pending_due"],
];
const UNUSED_INDEXES=[
  "idx_thread_experience_time","idx_thread_attention_time",
  "idx_situated_evidence_witness_thread","idx_situated_life_heads_thread",
];
function quote(name){return '"'+name.replaceAll('"','""')+'"';}

// Operator-only, atomic copy of in-flight work. Never enumerate lived history.
export function compactWorldPendingWork(database){
  return database.transaction(()=>{
    const queues=QUEUES.map(([table,dueIndex])=>{
      const schema=database.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      ).get(table)?.sql;
      if(typeof schema!=="string")throw new Error("World work frontier missing: "+table);
      const already=/\bWITHOUT\s+ROWID\b/iu.test(schema);
      let rowsCopied=0;
      if(!already){
        const create=schema.replace(/\)\s*STRICT\s*$/iu,") STRICT, WITHOUT ROWID");
        if(create===schema||!/WITHOUT ROWID\s*$/iu.test(create))
          throw new Error("World pending queue cannot be compacted: "+table);
        const triggers=database.prepare(`SELECT name,sql FROM sqlite_master
          WHERE type='trigger' AND sql IS NOT NULL
          AND (tbl_name=? OR instr(lower(sql),lower(?))>0)`).all(table,table);
        const copy="__fibre_pending_copy";
        rowsCopied=Number(database.prepare(
          `SELECT COUNT(*) AS n FROM ${quote(table)}`,
        ).get().n);
        for(const trigger of triggers)database.exec("DROP TRIGGER "+quote(trigger.name));
        database.exec(`CREATE TABLE ${quote(copy)} AS SELECT * FROM ${quote(table)}`);
        database.exec("DROP TABLE "+quote(table));
        database.exec(create);
        database.exec(`INSERT INTO ${quote(table)} SELECT * FROM ${quote(copy)}`);
        database.exec("DROP TABLE "+quote(copy));
        for(const trigger of triggers)database.exec(trigger.sql);
        const after=Number(database.prepare(
          `SELECT COUNT(*) AS n FROM ${quote(table)}`,
        ).get().n);
        if(after!==rowsCopied)throw new Error("World pending work was lost: "+table);
      }
      database.exec("DROP INDEX IF EXISTS "+quote(dueIndex));
      return {table,rowsCopied,already};
    });
    const indexesDropped=UNUSED_INDEXES.filter(index=>
      database.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?")
        .get(index)!==undefined);
    for(const index of UNUSED_INDEXES)
      database.exec("DROP INDEX IF EXISTS "+quote(index));
    return {queues,indexesDropped};
  });
}
