import assert from "node:assert/strict";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
import {
  WORLD_RECONCILIATION_SCOPE_ID,
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
} from "../src/world-reconciliation-process.mjs";

function createRuntimeFixture({ process, now = () => 1_000, intervalMs = 100 } = {}) {
  let wake = async () => {};
  const infraDriver = createLocalInfraDriver({
    stateScopes: { world: ":memory:" },
    schedulerScopes: {
      world: {
        onWake: () => wake(),
      },
    },
  });
  const runtime = createWorldReconciliationRuntime({ infraDriver, process, intervalMs, now });
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
  assert.equal(await infraDriver.scheduler.get("world"), 1_100);
  assert.equal(await runtime.stop(), true);
  assert.equal(await infraDriver.scheduler.get("world"), null);
});

test("World reconciliation wake runs durable work then schedules the next wake", async () => {
  let runs = 0;
  let clock = 2_000;
  const process = createWorldReconciliationProcess({
    presentationDelivery: {
      async deliverPending() { runs += 1; return { delivered: 0 }; },
    },
  });
  const { infraDriver, runtime } = createRuntimeFixture({ process, now: () => clock, intervalMs: 250 });
  await runtime.ensureScheduled();
  assert.equal(await infraDriver.scheduler.get("world"), 2_250);
  await infraDriver.scheduler.cancel("world");
  clock = 3_000;
  await runtime.handleWake();
  assert.equal(runs, 1);
  assert.equal(await infraDriver.scheduler.get("world"), 3_250);
  await runtime.stop();
});
