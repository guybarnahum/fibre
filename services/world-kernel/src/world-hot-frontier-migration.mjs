// Operator-only migration of per-Thread operational frontiers, not lived
// evidence. Each frontier has at most one row per Thread.
// Table rebuilds follow InfraDriver.state's portable-schema contract.
const TABLES=["current_situation_frontier","lived_now_next_boundaries"];

function quote(name){return '"'+name.replaceAll('"','""')+'"';}

function compactTable(database,table,maxRows){
  const schema=database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
  ).get(table)?.sql;
  if(typeof schema!=="string")throw new Error("World frontier table missing: "+table);
  if(/\bWITHOUT\s+ROWID\b/iu.test(schema))
    return {table,rowsCopied:0,already:true};
  const count=Number(database.prepare(
    `SELECT COUNT(*) AS n FROM ${quote(table)}`,
  ).get().n);
  if(count>maxRows)
    throw new Error("World frontier is not one row per Thread: "+table);

  const shadow="__fibre_compact_"+table;
  const create=schema.replace(/\)\s*STRICT\s*$/iu,") STRICT, WITHOUT ROWID");
  if(create===schema||!/WITHOUT ROWID\s*$/iu.test(create))
    throw new Error("World frontier cannot be converted without schema loss: "+table);
  const indexes=database.prepare(`SELECT sql FROM sqlite_master
    WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`).all(table)
    .map(row=>row.sql);
  const triggers=database.prepare(`SELECT name,sql FROM sqlite_master
    WHERE type='trigger' AND sql IS NOT NULL
      AND (tbl_name=? OR instr(lower(sql),lower(?))>0)`)
    .all(table,table);
  database.transaction(()=>{
    for(const trigger of triggers)
      database.exec("DROP TRIGGER "+quote(trigger.name));
    database.exec(`CREATE TABLE ${quote(shadow)} AS SELECT * FROM ${quote(table)}`);
    database.exec("DROP TABLE "+quote(table));
    database.exec(create);
    database.exec(`INSERT INTO ${quote(table)} SELECT * FROM ${quote(shadow)}`);
    database.exec("DROP TABLE "+quote(shadow));
    for(const sql of indexes)database.exec(sql);
    for(const {sql} of triggers)database.exec(sql);
    const after=Number(database.prepare(
      `SELECT COUNT(*) AS n FROM ${quote(table)}`,
    ).get().n);
    if(after!==count)throw new Error("World frontier copy lost rows: "+table);
  });
  return {table,rowsCopied:count,already:false};
}

export function compactWorldHotFrontiers(database){
  const maxRows=Number(database.prepare(
    "SELECT COUNT(*) AS n FROM threads",
  ).get().n);
  return TABLES.map(table=>compactTable(database,table,maxRows));
}
