import assert from "node:assert/strict";
import test from "node:test";

import { pendingBirths, reconcileStaleBirths } from "../runtime.mjs";

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

test("pending births is local observation", () => {
  const request = staleModern();
  const runtime = {
    modernBirthRequestStore:{
      recent:() => [request],
      isActive:(status) => status === "developing",
      progress:() => { throw new Error("pending read mutated birth state"); },
    },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
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
    worldBinding:{ fetch:async () => {
      worldChecks += 1;
      return Response.json({ identity:{ threadId:request.threadId } });
    } },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(worldChecks, 1, "same Thread caused duplicate World checks");
  assert.equal(published, 2, "healthy birth records did not converge");
  assert.equal(born, 1, "development birth did not settle born");
  assert.equal(result.born, 2);
});

test("terminal Pass-A failure becomes stillborn only after confirmed World absence", async () => {
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
        failureCode:"GENESIS_PASS_A_VALIDATION_ERROR",
      }),
      settleBorn:() => { throw new Error("absent Thread became born"); },
      settleStillborn:() => { stillborn += 1; },
    },
  };

  const result = await reconcileStaleBirths(runtime, {
    worldBinding:{ fetch:async () => Response.json({ error:"not_found" }, { status:404 }) },
    privateToken:TOKEN,
    nowMs:() => NOW,
  });

  assert.equal(stillborn, 1, "terminal birth did not settle stillborn");
  assert.equal(result.stillborn, 1);
});
