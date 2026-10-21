import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCosts } from "./infra-measure.mjs";

test("infrastructure measurement preserves Fibre operation cost and encounter slope", () => {
  const summary = summarizeCosts([
    {
      event:"world-state-cost",
      phase:"meeting",
      source:"world-kernel",
      kind:"request",
      method:"POST",
      path:"/internal/lived-encounter",
      rowsRead:40,
      rowsWritten:8,
      queries:12,
    },
    {
      event:"d1-cost",
      phase:"meeting",
      source:"thread-presentation",
      operation:"activity.record",
      rowsRead:0,
      rowsWritten:1,
    },
    {
      event:"world-state-cost",
      phase:"meeting",
      source:"world-kernel",
      kind:"request",
      method:"POST",
      path:"/internal/lived-encounter",
      rowsRead:42,
      rowsWritten:8,
      queries:12,
    },
    {
      event:"d1-cost",
      phase:"activity",
      source:"admin-dashboard",
      operation:"admin.activity.count",
      rowsRead:18000,
      rowsWritten:0,
    },
  ]);

  assert.deepEqual(summary.encounterRowsRead, [40, 42], "encounter cost history must remain visible");
  assert.equal(summary.encounterSlopeRowsReadPerTurn, 2, "encounter cost growth must remain measurable");

  const operations = new Map(summary.operations.map((row) => [row.operation, row]));
  assert.equal(operations.get("POST /internal/lived-encounter").calls, 2);
  assert.equal(operations.get("POST /internal/lived-encounter").rowsRead, 82);
  assert.equal(operations.get("activity.record").rowsWritten, 1);
  assert.equal(operations.get("admin.activity.count").rowsRead, 18000);
});

test("LivedNow failures are diagnosed without inflating Cloudflare read/write totals",()=>{
  const result=summarizeCosts([
    {event:"world-state-cost",phase:"world-life-wave",source:"world-kernel",
      kind:"request",method:"POST",path:"/internal/lived-now/ensure",
      rowsRead:70,rowsWritten:2,queries:11},
    {event:"lived-now-reconciliation-failed",phase:"world-life-wave",
      source:"world-kernel",threadId:"thr_london",
      code:"LIVED_NOW_RECONCILIATION_FAILED",
      detail:"Planning integration failed",
      diagnostics:{stage:"lived_now.ensure",providerErrorCode:"upstream_timeout"}},
  ]);
  assert.equal(result.operations.length,1,
    "a server error counted as a fictitious database request");
  assert.equal(result.operations[0].rowsRead,70);
  assert.equal(result.reconciliationFailures.length,1,
    "the reason for the failed wave vanished from measurement evidence");
  assert.equal(result.reconciliationFailures[0].diagnostics.stage,"lived_now.ensure");
});
