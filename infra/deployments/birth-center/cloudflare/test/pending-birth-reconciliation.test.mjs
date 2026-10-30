import assert from "node:assert/strict";
import test from "node:test";

import { nextBirthStatusCheckAt, pendingBirths, recentBirths, publishQueuedBirths, reconcileStaleBirths, stillbornBirths } from "../runtime.mjs";

const NOW = Date.parse("2026-09-25T15:00:00.000Z");
const TOKEN = "test-token-1234567890";

function staleModern(overrides = {}) {
  return {
    requestId:"admin_birth_stale",
    requestedAt:"2026-09-01T00:00:00.000Z",
    genesisId:"gen_stale",
    threadId:"thr_stale",
    location:"Georgia/Tbilisi",
    requestedLocation:null,
    locationSource:"sampled",
    sex:"female",
    requestedSex:null,
    status:"developing",
    error:null,
    createdAt:"2026-09-01T00:00:00.000Z",
    updatedAt:"2026-09-01T00:05:00.000Z",
    ...overrides,
  };
}

function developmentFor(request) {
  return {
    requestId:request.requestId,
    genesisId:request.genesisId,
    threadId:request.threadId,
    status:"reserved",
    plan:{ subjectIdentity:{
      femaleName:"Nino Beridze",
      maleName:"Giorgi Beridze",
      birthCity:"Tbilisi, Georgia",
      place:{ country:"Georgia", city:"Tbilisi" },
      sex:request.sex,
    } },
    createdAt:request.createdAt,
    updatedAt:request.updatedAt,
  };
}


test("Birth Center retains every outcome for three days without doubling a request",()=>{
  const now=Date.parse("2026-10-23T19:20:00.000Z");
  const published=staleModern({requestId:"london",status:"authoring",
    locationSource:"cli",createdAt:"2026-10-23T18:50:00.000Z",
    updatedAt:"2026-10-23T18:51:00.000Z"});
  const failed=staleModern({requestId:"aborted",status:"failed",
    threadId:null,genesisId:null,error:"model incomplete",
    locationSource:"cli",createdAt:"2026-10-23T17:50:00.000Z",
    updatedAt:"2026-10-23T17:55:00.000Z"});
  const stillborn=staleModern({requestId:"stillborn",
    createdAt:"2026-10-23T17:40:00.000Z",
    updatedAt:"2026-10-23T17:40:00.000Z"});
  const old=staleModern({requestId:"old",status:"published",
    createdAt:"2026-10-17T00:00:00.000Z",
    updatedAt:"2026-10-17T00:02:00.000Z"});
  const developmentA=developmentFor(published),developmentB=developmentFor(stillborn);
  const outcomes={
    london:{outcome:"born",updatedAt:"2026-10-23T19:00:00.000Z"},
    stillborn:{outcome:"stillborn",failureMessage:"World did not admit",
      updatedAt:"2026-10-23T18:30:00.000Z"},
  };
  const runtime={
    birthRequestStore:{recent:()=>[published,failed,stillborn,old]},
    developmentRequestStore:{
      recent:()=>[developmentA,developmentB],
      getDisposition:id=>outcomes[id]??null,
    },
    provisionalBirthStore:{get:()=>null},
  };
  const births=recentBirths(runtime,{nowMs:()=>now});
  assert.deepEqual(new Set(births.map(x=>x.requestId)),
    new Set(["london","aborted","stillborn"]),
    "recent history lost, duplicated or retained a birth beyond three days");
  assert.equal(births.find(x=>x.requestId==="london").stage,"in-world");
  assert.equal(births.find(x=>x.requestId==="aborted").stage,"failed");
  assert.equal(births.find(x=>x.requestId==="stillborn").stage,"stillborn");
});

