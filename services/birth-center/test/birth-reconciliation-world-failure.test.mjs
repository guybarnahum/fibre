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
    let attempts=0;
    const runtime=createBirthCenterRuntime({
      storage,now:()=>"2026-10-28T12:00:00Z",nowMs:()=>10000,
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
      await assert.rejects(runtime.handleWake(),/World unavailable/);
      assert.equal(runtime.provisionalBirthStore.get(genesisId).status,"pending",
        "transient World failure lost the birth");
      assert.equal(await infraDriver.scheduler.get("birth"),15000,
        "transient World failure was not rescheduled");
      assert.deepEqual(await runtime.handleWake(),{attempted:1,published:1});
      assert.equal(attempts,2,"transient World failure did not recover");
    }
  });
}
