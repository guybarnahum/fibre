import assert from "node:assert/strict";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import {
  WORLD_RECONCILIATION_SCOPE_ID,
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
  worldReconciliationNeedsRetry,
} from "../src/world-reconciliation-process.mjs";

function createRuntimeFixture({
  process,
  now = () => 1_000,
  intervalMs = 100,
  maxRetryMs = 800,
  retryState = null,
  infraDriver = null,
} = {}) {
  let wake = async () => {};
  const infra = infraDriver ?? createLocalInfraDriver({
    stateScopes: { world: ":memory:" },
    schedulerScopes: {
      world: {
        onWake: () => wake(),
      },
    },
  });
  const runtime = createWorldReconciliationRuntime({
    infraDriver: infra,
    process,
    intervalMs,
    maxRetryMs,
    now,
    retryState,
  });
  wake = () => runtime.handleWake();
  return { infraDriver: infra, runtime };
}

function memoryRetryState(initial = 0) {
  let value = initial;
  return {
    async get() { return value; },
    async set(next) { value = next; },
  };
}

test("World reconciliation isolates Genesis delivery from visual publication", async () => {
  const calls = [];
  const errors = [];
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() {
        calls.push("presentation");
        throw new Error("presentation unavailable");
      },
    },
    visualPublicationProcess: {
      async runOnce() {
        calls.push("visual");
        return { skipped: false, reason: null, results: [] };
      },
    },
    onError(entry) { errors.push(entry); },
  });
  const result = await process.runOnce();
  assert.deepEqual(calls, ["presentation", "visual"]);
  assert.equal(result.presentation.ok, false);
  assert.equal(result.visualPublication.ok, true);
  assert.equal(errors[0].kind, "genesis_presentation_delivery");
  assert.equal(worldReconciliationNeedsRetry(result), true);
});

test("World reconciliation scheduler emits no Activity for an idle sweep", async () => {
  const activityCalls = [];
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() {
        return { attempted: 0, delivered: 0, failed: 0, results: [] };
      },
    },
    visualPublicationProcess: {
      async runOnce() {
        return { skipped: false, reason: null, results: [] };
      },
    },
    activityRecorder: {
      async record(record) { activityCalls.push(["record", record]); },
      async runStage(metadata, operation) {
        activityCalls.push(["runStage", metadata]);
        return operation();
      },
    },
  });

  const result = await process.runOnce();
  assert.equal(result.presentation.ok, true);
  assert.equal(result.visualPublication.ok, true);
  assert.equal(worldReconciliationNeedsRetry(result), false);
  assert.deepEqual(activityCalls, []);
});

test("World reconciliation classifier keeps incomplete visual work active", () => {
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: true, ok: true, result: { attempted: 0, delivered: 0, failed: 0 } },
    visualPublication: {
      enabled: true,
      ok: true,
      result: {
        skipped: false,
        results: [{ threadId: "thr_1", ok: true, reconciliation: { complete: false, stage: "official_photo_pending" } }],
      },
    },
  }), true);
});

test("World reconciliation retries retryable visual failures", () => {
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: false, ok: true, result: null },
    visualPublication: {
      enabled: true,
      ok: true,
      result: {
        skipped: false,
        results: [{ threadId: "thr_retry", ok: false, retryable: true, code: "TEMPORARY_VISUAL_FAILURE" }],
      },
    },
  }), true);
});

test("World reconciliation does not reschedule a terminal visual failure", () => {
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: false, ok: true, result: null },
    visualPublication: {
      enabled: true,
      ok: true,
      result: {
        skipped: false,
        results: [{ threadId: "thr_terminal", ok: false, retryable: false, code: "INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY" }],
      },
    },
  }), false);
});

test("World reconciliation requestWake schedules immediate work without periodic bootstrap", async () => {
  const process = createWorldReconciliationProcess();
  const { infraDriver, runtime } = createRuntimeFixture({ process });
  try {
    assert.equal(runtime.scopeId, WORLD_RECONCILIATION_SCOPE_ID);

    assert.deepEqual(await runtime.ensureScheduled(), {
      scopeId: "world",
      scheduledTimeMs: null,
      existing: false,
      quiescent: true,
    });
    await runtime.requestWake();
    assert.equal(await infraDriver.scheduler.get("world"), 1_000);
  } finally {
    await runtime.stop();
  }
});

