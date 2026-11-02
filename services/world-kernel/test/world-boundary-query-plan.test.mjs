import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";

import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";

// Read-only index plans on the real installed schema. These represent the hot
// boundary readers, historical readers and World venue co-presence lookup.
// Not a blanket claim that every source query has been exhaustively explained.
test("World boundary indexes serve history, current presence and semantic heads",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-world-index-plan-"));
  let db=null;
  try{
    const path=join(directory,"world.sqlite");
    installWorldSchemas(localWorldStateStorage(path));
    db=new DatabaseSync(path,{readOnly:true});
    const indexes={};
    for(const table of [
      "current_situation_records","current_situation_frontier",
      "lived_now_next_boundaries","semantic_state_records",
      "semantic_state_current_heads",
    ]){
      indexes[table]=db.prepare(`PRAGMA index_list("${table}")`).all()
        .map(row=>row.name).sort();
    }
    const candidates=[
      {name:"situation-by-id",index:"sqlite_autoindex_current_situation_records_1",
        sql:"SELECT record_json FROM current_situation_records WHERE situation_id=?",
        args:["sit_probe"]},
      {name:"historical-thread-situation",index:"idx_current_situations_thread_time",
        sql:`SELECT situation_id FROM current_situation_records
          WHERE thread_id=? AND established_at<=?
          ORDER BY established_at DESC,situation_id DESC LIMIT 1`,
        args:["thr_probe","2026-10-22T12:00:00Z"]},
      {name:"recent-global-situations",index:"idx_current_situations_recent",
        sql:`SELECT situation_id FROM current_situation_records
          WHERE established_at>=? ORDER BY established_at DESC LIMIT ?`,
        args:["2026-10-22T12:00:00Z",64]},
      {name:"current-thread-situation",index:"sqlite_autoindex_current_situation_frontier_1",
        sql:"SELECT situation_id FROM current_situation_frontier WHERE thread_id=?",
        args:["thr_probe"]},
      {name:"current-venue-presence",index:"idx_current_frontier_place",
        sql:`SELECT situation_id,thread_id FROM current_situation_frontier
          WHERE place_ref=? AND established_at<=?`,
        args:["wpl_probe","2026-10-22T12:00:00Z"]},
      {name:"next-due-boundary",index:"idx_lived_now_next_boundaries_due",
        sql:`SELECT thread_id,situation_id FROM lived_now_next_boundaries
          WHERE due_at IS NOT NULL AND due_at<=? ORDER BY due_at LIMIT ?`,
        args:["2026-10-22T12:00:00Z",4]},
      {name:"semantic-current-head",index:"idx_semantic_state_current_heads_thread",
        sql:"SELECT state_id FROM semantic_state_current_heads WHERE thread_id=?",
        args:["thr_probe"]},
      {name:"semantic-supersession",index:"idx_semantic_state_supersedes",
        sql:"SELECT state_id FROM semantic_state_records WHERE supersedes_state_id=?",
        args:["sst_probe"]},
      {name:"semantic-by-id",index:"sqlite_autoindex_semantic_state_records_1",
        sql:"SELECT state_text FROM semantic_state_records WHERE state_id=?",
        args:["sst_probe"]},
    ];
    const plans={};
    for(const {name,index,sql,args} of candidates){
      const steps=db.prepare("EXPLAIN QUERY PLAN "+sql).all(...args)
        .map(row=>String(row.detail));
      plans[name]=steps;
      assert.ok(steps.some(detail=>detail.includes(index)),
        name+" lost its indexed lookup: "+steps.join(" | "));
    }
    console.log("FIBRE-WORLD-BOUNDARY-QUERY-PLANS "+JSON.stringify({
      indexes,plans,
    }));
  }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});
