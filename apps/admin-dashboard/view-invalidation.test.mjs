import assert from "node:assert/strict";
import test from "node:test";

import {
  invalidateView,
  threadViewKey,
  watchViewInvalidation,
} from "./view-invalidation.js";

test("Admin view invalidation refreshes only the affected component and coalesces overlap", async () => {
  const a = threadViewKey("thr_a", "presentation");
  const b = threadViewKey("thr_b", "presentation");
  const seen = [];
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });

  const stopA = watchViewInvalidation(a, async (detail) => {
    seen.push(["a", detail.revision]);
    if (detail.revision === 1) await blocked;
  });
  const stopB = watchViewInvalidation(b, async (detail) => {
    seen.push(["b", detail.revision]);
  });

  invalidateView(a, { revision:1 });
  await Promise.resolve();
  invalidateView(a, { revision:2 });
  invalidateView(a, { revision:3 });
  invalidateView(b, { revision:1 });
  await Promise.resolve();

  assert.deepEqual(seen, [["a",1],["b",1]], "invalidation refreshed unrelated or duplicate work");

  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(seen, [["a",1],["b",1],["a",3]], "overlapping invalidations were not coalesced");

  stopA();
  stopB();
});
