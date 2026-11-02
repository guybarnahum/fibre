import {reportTestEvidence} from "../../../tools/test-infra/test-evidence.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {localWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {createLivedExperienceTables} from "../src/lived-experience-schema.mjs";
import {createContactTables} from "../src/contact-schema.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {openContactStore} from "../src/contact-store.mjs";
import {compactWorldPendingWork} from "../src/world-pending-work-migration.mjs";

test("pending experience and contact work survives compact installation in due order",()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-work-compact-"));
  const path=join(dir,"world.sqlite");
  let db=null,experience=null,contact=null;
  try{
    db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
    db.exec(`
      CREATE TABLE threads(thread_id TEXT PRIMARY KEY) STRICT;
      INSERT INTO threads VALUES('thr_pending');
      CREATE TABLE thread_experience_pending_work(
        kind TEXT NOT NULL,reference TEXT NOT NULL,due_at TEXT NOT NULL,
        PRIMARY KEY(kind,reference)) STRICT;
      CREATE INDEX idx_thread_experience_pending_due
        ON thread_experience_pending_work(kind,due_at,reference);
      CREATE TABLE thread_contact_pending_work(
        kind TEXT NOT NULL,reference TEXT NOT NULL,due_at TEXT NOT NULL,
        PRIMARY KEY(kind,reference)) STRICT;
      CREATE INDEX idx_thread_contact_pending_due
        ON thread_contact_pending_work(kind,due_at,reference);
    `);
    createLivedExperienceTables(db);
    createContactTables(db);
    const create=db.prepare(`INSERT INTO thread_experience_consolidations(
      consolidation_id,thread_id,started_at,experience_refs_json,record_digest)
      VALUES (?,'thr_pending',?,'[]','sha256:fixture')`);
    const stage=db.prepare(`INSERT INTO thread_experience_consolidation_stages(
      consolidation_id,stage,recorded_at,payload_json,record_digest)
      VALUES (?,?,?,?,'sha256:fixture')`);
    const completeAttempt=db.prepare(`INSERT INTO thread_contact_attempt_stages(
      contact_attempt_id,stage,recorded_at,payload_json,record_digest)
      VALUES (?,?,?,?,'sha256:fixture')`);
    const at=hour=>"2026-11-02T"+hour+":00.000Z";
    for(const [id,time] of [["con_later","11:00"],["con_earlier","10:00"]])
      create.run(id,at(time));
    for(const [id,time] of [
      ["con_contact_later","09:30"],
      ["con_contact_earlier","09:00"],
      ["con_contact_attempt","09:15"],
    ]){
      create.run(id,at(time));
      stage.run(id,"decision",at(time),'{"afterthoughts":["consider contact"]}');
      stage.run(id,"complete",at(time),'{"memoryOutcome":"not_remembered"}');
    }
    db.prepare(`INSERT INTO thread_contact_attempts(
      contact_attempt_id,thread_id,consolidation_id,started_at,record_digest)
      VALUES ('attempt_one','thr_pending','con_contact_attempt',?,'sha256:fixture')`
    ).run(at("09:20"));
    const queueRows=table=>db.prepare(
      "SELECT kind,reference,due_at FROM "+table+" ORDER BY kind,reference",
    ).all();
    const before={
      experience:queueRows("thread_experience_pending_work"),
      contact:queueRows("thread_contact_pending_work"),
    };
    const storage={
      prepare:sql=>db.prepare(sql),exec:sql=>db.exec(sql),
      transaction:work=>{
        db.exec("BEGIN IMMEDIATE");
        try{const result=work();db.exec("COMMIT");return result;}
        catch(error){db.exec("ROLLBACK");throw error;}
      },
    };
    const copy=compactWorldPendingWork(storage);
    assert.deepEqual(copy.queues.map(row=>row.rowsCopied),[2,3],
      "unfinished work was not copied intact");
    assert.deepEqual(queueRows("thread_experience_pending_work"),before.experience,
      "pending experiences changed during migration");
    assert.deepEqual(queueRows("thread_contact_pending_work"),before.contact,
      "pending contacts changed during migration");
    const state=localWorldStateStorage(path);
    experience=openLivedExperienceStore(state);
    contact=openContactStore(state);
    assert.deepEqual(experience.listPendingThreadExperienceConsolidations({limit:4})
      .map(item=>item.consolidationId),["con_earlier","con_later"],
      "pending experience lost due order");
    assert.deepEqual(contact.listUnconsideredAfterthoughtSources({limit:4})
      .map(item=>item.consolidationId),["con_contact_earlier","con_contact_later"],
      "pending afterthought lost due order");
    assert.deepEqual(contact.listPendingAttempts({limit:4})
      .map(item=>item.contactAttemptId),["attempt_one"],
      "claimed contact attempt disappeared");
    for(const [table,kind] of [
      ["thread_experience_pending_work","consolidation"],
      ["thread_contact_pending_work","afterthought"],
    ]){
      const indexes=db.prepare('PRAGMA index_list("'+table+'")').all();
      assert.equal(indexes.length,1,"pending work retains redundant indexes");
      const steps=db.prepare(`EXPLAIN QUERY PLAN SELECT reference FROM "${table}"
        WHERE kind=? ORDER BY due_at,reference LIMIT ?`).all(kind,4)
        .map(row=>String(row.detail));
      assert.ok(steps.some(step=>step.includes("USING PRIMARY KEY (kind=?)")),
        "pending-work read is not bounded by in-flight kind");
    }
    stage.run("con_earlier","decision",at("10:01"),'{"afterthoughts":[]}');
    stage.run("con_earlier","complete",at("10:02"),'{"memoryOutcome":"not_remembered"}');
    assert.deepEqual(experience.listPendingThreadExperienceConsolidations({limit:4})
      .map(item=>item.consolidationId),["con_later"],
      "completed consolidation remained pending");
    completeAttempt.run("attempt_one","complete",at("09:22"),'{}');
    assert.equal(contact.listPendingAttempts({limit:4}).length,0,
      "completed contact remained pending");
    assert.deepEqual(contact.listUnconsideredAfterthoughtSources({limit:4})
      .map(item=>item.consolidationId),["con_contact_earlier","con_contact_later"],
      "another person's pending contact disappeared");
    assert.equal(db.prepare(
      "SELECT COUNT(*) AS n FROM thread_experience_consolidations",
    ).get().n,5,"pending-work migration rewrote historical consolidations");
    const second=compactWorldPendingWork(storage);
    assert.deepEqual(second.queues.map(row=>row.rowsCopied),[0,0],
      "repeat install rewrote in-flight work");
    reportTestEvidence("FIBRE-WORLD-PENDING-COPIES",copy);
  }finally{
    experience?.close();contact?.close();db?.close();
    rmSync(dir,{recursive:true,force:true});
  }
});
