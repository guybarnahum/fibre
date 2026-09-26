import assert from "node:assert/strict";
import test from "node:test";

import { nextBirthStatusCheckAt, pendingBirths, reconcileStaleBirths } from "../runtime.mjs";

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
      birthCity:"Tbilisi, Georgia",
      place:{ country:"Georgia", city:"Tbilisi" },
      sex:request.sex,
    } },
    createdAt:request.createdAt,
    updatedAt:request.updatedAt,
  };
}


test("stale births wake immediately once, then retry on the normal interval", () => {
  const request = staleModern();
  const runtime = {
    modernBirthRequestStore:{
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
    modernBirthRequestStore:{
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

test("pending births is local observation", () => {
  const request = staleModern();
  const runtime = {
    modernBirthRequestStore:{
      recent:() => [request],
      isActive:(status) => status === "developing",
      progress:() => { throw new Error("pending read mutated birth state"); },
    },
    provisionalBirthStore:{ get:() => { throw new Error("pending read inspected publication state"); } },
    developmentRequestStore:{
      recent:() => [developmentFor(request)],
      getDisposition:() => null,
    },
  };

  const births = pendingBirths(runtime, { nowMs:() => NOW });

  assert.equal(births.length, 1, "stale birth disappeared before reconciliation");
  assert.equal(births[0].classification, "stale_unresolved", "stale birth was presented as reconciled");
  assert.equal(births[0].requestedAt, request.requestedAt, "birth replay time was lost");
});

test("one World check settles duplicate stale birth records as born", async () => {
  const request = staleModern();
  let worldChecks = 0;
  let published = 0;
  let born = 0;
  const runtime = {
    modernBirthRequestStore:{
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

test("terminal pre-admission failure becomes stillborn only after confirmed World absence", async () => {
  const request = staleModern({
    status:"failed",
    error:"replacement Pass-A exhausted 3 generated versions",
  });
  let stillborn = 0;
  const runtime = {
    modernBirthRequestStore:{
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
    modernBirthRequestStore:{
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
    modernBirthRequestStore:{
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
