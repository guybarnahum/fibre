import assert from "node:assert/strict";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
import {
  WORLD_RECONCILIATION_SCOPE_ID,
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
  worldReconciliationNeedsRetry,
} from "../src/world-reconciliation-process.mjs";

function createRuntimeFixture({ process, now = () => 1_000, intervalMs = 100, maxRetryMs = 800 } = {}) {
  let wake = async () => {};
  const infraDriver = createLocalInfraDriver({
    stateScopes: { world: ":memory:" },
    schedulerScopes: {
      world: {
        onWake: () => wake(),
      },
    },
  });
  const runtime = createWorldReconciliationRuntime({ infraDriver, process, intervalMs, maxRetryMs, now });
  wake = () => runtime.handleWake();
  return { infraDriver, runtime };
}

test("World reconciliation isolates Genesis delivery from visual publication", async () => {
  const calls = [];
  const errors = [];
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() {
        calls.push("presentation");
        throw new Error("presentation unavailable");
      },
    },
    visualPublicationProcess: {
      async runOnce() {
        calls.push("visual");
        return { skipped: false, reason: null, results: [] };
      },
    },
    onError(entry) { errors.push(entry); },
  });
  const result = await process.runOnce();
  assert.deepEqual(calls, ["presentation", "visual"]);
  assert.equal(result.presentation.ok, false);
  assert.equal(result.visualPublication.ok, true);
  assert.equal(errors[0].kind, "genesis_presentation_delivery");
  assert.equal(worldReconciliationNeedsRetry(result), true);
});

test("World reconciliation scheduler emits no Activity for an idle sweep", async () => {
  const activityCalls = [];
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() {
        return { attempted: 0, delivered: 0, failed: 0, results: [] };
      },
    },
    visualPublicationProcess: {
      async runOnce() {
        return { skipped: false, reason: null, results: [] };
      },
    },
    activityRecorder: {
      async record(record) { activityCalls.push(["record", record]); },
      async runStage(metadata, operation) {
        activityCalls.push(["runStage", metadata]);
        return operation();
      },
    },
  });

  const result = await process.runOnce();
  assert.equal(result.presentation.ok, true);
  assert.equal(result.visualPublication.ok, true);
  assert.equal(worldReconciliationNeedsRetry(result), false);
  assert.deepEqual(activityCalls, []);
});

test("World reconciliation classifier keeps incomplete visual work active", () => {
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: true, ok: true, result: { attempted: 0, delivered: 0, failed: 0 } },
    visualPublication: {
      enabled: true,
      ok: true,
      result: {
        skipped: false,
        results: [{ threadId: "thr_1", ok: true, reconciliation: { complete: false, stage: "official_photo_pending" } }],
      },
    },
  }), true);
});

test("World reconciliation requestWake schedules immediate work without periodic bootstrap", async () => {
  const process = createWorldReconciliationProcess();
  const { infraDriver, runtime } = createRuntimeFixture({ process });
  try {
    assert.equal(runtime.scopeId, WORLD_RECONCILIATION_SCOPE_ID);

    assert.deepEqual(await runtime.ensureScheduled(), {
      scopeId: "world",
      scheduledTimeMs: null,
      existing: false,
      quiescent: true,
    });
    await runtime.requestWake();
    assert.equal(await infraDriver.scheduler.get("world"), 1_000);
  } finally {
    await runtime.stop();
  }
});

test("World reconciliation converged sweep cancels alarm and becomes quiescent", async () => {
  let runs = 0;
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() { runs += 1; return { attempted: 0, delivered: 0, failed: 0, results: [] }; },
    },
    visualPublicationProcess: {
      async runOnce() { return { skipped: false, reason: null, results: [] }; },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({ process });
  await runtime.requestWake();
  const result = await runtime.handleWake();
  assert.equal(runs, 1);
  assert.equal(result.reconciliationPending, false);
  assert.equal(result.retryDelayMs, null);
  assert.equal(await infraDriver.scheduler.get("world"), null);
});

test("World reconciliation pending work backs off exponentially and caps retry delay", async () => {
  let clock = 2_000;
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          reason: null,
          results: [{ threadId: "thr_pending", ok: true, reconciliation: { complete: false } }],
        };
      },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 100,
    maxRetryMs: 400,
  });

  try {
    await runtime.requestWake();
    let result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 100);
    assert.equal(await infraDriver.scheduler.get("world"), 2_100);

    clock = 3_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 200);
    assert.equal(await infraDriver.scheduler.get("world"), 3_200);

    clock = 4_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 400);
    assert.equal(await infraDriver.scheduler.get("world"), 4_400);

    clock = 5_000;
    result = await runtime.handleWake();
    assert.equal(result.retryDelayMs, 400);
    assert.equal(await infraDriver.scheduler.get("world"), 5_400);
  } finally {
    await runtime.stop();
  }
});

test("new authoritative wake resets World reconciliation backoff", async () => {
  let clock = 10_000;
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          reason: null,
          results: [{ threadId: "thr_pending", ok: true, reconciliation: { complete: false } }],
        };
      },
    },
  });
  const { runtime } = createRuntimeFixture({ process, now: () => clock, intervalMs: 100, maxRetryMs: 800 });
  try {
    await runtime.requestWake();
    await runtime.handleWake();
    clock = 11_000;
    const second = await runtime.handleWake();
    assert.equal(second.retryDelayMs, 200);

    clock = 12_000;
    await runtime.requestWake();
    const afterNewWork = await runtime.handleWake();
    assert.equal(afterNewWork.retryDelayMs, 100);
  } finally {
    await runtime.stop();
  }
});
