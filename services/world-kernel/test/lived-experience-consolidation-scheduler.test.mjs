import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareInfraDriver } from "../../../infra/providers/cloudflare/index.mjs";
import { createLocalInfraDriver } from "../../../infra/providers/local/driver.mjs";
import {
  createWorldReconciliationRuntime,
} from "../src/world-reconciliation-process.mjs";
import {
  EXPERIENCE_CONSOLIDATION_DELAY_MS,
  createExperienceConsolidationWakeScheduler,
} from "../src/lived-experience-consolidation-scheduler.mjs";

function cloudflareStorage(){
  let alarm=null;
  return {
    sql:{
      exec(){
        return {
          rowsWritten:0,
          toArray(){ return []; },
        };
      },
    },
    transactionSync(callback){ return callback(); },
    getAlarm(){ return alarm; },
    setAlarm(value){ alarm=value; },
    deleteAlarm(){ alarm=null; },
  };
}

async function proveScheduler(infraDriver){
  const now=Date.now();
  const runtime=createWorldReconciliationRuntime({
    infraDriver,
    process:{ async runOnce(){ return { skipped:false }; } },
    now:()=>now,
    intervalMs:5_000,
  });
  const schedule=createExperienceConsolidationWakeScheduler({
    reconciliationRuntime:runtime,
  });

  await infraDriver.scheduler.schedule("world",now+10_000);
  const reused=await schedule({
    experienceId:"exp_n75_scheduler",
    threadId:"thr_n75_scheduler",
  });
  assert.deepEqual(
    reused,
    {
      scopeId:"world",
      scheduledTimeMs:now+10_000,
      existing:true,
    },
    "consolidation postponed an earlier World wake",
  );

  await infraDriver.scheduler.cancel("world");
  const fresh=await schedule();
  assert.equal(
    fresh.scheduledTimeMs,
    now+EXPERIENCE_CONSOLIDATION_DELAY_MS,
    "recovery wake did not use the shared consolidation delay",
  );
  assert.equal(
    await infraDriver.scheduler.get("world"),
    now+EXPERIENCE_CONSOLIDATION_DELAY_MS,
    "InfraDriver did not own the consolidation wake",
  );
  await infraDriver.scheduler.cancel("world");
}

test("N7.5 consolidation scheduling is provider-neutral across Local and Cloudflare InfraDrivers",async()=>{
  const local=createLocalInfraDriver({
    schedulerScopes:{world:{onWake(){}}},
  });
  const cloudflare=createCloudflareInfraDriver({
    schedulerScopes:{world:cloudflareStorage()},
  });

  await proveScheduler(local);
  await proveScheduler(cloudflare);
});
