import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import {
  MEMORY_SELECTIVITY_CORRECTED_PROMPT,
  buildMemorySelectivityCorrectionPlan,
  scoreMemorySelectivityCorrection,
} from "./genesis-memory-selectivity-correction.mjs";

test("memory-selectivity correction plan is fresh, paired, hidden-label and quota-free", () => {
  const plan = buildMemorySelectivityCorrectionPlan();
  assert.equal(plan.trialCount, 12);
  assert.equal(plan.pairCount, 6);
  assert.equal(plan.isolatedPairCount, 3);
  assert.equal(plan.incrementalPairCount, 3);
  assert.equal(plan.baselineBinding.classification, "SATURATED");
  assert.equal(plan.scientificRetries, 0);
  assert.equal(plan.promptHash, "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a");
  assert.equal(GENESIS_LIFE_PASS_B_COGNITION_PROMPT, MEMORY_SELECTIVITY_CORRECTED_PROMPT);
  assert.match(MEMORY_SELECTIVITY_CORRECTED_PROMPT, /Autobiographical memory is selective/u);
  assert.match(MEMORY_SELECTIVITY_CORRECTED_PROMPT, /No quota applies/u);
  for (const trial of plan.trials) {
    const text = JSON.stringify(trial.input);
    assert.doesNotMatch(text, /ordinary_nonselection|strong_residue|expectedOutcome|controlClass/u);
  }
});

test("memory-selectivity correction scoring requires both retention and non-selection", () => {
  const plan = buildMemorySelectivityCorrectionPlan();
  const ideal = plan.trials.map((trial) => ({
    trialId: trial.trialId,
    outcome: trial.expectedOutcome,
  }));
  const passing = scoreMemorySelectivityCorrection(plan, ideal);
  assert.equal(passing.classification, "SELECTIVITY_EXERCISED");
  assert.equal(passing.passesDevelopmentCriterion, true);
  assert.equal(passing.residueRemembered, 6);
  assert.equal(passing.ordinaryNotRemembered, 6);
  assert.equal(passing.matchedPairSeparation, 6);
  assert.equal(passing.isolatedPairsSeparated, 3);
  assert.equal(passing.incrementalPairsSeparated, 3);

  const saturated = scoreMemorySelectivityCorrection(
    plan,
    plan.trials.map((trial) => ({ trialId: trial.trialId, outcome: "remembered" })),
  );
  assert.equal(saturated.classification, "SATURATED");
  assert.equal(saturated.passesDevelopmentCriterion, false);
});