test("delayed World wake keeps the earliest consolidation deadline", async () => {
  let clock=10_000;
  const process=createWorldReconciliationProcess();
  const {infraDriver,runtime}=createRuntimeFixture({
    process,
    now:()=>clock,
  });
  try{
    const first=await runtime.requestWakeAfter(30_000);
    assert.equal(first.scheduledTimeMs,40_000,
      "first delayed consolidation wake was not scheduled");

    clock=12_000;
    const later=await runtime.requestWakeAfter(30_000);
    assert.equal(later.scheduledTimeMs,40_000,
      "later experience pushed the consolidation frontier back");
    assert.equal(later.existing,true,
      "later experience should reuse the earlier alarm");

    clock=13_000;
    const urgent=await runtime.requestWakeAfter(5_000);
    assert.equal(urgent.scheduledTimeMs,18_000,
      "earlier authoritative work did not pull reconciliation forward");
    assert.equal(await infraDriver.scheduler.get("world"),18_000);
  }finally{
    await runtime.stop();
  }
});

test("delayed World wake never postpones overdue work", async () => {
  let clock=10_000;
  const process=createWorldReconciliationProcess();
  const {infraDriver,runtime}=createRuntimeFixture({
    process,
    now:()=>clock,
  });
  try{
    await infraDriver.scheduler.schedule("world",9_000);
    const wake=await runtime.requestWakeAfter(30_000);
    assert.equal(wake.scheduledTimeMs,10_000,
      "new consolidation work postponed an already-due World alarm");
    assert.equal(await infraDriver.scheduler.get("world"),10_000);
  }finally{
    await runtime.stop();
  }
});

test("experience consolidation participates in World retry and quiescence", async () => {
  let pending=true;
  let runs=0;
  const process=createWorldReconciliationProcess({
    experienceConsolidationProcess:{
      async runOnce(){
        runs+=1;
        return {
          attempted:pending?1:0,
          completed:pending?1:0,
          failed:0,
          hasPending:pending,
          results:[],
        };
      },
    },
  });
  const {infraDriver,runtime}=createRuntimeFixture({
    process,
    intervalMs:100,
    maxRetryMs:800,
  });
  try{
    await runtime.requestWake();
    const first=await runtime.handleWake();
    assert.equal(runs,1);
    assert.equal(first.experienceConsolidation.enabled,true);
    assert.equal(first.reconciliationPending,true,
      "pending consolidation did not keep World reconciliation alive");
    assert.equal(first.retryDelayMs,100);
    assert.equal(await infraDriver.scheduler.get("world"),1_100);

    pending=false;
    const second=await runtime.handleWake();
    assert.equal(runs,2);
    assert.equal(second.reconciliationPending,false,
      "completed consolidation did not return World to quiescence");
    assert.equal(await infraDriver.scheduler.get("world"),null);
  }finally{
    await runtime.stop();
  }
});

test("failed experience consolidation uses World backoff", async () => {
  const process=createWorldReconciliationProcess({
    experienceConsolidationProcess:{
      async runOnce(){
        return {
          attempted:1,
          completed:0,
          failed:1,
          hasPending:true,
          results:[],
        };
      },
    },
  });
  const {runtime}=createRuntimeFixture({
    process,
    intervalMs:100,
    maxRetryMs:800,
  });
  try{
    await runtime.requestWake();
    const result=await runtime.handleWake();
    assert.equal(result.reconciliationPending,true);
    assert.equal(result.retryDelayMs,100,
      "failed consolidation bypassed World retry backoff");
  }finally{
    await runtime.stop();
  }
});

test("World reconciliation requestWake replaces an overdue alarm", async () => {
  let clock = 5_000;
  const process = createWorldReconciliationProcess();
  const { infraDriver, runtime } = createRuntimeFixture({ process, now: () => clock });
  try {
    await infraDriver.scheduler.schedule("world", 1_000);
    assert.equal(await infraDriver.scheduler.get("world"), 1_000);

    const wake = await runtime.requestWake();
    assert.deepEqual(wake, { scopeId: "world", scheduledTimeMs: 5_000 });
    assert.equal(await infraDriver.scheduler.get("world"), 5_000);
  } finally {
    await runtime.stop();
  }
});

