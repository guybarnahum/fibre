import assert from "node:assert/strict";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
import {
  WORLD_RECONCILIATION_SCOPE_ID,
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
  worldReconciliationNeedsRetry,
} from "../src/world-reconciliation-process.mjs";

function createRuntimeFixture({
  process,
  now = () => 1_000,
  intervalMs = 100,
  idleIntervalMs = 1_000,
} = {}) {
  let wake = async () => {};
  const infraDriver = createLocalInfraDriver({
    stateScopes: { world: ":memory:" },
    schedulerScopes: {
      world: {
        onWake: () => wake(),
      },
    },
  });
  const runtime = createWorldReconciliationRuntime({
    infraDriver,
    process,
    intervalMs,
    idleIntervalMs,
    now,
  });
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
        return { complete: true };
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
  assert.equal(worldReconciliationNeedsRetry(result), false);
  assert.deepEqual(activityCalls, []);
});

test("World reconciliation retry classification distinguishes pending work from convergence", () => {
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: true, ok: true, result: { attempted: 0, delivered: 0, failed: 0, results: [] } },
    visualPublication: { enabled: true, ok: true, result: { skipped: false, results: [] } },
  }), false);
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: true, ok: true, result: { attempted: 0, delivered: 0, failed: 0, results: [] } },
    visualPublication: {
      enabled: true,
      ok: true,
      result: {
        skipped: false,
        results: [{ threadId: "thread_1", ok: true, reconciliation: { complete: false, stage: "canonical_visual_root_pending" } }],
      },
    },
  }), true);
  assert.equal(worldReconciliationNeedsRetry({
    skipped: false,
    presentation: { enabled: true, ok: true, result: { attempted: 1, delivered: 0, failed: 1, results: [] } },
    visualPublication: { enabled: true, ok: true, result: { skipped: false, results: [] } },
  }), true);
});

test("World reconciliation runtime consumes get/schedule/cancel and preserves an existing wake", async () => {
  let visualRuns = 0;
  const process = createWorldReconciliationProcess();
  const { infraDriver, runtime } = createRuntimeFixture({ process });
  assert.equal(runtime.scopeId, WORLD_RECONCILIATION_SCOPE_ID);

  const first = await runtime.ensureScheduled();
  assert.deepEqual(first, { scopeId: "world", scheduledTimeMs: 1_100, existing: false });
  const second = await runtime.ensureScheduled();
  assert.deepEqual(second, { scopeId: "world", scheduledTimeMs: 1_100, existing: true });
  await runtime.requestWake();
  assert.equal(await infraDriver.scheduler.get("world"), 1_000);

  process.setVisualPublicationProcess({
    async runOnce() { visualRuns += 1; return { complete: true }; },
  });
  const result = await runtime.runNow();
  assert.equal(result.visualPublication.ok, true);
  assert.equal(visualRuns, 1);
  assert.equal(await infraDriver.scheduler.get("world"), 2_000);
  assert.equal(await runtime.stop(), true);
  assert.equal(await infraDriver.scheduler.get("world"), null);
});

test("World reconciliation wake backs off after an idle sweep", async () => {
  let runs = 0;
  let clock = 2_000;
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() {
        runs += 1;
        return { attempted: 0, delivered: 0, failed: 0, results: [] };
      },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 250,
    idleIntervalMs: 3_600,
  });
  await runtime.ensureScheduled();
  assert.equal(await infraDriver.scheduler.get("world"), 2_250);
  await infraDriver.scheduler.cancel("world");
  clock = 3_000;
  await runtime.handleWake();
  assert.equal(runs, 1);
  assert.equal(await infraDriver.scheduler.get("world"), 6_600);
  await runtime.requestWake();
  assert.equal(await infraDriver.scheduler.get("world"), 3_000);
  await runtime.stop();
});

test("World reconciliation keeps the active cadence while visual work is pending", async () => {
  let clock = 4_000;
  const process = createWorldReconciliationProcess({
    visualPublicationProcess: {
      async runOnce() {
        return {
          skipped: false,
          results: [{
            threadId: "thread_1",
            ok: true,
            reconciliation: { complete: false, stage: "canonical_visual_root_pending" },
          }],
        };
      },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({
    process,
    now: () => clock,
    intervalMs: 250,
    idleIntervalMs: 3_600,
  });
  await runtime.handleWake();
  assert.equal(await infraDriver.scheduler.get("world"), 4_250);
  clock = 5_000;
  process.setVisualPublicationProcess({
    async runOnce() {
      return {
        skipped: false,
        results: [{
          threadId: "thread_1",
          ok: true,
          reconciliation: { complete: true, stage: "complete" },
        }],
      };
    },
  });
  await runtime.handleWake();
  assert.equal(await infraDriver.scheduler.get("world"), 8_600);
  await runtime.stop();
});
