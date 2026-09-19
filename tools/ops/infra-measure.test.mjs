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
