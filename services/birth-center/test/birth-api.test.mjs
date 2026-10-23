import assert from "node:assert/strict";
import test from "node:test";

import { createBirthInitiationApi } from "../src/birth-api.mjs";

const TOKEN = "private-token-for-birth-test";

test("birth API exposes durable pending births without changing initiation", async () => {
  const stillborn = [{
    requestId:"admin_birth_old",
    genesisId:"genesis_old",
    threadId:"thr_old",
    failureCode:"GENESIS_COMPILE_VALIDATION_ERROR",
    failureMessage:"Genesis birth place Tokyo, Japan is not mappable",
    settledAt:"2026-09-25T04:55:00.000Z",
  }];
  const pending = [{
    requestId:"admin_birth_1",
    genesisId:"genesis_1",
    threadId:"thr_1",
    location:"Georgia/Tbilisi",
    sex:null,
    status:"developing",
    createdAt:"2026-09-25T05:00:00.000Z",
    updatedAt:"2026-09-25T05:00:00.000Z",
  }];
  const events = [];
  const requestStore = {
    enqueue(input) { events.push(["enqueue", input.requestId]); },
    fail(requestId) { events.push(["fail", requestId]); },
  };
  const api = createBirthInitiationApi({
    service:{
      async initiate(input) {
        return {
          requestId:input.requestId,
          threadId:"thr_2",
          genesisId:"genesis_2",
          location:"Israel/Jerusalem",
          sex:"female",
          development:{ status:"pending" },
        };
      },
    },
    pendingBirths:async () => pending,
    recentBirths:async () => [{requestId:"recent_birth",status:"published"}],
    stillbornBirths:async () => stillborn,
    birthplaces:[{ place:"Georgia/Tbilisi", lat:41.69, long:44.83 }],
    requestStore,
    privateToken:TOKEN,
  });

  const list = await api.fetch(new Request("https://birth.internal/internal/births/pending", {
    headers:{ "x-fibre-private-token":TOKEN },
  }));
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { ok:true, births:pending });

  const settled = await api.fetch(new Request("https://birth.internal/internal/births/stillborn", {
    headers:{ "x-fibre-private-token":TOKEN },
  }));
  assert.equal(settled.status, 200);
  assert.deepEqual(await settled.json(), { ok:true, births:stillborn });

  const places = await api.fetch(new Request("https://birth.internal/internal/births/places", {
    headers:{ "x-fibre-private-token":TOKEN },
  }));
  assert.equal(places.status, 200);
  assert.equal((await places.json()).places[0].place, "Georgia/Tbilisi");

  const initiate = await api.fetch(new Request("https://birth.internal/internal/births/initiate", {
    method:"POST",
    headers:{ "content-type":"application/json", "x-fibre-private-token":TOKEN },
    body:JSON.stringify({
      requestId:"admin_birth_2",
      requestedAt:"2026-09-25T05:10:00.000Z",
      location:{ country:"United Kingdom", city:"London", displayName:"London, England, United Kingdom", lat:51.5072, long:-0.1276 },
      sex:"female",
    }),
  }));
  assert.equal(initiate.status, 202);
  assert.equal((await initiate.json()).birth.threadId, "thr_2");
  assert.deepEqual(events, [["enqueue","admin_birth_2"]], "birth must be durable before authoring starts");
});


test("CLI pre-authoring is visible and failed preparation stays recorded", async () => {
  const stored=new Map();
  const requests={
    get(id){return stored.get(id)??null;},
    enqueue(input){
      const found=stored.get(input.requestId);
      if(found){
        assert.deepEqual(found.requestedLocation,input.location);
        assert.equal(found.requestedAt,input.requestedAt);
        return found;
      }
      const item={requestId:input.requestId,requestedAt:input.requestedAt,
        requestedLocation:input.location,sex:input.sex,status:"queued",locationSource:null};
      stored.set(item.requestId,item);
      return item;
    },
    progress(id,patch){const next={...stored.get(id),...patch};stored.set(id,next);return next;},
    fail(id,error){return this.progress(id,{status:"failed",error:error.message});},
  };
  const api=createBirthInitiationApi({
    service:{async initiate(){throw Error("CLI preparation must not start another birth");}},
    privateToken:TOKEN,requestStore:requests,
  });
  const url="https://birth.internal/internal/births/preparation";
  const body={action:"start",requestId:"fibre-population-london-001",
    requestedAt:"2026-10-23T17:40:00.000Z",
    location:{country:"United Kingdom",city:"London",lat:51.5,long:-0.12},sex:null};
  const call=async input=>api.fetch(new Request(url,{method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":TOKEN},
    body:JSON.stringify(input)}));
  const started=await call(body);
  assert.equal(started.status,200);
  assert.equal(requests.get(body.requestId).status,"authoring",
    "CLI world authoring was invisible to the Birth Center");
  const resumed=await call({...body,requestedAt:"2026-10-23T17:42:00.000Z"});
  assert.equal((await resumed.json()).preparation.requestedAt,body.requestedAt,
    "retry replaced the original birth request time");
  const failed=await call({...body,action:"fail",error:"World authoring timed out"});
  assert.equal(failed.status,200);
  assert.equal(requests.get(body.requestId).status,"failed",
    "failed CLI preparation disappeared before development was reserved");
});

test("Cloudflare-style defer returns immediately after durable enqueue", async () => {
  const events = [];
  let finish;
  const blocked = new Promise((resolve) => { finish = resolve; });
  const api = createBirthInitiationApi({
    service:{
      async initiate(input) {
        events.push(["started", input.requestId]);
        await blocked;
        return {
          requestId:input.requestId,
          threadId:"thr_deferred",
          genesisId:"genesis_deferred",
          location:"Georgia/Tbilisi",
          sex:"male",
          development:{ status:"pending" },
        };
      },
    },
    requestStore:{
      enqueue(input) { events.push(["enqueue", input.requestId]); },
      fail(requestId) { events.push(["fail", requestId]); },
    },
    privateToken:TOKEN,
  });

  let deferred = null;
  const response = await api.fetch(new Request("https://birth.internal/internal/births/initiate", {
    method:"POST",
    headers:{ "content-type":"application/json", "x-fibre-private-token":TOKEN },
    body:JSON.stringify({
      requestId:"admin_birth_deferred",
      requestedAt:"2026-09-25T14:30:00.000Z",
      location:null,
      sex:null,
    }),
  }), {
    defer(promise) { deferred = promise; },
  });

  assert.equal(response.status, 202);
  assert.equal((await response.json()).birth.status, "queued");
  assert.deepEqual(events.slice(0,2), [
    ["enqueue","admin_birth_deferred"],
    ["started","admin_birth_deferred"],
  ]);
  assert.ok(deferred instanceof Promise);
  finish();
  await deferred;
});
