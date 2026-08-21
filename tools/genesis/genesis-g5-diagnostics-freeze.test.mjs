import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCleanNegativeControl,
  classifyD1,
  classifyD3Ordinal,
  deterministicSha256Order,
  emitsNegativeControlFailureSignal,
  rankPointsFromScores,
  verifyG5DiagnosticsFreeze,
} from "./genesis-g5-diagnostics-freeze.mjs";

test("G5 deterministic order is stable and complete", () => {
  const items = ["a", "b", "c", "d", "e"];
  const a = deterministicSha256Order(items, {
    seedDomain: "g5-test",
    namespace: "trial-1",
    key: String,
  });
  const b = deterministicSha256Order(items, {
    seedDomain: "g5-test",
    namespace: "trial-1",
    key: String,
  });
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), items);
});

test("G5 rank points use within-output ranks and average ties", () => {
  assert.deepEqual(
    rankPointsFromScores({ A: 100, B: 80, C: 60, D: 40, E: 20 }),
    { A: 5, B: 4, C: 3, D: 2, E: 1 },
  );
  assert.deepEqual(
    rankPointsFromScores({ A: 90, B: 90, C: 50, D: 10, E: 10 }),
    { A: 4.5, B: 4.5, C: 3, D: 1.5, E: 1.5 },
  );
});

test("G5 D1 and D3 interpretation bands are predeclared", () => {
  assert.equal(classifyD1(2), "weak_or_inconclusive");
  assert.equal(classifyD1(3), "suggestive");
  assert.equal(classifyD1(4), "strong");
  assert.equal(classifyD3Ordinal(3), "inconclusive");
  assert.equal(classifyD3Ordinal(4), "suggestive");
  assert.equal(classifyD3Ordinal(5), "detectable_reference");
  assert.equal(classifyCleanNegativeControl(3), "no_detectable_negative_control_signal");
  assert.equal(classifyCleanNegativeControl(4), "negative_control_watch");
  assert.equal(classifyCleanNegativeControl(5), "negative_control_warning");
});

test("G5 clean-control combined warning cannot be selected after outcomes", () => {
  assert.equal(emitsNegativeControlFailureSignal(5, 0), true);
  assert.equal(emitsNegativeControlFailureSignal(0, 5), true);
  assert.equal(emitsNegativeControlFailureSignal(4, 4), true);
  assert.equal(emitsNegativeControlFailureSignal(4, 3), false);
  assert.equal(emitsNegativeControlFailureSignal(3, 4), false);
});

test("G5 frozen packet verifies against G3-v2 and G4-v2 before final life", () => {
  const result = verifyG5DiagnosticsFreeze();
  assert.equal(result.primaryD1, "normalized");
  assert.deepEqual(result.d3PrimaryOrdinals, [3, 6]);
  assert.deepEqual(result.d3PrimaryHorizons, [6, 10]);
  assert.equal(result.d2MinimumMeanings, 8);
});