test("completed lifecycle births supersede stale development status without World reconciliation",()=>{
  const now=Date.parse("2026-10-30T02:30:00.000Z");
  const stale=staleModern({requestId:"genesis-birth-complete",
    genesisId:"gen_completed",threadId:"thr_completed",
    status:"developing",locationSource:"birth-center",
    createdAt:"2026-10-30T02:00:00.000Z",
    updatedAt:"2026-10-30T02:01:00.000Z"});
  const lifecycle={
    requestId:stale.requestId,requestedAt:stale.requestedAt,
    genesisId:stale.genesisId,threadId:stale.threadId,
    status:"published",stage:"complete",sex:"female",name:"Joanna Lewandowski",
    location:"United Kingdom/London",
    createdAt:stale.createdAt,updatedAt:"2026-10-30T02:10:00.000Z",
  };
  const runtime={
    birthRequestStore:{recent:()=>[stale],isActive:status=>status==="developing"},
    developmentRequestStore:{
      recent:()=>[developmentFor(stale)],
      getDisposition:()=>null,
    },
    provisionalBirthStore:{get:()=>null},
  };
  const lifecycleBirths=[lifecycle];
  assert.deepEqual(pendingBirths(runtime,{nowMs:()=>now,lifecycleBirths}),[],
    "A completed Thread was still pending World reconciliation");
  const recent=recentBirths(runtime,{nowMs:()=>now,lifecycleBirths});
  assert.equal(recent.length,1,"Lifecycle and development duplicated one Thread");
  assert.equal(recent[0].stage,"in-world","A completed life was not shown in World");
  assert.equal(recent[0].name,"Joanna Lewandowski");
  assert.equal(recent[0].stale,false,"A completed birth was marked stale");
});

test("stale births wake immediately once, then retry on the normal interval", () => {
  const request = staleModern();
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:(status) => status === "developing",
    },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => null,
    },
  };

  assert.equal(
    nextBirthStatusCheckAt(runtime, () => NOW, { reconcileStaleNow:true }),
    NOW,
    "stuck births did not request immediate reconciliation",
  );
  assert.equal(
    nextBirthStatusCheckAt(runtime, () => NOW),
    NOW + (5 * 60 * 1000),
    "stuck birth retry became a busy loop",
  );
});


test("pre-Genesis request rejection is complete, not pending reconciliation", () => {
  const request = staleModern({
    status:"failed",
    error:"location must be Country/City",
    genesisId:null,
    threadId:null,
  });
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:() => false,
    },
    developmentRequestStore:{
      recent:() => [],
      getDisposition:() => null,
    },
  };

  assert.deepEqual(pendingBirths(runtime, { nowMs:() => NOW }), [], "rejected request remained pending");
  assert.equal(nextBirthStatusCheckAt(runtime, () => NOW), null, "rejected request scheduled reconciliation");
});


test("CLI preparation is visible, then durable Genesis takes over once without a fabricated wake", () => {
  const preflight=staleModern({
    requestId:"fibre-population-20261023-london-001",threadId:null,genesisId:null,
    status:"authoring",location:"United Kingdom/London",locationSource:"cli",
    sex:null,createdAt:"2026-10-23T17:30:00.000Z",
    updatedAt:"2026-10-23T17:30:00.000Z",
  });
  let development=[];
  const runtime={
    birthRequestStore:{recent:()=>[preflight],isActive:(status)=>status==="authoring"},
    developmentRequestStore:{
      recent:()=>development,
      getDisposition:()=>null,
    },
  };
  const awaiting=pendingBirths(runtime,{nowMs:()=>NOW})[0];
  assert.equal(awaiting.source,"birth",
    "unsubmitted CLI authoring vanished from Birth Center");
  assert.equal(awaiting.stage,"genesis",
    "pre-authoring was mislabeled as a developed candidate");
  assert.equal(nextBirthStatusCheckAt(runtime,()=>NOW),null,
    "pre-authoring created a perpetual World reconciliation alarm");
  const reserved=developmentFor({
    ...preflight,genesisId:"gen_london",threadId:"thr_london",
    status:"reserved",
  });
  development=[reserved];
  const records=pendingBirths(runtime,{nowMs:()=>NOW});
  assert.equal(records.length,1,
    "CLI preparation and durable Genesis appeared as duplicate births");
  assert.equal(records[0].source,"development",
    "operator preparation obscured durable Genesis authority");
  assert.equal(records[0].threadId,"thr_london",
    "development did not replace the pre-authoring identity gap");
  assert.ok(nextBirthStatusCheckAt(runtime,()=>NOW)!==null,
    "durable Genesis lost its eventual reconciliation opportunity");
});

