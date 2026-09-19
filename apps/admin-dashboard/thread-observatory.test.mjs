import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeObservatoryWorldIdentity,
  threadObservatoryCopyPayload,
} from "./thread-observatory.js";

test("Thread Observatory renders mutable identity from current authoritative World", () => {
  const staleProjection = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
    originOrientation:"original",
    lifecycleStatus:"active",
    presentation:{ snapshotVersion:"stale-public-projection" },
  };
  const deepWorld = {
    thread:{
      threadId:"thr_observatory_1",
      version:8,
      status:"active",
      identity:{
        name:"Maya Cohen",
        sex:"female",
        birthDate:"2004-08-20",
        birthCity:"Jerusalem, Israel",
        culture:["Jerusalem formative context"],
        languages:["Hebrew", "English"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(staleProjection, deepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "English"], "stale projected languages must not override current World identity");
  assert.equal(merged.world.thread.version, 8);
  assert.equal(merged.presentation.snapshotVersion, "stale-public-projection", "Presentation must remain separately inspectable");
});

test("Thread Observatory keeps a newer authoritative identity read when deep Observatory lags", () => {
  const currentIdentity = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Russian", "English"],
    originOrientation:"original",
    lifecycleStatus:"active",
    version:9,
  };
  const laggingDeepWorld = {
    thread:{
      threadId:"thr_observatory_1",
      version:8,
      status:"active",
      identity:{
        name:"Maya Cohen",
        sex:"female",
        birthDate:"2004-08-20",
        birthCity:"Jerusalem, Israel",
        culture:["Jerusalem formative context"],
        languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(currentIdentity, laggingDeepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "Russian", "English"]);
  assert.equal(merged.version, 9);
  assert.equal(merged.world.thread.version, 8, "lagging deep World remains inspectable rather than being rewritten");
});

test("Thread Observatory preserves identity projection when deep World is unavailable", () => {
  const identity = {
    displayName:"Maya Cohen",
    languages:["Hebrew", "English"],
    lifecycleStatus:"active",
  };
  const merged = mergeObservatoryWorldIdentity(identity, null);
  assert.deepEqual(merged.languages, ["Hebrew", "English"]);
  assert.equal(merged.world, null);
});


test("Thread Observatory copy payload carries person state and current repair diagnosis", () => {
  const payload = threadObservatoryCopyPayload({
    threadId:"thr_observatory_copy_1",
    identity:{
      displayName:"Maya Cohen",
      raisedAs:{ languages:["Hebrew"] },
      languages:["Hebrew", "Danish"],
      world:{ thread:{ version:12, status:"active" } },
    },
    memories:[{ memoryId:"mem_1", rememberedContent:"Worked in Copenhagen." }],
    repair:{
      diagnosis:{
        health:"operator_decision_required",
        findings:[{ code:"RAISED_LANGUAGES_NEED_REVIEW", state:"operator_decision_required" }],
      },
      reconciliation:{ state:"pending" },
    },
  });

  assert.equal(payload.contract, "fibre-thread-observatory-copy-v0.1");
  assert.equal(payload.threadId, "thr_observatory_copy_1");
  assert.deepEqual(payload.identity.raisedAs.languages, ["Hebrew"]);
  assert.deepEqual(payload.identity.languages, ["Hebrew", "Danish"]);
  assert.equal(payload.identity.world.thread.version, 12);
  assert.equal(payload.memories[0].memoryId, "mem_1");
  assert.equal(payload.repair.diagnosis.health, "operator_decision_required");
  assert.equal(payload.repair.reconciliation.state, "pending");
  assert.equal(payload.memoryError, null);
  assert.equal(payload.repairError, null);
});
