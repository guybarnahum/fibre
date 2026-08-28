import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReinterpretationRestraintPlan,
  scoreReinterpretationRestraint,
} from "./genesis-reinterpretation-restraint.mjs";

test("reinterpretation-restraint plan is fresh, paired, hidden-label and quota-free", () => {
  const plan = buildReinterpretationRestraintPlan();
  assert.equal(plan.trialCount, 8);
  assert.equal(plan.matchedPairCount, 4);
  assert.equal(plan.scientificRetries, 0);
  assert.equal(plan.decisionRule.unchangedMinimum, 3);
  assert.equal(plan.decisionRule.revisedMinimum, 3);
  assert.equal(plan.decisionRule.matchedPairSeparationMinimum, 3);
  assert.equal(plan.decisionRule.requireBothOutcomes, true);

  const pairs = new Map();
  for (const trial of plan.trials) {
    const cognition = JSON.stringify(trial.input);
    assert.equal(cognition.includes("expectedOutcome"), false);
    assert.equal(cognition.includes("decisionRule"), false);
    const pair = pairs.get(trial.pairId) ?? [];
    pair.push(trial);
    pairs.set(trial.pairId, pair);
  }
  assert.equal(pairs.size, 4);
  for (const pair of pairs.values()) {
    assert.equal(pair.length, 2);
    assert.deepEqual(new Set(pair.map((trial) => trial.expectedOutcome)), new Set(["unchanged", "revised"]));
    assert.equal(pair[0].input.targetMemory.memoryRef, pair[1].input.targetMemory.memoryRef);
    assert.equal(pair[0].input.targetMemory.rememberedContent, pair[1].input.targetMemory.rememberedContent);
    assert.deepEqual(pair[0].input.priorMeaning, pair[1].input.priorMeaning);
  }
});

test("reinterpretation-restraint scoring requires both unchanged and revised paths", () => {
  const plan = buildReinterpretationRestraintPlan();
  const ideal = plan.trials.map((trial) => ({
    trialId: trial.trialId,
    output: { outcome: trial.expectedOutcome },
  }));
  const pass = scoreReinterpretationRestraint(plan, ideal);
  assert.equal(pass.classification, "RESTRAINT_EXERCISED");
  assert.equal(pass.passesDevelopmentCriterion, true);
  assert.equal(pass.unchangedCorrect, 4);
  assert.equal(pass.revisedCorrect, 4);
  assert.equal(pass.matchedPairSeparation, 4);

  const saturated = plan.trials.map((trial) => ({
    trialId: trial.trialId,
    output: { outcome: "revised" },
  }));
  const fail = scoreReinterpretationRestraint(plan, saturated);
  assert.equal(fail.classification, "REVISION_SATURATED");
  assert.equal(fail.passesDevelopmentCriterion, false);
  assert.equal(fail.unchangedCorrect, 0);
  assert.equal(fail.revisedCorrect, 4);
});