test("World reconciliation converged sweep cancels alarm and becomes quiescent", async () => {
  let runs = 0;
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() { runs += 1; return { attempted: 0, delivered: 0, failed: 0, results: [] }; },
    },
    visualPublicationProcess: {
      async runOnce() { return { skipped: false, reason: null, results: [] }; },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({ process });
  await runtime.requestWake();
  const result = await runtime.handleWake();
  assert.equal(runs, 1);
  assert.equal(result.reconciliationPending, false);
  assert.equal(result.retryDelayMs, null);
  assert.equal(await infraDriver.scheduler.get("world"), null);
});

test("World reconciliation pending work backs off exponentially and caps retry delay", async () => {
  let clock = 2_000;
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          reason: null,
          results: [{ threadId: "thr_pending", ok: true, reconciliation: { complete: false } }],
        };
      },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 100,
    maxRetryMs: 400,
  });

  try {
    await runtime.requestWake();
    let result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 100);
    assert.equal(await infraDriver.scheduler.get("world"), 2_100);

    clock = 3_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 200);
    assert.equal(await infraDriver.scheduler.get("world"), 3_200);

    clock = 4_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 400);
    assert.equal(await infraDriver.scheduler.get("world"), 4_400);

    clock = 5_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 400);
    assert.equal(await infraDriver.scheduler.get("world"), 5_400);
  } finally {
    await runtime.stop();
  }
});

test("World reconciliation durable backoff survives runtime recreation", async () => {
  let clock = 2_000;
  const retryState = memoryRetryState();
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          reason: null,
          results: [{ threadId: "thr_pending", ok: true, reconciliation: { complete: false } }],
        };
      },
    },
  });
  const first = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 100,
    maxRetryMs: 800,
    retryState,
  });
  await first.runtime.requestWake();
  const firstWake = await first.runtime.handleWake();
  assert.equal(firstWake.retryDelayMs, 100);

  clock = 3_000;
  const second = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 100,
    maxRetryMs: 800,
    retryState,
    infraDriver: first.infraDriver,
  });
  try {
    const secondWake = await second.runtime.handleWake();
    assert.equal(secondWake.retryDelayMs, 200, "restart must retain retry streak instead of returning to hot-loop delay");
  } finally {
    await second.runtime.stop();
  }
});

test("new authoritative wake resets World reconciliation backoff", async () => {
  let clock = 10_000;
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          reason: null,
          results: [{ threadId: "thr_pending", ok: true, reconciliation: { complete: false } }],
        };
      },
    },
  });
  const { runtime } = createRuntimeFixture({ process, now: () => clock, intervalMs: 100, maxRetryMs: 800 });
  try {
    await runtime.requestWake();
    await runtime.handleWake();
    clock = 11_000;
    const second = await runtime.handleWake();
    assert.equal(second.retryDelayMs, 200);

    clock = 12_000;
    await runtime.requestWake();
    const afterNewWork = await runtime.handleWake();
    assert.equal(afterNewWork.retryDelayMs, 100);
  } finally {
    await runtime.stop();
  }
});

test("later contact participates in World retry and quiescence", async () => {
  let pending=true;
  let runs=0;
  const process=createWorldReconciliationProcess({
    contactOutreachProcess:{
      async runOnce(){
        runs+=1;
        return {
          attempted:pending?1:0,
          completed:pending?0:0,
          failed:0,
          hasPending:pending,
          results:[],
        };
      },
    },
  });
  const {infraDriver,runtime}=createRuntimeFixture({
    process,
    intervalMs:100,
    maxRetryMs:800,
  });
  try{
    await runtime.requestWake();
    const first=await runtime.handleWake();
    assert.equal(runs,1);
    assert.equal(first.contactOutreach.enabled,true);
    assert.equal(first.reconciliationPending,true,
      "pending later contact did not keep World reconciliation alive");
    assert.equal(await infraDriver.scheduler.get("world"),1_100);

    pending=false;
    const second=await runtime.handleWake();
    assert.equal(runs,2);
    assert.equal(second.reconciliationPending,false,
      "settled later contact did not return World to quiescence");
    assert.equal(await infraDriver.scheduler.get("world"),null);
  }finally{
    await runtime.stop();
  }
});


