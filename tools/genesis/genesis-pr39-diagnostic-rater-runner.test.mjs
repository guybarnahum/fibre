import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalD3Cell,
  exactBinomialTail,
  majorityChoice,
  median,
  selectedChoiceIndex,
  spearmanRho,
} from "./genesis-pr39-diagnostic-rater-runner.mjs";

test("PR39 diagnostic scoring primitives preserve frozen majority/statistical semantics", () => {
  assert.equal(majorityChoice(["A", "B", "A"]), "A");
  assert.equal(majorityChoice(["A", "B", "C"]), null);

  assert.equal(median([2, -1, 0]), 0);
  assert.equal(median([2, -1, 0, 1]), 0.5);

  assert.equal(spearmanRho([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(spearmanRho([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(spearmanRho([1, 1, 1], [3, 2, 1]), 0);

  assert.ok(Math.abs(exactBinomialTail(4, 5, 0.2) - 0.00672) < 1e-12);

  const trial = { ordinal: 1, choiceOrder: [2, 0, 4, 1, 3] };
  assert.equal(selectedChoiceIndex(trial, "A"), 2);
  assert.equal(selectedChoiceIndex(trial, "D"), 1);

  assert.equal(canonicalD3Cell("life_only_unexposed"), "life_only_unexposed");
  assert.equal(canonicalD3Cell("life_plus_genome"), "life_plus_genome");
  assert.equal(canonicalD3Cell("life_only_exposed"), "later_life_only_potentially_contaminated");
  assert.equal(canonicalD3Cell("later_life_only_potentially_contaminated"), "later_life_only_potentially_contaminated");
});
