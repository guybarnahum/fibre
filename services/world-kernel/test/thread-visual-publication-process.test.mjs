import assert from "node:assert/strict";
import test from "node:test";

import { createThreadVisualPublicationProcess } from "../src/thread-visual-publication-process.mjs";

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
