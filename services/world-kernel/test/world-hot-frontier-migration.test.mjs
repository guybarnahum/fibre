import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {compactWorldHotFrontiers} from "../src/world-hot-frontier-migration.mjs";

test("bounded World frontier conversion preserves current presence and due wakes",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-frontier-migrate-"));
  let db=null;
  try{
    db=new DatabaseSync(join(directory,"world.sqlite"),{enableForeignKeyConstraints:true});
    db.exec(`
      CREATE TABLE threads(thread_id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE current_situation_records(situation_id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE current_situation_frontier(
        thread_id TEXT PRIMARY KEY,situation_id TEXT NOT NULL,established_at TEXT NOT NULL,
        record_json TEXT NOT NULL,record_digest TEXT NOT NULL,place_ref TEXT,wakefulness TEXT,
        FOREIGN KEY(thread_id) REFERENCES threads(thread_id),
        FOREIGN KEY(situation_id) REFERENCES current_situation_records(situation_id)
      ) STRICT;
      CREATE INDEX idx_current_frontier_place ON current_situation_frontier(place_ref,thread_id)
        WHERE place_ref IS NOT NULL;
      CREATE INDEX idx_current_frontier_recent
        ON current_situation_frontier(established_at DESC,situation_id DESC);
      CREATE TABLE lived_now_next_boundaries(
        thread_id TEXT PRIMARY KEY,situation_id TEXT NOT NULL,due_at TEXT,
        blocked_reason TEXT,failed_attempts INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(thread_id) REFERENCES threads(thread_id),
        FOREIGN KEY(situation_id) REFERENCES current_situation_records(situation_id)
      ) STRICT;
      CREATE INDEX idx_lived_now_next_boundaries_due ON lived_now_next_boundaries(due_at)
        WHERE due_at IS NOT NULL;
      CREATE TRIGGER current_situations_advance_frontier
        AFTER INSERT ON current_situation_records BEGIN
        INSERT INTO current_situation_frontier
          (thread_id,situation_id,established_at,record_json,record_digest,place_ref,wakefulness)
          VALUES('thr_a',NEW.situation_id,'2026-11-02T03:00:00Z','{}','sha256:a','wpl_room','awake')
        ON CONFLICT(thread_id) DO UPDATE SET situation_id=excluded.situation_id;
        END;
      INSERT INTO threads VALUES('thr_a');
      INSERT INTO current_situation_records VALUES('sit_first');
      INSERT INTO lived_now_next_boundaries(thread_id,situation_id,due_at)
      VALUES('thr_a','sit_first','2026-11-02T04:00:00Z');
    `);
    const expected=db.prepare("SELECT * FROM current_situation_frontier").all();
    const wake=db.prepare("SELECT * FROM lived_now_next_boundaries").all();
    const copies=compactWorldHotFrontiers({
      prepare:sql=>db.prepare(sql),exec:sql=>db.exec(sql),
      transaction:work=>{
        db.exec("BEGIN IMMEDIATE");
        try{const result=work();db.exec("COMMIT");return result;}
        catch(error){db.exec("ROLLBACK");throw error;}
      },
    });
    assert.deepEqual(copies.map(item=>item.rowsCopied),[1,1],
      "frontier migration copied more than one row per Thread");
    assert.deepEqual(db.prepare("SELECT * FROM current_situation_frontier").all(),expected,
      "frontier migration changed the enacted present");
    assert.deepEqual(db.prepare("SELECT * FROM lived_now_next_boundaries").all(),wake,
      "frontier migration changed the outstanding wake");
    for(const table of ["current_situation_frontier","lived_now_next_boundaries"]){
      assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name=?").get(table).sql,
        /WITHOUT ROWID/u,"operational frontier still has a duplicate rowid");
    }
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(),[],
      "bounded migration broke World references");
    db.exec("INSERT INTO current_situation_records VALUES('sit_second')");
    assert.equal(db.prepare("SELECT situation_id FROM current_situation_frontier").get().situation_id,
      "sit_second","World frontier update trigger was not restored");
    assert.deepEqual(compactWorldHotFrontiers({
      prepare:sql=>db.prepare(sql),exec:sql=>db.exec(sql),
      transaction:()=>{throw Error("already compacted frontiers were recopied");},
    }).map(row=>row.rowsCopied),[0,0]);
    console.log("FIBRE-WORLD-HOT-FRONTIER-COPIES "+JSON.stringify(copies));
  }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});
