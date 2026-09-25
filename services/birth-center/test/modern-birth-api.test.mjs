import assert from "node:assert/strict";
import test from "node:test";

import { createModernBirthInitiationApi } from "../src/modern-birth-api.mjs";

const TOKEN = "private-token-for-modern-birth-test";

test("modern birth API exposes durable pending births without changing initiation", async () => {
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
  const api = createModernBirthInitiationApi({
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
    birthplaces:[{ place:"Georgia/Tbilisi", lat:41.69, long:44.83 }],
    requestStore,
    privateToken:TOKEN,
  });

  const list = await api.fetch(new Request("https://birth.internal/internal/births/pending", {
    headers:{ "x-fibre-private-token":TOKEN },
  }));
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { ok:true, births:pending });

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
      location:"Israel/Jerusalem",
      sex:"female",
    }),
  }));
  assert.equal(initiate.status, 202);
  assert.equal((await initiate.json()).birth.threadId, "thr_2");
  assert.deepEqual(events, [["enqueue","admin_birth_2"]], "birth must be durable before authoring starts");
});


test("Cloudflare-style defer returns immediately after durable enqueue", async () => {
  const events = [];
  let finish;
  const blocked = new Promise((resolve) => { finish = resolve; });
  const api = createModernBirthInitiationApi({
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
