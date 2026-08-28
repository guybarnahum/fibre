import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson } from "#services/world-kernel/src/persistence-common.mjs";
import { projectPassBInputForCognition } from "#services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  buildGenomeMemorySeamPlan,
  scoreGenomeMemorySeam,
} from "./genesis-genome-memory-seam.mjs";

function resultFor(trial, episodeId) {
  return {
    trialId: trial.trialId,
    output: {
      outcome: "remembered",
      episodeRefs: [episodeId],
      rememberedContent: "A bounded remembered episode for deterministic scoring.",
      uncertainty: [],
    },
  };
}

test("genome-memory-seam plan is paired, counterbalanced and differs only by genome exposure within each pair", () => {
  const plan = buildGenomeMemorySeamPlan();
  assert.equal(plan.pairCount, 8);
  assert.equal(plan.trialCount, 16);
  assert.equal(plan.scientificRetries, 0);
  assert.equal(plan.maxMechanicalGenomeCopyRetriesPerTrial, 1);
  assert.equal(plan.maximumPhysicalProviderAttempts, 32);
  assert.equal(plan.taskMatchedPositiveControl.promptHash, plan.promptHash);

  const horizonCounts = new Map();
  let alphaFirst = 0;
  let betaFirst = 0;
  for (let pairOrdinal = 1; pairOrdinal <= 8; pairOrdinal += 1) {
    const pair = plan.trials.filter((trial) => trial.pairOrdinal === pairOrdinal);
    assert.equal(pair.length, 2);
    assert.deepEqual(new Set(pair.map((trial) => trial.treatment)), new Set(["alpha", "beta"]));
    if (pair[0].treatment === "alpha") alphaFirst += 1;
    else betaFirst += 1;
    horizonCounts.set(pair[0].historyHorizon, (horizonCounts.get(pair[0].historyHorizon) ?? 0) + 1);

    const left = projectPassBInputForCognition(pair[0].input);
    const right = projectPassBInputForCognition(pair[1].input);
    assert.notDeepEqual(left.genomeExposure, right.genomeExposure);
    assert.deepEqual(
      { ...left, genomeExposure: null },
      { ...right, genomeExposure: null },
      `pair ${pairOrdinal} must match outside genome exposure`,
    );

    for (const cognition of [left, right]) {
      const json = canonicalJson(cognition);
      for (const forbidden of ["expectedAnchorEpisodeId", "anchorTemporalOrder", "treatmentOrder", "decisionRule", "\"treatment\""]) {
        assert.equal(json.includes(forbidden), false);
      }
    }
  }

  assert.equal(alphaFirst, 4);
  assert.equal(betaFirst, 4);
  assert.deepEqual(
    Object.fromEntries([...horizonCounts.entries()].sort((a, b) => a[0] - b[0])),
    { 4: 2, 6: 2, 8: 2, 10: 2 },
  );
});

test("genome-memory-seam scoring distinguishes large causal separation, context-only and unresolved mixed effects", () => {
  const plan = buildGenomeMemorySeamPlan();

  const ideal = plan.trials.map((trial) => resultFor(trial, trial.expectedAnchorEpisodeId));
  const causal = scoreGenomeMemorySeam(plan, ideal);
  assert.equal(causal.classification, "BEHAVIORALLY_CAUSAL");
  assert.equal(causal.directionalPairCount, 8);
  assert.equal(causal.reversePairCount, 0);

  const contextOnly = [];
  for (let pairOrdinal = 1; pairOrdinal <= 8; pairOrdinal += 1) {
    const pair = plan.trials.filter((trial) => trial.pairOrdinal === pairOrdinal);
    const alpha = pair.find((trial) => trial.treatment === "alpha");
    for (const trial of pair) contextOnly.push(resultFor(trial, alpha.expectedAnchorEpisodeId));
  }
  const noResolvedEffect = scoreGenomeMemorySeam(plan, contextOnly);
  assert.equal(noResolvedEffect.classification, "CONTEXT_ONLY");
  assert.equal(noResolvedEffect.directionalPairCount, 0);
  assert.equal(noResolvedEffect.reversePairCount, 0);

  const mixed = [];
  for (let pairOrdinal = 1; pairOrdinal <= 8; pairOrdinal += 1) {
    const pair = plan.trials.filter((trial) => trial.pairOrdinal === pairOrdinal);
    const alpha = pair.find((trial) => trial.treatment === "alpha");
    for (const trial of pair) {
      mixed.push(resultFor(
        trial,
        pairOrdinal <= 4 ? trial.expectedAnchorEpisodeId : alpha.expectedAnchorEpisodeId,
      ));
    }
  }
  const unresolved = scoreGenomeMemorySeam(plan, mixed);
  assert.equal(unresolved.classification, "INCONCLUSIVE");
  assert.equal(unresolved.directionalPairCount, 4);
});
