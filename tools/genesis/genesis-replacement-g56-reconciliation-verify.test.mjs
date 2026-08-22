import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { verifyReplacementG56Reconciliation } from "./genesis-replacement-g56-reconciliation-verify.mjs";

function readRepoJson(relativePath) {
  return JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"));
}

const reconciliationPath = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg5-g6-fresh-g2-reconciliation-v1.json";

test("replacement G5/G6 reconciliation binds all five fresh detectable edges and remains zero-call", () => {
  const result = verifyReplacementG56Reconciliation();
  assert.equal(result.status, "CLEAR_REPLACEMENT_G56_RECONCILIATION_ZERO_CALL");
  assert.deepEqual(result.g2PairScores, [22, 24, 24, 22, 23]);
  assert.deepEqual(result.detectableEdges, [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]);
  assert.equal(result.eachOrdinalMinimumCorrectCoreEdges, 4);
  assert.equal(result.atLeastOneOrdinalCorrectCoreEdges, 5);
  assert.equal(result.finalLifeCognitionAuthorized, false);
});

test("replacement G5/G6 reconciliation refuses a weakened post-G2 D3 threshold", () => {
  const reconciliation = readRepoJson(reconciliationPath);
  const weakened = structuredClone(reconciliation);
  weakened.g6D3EffectiveRule.directPropagationClearRequirement.eachOrdinalMinimumCorrectCoreEdges = 3;
  assert.throws(
    () => verifyReplacementG56Reconciliation({ reconciliation: weakened }),
    /3 !== 4/,
  );
});

test("replacement G5/G6 reconciliation refuses a pair-3-4 exemption", () => {
  const reconciliation = readRepoJson(reconciliationPath);
  const exempted = structuredClone(reconciliation);
  exempted.g6D3EffectiveRule.g2DetectableCoreEdges = [[1, 2], [2, 3], [4, 5], [5, 1]];
  assert.throws(
    () => verifyReplacementG56Reconciliation({ reconciliation: exempted }),
    /Expected values to be strictly deep-equal/,
  );
});