test("pending births reads durable retry state without changing birth authority", () => {
  const request = staleModern();
  const retry = {attemptCount:2,nextAttemptAt:NOW+30_000,lastRetryableError:"World unavailable"};
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:(status) => status === "developing",
      progress:() => { throw new Error("pending read mutated birth state"); },
    },
    provisionalBirthStore:{
      get:genesisId=>{
        assert.equal(genesisId,request.genesisId,"retry state belongs to another birth");
        return retry;
      },
    },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => null,
    },
  };

  const births = pendingBirths(runtime, { nowMs:() => NOW });

  assert.equal(births.length, 1, "stale birth disappeared before reconciliation");
  assert.equal(births[0].classification, "stale_unresolved", "stale birth was presented as reconciled");
  assert.equal(births[0].requestedAt, request.requestedAt, "birth replay time was lost");
  assert.equal(births[0].name, "Nino Beridze", "pending birth hid its already-authored name");
  assert.equal(births[0].attemptCount,2,"Admin lost retry attempt count");
  assert.equal(births[0].nextAttemptAt,retry.nextAttemptAt,"Admin lost next retry time");
  assert.equal(births[0].lastRetryableError,retry.lastRetryableError,"Admin lost publication failure");
});

test("one World check settles duplicate stale birth records as born", async () => {
  const request = staleModern();
  let worldChecks = 0;
  let published = 0;
  let born = 0;
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:(status) => status === "developing",
      progress:(_requestId, patch) => { if (patch.status === "published") published += 1; },
    },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => null,
      settleBorn:() => { born += 1; },
      settleStillborn:() => { throw new Error("healthy Thread became stillborn"); },
    },
  };

  const result = await reconcileStaleBirths(runtime, {
    worldBinding:{ fetch:async (worldRequest) => {
      worldChecks += 1;
      assert.equal(new URL(worldRequest.url).pathname, "/internal/thread-directory/presence");
      return Response.json({ presentThreadIds:[request.threadId] });
    } },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(worldChecks, 1, "same Thread caused duplicate World checks");
  assert.equal(published, 1, "healthy birth published more than once");
  assert.equal(born, 1, "development birth did not settle born");
  assert.equal(result.born, 1);
});


test("terminal failure projects as failed with its durable error", () => {
  const request = staleModern();
  const runtime = {
    birthRequestStore:{
      recent:() => [],
      isActive:() => false,
    },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => ({
        outcome:null,
        failureCode:"GENESIS_COMPILE_VALIDATION_ERROR",
        failureMessage:"Genesis birth place Tokyo, Japan is not mappable",
        failureRetryable:false,
      }),
    },
  };

  const [birth] = pendingBirths(runtime, { nowMs:() => NOW });

  assert.equal(birth.status, "failed", "terminal Genesis failure still looked active");
  assert.equal(birth.stage, "failed", "terminal Genesis failure kept a developing stage");
  assert.equal(birth.error, "Genesis birth place Tokyo, Japan is not mappable");
  assert.equal(birth.failureCode, "GENESIS_COMPILE_VALIDATION_ERROR");
  assert.equal(birth.classification, "failed_waiting_reconciliation");
});

test("settled stillborn projection retains the terminal reason", () => {
  const request = developmentFor(staleModern());
  const runtime = {
    developmentRequestStore:{
      recent:() => [request],
      getDisposition:() => ({
        outcome:"stillborn",
        failureCode:"GENESIS_COMPILE_VALIDATION_ERROR",
        failureMessage:"Genesis birth place Tokyo, Japan is not mappable",
        failureRetryable:false,
        settledAt:"2026-09-25T14:58:00.000Z",
        updatedAt:"2026-09-25T14:58:00.000Z",
      }),
    },
  };

  const [birth] = stillbornBirths(runtime);

  assert.equal(birth.threadId, request.threadId);
  assert.equal(birth.failureCode, "GENESIS_COMPILE_VALIDATION_ERROR");
  assert.equal(birth.failureMessage, "Genesis birth place Tokyo, Japan is not mappable");
  assert.equal(birth.settledAt, "2026-09-25T14:58:00.000Z");
});

