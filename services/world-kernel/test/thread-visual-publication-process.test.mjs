import assert from "node:assert/strict";
import test from "node:test";

import {
  createThreadVisualPublicationProcess,
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
        if (threadId === "thr_b") {
          const error = new Error("fixture failure");
          error.code = "FIXTURE_TERMINAL";
          error.retryable = false;
          throw error;
        }
        return { complete: threadId === "thr_a", stage: threadId === "thr_a" ? "complete" : "official_photo_pending" };
      },
    },
    onError(entry) { errors.push(entry); },
  });

  const result = await process.runOnce();
  assert.equal(result.skipped, false);
  assert.deepEqual(calls, ["thr_a", "thr_b", "thr_c"]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].threadId, "thr_b");
  assert.equal(errors[0].code, "FIXTURE_TERMINAL");
  assert.equal(errors[0].retryable, false);
  assert.equal(result.results.length, 3);
  assert.equal(result.results[0].ok, true);
  assert.equal(result.results[1].ok, false);
  assert.equal(result.results[1].code, "FIXTURE_TERMINAL");
  assert.equal(result.results[1].retryable, false);
  assert.equal(result.results[2].ok, true);
});

test("visual publication process defaults unclassified failures to retryable", async () => {
  const process = createThreadVisualPublicationProcess({
    threadSource: { async listThreadIds() { return ["thr_retry"]; } },
    reconciler: {
      async reconcileThread() { throw new Error("temporary fixture failure"); },
    },
  });

  const result = await process.runOnce();
  assert.equal(result.results[0].ok, false);
  assert.equal(result.results[0].code, "THREAD_VISUAL_PUBLICATION_FAILED");
  assert.equal(result.results[0].retryable, true);
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
