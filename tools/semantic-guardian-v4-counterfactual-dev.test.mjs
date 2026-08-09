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
        status: "grounded",
        effect: action === "accept" ? "supports_fit" : "opposes_fit",
      },
    },
  };
}

test("counterfactual development pairs isolate semantic-state meaning", () => {
  const cases = buildCounterfactualDevelopmentCases();
  assert.equal(cases.length, 4);
  assert.equal(validateCounterfactualPairs(cases), true);

  const minaSupportive = cases.find((item) => item.id === "counterfactual_dev_mina_supportive_state");
  const minaOpposing = cases.find((item) => item.id === "counterfactual_dev_mina_opposing_state");
  assert.ok(minaSupportive);
  assert.ok(minaOpposing);
  assert.equal(minaSupportive.capsule.semanticState.length, 1);
  assert.equal(minaOpposing.capsule.semanticState.length, 1);
  assert.equal(minaSupportive.capsule.semanticState[0].domain, minaOpposing.capsule.semanticState[0].domain);
  assert.equal(minaSupportive.capsule.semanticState[0].dimension, minaOpposing.capsule.semanticState[0].dimension);
  assert.notEqual(minaSupportive.capsule.semanticState[0].state, minaOpposing.capsule.semanticState[0].state);

  const supportiveWithoutState = { ...structuredClone(minaSupportive.capsule), semanticState: [] };
  const opposingWithoutState = { ...structuredClone(minaOpposing.capsule), semanticState: [] };
  assert.deepEqual(supportiveWithoutState, opposingWithoutState);
});

test("counterfactual development requires downstream judgment to change", () => {
  const cases = buildCounterfactualDevelopmentCases();
  const passing = [
    { caseId: "counterfactual_dev_mina_supportive_state", output: output("accept", "high") },
    { caseId: "counterfactual_dev_mina_opposing_state", output: output("negotiate", "mixed") },
    { caseId: "counterfactual_dev_amara_supportive_state", output: output("accept", "high") },
    { caseId: "counterfactual_dev_amara_opposing_state", output: output("refuse", "low") },
  ];
  assert.deepEqual(evaluateCounterfactualDevelopment(cases, passing), []);

  const unchanged = passing.map((item) => item.caseId === "counterfactual_dev_mina_opposing_state"
    ? { ...item, output: output("accept", "high") }
    : item);
  assert.ok(evaluateCounterfactualDevelopment(cases, unchanged).some((failure) => /did not change downstream judgment/.test(failure)));
});

test("counterfactual development rejects state-presence versus state-absence pairs", () => {
  const cases = buildCounterfactualDevelopmentCases();
  const malformed = structuredClone(cases);
  malformed[0].capsule.semanticState = [];
  assert.throws(() => validateCounterfactualPairs(malformed), /both sides must carry explicit semantic state/);
});