test("terminal pre-admission failure becomes stillborn only after confirmed World absence", async () => {
  const request = staleModern({
    status:"failed",
    error:"replacement Pass-A exhausted 3 generated versions",
  });
  let stillborn = 0;
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:() => false,
      progress:() => {},
    },
    provisionalBirthStore:{ get:() => null },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => ({
        outcome:null,
        failureCode:"ERROR",
        failureRetryable:false,
      }),
      settleBorn:() => { throw new Error("absent Thread became born"); },
      settleStillborn:() => { stillborn += 1; },
    },
  };

  const result = await reconcileStaleBirths(runtime, {
    worldBinding:{ fetch:async () => Response.json({ presentThreadIds:[] }) },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(stillborn, 1, "terminal pre-admission failure did not settle stillborn");
  assert.equal(result.stillborn, 1);
});


test("distinct stale births share one bounded World presence query", async () => {
  const first = staleModern();
  const second = staleModern({
    requestId:"admin_birth_stale_2",
    genesisId:"gen_stale_2",
    threadId:"thr_stale_2",
  });
  let worldChecks = 0;
  let published = 0;
  const runtime = {
    birthRequestStore:{
      recent:() => [first, second],
      isActive:(status) => status === "developing",
      progress:(_requestId, patch) => { if (patch.status === "published") published += 1; },
    },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{
      recent:() => [],
      getDisposition:() => null,
    },
  };

  const result = await reconcileStaleBirths(runtime, {
    worldBinding:{ fetch:async (worldRequest) => {
      worldChecks += 1;
      const body = await worldRequest.json();
      assert.deepEqual(
        [...body.threadIds].sort(),
        [first.threadId, second.threadId].sort(),
        "World presence query lost stale Threads",
      );
      return Response.json({ presentThreadIds:body.threadIds });
    } },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(worldChecks, 1, "stale cohort fanned out into multiple World calls");
  assert.equal(published, 2, "admitted stale births did not converge");
  assert.equal(result.checked, 2);
});


test("retryable pre-admission failure remains recoverable when World is absent", async () => {
  const request = staleModern({ status:"failed", error:"provider unavailable" });
  let stillborn = 0;
  const runtime = {
    birthRequestStore:{
      recent:() => [request],
      isActive:() => false,
      progress:() => {},
    },
    provisionalBirthStore:{ get:() => null },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => ({
        outcome:null,
        failureCode:"MODEL_PROVIDER_UNAVAILABLE",
        failureRetryable:true,
      }),
      settleBorn:() => { throw new Error("absent Thread became born"); },
      settleStillborn:() => { stillborn += 1; },
    },
  };

  const result = await reconcileStaleBirths(runtime, {
    worldBinding:{ fetch:async () => Response.json({ presentThreadIds:[] }) },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(stillborn, 0, "retryable Genesis interruption became stillborn");
  assert.equal(result.stillborn, 0);
});


test("queued publication is kicked immediately and leaves scheduling consistent", async () => {
  const calls = [];
  const result = await publishQueuedBirths({
    runtime:{
      async handleWake() {
        calls.push("publish");
        return { attempted:1, published:1 };
      },
    },
    async ensureBirthStatusScheduled() {
      calls.push("schedule");
      return { scheduledAt:null };
    },
  });

  assert.deepEqual(calls, ["publish","schedule"]);
  assert.deepEqual(result, { attempted:1, published:1 });
});

test("old failed admin birth settles after confirmed World absence despite legacy retryability",async()=>{
  const old=staleModern({
    requestId:"admin_birth_legacy_manchester",genesisId:"gen_manchester",
    threadId:"thr_manchester",location:"United Kingdom/Manchester",
    status:"failed",error:"replacement Pass-A exhausted 5 generated versions",
    createdAt:"2026-08-23T00:00:00.000Z",
    updatedAt:"2026-08-23T00:10:00.000Z",
  });
  const development=developmentFor(old);
  let disposition={outcome:null,failureRetryable:null};
  let checks=0,settlements=0;
  const runtime={
    birthRequestStore:{
      recent:()=>[old],
      unsettledFailed:()=>disposition.outcome===null?[old]:[],
      isActive:()=>false,
      progress:()=>{throw new Error("absent Thread marked published");},
    },
    provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{
      recent:()=>[],
      get:id=>id===old.requestId?development:null,
      getDisposition:()=>disposition,
      settleBorn:()=>{throw new Error("absent Thread marked born");},
      settleStillborn:()=>{settlements++;disposition={outcome:"stillborn"};},
    },
  };
  assert.equal(pendingBirths(runtime,{nowMs:()=>NOW}).length,1,
    "unsettled legacy failure was not visible");
  const presence={fetch:async()=>{
    checks++;
    return Response.json({presentThreadIds:[]});
  }};
  const first=await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,
  });
  assert.equal(first.stillborn,1,"old failure did not settle stillborn");
  assert.equal(settlements,1);
  assert.deepEqual(pendingBirths(runtime,{nowMs:()=>NOW}),[],
    "settled admin failure remained pending");
  await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,
  });
  assert.equal(checks,1,"settled failure repeated World presence queries");
});

