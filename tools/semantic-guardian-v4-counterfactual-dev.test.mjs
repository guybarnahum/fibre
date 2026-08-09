import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCounterfactualDevelopmentCases,
  evaluateCounterfactualDevelopment,
  validateCounterfactualPairs,
} from "./semantic-guardian-v4-counterfactual-dev.mjs";

function output(action, fit) {
  return {
    proposedAction: action,
    participationFit: fit,
    rationale: "test",
    factors: {
      semanticStateImpact: {
        status: fit === "high" ? "unresolved" : "grounded",
        effect: fit === "high" ? "unresolved" : "opposes_fit",
      },
    },
  };
}

test("counterfactual development pairs isolate semantic state", () => {
  const cases = buildCounterfactualDevelopmentCases();
  assert.equal(cases.length, 4);
  assert.equal(validateCounterfactualPairs(cases), true);

  const minaBaseline = cases.find((item) => item.id === "counterfactual_dev_mina_baseline");
  assert.ok(minaBaseline);
  assert.doesNotMatch(minaBaseline.capsule.statedNeed, /current availability/i);
  assert.doesNotMatch(minaBaseline.capsule.acceptanceCriteria, /current availability/i);
});

test("counterfactual development requires downstream judgment to change", () => {
  const cases = buildCounterfactualDevelopmentCases();
  const passing = [
    { caseId: "counterfactual_dev_mina_baseline", output: output("accept", "high") },
    { caseId: "counterfactual_dev_mina_with_state", output: output("negotiate", "mixed") },
    { caseId: "counterfactual_dev_amara_baseline", output: output("accept", "high") },
    { caseId: "counterfactual_dev_amara_with_state", output: output("refuse", "low") },
  ];
  assert.deepEqual(evaluateCounterfactualDevelopment(cases, passing), []);

  const unchanged = passing.map((item) => item.caseId === "counterfactual_dev_mina_with_state"
    ? { ...item, output: output("accept", "high") }
    : item);
  assert.ok(evaluateCounterfactualDevelopment(cases, unchanged).some((failure) => /did not change downstream judgment/.test(failure)));
});
