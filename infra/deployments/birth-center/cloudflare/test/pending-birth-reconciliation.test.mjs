import assert from "node:assert/strict";
import test from "node:test";

import { pendingBirths } from "../runtime.mjs";

test("stale modern birth settles published when its Thread is already in World", async () => {
  let published = null;
  const runtime = {
    modernBirthRequestStore:{
      recent:() => [{
        requestId:"admin_birth_stale",
        genesisId:"gen_stale",
        threadId:"thr_stale",
        location:"Georgia/Tbilisi",
        requestedLocation:null,
        locationSource:"sampled",
        sex:"female",
        requestedSex:null,
        status:"publishing",
        createdAt:"2026-09-01T00:00:00.000Z",
        updatedAt:"2026-09-01T00:05:00.000Z",
      }],
      progress:(requestId, patch) => { published = { requestId, patch }; },
      isActive:(status) => ["queued","authoring","developing","publishing"].includes(status),
    },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{ recent:() => [], getDisposition:() => null, settleBorn:() => {}, settleStillborn:() => {} },
  };
  const worldBinding = {
    fetch:async () => Response.json({ identity:{ threadId:"thr_stale" } }),
  };

  const births = await pendingBirths(runtime, {
    worldBinding,
    privateToken:"private-token-for-birth-reconciliation",
    nowMs:() => Date.parse("2026-09-25T15:00:00.000Z"),
  });

  assert.deepEqual(births, [], "in-world Thread remained pending");
  assert.deepEqual(
    published,
    { requestId:"admin_birth_stale", patch:{ status:"published" } },
    "durable birth was not reconciled to published",
  );
});

test("stale birth distinguishes absent World state from an unavailable World check", async () => {
  const request = {
    requestId:"admin_birth_stalled",
    requestedAt:"2026-09-01T00:00:00.000Z",
    genesisId:"gen_stalled",
    threadId:"thr_stalled",
    location:"Georgia/Tbilisi",
    requestedLocation:null,
    locationSource:"sampled",
    sex:"male",
    requestedSex:null,
    status:"developing",
    createdAt:"2026-09-01T00:00:00.000Z",
    updatedAt:"2026-09-01T00:05:00.000Z",
  };
  const runtime = {
    modernBirthRequestStore:{ recent:() => [request], progress:() => {}, isActive:() => true },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{ recent:() => [], getDisposition:() => null, settleBorn:() => {}, settleStillborn:() => {} },
  };
  const options = {
    privateToken:"private-token-for-birth-reconciliation",
    nowMs:() => Date.parse("2026-09-25T15:00:00.000Z"),
  };

  const absent = await pendingBirths(runtime, {
    ...options,
    worldBinding:{ fetch:async () => Response.json({ error:"not_found" }, { status:404 }) },
  });
  assert.equal(absent[0].stale, true, "stalled birth was not marked stale");
  assert.equal(absent[0].classification, "stale_not_in_world", "World absence was not identified");
  assert.equal(absent[0].source, "modern", "stale birth lost its durable source");
  assert.equal(absent[0].requestedAt, request.requestedAt, "stale birth lost replay time");
  assert.equal(absent[0].requestedLocation, null, "random-location intent was not preserved");

  const unavailable = await pendingBirths(runtime, {
    ...options,
    worldBinding:{ fetch:async () => Response.json({ error:"unavailable" }, { status:503 }) },
  });
  assert.equal(
    unavailable[0].classification,
    "stale_world_check_unavailable",
    "World outage was misclassified as Thread absence",
  );
});


test("stale development reservation is durably settled born when World already has the Thread", async () => {
  let settled = null;
  const request = {
    requestId:"legacy_birth_stale",
    genesisId:"gen_legacy_stale",
    threadId:"thr_legacy_stale",
    status:"reserved",
    plan:{ subjectIdentity:{ birthCity:"Tbilisi, Georgia", place:{ country:"Georgia", city:"Tbilisi" }, sex:"female" } },
    createdAt:"2026-09-01T00:00:00.000Z",
    updatedAt:"2026-09-01T00:05:00.000Z",
  };
  const runtime = {
    modernBirthRequestStore:{ recent:() => [], progress:() => {}, isActive:() => false },
    provisionalBirthStore:{ get:() => null },
    developmentRequestStore:{
      recent:() => [request],
      getDisposition:() => null,
      settleBorn:(requestId) => { settled = requestId; },
      settleStillborn:() => { throw new Error("healthy World Thread was classified stillborn"); },
    },
  };

  const births = await pendingBirths(runtime, {
    worldBinding:{ fetch:async () => Response.json({ identity:{ threadId:request.threadId } }) },
    privateToken:"private-token-for-birth-reconciliation",
    nowMs:() => Date.parse("2026-09-25T15:00:00.000Z"),
  });

  assert.deepEqual(births, [], "born Thread remained in the active birth pipeline");
  assert.equal(settled, request.requestId, "World truth did not durably settle the birth as born");
});

test("terminal Pass-A failure becomes stillborn only when World confirms the Thread is absent", async () => {
  let settled = null;
  const request = {
    requestId:"legacy_birth_failed",
    genesisId:"gen_legacy_failed",
    threadId:"thr_legacy_failed",
    status:"reserved",
    plan:{ subjectIdentity:{ birthCity:"Tbilisi, Georgia", place:{ country:"Georgia", city:"Tbilisi" }, sex:"male" } },
    createdAt:"2026-09-01T00:00:00.000Z",
    updatedAt:"2026-09-01T00:05:00.000Z",
  };
  const runtime = {
    modernBirthRequestStore:{ recent:() => [], progress:() => {}, isActive:() => false },
    provisionalBirthStore:{ get:() => null },
    developmentRequestStore:{
      recent:() => [request],
      getDisposition:() => ({ outcome:null, failureCode:"GENESIS_PASS_A_VALIDATION_ERROR" }),
      settleBorn:() => { throw new Error("absent Thread was classified born"); },
      settleStillborn:(requestId) => { settled = requestId; },
    },
  };

  const births = await pendingBirths(runtime, {
    worldBinding:{ fetch:async () => Response.json({ error:"not_found" }, { status:404 }) },
    privateToken:"private-token-for-birth-reconciliation",
    nowMs:() => Date.parse("2026-09-25T15:00:00.000Z"),
  });

  assert.deepEqual(births, [], "terminal failed birth remained in the active pipeline");
  assert.equal(settled, request.requestId, "confirmed terminal birth was not settled stillborn");
});
