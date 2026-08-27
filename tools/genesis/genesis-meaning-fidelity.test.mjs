import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMeaningFidelityPlan,
  buildSemanticReviewInput,
  scoreMeaningFidelity,
} from "./genesis-meaning-fidelity.mjs";

function idealTrials(plan) {
  return plan.trials.map((trial) => ({
    trialId: trial.trialId,
    output: {
      outcome: trial.expectedOutcome,
      summary: ["durable_meaning", "revised"].includes(trial.expectedOutcome)
        ? "A grounded interpretation long enough for characterization."
        : null,
      parts: [],
    },
  }));
}

test("meaning-fidelity plan is balanced and hides control labels from cognition and review", () => {
  const plan = buildMeaningFidelityPlan();
  assert.equal(plan.trialCount, 12);
  assert.equal(plan.generationCalls, 12);
  assert.equal(plan.semanticReviewCalls, 1);
  assert.equal(plan.scientificRetries, 0);
  assert.equal(plan.trials.filter((item) => item.mode === "initial").length, 6);
  assert.equal(plan.trials.filter((item) => item.mode === "reinterpretation").length, 6);

  for (const trial of plan.trials) {
    const input = JSON.stringify(trial.input);
    assert.doesNotMatch(input, /semanticClass|expectedOutcome|decisionRule/u);
  }

  const review = JSON.stringify(buildSemanticReviewInput(plan, idealTrials(plan)));
  assert.doesNotMatch(review, /semanticClass|expectedOutcome|pairId|decisionRule/u);
});

test("meaning-fidelity scoring requires no-inflation and both reinterpretation paths", () => {
  const plan = buildMeaningFidelityPlan();
  const trials = idealTrials(plan);
  const reviews = plan.trials.map((trial) => ({
    trialId: trial.trialId,
    fidelity: "pass",
    issue: "none",
    reason: "The output remains proportionate to the supplied evidence.",
  }));
  const score = scoreMeaningFidelity(plan, trials, reviews);
  assert.equal(score.classification, "FIDELITY_EXERCISED");
  assert.equal(score.passesDevelopmentCriterion, true);
  assert.equal(score.mundaneNoMeaning, 2);
  assert.equal(score.negativeDurableMeaning, 2);
  assert.equal(score.ambiguousDurableMeaning, 2);
  assert.equal(score.reinterpretationExpected, 6);
  assert.equal(score.unchangedObserved, 3);
  assert.equal(score.revisedObserved, 3);
  assert.equal(score.semanticFidelityPass, 12);

  const inflated = reviews.map((item, index) => index === 0
    ? { ...item, fidelity: "fail", issue: "inflated_mundane", reason: "The routine was inflated into significance." }
    : item);
  const failed = scoreMeaningFidelity(plan, trials, inflated);
  assert.equal(failed.passesDevelopmentCriterion, false);
  assert.equal(failed.forbiddenSemanticFailures, 1);
});
