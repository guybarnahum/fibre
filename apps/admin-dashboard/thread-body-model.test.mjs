import assert from "node:assert/strict";
import test from "node:test";

import { eventTicks, geneticsRows, sparkPoints } from "./thread-body-model.mjs";

test("the Body panel shows every inherited urge with each position it carries, and a day of each state", () => {
  const rows = geneticsRows([
    { family:"trust", kind:"directional", orientation:"warmth", positions:{ gain:0.2, feltThreshold:0, persistence:-0.4 } },
    { family:"standing", kind:"directional", orientation:"deference", positions:{ gain:0.95, feltThreshold:0.48,
      persistence:-0.25, selfRegard:0.88, stubbornness:-0.65 } },
  ]);
  assert.deepEqual(rows.map((row) => row.family), ["standing", "trust"]);
  assert.equal(rows[0].positions.stubbornness, -0.65, "stubbornness was not shown on standing");
  assert.equal("stubbornness" in rows[1].positions, false, "a position a family does not carry was shown");
  const points = sparkPoints([0, null, 1], { range:[0, 1], width:100, height:10 }).split(" ");
  assert.deepEqual(points, ["0.0,10.0", "100.0,0.0"], "a missing moment was drawn, or the range was not respected");
  assert.equal(eventTicks([{ at:"2026-11-14T06:00:00.000Z" }],
    { from:"2026-11-14T00:00:00.000Z", to:"2026-11-15T00:00:00.000Z", width:100 })[0].x, 25);
});
