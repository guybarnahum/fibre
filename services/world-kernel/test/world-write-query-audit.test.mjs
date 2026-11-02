import {reportTestEvidence} from "../../../tools/test-infra/test-evidence.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,readdirSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,relative} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";

import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";

const root=fileURLToPath(new URL("../../../",import.meta.url));
const tables=["current_situation_records","current_situation_frontier",
  "semantic_state_records","lived_now_next_boundaries","semantic_state_current_heads"];
const schemaSql={
  place:`CREATE INDEX idx_current_situations_place ON current_situation_records(
    json_extract(record_json,'$.location.placeRef'),established_at DESC,thread_id)
    WHERE json_extract(record_json,'$.location.kind')='place'`,
};

// Production SQL inventory: current/history/presence/boundary readers from
// LivedNowStore, LivedExperienceStore, Genesis, observatory, integrity audit,
// and semantic-state inspection. Writes are audited in the write-cost harness.
// The original index is temporarily restored here to test whether any of
// these reads actually uses it BEFORE the production schema removes it.
const queries=[
  ["lived.getSituation","SELECT record_json FROM current_situation_records WHERE situation_id=?"],
  ["lived.getSituationAt",`SELECT situation_id FROM current_situation_records WHERE thread_id=?
    AND established_at<=? ORDER BY established_at DESC,situation_id DESC LIMIT 1`],
  ["lived.getPreviousSituation",`SELECT situation_id FROM current_situation_records
    WHERE thread_id=? AND established_at<? ORDER BY established_at DESC,situation_id DESC LIMIT 1`],
  ["lived.listRecentSituations",`SELECT situation_id FROM current_situation_records
    WHERE thread_id=? ORDER BY established_at DESC,situation_id DESC LIMIT ?`],
  ["lived.getCurrentSituation","SELECT record_json FROM current_situation_frontier WHERE thread_id=?"],
  ["lived.listCurrentSituations",`SELECT f.situation_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id WHERE f.established_at<=?`],
  ["lived.listCurrentSituations.history",`SELECT s.situation_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id
    JOIN current_situation_records s ON s.situation_id=(
      SELECT prior.situation_id FROM current_situation_records prior
      WHERE prior.thread_id=f.thread_id AND prior.established_at<=?
      ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1)
    WHERE f.established_at>?`],
  ["lived.listCurrentSituations.continuity",`SELECT f.situation_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id
    LEFT JOIN lived_now_plans p ON p.plan_id=json_extract(f.record_json,'$.sourcePlanRefs[0]')
    LEFT JOIN lived_now_next_boundaries b ON b.thread_id=f.thread_id AND b.situation_id=f.situation_id
    WHERE f.established_at<=?`],
  ["lived.listCurrentVenueSituations.legacy",`SELECT s.situation_id FROM live_physical_venue_bindings v
    JOIN current_situation_frontier f ON f.thread_id=v.thread_id
    JOIN current_situation_records s ON s.situation_id=(
      CASE WHEN f.established_at<=? THEN f.situation_id ELSE
        (SELECT latest.situation_id FROM current_situation_records latest
         WHERE latest.thread_id=v.thread_id AND latest.established_at<=?
         ORDER BY latest.established_at DESC,latest.situation_id DESC LIMIT 1) END)
    WHERE v.venue_ref=? AND json_extract(s.record_json,'$.location.kind')='place'
      AND json_extract(s.record_json,'$.location.placeRef')=v.context_place_ref
    ORDER BY v.thread_id LIMIT ?`],
  ["lived.listCurrentVenueSituations.public",`SELECT f.situation_id FROM world_public_places p
    JOIN current_situation_frontier f ON f.place_ref=p.place_ref
    JOIN threads t ON t.thread_id=f.thread_id
    WHERE p.venue_ref=? AND f.established_at<=? AND t.status<>'retired'`],
  ["lived.listCurrentVenueSituations.past",`SELECT s.situation_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id JOIN world_public_places p ON p.venue_ref=?
    JOIN current_situation_records s ON s.situation_id=(
      SELECT latest.situation_id FROM current_situation_records latest
      WHERE latest.thread_id=f.thread_id AND latest.established_at<=?
      ORDER BY latest.established_at DESC,latest.situation_id DESC LIMIT 1)
    WHERE f.established_at>? AND json_extract(s.record_json,'$.location.kind')='place'
      AND json_extract(s.record_json,'$.location.placeRef')=p.place_ref`],
  ["lived.listRecentCurrentSituations",`SELECT f.situation_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id
    WHERE f.established_at BETWEEN ? AND ? AND t.status<>'retired'`],
  ["lived.listRecentCurrentSituations.history",`SELECT s.situation_id FROM current_situation_frontier f
    JOIN current_situation_records s ON s.situation_id=(
      SELECT prior.situation_id FROM current_situation_records prior
      WHERE prior.thread_id=f.thread_id AND prior.established_at BETWEEN ? AND ?
      ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1)
    WHERE f.established_at>?`],
  ["lived.due",`SELECT b.thread_id FROM lived_now_next_boundaries b
    LEFT JOIN current_situation_frontier f ON f.thread_id=b.thread_id
    WHERE b.due_at IS NOT NULL AND b.due_at<=? ORDER BY b.due_at LIMIT ?`],
  ["lived.repair",`SELECT f.thread_id FROM current_situation_frontier f
    JOIN threads t ON t.thread_id=f.thread_id AND t.status<>'retired'
    LEFT JOIN lived_now_next_boundaries b ON b.thread_id=f.thread_id
    WHERE b.thread_id IS NULL OR b.situation_id<>f.situation_id
    ORDER BY f.thread_id LIMIT ?`],
  ["genesis.firstLife",`SELECT t.thread_id FROM threads t
    LEFT JOIN current_situation_frontier f ON f.thread_id=t.thread_id
    WHERE f.thread_id IS NULL ORDER BY t.thread_id LIMIT 500`],
  ["experience.arrivalDebt",`SELECT situation_id FROM current_situation_records
    WHERE situation_id=?`],
  ["experience.storyInspection",`SELECT e.encounter_id FROM encounter_story_records e
    LEFT JOIN current_situation_records sit ON sit.situation_id=?
    WHERE e.encounter_id=?`],
  ["observatory.globalRecent",`SELECT situation_id,thread_id,established_at FROM current_situation_records
    WHERE established_at>=? ORDER BY established_at DESC,situation_id DESC LIMIT ?`],
  ["observatory.previous",`SELECT prior.record_json FROM current_situation_records prior
    WHERE prior.thread_id=? AND (prior.established_at<? OR
      (prior.established_at=? AND prior.situation_id<?))
    ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1`],
  ["integrity.situation",`SELECT situation_id,record_json,record_digest FROM current_situation_records
    WHERE situation_id>? ORDER BY situation_id LIMIT ?`],
  ["semantic.getState","SELECT state_id FROM semantic_state_records WHERE state_id=?"],
  ["semantic.history",`SELECT state_id FROM semantic_state_records
    WHERE thread_id=? ORDER BY as_of,state_id`],
  ["semantic.supersedes",`SELECT state_id FROM semantic_state_records WHERE supersedes_state_id=?`],
  ["semantic.currentHead",`SELECT r.state_id FROM semantic_state_current_heads h
    JOIN semantic_state_records r ON r.state_id=h.state_id
    WHERE h.thread_id=? ORDER BY r.domain,r.dimension,r.as_of,r.state_id`],
  ["tools.inspectIdentityContext",`SELECT r.state_id FROM semantic_state_current_heads h
    JOIN semantic_state_records r ON r.state_id=h.state_id
    WHERE h.thread_id=? ORDER BY r.domain,r.dimension,r.as_of,r.state_id`],
];
// Explicit historical inspection may enumerate a Thread's entire history.
// Production current-state readers must not do so.
const historicalTables=[
  "semantic_state_records","current_situation_records","lived_now_plans",
  "lived_encounter_records","thread_encounter_experiences",
  "autobiographical_memory_records",
];
const historicalScanAllowlist=[
  {path:"services/world-kernel/src/semantic-state-store.mjs",
    sql:/\bFROM semantic_state_records WHERE thread_id=\? ORDER BY as_of,state_id$/iu,
    reason:"listStateHistory explicitly returns complete semantic history"},
  {path:"services/world-kernel/src/lived-now-store.mjs",
    sql:/\bFROM lived_now_plans WHERE subject_thread_id=\? ORDER BY authored_at,plan_id$/iu,
    reason:"listPlans explicitly returns one Thread's complete plan history"},
  {path:"services/world-kernel/src/lived-experience-store.mjs",
    sql:/\bFROM lived_encounter_records WHERE thread_id=\? ORDER BY occurred_at,event_id$/iu,
    reason:"listLegacyEncounters explicitly returns historical encounters"},
];
function historyScanJustification(entry){
  return historicalScanAllowlist.find(item=>item.path===entry.path
    &&item.sql.test(entry.sql))?.reason??null;
}
function unboundedThreadHistoryRead({path,sql}){
  const clean=sql.replace(/--[^\n]*/gu," ").replace(/\s+/gu," ").trim();
  if(!/^SELECT\b/iu.test(clean)||/\bLIMIT\b/iu.test(clean))return null;
  if((clean.match(/\?/gu)??[]).length!==1
    ||!/\b(?:thread_id|subject_thread_id)\s*=\s*\?/iu.test(clean))return null;
  const table=historicalTables.find(name=>new RegExp(`\\bFROM\\s+${name}\\b`,"iu").test(clean));
  return table?{path,table,sql:clean}:null;
}
function staticHotSql(tableNames=tables,scanAll=false){
  const paths=[
    "services/world-kernel/src/lived-now-store.mjs",
    "services/world-kernel/src/lived-experience-store.mjs",
    "services/world-kernel/src/autobiographical-memory-store.mjs",
    "services/world-kernel/src/semantic-state-store.mjs",
    "services/world-kernel/src/genesis-first-life-store.mjs",
    "services/world-kernel/src/world-event-observatory.mjs",
    "services/world-kernel/src/world-integrity-audit.mjs",
    "tools/inspect/inspect-identity-context.mjs",
  ];
  if(scanAll){
    function collect(dir){
      for(const entry of readdirSync(dir,{withFileTypes:true})){
        const file=join(dir,entry.name);
        if(entry.isDirectory())collect(file);
        else if(entry.isFile()&&entry.name.endsWith(".mjs"))
          paths.push(relative(root,file));
      }
    }
    collect(join(root,"services/world-kernel/src"));
  }
  const staticQueries=[],dynamic=[];
  for(const path of [...new Set(paths)]){
    const source=readFileSync(join(root,path),"utf8");
    const matches=source.matchAll(/\.prepare\(\s*(?:`([^`]*?)`|"([^"\n]*)"|'([^'\n]*)')/gu);
    for(const match of matches){
      const sql=(match[1]??match[2]??match[3]??"").trim();
      if(!tableNames.some(table=>sql.includes(table))
        &&!historicalTables.some(table=>sql.includes(table)))continue;
      const line=source.slice(0,match.index).split("\n").length;
      // Some legitimate prepared queries start with SQL comments (notably
      // LivedNow's delayed-event UNION); explain those instead of skipping.
      const statement=sql.replace(/^(?:\s*--[^\n]*\n)+/gu,"").trim();
      if(sql.includes("\${")||!/^(?:SELECT|INSERT|UPDATE|DELETE|WITH)\b/iu.test(statement)){
        dynamic.push({path,line,reason:"dynamic SQL or non-DML",
          tables:tableNames.filter(table=>sql.includes(table))});
      }else staticQueries.push({path,line,sql:statement});
    }
  }
  return {staticQueries,dynamic};
}

function relevantSources(){
  const files=[];
  function scan(rootDir){
    for(const entry of readdirSync(rootDir,{withFileTypes:true})){
      if(["node_modules",".fibre","dist"].includes(entry.name))continue;
      const file=join(rootDir,entry.name);
      if(entry.isDirectory())scan(file);
      else if(entry.isFile()&&/\.(?:mjs|js|ts|sql)$/u.test(file)
        &&!/(?:^|\/)test(?:\/|$)|\.test\./u.test(file)){
        const source=readFileSync(file,"utf8");
        if(tables.some(table=>source.includes(table)))
          files.push(relative(root,file));
      }
    }
  }
  for(const folder of ["services","infra","apps","tools","migrations"]){
    const dir=join(root,folder);
    try{scan(dir)}catch(error){if(error.code!=="ENOENT")throw error;}
  }
  return files.sort();
}
test("unbounded current semantic reads cannot masquerade as history inspection",()=>{
  const query=unboundedThreadHistoryRead({
    path:"services/world-kernel/src/semantic-state-store.mjs",
    sql:"SELECT state_id FROM semantic_state_records WHERE thread_id=? AND staleness='current' ORDER BY as_of",
  });
  assert.ok(query&&!historyScanJustification(query),
    "current semantic history scan escaped the hot-path guard");
});

test("World hot-table SQL keeps indexed historical and co-presence readers",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-write-query-audit-"));
  let db=null;
  try{
    const path=join(directory,"world.sqlite");
    installWorldSchemas(localWorldStateStorage(path));
    db=new DatabaseSync(path);
    db.exec(schemaSql.place);
    const plans=[];
    for(const [statement,sql] of queries){
      const bindings=Array((sql.match(/\?/gu)??[]).length).fill("probe");
      const steps=db.prepare("EXPLAIN QUERY PLAN "+sql).all(...bindings)
        .map(row=>String(row.detail));
      assert.ok(steps.length>0,statement+" has no query plan");
      plans.push({statement,steps});
    }
    const {staticQueries,dynamic}=staticHotSql();
    const unbounded=staticQueries.map(unboundedThreadHistoryRead).filter(Boolean);
    for(const entry of unbounded)
      assert.ok(historyScanJustification(entry),
        "unbounded lived-history read: "+entry.path);
    const preparedPlans=[];
    for(const entry of staticQueries){
      const args=Array((entry.sql.match(/\?/gu)??[]).length).fill("probe");
      const steps=db.prepare("EXPLAIN QUERY PLAN "+entry.sql).all(...args)
        .map(row=>String(row.detail));
      preparedPlans.push({path:entry.path,line:entry.line,steps});
    }
    const usesStatic=index=>preparedPlans.filter(entry=>
      entry.steps.some(step=>step.includes(index)));
    assert.equal(usesStatic("idx_current_situations_place").length,0,
      "a production prepared statement uses the historical place index");
    const uses=index=>plans.filter(entry=>entry.steps.some(step=>step.includes(index)))
      .map(entry=>entry.statement);
    assert.deepEqual(uses("idx_current_situations_place"),[],
      "historical place-expression index is actually used");
    assert.ok(uses("idx_semantic_state_thread_current").includes("semantic.history"),
      "semantic history lost its thread index");
    assert.ok(uses("idx_current_frontier_recent").includes("lived.listRecentCurrentSituations"),
      "current recent-presence path lost its time index");
    db.exec("DROP INDEX idx_current_situations_place");
    // Inspect every installed secondary index, a superset of the tables the
    // write map mutates. This is a reader inventory, not an index-removal gate.
    const tableNames=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all().map(row=>row.name);
    const allReaders=staticHotSql(tableNames,true);
    const readerPlans=[...plans.map(item=>({
      reader:item.statement,steps:item.steps,
    })),...preparedPlans.map(item=>({
      reader:item.path+":"+item.line,steps:item.steps,
    }))];
    const unplanned=[];
    for(const entry of allReaders.staticQueries){
      try{
        const bindings=Array((entry.sql.match(/\?/gu)??[]).length).fill("probe");
        readerPlans.push({
          reader:entry.path+":"+entry.line,
          steps:db.prepare("EXPLAIN QUERY PLAN "+entry.sql).all(...bindings)
            .map(row=>String(row.detail)),
        });
      }catch(error){
        unplanned.push({path:entry.path,line:entry.line,
          reason:String(error?.message??error).slice(0,110)});
      }
    }
    // Dynamic templates naming a retired table must be reviewed, not ignored.
    const retiredTables=[
      "thread_encounter_experiences","thread_encounter_attention",
      "situated_evidence_witnesses","situated_life_lineage_heads",
    ];
    const unresolved=allReaders.dynamic.filter(entry=>
      entry.tables.some(table=>retiredTables.includes(table)));
    assert.deepEqual(unresolved,[],
      "retired index has an unresolved dynamic SQL reader");
    const indexes=[];
    for(const table of tableNames){
      const escaped='"'+table.replaceAll('"','""')+'"';
      for(const index of db.prepare("PRAGMA index_list("+escaped+")").all()){
        if(index.origin==="pk")continue; // WITHOUT ROWID's primary tree is not secondary.
        const readers=[...new Set(readerPlans.filter(plan=>
          plan.steps.some(step=>step.includes(index.name)))
          .map(plan=>plan.reader))].sort();
        indexes.push({
          table,index:index.name,origin:index.origin,
          readers,readerStatus:readers.length===0?"none in audited SQL":"indexed",
        });
      }
    }
    indexes.sort((a,b)=>a.table.localeCompare(b.table)||a.index.localeCompare(b.index));
    for(const index of [
      "idx_thread_experience_time","idx_thread_attention_time",
      "idx_situated_evidence_witness_thread","idx_situated_life_heads_thread",
    ])assert.ok(!indexes.some(entry=>entry.index===index),
      "unused hot index survived installation: "+index);
    reportTestEvidence("FIBRE-WORLD-INDEX-READERS",{
      indexes,withoutAuditedReader:indexes.filter(entry=>entry.readers.length===0)
        .map(({table,index})=>({table,index})),
      queriesPlanned:readerPlans.length,dynamicSql:allReaders.dynamic.length,
      unplanned,scope:"all World indexes; no reader does not prove unused",
    });
    const sourceFiles=relevantSources();
    reportTestEvidence("FIBRE-WORLD-HOT-SQL-AUDIT",{
      checked:plans.length,staticPreparedStatements:preparedPlans.length,
      dynamicPreparedStatements:dynamic,
      unboundedHistoryReaders:unbounded.map(({path,table,sql})=>({
        path,table,reason:historyScanJustification({path,table,sql}),
      })),sourceFiles,plans,preparedPlans,
      retained:{
        currentFrontierRecent:uses("idx_current_frontier_recent"),
        semanticThread:uses("idx_semantic_state_thread_current"),
      },
      dropped:"idx_current_situations_place",
    });
  }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});
