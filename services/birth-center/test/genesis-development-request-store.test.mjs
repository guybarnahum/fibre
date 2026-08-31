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
