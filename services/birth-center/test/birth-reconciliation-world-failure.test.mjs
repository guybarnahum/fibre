import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createLocalInfraDriver} from "#infra/providers/local";
import {WorldKernelBirthPublicationError} from "../../../infra/deployments/birth-center/world-kernel-boundary.mjs";
import {migrateBirthState} from "../src/birth-state-migrations.mjs";
import {createBirthCenterRuntime} from "../src/runtime.mjs";

for(const {status,code,terminal} of [
  {status:400,code:"BODY_PROJECTION_MISMATCH",terminal:true},
  {status:409,code:"GENESIS_RECORD_CONFLICT",terminal:true},
  {status:409,code:"WORLD_REVISION_NOT_SERVING",terminal:false},
  {status:503,code:"WORLD_UNAVAILABLE",terminal:false},
]){
  test(`World ${status} ${code} ${terminal?"ends publication":"remains retryable"}`,async(t)=>{
    const root=mkdtempSync(join(tmpdir(),"fibre-world-birth-retry-"));
    t.after(()=>rmSync(root,{recursive:true,force:true}));
    const infraDriver=createLocalInfraDriver({
      stateScopes:{birth:join(root,"birth.sqlite")},
      schedulerScopes:{birth:{onWake:()=>{}}},
    });
    const storage={infraDriver,stateScopeId:"birth"};
    migrateBirthState(storage);
    const genesisId=`genesis_world_error_${code}`;
    const threadId=`thr_world_error_${code}`;
    const requestId=`request_world_error_${code}`;
    let attempts=0,clock=10000;
    const runtime=createBirthCenterRuntime({
      storage,now:()=>"2026-10-28T12:00:00Z",nowMs:()=>clock,
      worldPublisher:{
        publishBirth(){
          attempts++;
          if(attempts===1)throw new WorldKernelBirthPublicationError(
            terminal?(status===409?"WorldSpec already exists with different content":"birth Body projection differs from admitted symbolic urge genome"):"World unavailable",
            {status,code},
          );
          return {thread:{threadId}};
        },
      },
    });
    t.after(()=>runtime.close());
    runtime.developmentRequestStore.reserve({
      requestId,requestDigest:"digest_test",
      plan:{requestId,requestDigest:"digest_test",genesisId,threadId},
    });
    await runtime.submitBirth({manifest:{genesisId,threadId},thread:{threadId}});
    if(terminal){
      assert.deepEqual(await runtime.handleWake(),{attempted:1,published:0});
      assert.equal(runtime.provisionalBirthStore.get(genesisId).status,"failed",
        "rejected birth remained retryable");
      const disposition=runtime.developmentRequestStore.getDisposition(requestId);
      assert.equal(disposition.failureRetryable,false,"rejected birth remained retryable");
      assert.equal(disposition.failureCode,code);
      assert.match(disposition.failureMessage,status===409?/WorldSpec already exists/:/birth Body projection differs/);
      assert.equal(runtime.status().pendingBirthCount,0,"rejected birth remained queued");
      await runtime.ensureScheduled();
      assert.equal(await infraDriver.scheduler.get("birth"),null,
        "rejected birth retained a scheduled retry");
      assert.deepEqual(await runtime.handleWake(),{attempted:0,published:0});
      assert.equal(attempts,1,"rejected birth retried");
    }else{
      assert.deepEqual(await runtime.handleWake(),{attempted:1,published:0},
        "retryable World failure stopped the alarm");
      assert.equal(runtime.provisionalBirthStore.get(genesisId).status,"pending",
        "transient World failure lost the birth");
      assert.equal(runtime.provisionalBirthStore.get(genesisId).attemptCount,1);
      assert.equal(await infraDriver.scheduler.get("birth"),15000,
        "transient World failure was not rescheduled");
      assert.deepEqual(await runtime.handleWake(),{attempted:0,published:0},
        "non-due birth was retried");
      clock=15000;
      assert.deepEqual(await runtime.handleWake(),{attempted:1,published:1});
      assert.equal(attempts,2,"transient World failure did not recover");
    }
  });
}

test("retryable publication backs off durably without blocking another birth",async t=>{
  const root=mkdtempSync(join(tmpdir(),"fibre-world-backoff-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const infraDriver=createLocalInfraDriver({
    stateScopes:{birth:join(root,"birth.sqlite")},
    schedulerScopes:{birth:{onWake:()=>{}}},
  });
  const storage={infraDriver,stateScopeId:"birth"};
  migrateBirthState(storage);
  let clock=10_000,failedAttempts=0,secondPublished=0;
  const runtime=createBirthCenterRuntime({
    storage,now:()=>new Date(clock).toISOString(),nowMs:()=>clock,
    worldPublisher:{publishBirth(bundle){
      if(bundle.manifest.genesisId==="gen_blocked"){
        failedAttempts++;
        throw new WorldKernelBirthPublicationError("World temporarily unavailable",
          {status:503,code:"WORLD_UNAVAILABLE"});
      }
      secondPublished++;
      return {thread:{threadId:bundle.manifest.threadId}};
    }},
  });
  t.after(()=>runtime.close());
  for(const id of ["blocked","healthy"])
    await runtime.submitBirth({manifest:{genesisId:"gen_"+id,threadId:"thr_"+id}});
  for(let i=0;i<14;i++){
    const result=await runtime.handleWake();
    assert.deepEqual(result,{attempted:i===0?2:1,published:i===0?1:0},
      "one failed birth blocked a healthy peer");
    assert.equal(secondPublished,1,"healthy peer was republished");
    const birth=runtime.provisionalBirthStore.get("gen_blocked");
    const delay=Math.min(900_000,5_000*2**i);
    assert.equal(birth.attemptCount,i+1,"retry count was not persisted");
    assert.equal(birth.nextAttemptAt,clock+delay,"retry backoff failed");
    assert.match(birth.lastRetryableError,/World temporarily unavailable/u);
    assert.equal(await infraDriver.scheduler.get("birth"),clock+delay,
      "scheduler ignored earliest due retry");
    assert.equal(runtime.provisionalBirthStore.pending({nowMs:clock}).length,0,
      "backing-off birth appeared due");
    clock+=delay;
  }
  assert.equal(failedAttempts,14,"failed birth skipped or duplicated attempts");
});