test("environmental due time survives unrelated World work and settles without polling",async()=>{
  let clock=10_000;
  const dueAt=new Date(40_000).toISOString();
  let pending=true;
  const process=createWorldReconciliationProcess({
    presentationDelivery:{
      async deliverPending(){return {attempted:0,delivered:0,failed:0,results:[]};},
    },
    environmentEvolutionProcess:{
      async runOnce(){
        return {
          attempted:pending?0:1,
          completed:pending?0:1,
          failed:0,
          hasDue:false,
          nextDueAt:pending?dueAt:null,
          results:[],
        };
      },
    },
  });
  const {infraDriver,runtime}=createRuntimeFixture({process,now:()=>clock});
  try{
    await runtime.requestWake();
    const before=await runtime.handleWake();
    assert.equal(before.environmentEvolution.enabled,true,
      "World environmental continuation was not executed");
    assert.equal(await infraDriver.scheduler.get("world"),40_000,
      "unrelated World reconciliation canceled the earned environmental due time");

    clock=40_000;
    pending=false;
    const after=await runtime.handleWake();
    assert.equal(after.reconciliationPending,false,
      "completed environmental continuation left a persistent wake");
    assert.equal(await infraDriver.scheduler.get("world"),null,
      "World did not return to quiescence after one environmental follow-up");
  }finally{
    await runtime.stop();
  }
});

test("environmental noticing reaches delayed consolidation before World becomes quiet",async()=>{
  let queued=false;
  let consolidated=0;
  let environmentRuns=0;
  const process=createWorldReconciliationProcess({
    experienceConsolidationProcess:{
      async runOnce(){
        if(queued){consolidated++;queued=false;}
        return {attempted:consolidated,completed:consolidated,failed:0,hasPending:false};
      },
    },
    environmentEvolutionProcess:{
      async runOnce(){
        environmentRuns++;
        if(environmentRuns===1){
          queued=true;
          return {attempted:1,completed:1,failed:0,noticed:1,hasDue:false,nextDueAt:null};
        }
        return {attempted:0,completed:0,failed:0,noticed:0,hasDue:false,nextDueAt:null};
      },
    },
  });
  const {runtime,infraDriver}=createRuntimeFixture({process});
  try{
    await runtime.requestWake();
    const first=await runtime.handleWake();
    assert.equal(first.reconciliationPending,true,
      "World dropped newly noticed Experience before consolidation");
    const second=await runtime.handleWake();
    assert.equal(consolidated,1,"environmental Experience never reached consolidation");
    assert.equal(second.reconciliationPending,false,
      "World continued polling after subjective consequence settled");
    assert.equal(await infraDriver.scheduler.get("world"),null,
      "settled environmental Experience left an unnecessary alarm");
  }finally{await runtime.stop();}
});

test("an in-flight World sweep preserves new ambient work through both InfraDrivers",async()=>{
  for(const provider of ["local","cloudflare"]){
    let beginSweep;
    let finishSweep;
    const started=new Promise((resolve)=>{beginSweep=resolve;});
    const finish=new Promise((resolve)=>{finishSweep=resolve;});
    let alarm=null;
    const infraDriver=provider==="local"
      ?createLocalInfraDriver({
        schedulerScopes:{world:{onWake(){}}},
      })
      :createCloudflareInfraDriver({
        schedulerScopes:{world:{
          async getAlarm(){return alarm;},
          async setAlarm(value){alarm=value;},
          async deleteAlarm(){alarm=null;},
        }},
      });
    const process=createWorldReconciliationProcess({
      presentationDelivery:{
        async deliverPending(){
          beginSweep();
          await finish;
          return {attempted:0,delivered:0,failed:0,results:[]};
        },
      },
    });
    const runtime=createWorldReconciliationRuntime({
      infraDriver,process,now:()=>1_000,intervalMs:100,maxRetryMs:800,
    });
    try{
      await runtime.requestWake();
      // An InfraDriver consumes the due alarm before invoking its wake handler.
      await infraDriver.scheduler.cancel("world");
      const inFlight=runtime.handleWake();
      await started;
      await runtime.requestWakeAfter(60_000);
      finishSweep();
      const settled=await inFlight;
      assert.equal(settled.reconciliationPending,true,
        `${provider}: a prior World sweep erased new ambient work`);
      assert.equal(await infraDriver.scheduler.get("world"),61_000,
        `${provider}: the new wake was cancelled`);
    }finally{
      finishSweep();
      await runtime.stop();
    }
  }
});

