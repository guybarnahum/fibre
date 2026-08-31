import assert from "node:assert/strict";
import test from "node:test";

import {
  createThreadVisualPublicationProcess,
  startThreadVisualPublicationProcess,
} from "../src/thread-visual-publication-process.mjs";

async function waitFor(predicate, { timeoutMs = 1_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out waiting for visual publication scheduler condition");
}

test("visual publication process reconciles durable Threads deterministically and isolates per-Thread failures", async () => {
  const calls = [];
  const errors = [];
  const process = createThreadVisualPublicationProcess({
    threadSource: {
      async listThreadIds() {
        return ["thr_b", "thr_a", "thr_b", "thr_c"];
      },
    },
    reconciler: {
      async reconcileThread({ threadId }) {
        calls.push(threadId);
        if (threadId === "thr_b") throw new Error("fixture failure");
        return { complete: threadId === "thr_a", stage: threadId === "thr_a" ? "complete" : "official_photo_pending" };
      },
    },
    onError(entry) { errors.push(entry.threadId); },
  });

  const result = await process.runOnce();
  assert.equal(result.skipped, false);
  assert.deepEqual(calls, ["thr_a", "thr_b", "thr_c"]);
  assert.deepEqual(errors, ["thr_b"]);
  assert.equal(result.results.length, 3);
  assert.equal(result.results[0].ok, true);
  assert.equal(result.results[1].ok, false);
  assert.equal(result.results[2].ok, true);
});

test("visual publication process does not overlap reconciliation sweeps", async () => {
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  let entered = 0;
  const process = createThreadVisualPublicationProcess({
    threadSource: { async listThreadIds() { return ["thr_overlap"]; } },
    reconciler: {
      async reconcileThread() {
        entered += 1;
        await blocked;
        return { complete: false, stage: "pending" };
      },
    },
  });

  const first = process.runOnce();
  while (entered === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await process.runOnce();
  assert.equal(second.skipped, true);
  assert.equal(second.reason, "already_running");
  release();
  await first;
  assert.equal(entered, 1);
});

test("visual publication scheduler runs automatically and resumes from durable state after restart", async () => {
  let durableStage = "canonical_visual_root_pending";
  const observed = [];
  const threadSource = { async listThreadIds() { return ["thr_scheduler"]; } };

  function createProcess() {
    return createThreadVisualPublicationProcess({
      threadSource,
      reconciler: {
        async reconcileThread({ threadId }) {
          const stage = durableStage;
          observed.push({ threadId, stage });
          return { complete: stage === "complete", stage };
        },
      },
    });
  }

  const firstProcess = createProcess();
  const firstScheduler = startThreadVisualPublicationProcess({
    process: firstProcess,
    intervalMs: 100,
    runImmediately: true,
  });
  await waitFor(() => observed.some((entry) => entry.stage === "canonical_visual_root_pending"));
  firstScheduler.stop();

  durableStage = "official_photo_pending";
  const beforeRestart = observed.length;
  const secondProcess = createProcess();
  const secondScheduler = startThreadVisualPublicationProcess({
    process: secondProcess,
    intervalMs: 100,
    runImmediately: true,
  });
  await waitFor(() => observed.slice(beforeRestart).some((entry) => entry.stage === "official_photo_pending"));

  durableStage = "complete";
  await waitFor(() => observed.some((entry) => entry.stage === "complete"));
  secondScheduler.stop();

  assert.equal(observed.every((entry) => entry.threadId === "thr_scheduler"), true);
  assert.equal(observed.some((entry) => entry.stage === "canonical_visual_root_pending"), true);
  assert.equal(observed.some((entry) => entry.stage === "official_photo_pending"), true);
  assert.equal(observed.some((entry) => entry.stage === "complete"), true);
});
