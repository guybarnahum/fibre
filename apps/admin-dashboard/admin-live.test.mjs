import assert from "node:assert/strict";
import test from "node:test";

import { routeAdminLiveMessage } from "./admin-live.js";
import {
  threadObservatoryViewKey,
  threadPopulationViewKey,
  threadViewKey,
  watchViewInvalidation,
} from "./view-invalidation.js";

test("one Thread live hint refreshes its aspect, Observatory, and population row", async () => {
  const seen = [];
  const stops = [
    watchViewInvalidation(threadViewKey("thr_live", "reconciliation"), async (detail) => {
      seen.push(["aspect", detail.reason]);
    }),
    watchViewInvalidation(threadObservatoryViewKey("thr_live"), async (detail) => {
      seen.push(["observatory", detail.aspect]);
    }),
    watchViewInvalidation(threadPopulationViewKey(), async (detail) => {
      seen.push(["population", detail.threadId]);
    }),
  ];

  assert.equal(routeAdminLiveMessage({
    type:"admin-live.invalidate",
    entity:"thread",
    id:"thr_live",
    aspect:"reconciliation",
  }), true);

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(seen, [
    ["aspect", "changed"],
    ["observatory", "reconciliation"],
    ["population", "thr_live"],
  ]);

  stops.forEach((stop) => stop());
});
