import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson } from "#services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import {
  GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT,
  buildReinterpretationRestraintCorrectionPlan,
} from "./genesis-reinterpretation-restraint-correction.mjs";
import { scoreReinterpretationRestraint } from "./genesis-reinterpretation-restraint.mjs";

test("reinterpretation-restraint correction plan is fresh, paired, hidden-label and production-neutral", () => {
  const plan = buildReinterpretationRestraintCorrectionPlan();
  assert.equal(plan.trialCount, 8);
  assert.equal(plan.matchedPairCount, 4);
  assert.equal(plan.scientificRetries, 0);
  assert.notEqual(plan.candidatePromptHash, plan.baselinePromptHash);
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT.startsWith(GENESIS_PASS_C_REINTERPRETATION_PROMPT), true);
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT.includes(GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT), true);

  for (const trial of plan.trials) {
    const cognition = canonicalJson(trial.input);
    assert.equal(cognition.includes("expectedOutcome"), false);
    assert.equal(cognition.includes("decisionRule"), false);
  }

  const byPair = new Map();
  for (const trial of plan.trials) {
    const pair = byPair.get(trial.pairId) ?? [];
    pair.push(trial);
    byPair.set(trial.pairId, pair);
  }
  assert.equal(byPair.size, 4);
  for (const pair of byPair.values()) {
    assert.deepEqual(new Set(pair.map((item) => item.expectedOutcome)), new Set(["unchanged", "revised"]));
    assert.equal(pair[0].input.targetMemory.rememberedContent, pair[1].input.targetMemory.rememberedContent);
    assert.deepEqual(pair[0].input.priorMeaning, pair[1].input.priorMeaning);
  }
});

test("reinterpretation-restraint correction scoring still requires both conservative and responsive paths", () => {
  const plan = buildReinterpretationRestraintCorrectionPlan();
  const ideal = plan.trials.map((trial) => ({ trialId: trial.trialId, output: { outcome: trial.expectedOutcome } }));
  const score = scoreReinterpretationRestraint(plan, ideal);
  assert.equal(score.passesDevelopmentCriterion, true);
  assert.equal(score.unchangedCorrect, 4);
  assert.equal(score.revisedCorrect, 4);
  assert.equal(score.matchedPairSeparation, 4);

  const overConservative = plan.trials.map((trial) => ({ trialId: trial.trialId, output: { outcome: "unchanged" } }));
  assert.equal(scoreReinterpretationRestraint(plan, overConservative).passesDevelopmentCriterion, false);

  const overRevising = plan.trials.map((trial) => ({ trialId: trial.trialId, output: { outcome: "revised" } }));
  assert.equal(scoreReinterpretationRestraint(plan, overRevising).passesDevelopmentCriterion, false);
});
