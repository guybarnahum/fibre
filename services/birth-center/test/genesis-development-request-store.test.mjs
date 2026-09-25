import assert from "node:assert/strict";
import test from "node:test";

import {
  GenesisDevelopmentRequestConflictError,
  createGenesisDevelopmentRequestStore,
} from "../src/genesis-development-request-store.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

function plan(overrides = {}) {
  return {
    planVersion: "fibre-genesis-development-plan-v2",
    requestId: "request-durable-001",
    requestDigest: `sha256:${"a".repeat(64)}`,
    genesisId: "genesis_durable_001",
    threadId: "thr_durable_001",
    material: { seed: "alpha", windows: 14 },
    ...overrides,
  };
}

function admission(overrides = {}) {
  return {
    manifest: { genesisId: "genesis_durable_001", threadId: "thr_durable_001" },
    worldSpec: { worldSpecId: "world_durable_001" },
    symbolicGenomes: [{ genomeDigest: `sha256:${"b".repeat(64)}` }],
    civilRegistration: { fibreIdentityNumber: "F-0000-0000-0000-0001" },
    ...overrides,
  };
}

test("Genesis development request store durably reserves exact request and plan identity", (t) => {
  const state = tempBirthState(t);
  const first = createGenesisDevelopmentRequestStore(state.storage(), { now: () => "2026-08-31T23:21:00Z" });
  const created = first.reserve({
    requestId: "request-durable-001",
    requestDigest: plan().requestDigest,
    plan: plan(),
  });
  assert.equal(created.status, "reserved");
  assert.equal(created.idempotent, false);
  first.close();

  const restarted = createGenesisDevelopmentRequestStore(state.storage(), { now: () => "2026-08-31T23:22:00Z" });
  const replay = restarted.reserve({
    requestId: "request-durable-001",
    requestDigest: plan().requestDigest,
    plan: plan(),
  });
  assert.equal(replay.idempotent, true);
  assert.equal(replay.createdAt, "2026-08-31T23:21:00Z");
  assert.deepEqual(replay.plan, plan());
  restarted.close();
});

test("same request identity with changed plan material conflicts before any model work can resume", (t) => {
  const state = tempBirthState(t);
  const store = createGenesisDevelopmentRequestStore(state.storage());
  store.reserve({ requestId: plan().requestId, requestDigest: plan().requestDigest, plan: plan() });
  assert.throws(
    () => store.reserve({
      requestId: plan().requestId,
      requestDigest: plan().requestDigest,
      plan: plan({ material: { seed: "changed", windows: 14 } }),
    }),
    GenesisDevelopmentRequestConflictError,
  );
  store.close();
});

test("ready admission and submitted result survive restart and reject changed material", (t) => {
  const state = tempBirthState(t);
  const store = createGenesisDevelopmentRequestStore(state.storage(), { now: () => "2026-08-31T23:23:00Z" });
  store.reserve({ requestId: plan().requestId, requestDigest: plan().requestDigest, plan: plan() });
  const ready = store.saveAdmission(plan().requestId, admission());
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.admission, admission());
  assert.throws(
    () => store.saveAdmission(plan().requestId, admission({ worldSpec: { worldSpecId: "world_changed" } })),
    GenesisDevelopmentRequestConflictError,
  );
  const submitted = store.markSubmitted(plan().requestId, {
    genesisId: "genesis_durable_001",
    threadId: "thr_durable_001",
    status: "pending",
  });
  assert.equal(submitted.status, "submitted");
  store.close();

  const restarted = createGenesisDevelopmentRequestStore(state.storage());
  const recovered = restarted.get(plan().requestId);
  assert.equal(recovered.status, "submitted");
  assert.deepEqual(recovered.admission, admission());
  assert.deepEqual(recovered.submissionResult, {
    genesisId: "genesis_durable_001",
    status: "pending",
    threadId: "thr_durable_001",
  });
  restarted.close();
});


test("recent Genesis development requests expose durable pending-order state", (t) => {
  const state = tempBirthState(t);
  let now = "2026-09-25T05:00:00Z";
  const store = createGenesisDevelopmentRequestStore(state.storage(), { now:() => now });

  const first = plan({ requestId:"request-durable-older", genesisId:"genesis_durable_older", threadId:"thr_durable_older" });
  store.reserve({ requestId:first.requestId, requestDigest:first.requestDigest, plan:first });

  now = "2026-09-25T05:01:00Z";
  const second = plan({ requestId:"request-durable-newer", genesisId:"genesis_durable_newer", threadId:"thr_durable_newer" });
  store.reserve({ requestId:second.requestId, requestDigest:second.requestDigest, plan:second });

  assert.deepEqual(
    store.recent({ limit:2 }).map((entry) => entry.requestId),
    ["request-durable-newer","request-durable-older"],
    "pending-birth inspection must read durable development requests newest first",
  );
  assert.throws(() => store.recent({ limit:0 }), /recent limit/);
  store.close();
});


test("Genesis birth disposition survives restart without rewriting the development record", (t) => {
  const state = tempBirthState(t);
  const store = createGenesisDevelopmentRequestStore(state.storage(), { now:() => "2026-09-25T17:00:00Z" });
  store.reserve({ requestId:plan().requestId, requestDigest:plan().requestDigest, plan:plan() });
  store.recordFailure(plan().requestId, Object.assign(new Error("Pass-A exhausted"), {
    code:"GENESIS_PASS_A_VALIDATION_ERROR",
  }));
  const born = store.settleBorn(plan().requestId);
  assert.equal(born.outcome, "born");
  assert.equal(born.failureCode, "GENESIS_PASS_A_VALIDATION_ERROR");
  store.close();

  const restarted = createGenesisDevelopmentRequestStore(state.storage());
  const recovered = restarted.getDisposition(plan().requestId);
  assert.equal(recovered.outcome, "born", "settled birth outcome was not durable");
  assert.equal(recovered.failureCode, "GENESIS_PASS_A_VALIDATION_ERROR", "historical failure evidence was lost");
  restarted.close();
});
