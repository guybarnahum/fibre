import assert from "node:assert/strict";
import test from "node:test";

import { pendingBirths } from "../runtime.mjs";

test("stale birth leaves pending when its Thread is already in World", async () => {
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
    },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{ recent:() => [] },
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
    modernBirthRequestStore:{ recent:() => [request], progress:() => {} },
    provisionalBirthStore:{ get:() => ({ status:"pending" }) },
    developmentRequestStore:{ recent:() => [] },
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
