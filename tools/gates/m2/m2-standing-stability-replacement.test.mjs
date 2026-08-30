import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateM2StandingReplacement,
  evaluateM2StandingStability,
  M2_STANDING_STABILITY_REPLACEMENT,
} from "./m2-standing-stability-replacement.mjs";

const THREADS = Object.freeze([
  ["thr_a", "FIN-A", "accept", "high"],
  ["thr_b", "FIN-B", "refuse", "mixed"],
  ["thr_c", "FIN-C", "refuse", "low"],
  ["thr_d", "FIN-D", "refuse", "mixed"],
  ["thr_e", "FIN-E", "accept", "high"],
]);

function planThreads() {
  return THREADS.map(([threadId, fibreIdentityNumber, proposedAction, participationFit], index) => ({
    threadId,
    fibreIdentityNumber,
    canonicalCapsuleDigest: `sha256:capsule${index}`,
    modelInputDigest: `sha256:input${index}`,
    responseSchemaHash: `sha256:schema${index}`,
    canonicalIdentityMemoryRefs: [`ias_${index}`, `mem_${index}`],
    expected: { proposedAction, participationFit },
  }));
}

function factorEvidence(refs) {
  return {
    identityAlignment: { evidenceRefs: refs },
    individualizedAdvantage: { evidenceRefs: [] },
    interchangeability: { evidenceRefs: [] },
    obligationsAndOpportunityCost: { evidenceRefs: [] },
  };
}

function stabilityTrial(planned, { exact = true, grounded = true } = {}) {
  return {
    proposedAction: exact ? planned.expected.proposedAction : "negotiate",
    participationFit: exact ? planned.expected.participationFit : "mixed",
    factors: factorEvidence(grounded ? [planned.canonicalIdentityMemoryRefs[0]] : ["request:objective"]),
  };
}

function passingStabilityResults(plan) {
  return plan.map((planned) => ({
    threadId: planned.threadId,
    fibreIdentityNumber: planned.fibreIdentityNumber,
    trials: [
      stabilityTrial(planned),
      stabilityTrial(planned),
      stabilityTrial(planned),
      stabilityTrial(planned),
      stabilityTrial(planned, { exact: false, grounded: false }),
    ],
  }));
}

function passingReplacementResults(plan) {
  return plan.map((planned) => ({
    threadId: planned.threadId,
    fibreIdentityNumber: planned.fibreIdentityNumber,
    provider: "google",
    modelId: "gemini-3.6-flash",
    canonicalCapsuleDigest: planned.canonicalCapsuleDigest,
    modelInputDigest: planned.modelInputDigest,
    responseSchemaHash: planned.responseSchemaHash,
    outputValidated: true,
    worldUnchanged: true,
  }));
}

test("#41 prospectus freezes exactly thirty substantive calls without provider shopping", () => {
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.threadCount, 5);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.stability.trialsPerThread, 5);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.replacement.trialsPerThread, 1);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.plannedSubstantiveCalls, 30);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.providerCallsAtPreflight, 0);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.scenarioSearchAfterProvider, false);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.rerunAfterSubstantiveResult, false);
  assert.equal(M2_STANDING_STABILITY_REPLACEMENT.providerShoppingAfterProvider, false);
});

test("stability passes only when every Thread reaches four of five exact and grounded trials", () => {
  const plan = planThreads();
  const result = evaluateM2StandingStability({
    planThreads: plan,
    resultThreads: passingStabilityResults(plan),
  });
  assert.equal(result.passed, true);
  assert.equal(result.threads.length, 5);
  for (const thread of result.threads) {
    assert.equal(thread.exactTopLevelMatches, 4);
    assert.equal(thread.groundedTrials, 4);
    assert.equal(thread.passed, true);
  }
});

test("stability fails closed when one Thread reaches only three exact top-level matches", () => {
  const plan = planThreads();
  const results = passingStabilityResults(plan);
  results[0].trials[3] = stabilityTrial(plan[0], { exact: false, grounded: true });
  const result = evaluateM2StandingStability({ planThreads: plan, resultThreads: results });
  assert.equal(result.passed, false);
  assert.equal(result.threads.find((thread) => thread.threadId === "thr_a").exactTopLevelMatches, 3);
});

test("stability fails closed when structured results are not grounded in canonical identity or memory", () => {
  const plan = planThreads();
  const results = passingStabilityResults(plan);
  results[1].trials[3] = stabilityTrial(plan[1], { exact: true, grounded: false });
  const result = evaluateM2StandingStability({ planThreads: plan, resultThreads: results });
  assert.equal(result.passed, false);
  assert.equal(result.threads.find((thread) => thread.threadId === "thr_b").groundedTrials, 3);
});

test("replacement accepts a different provider judgment without requiring semantic equivalence", () => {
  const plan = planThreads();
  const results = passingReplacementResults(plan).map((result, index) => ({
    ...result,
    proposedAction: index % 2 === 0 ? "accept" : "refuse",
    participationFit: index % 2 === 0 ? "high" : "low",
  }));
  const evaluated = evaluateM2StandingReplacement({ planThreads: plan, results });
  assert.equal(evaluated.passed, true);
  assert.equal(evaluated.threads.every((thread) => thread.passed), true);
});

test("replacement fails closed on provider substitution or World mutation", () => {
  const plan = planThreads();
  const results = passingReplacementResults(plan);
  results[2].provider = "openai";
  results[4].worldUnchanged = false;
  const evaluated = evaluateM2StandingReplacement({ planThreads: plan, results });
  assert.equal(evaluated.passed, false);
  assert.equal(evaluated.threads.find((thread) => thread.threadId === "thr_c").passed, false);
  assert.equal(evaluated.threads.find((thread) => thread.threadId === "thr_e").passed, false);
});

test("evaluators reject missing or duplicate Thread result sets instead of averaging them away", () => {
  const plan = planThreads();
  const stability = passingStabilityResults(plan).slice(0, 4);
  assert.throws(
    () => evaluateM2StandingStability({ planThreads: plan, resultThreads: stability }),
    /Thread set mismatch/,
  );

  const replacement = passingReplacementResults(plan);
  replacement[4] = { ...replacement[3] };
  assert.throws(
    () => evaluateM2StandingReplacement({ planThreads: plan, results: replacement }),
    /duplicate Thread/,
  );
});
