import assert from "node:assert/strict";
import test from "node:test";

import { exactBinomialTailHalf } from "./genesis-rich-life-e2-n1.mjs";
import {
  E2_N2_ATTRIBUTION_THRESHOLDS,
  E2_N2_MIN_REMEMBERED,
  E2_N2_PASS_B_PROMPT,
  E2_N2_TRIAL_COUNT,
  buildN2TrialPlan,
  scoreN2Trials,
} from "./genesis-rich-life-e2-n2.mjs";
import { buildE2V2A0Preflight } from "./genesis-rich-life-e2-v2-a0.mjs";

function syntheticTrials({ remembered, correctRemembered, correctNoMemory = 0 }) {
  const trials = [];
  for (let index = 0; index < E2_N2_TRIAL_COUNT; index += 1) {
    const isRemembered = index < remembered;
    let correct = false;
    if (isRemembered) correct = index < correctRemembered;
    else correct = index - remembered < correctNoMemory;
    trials.push({
      correct,
      passB: { output: { outcome: isRemembered ? "remembered" : "not_remembered" } },
    });
  }
  return trials;
}

test("N2 freezes constitutive Pass-B semantics, balanced assignments, source generation, and attainable two-part scoring before model use", () => {
  assert.match(E2_N2_PASS_B_PROMPT, /Form the autobiographical memory this Thread retains/);
  assert.match(E2_N2_PASS_B_PROMPT, /priorMemories may be empty; that is normal/);
  assert.match(E2_N2_PASS_B_PROMPT, /not_remembered is fully legal; do not force a memory/);
  assert.doesNotMatch(E2_N2_PASS_B_PROMPT, /Decide whether one or more concrete episodes.*are autobiographically remembered/s);

  const plan = buildN2TrialPlan();
  assert.equal(plan.length, 18);
  assert.deepEqual(
    Object.fromEntries(["A", "B"].map((label) => [label, plan.filter((trial) => trial.truthCandidate === label).length])),
    { A: 9, B: 9 },
  );
  assert.deepEqual(
    Object.fromEntries(["left", "right"].map((side) => [side, plan.filter((trial) => trial.candidateASide === side).length])),
    { left: 9, right: 9 },
  );
  for (const worldId of ["E2-V1", "E2-V2"]) {
    for (const runOrdinal of [1, 2, 3]) {
      assert.equal(plan.filter((trial) => trial.worldId === worldId && (trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal) === runOrdinal).length, 3);
    }
  }

  for (const [mText, threshold] of Object.entries(E2_N2_ATTRIBUTION_THRESHOLDS)) {
    const m = Number(mText);
    assert.ok(exactBinomialTailHalf(m, threshold) <= 0.05);
    assert.ok(exactBinomialTailHalf(m, threshold - 1) > 0.05);
  }
  assert.equal(E2_N2_MIN_REMEMBERED, 10);

  const tooFewMemories = scoreN2Trials(syntheticTrials({ remembered: 9, correctRemembered: 9, correctNoMemory: 9 }));
  assert.equal(tooFewMemories.memoryFormation.criterionMet, false);
  assert.equal(tooFewMemories.gateFDownstreamFertilityMet, false);

  const enoughButChanceWeak = scoreN2Trials(syntheticTrials({ remembered: 10, correctRemembered: 8, correctNoMemory: 8 }));
  assert.equal(enoughButChanceWeak.memoryFormation.criterionMet, true);
  assert.equal(enoughButChanceWeak.conditionalAttribution.criterionMet, false);
  assert.equal(enoughButChanceWeak.gateFDownstreamFertilityMet, false);

  const minimumPass = scoreN2Trials(syntheticTrials({ remembered: 10, correctRemembered: 9 }));
  assert.equal(minimumPass.memoryFormation.criterionMet, true);
  assert.equal(minimumPass.conditionalAttribution.minimumCorrectAtObservedM, 9);
  assert.equal(minimumPass.conditionalAttribution.criterionMet, true);
  assert.equal(minimumPass.gateFDownstreamFertilityMet, true);

  const fullMemoryPass = scoreN2Trials(syntheticTrials({ remembered: 18, correctRemembered: 13 }));
  assert.equal(fullMemoryPass.conditionalAttribution.minimumCorrectAtObservedM, 13);
  assert.equal(fullMemoryPass.gateFDownstreamFertilityMet, true);

  const v2 = buildE2V2A0Preflight();
  assert.equal(v2.sourceFree, true);
  assert.equal(v2.firstModelUseBurnsWorld, true);
  assert.equal(v2.lives, 3);
  assert.equal(v2.allCompletedLivesMustFlowIntoN2, true);
  assert.equal(v2.sourceSelectionAfterGeneration, false);
  assert.equal(v2.seeds.length, 3);
});