test("partial ambient failure reports through World reconciliation's shared error boundary",async()=>{
  const failures=[];
  const process=createWorldReconciliationProcess({
    environmentEvolutionProcess:{
      async runOnce(){
        return {
          attempted:1,failed:1,noticed:0,hasDue:true,nextDueAt:null,
          results:[{situationId:"sit_failure",outcome:"failed",
            message:"environmental decision not admitted"}],
        };
      },
    },
    onError:(entry)=>failures.push(entry),
  });
  const result=await process.runOnce();
  assert.deepEqual(failures.map((failure)=>({
    kind:failure.kind,message:failure.message,
  })),[{
    kind:"world_environment_opportunity",
    message:"environmental decision not admitted",
  }],"an ambient error bypassed the existing reconciliation diagnostics");
  assert.equal(worldReconciliationNeedsRetry(result),true,
    "unsettled ambient work must remain retryable");
});

test("E7.5 World alarm follows the earliest lived boundary and then returns to quiescence",async()=>{
  let clock=10_000;
  let pending=true;
  const dueAt=new Date(30_000).toISOString();
  const process=createWorldReconciliationProcess({
    livedBoundaryProcess:{
      async runOnce(){
        if(pending)return {attempted:0,failed:0,nextDueAt:dueAt,hasDue:false};
        return {attempted:1,failed:0,nextDueAt:null,hasDue:false};
      },
    },
    environmentEvolutionProcess:{
      async runOnce(){
        return {
          attempted:0,failed:0,noticed:0,
          nextDueAt:new Date(60_000).toISOString(),hasDue:false,
        };
      },
    },
  });
  const {runtime,infraDriver}=createRuntimeFixture({process,now:()=>clock});
  try{
    await runtime.requestWake();
    const first=await runtime.handleWake();
    assert.equal(first.livedBoundary.enabled,true);
    assert.equal(await infraDriver.scheduler.get("world"),30_000,
      "World missed the earliest Flight Plan boundary");
    clock=30_000;
    pending=false;
    await runtime.handleWake();
    assert.equal(await infraDriver.scheduler.get("world"),60_000,
      "environmental work was lost when lived advancement completed");
  }finally{
    await runtime.stop();
  }
});

test("an absolute Flight Plan wake cannot postpone overdue World work",async()=>{
  const process=createWorldReconciliationProcess();
  const {runtime,infraDriver}=createRuntimeFixture({
    process,now:()=>20_000,
  });
  try{
    await infraDriver.scheduler.schedule("world",19_000);
    const result=await runtime.requestWakeAt(60_000);
    assert.equal(result.scheduledTimeMs,20_000,
      "later Flight Plan boundary postponed earlier World work");
    assert.equal(await infraDriver.scheduler.get("world"),20_000);
  }finally{await runtime.stop();}
});

test("multiple due Flight Plan boundaries progress without exponential error backoff",async()=>{
  let remaining=2;
  const process=createWorldReconciliationProcess({
    livedBoundaryProcess:{
      async runOnce(){
        remaining--;
        return {
          attempted:1,failed:0,hasDue:remaining>0,
          nextDueAt:remaining>0?new Date(1_000).toISOString():null,
        };
      },
    },
  });
  const {infraDriver,runtime}=createRuntimeFixture({process,now:()=>1_000});
  try{
    await runtime.requestWake();
    const first=await runtime.handleWake();
    assert.equal(first.retryDelayMs,null,
      "ordinary Flight Plan backlog triggered exponential failure backoff");
    assert.equal(await infraDriver.scheduler.get("world"),1_000,
      "a second already-due Thread was postponed");
    const second=await runtime.handleWake();
    assert.equal(second.reconciliationPending,false);
    assert.equal(await infraDriver.scheduler.get("world"),null,
      "settled lives kept the World alarm alive");
  }finally{await runtime.stop();}
});
