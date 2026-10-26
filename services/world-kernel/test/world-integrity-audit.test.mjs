import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {installedWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import {openWorldStore} from "../src/persistence.mjs";
import {auditWorldIntegrityBatch} from "../src/world-integrity-audit.mjs";

const seed=JSON.parse(readFileSync(new URL(
  "../../../fixtures/threads/mina.thread.json",import.meta.url,
),"utf8"));

test("operator integrity audit finds a corrupted admitted lived record",()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-integrity-audit-"));
  const path=join(dir,"world.sqlite");
  try{
    const storage=installedWorldStateStorage(path);
    const world=openWorldStore(storage);
    const threadId=world.seedThread(structuredClone(seed)).thread.threadId;
    world.close();
    const raw=new DatabaseSync(path);
    try{
      raw.prepare(`INSERT INTO lived_now_plans(
        plan_id,subject_thread_id,plan_kind,owner_party_id,authored_at,
        record_json,record_digest
      ) VALUES (?,?,?,?,?,?,?)`).run(
        "plan_invalid_witness",threadId,"personal",threadId,
        "2026-10-24T12:00:00Z",JSON.stringify({planId:"plan_invalid_witness"}),
        "sha256:"+"0".repeat(64),
      );
    }finally{raw.close();}
    const report=auditWorldIntegrityBatch(storage,{
      family:"lived_plans",limit:1,
    });
    assert.equal(report.checked,1);
    assert.equal(report.findings.length,1,
      "operator audit silently accepted corrupted lived evidence");
    assert.equal(report.findings[0].ref,"plan_invalid_witness");
    assert.throws(()=>auditWorldIntegrityBatch(storage,{
      family:"lived_plans",limit:501,
    }),/limit/u,"audit exceeded bounded read limit");
  }finally{rmSync(dir,{recursive:true,force:true});}
});
