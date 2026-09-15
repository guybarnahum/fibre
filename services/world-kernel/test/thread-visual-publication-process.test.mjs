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

test("visual publication retires complete and terminal work instead of touching it again", async () => {
  const active = new Set(["thr_complete", "thr_terminal"]);
  const calls = [];
  const deadLetters = [];
  const workset = {
    async listThreadIds() { return [...active]; },
    async complete(threadId) { active.delete(threadId); },
    async retry() {},
    async deadLetter(threadId, error) {
      active.delete(threadId);
      deadLetters.push([threadId, error.code]);
    },
    async hasPending() { return active.size > 0; },
  };
  const process = createThreadVisualPublicationProcess({
    workset,
    reconciler: {
      async reconcileThread({ threadId }) {
        calls.push(threadId);
        if (threadId === "thr_terminal") {
          const error = new Error("missing canonical visual identity");
          error.code = "INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY";
          error.retryable = false;
          throw error;
        }
        return { complete:true, stage:"complete" };
      },
    },
  });

  const first = await process.runOnce();
  assert.equal(first.hasPending, false, "retired work must leave reconciliation quiescent");
  assert.deepEqual(deadLetters, [["thr_terminal", "INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY"]]);
  assert.deepEqual(calls.sort(), ["thr_complete", "thr_terminal"]);

  await process.runOnce();
  assert.equal(calls.length, 2, "retired work must not be reconciled again");
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