test("reconciliation advances beyond 64 old failures and wraps after the last",async()=>{
  const requests=Array.from({length:70},(_,i)=>staleModern({
    requestId:"old_"+String(i).padStart(3,"0"),
    genesisId:"gen_old_"+i,threadId:"thr_old_"+i,status:"failed",
    error:"legacy permanent failure",
  }));
  const byId=new Map(requests.map(request=>[request.requestId,request]));
  const outcomes=new Set();
  const cursor={after:null};
  const runtime={
    birthRequestStore:{
      recent:()=>[],
      unsettledFailed:({limit,after})=>requests.filter(request=>
        !outcomes.has(request.requestId)
        &&(after===null||request.createdAt>after.createdAt
          ||(request.createdAt===after.createdAt&&request.requestId>after.requestId))
      ).slice(0,limit),
      progress:()=>{throw new Error("absent Thread marked published");},
    },
    provisionalBirthStore:{get:()=>null},
    developmentRequestStore:{
      recent:()=>[],
      get:id=>byId.has(id)?developmentFor(byId.get(id)):null,
      getDisposition:id=>outcomes.has(id)?{outcome:"stillborn"}:{outcome:null,failureRetryable:null},
      settleBorn:()=>{throw new Error("absent Thread marked born");},
      settleStillborn:id=>outcomes.add(id),
    },
  };
  let worldChecks=0;
  const presence={fetch:async()=>{
    worldChecks++;
    return Response.json(worldChecks===1?{ok:false}:{presentThreadIds:[]});
  }};
  const first=await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,failedCursor:cursor,
  });
  assert.equal(first.unavailable,64,"first reconciliation exceeded its bounded batch");
  assert.equal(outcomes.size,0,"uncertain World presence settled a failed birth");
  assert.equal(cursor.after.requestId,"old_063","failed birth cursor did not advance");
  const second=await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,failedCursor:cursor,
  });
  assert.equal(second.stillborn,6,"later failures were starved by unresolved oldest 64");
  const third=await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,failedCursor:cursor,
  });
  assert.equal(third.stillborn,64,"cursor failed to wrap back to unresolved births");
  assert.equal(outcomes.size,70,"not all old failures settled");
  await reconcileStaleBirths(runtime,{
    worldBinding:presence,privateToken:TOKEN,nowMs:()=>NOW,failedCursor:cursor,
  });
  assert.equal(cursor.after,null,"cursor did not reset after exhausting eligible failures");
});
