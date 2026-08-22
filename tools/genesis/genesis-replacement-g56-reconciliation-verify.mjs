#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const G2_PATH = "artifacts/validation/m2-pr39/replacement-v1/results/rg2-cohort-genome-specificity-ceiling-v1.json";
const G5_PATH = "artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json";
const G6_PATH = "artifacts/validation/m2-pr39/g/protocol/g6-verdict-freeze-v1.json";
const RECONCILIATION_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg5-g6-fresh-g2-reconciliation-v1.json";

const EXPECTED_EDGES = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]];
const EXPECTED_G2_SCORES = [22, 24, 24, 22, 23];

function readRepoJson(relativePath) {
  return JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"));
}

export function verifyReplacementG56Reconciliation({
  g2 = readRepoJson(G2_PATH),
  g5 = readRepoJson(G5_PATH),
  g6 = readRepoJson(G6_PATH),
  reconciliation = readRepoJson(RECONCILIATION_PATH),
} = {}) {
  assert.equal(g2.verdict, "CLEAR");
  assert.equal(g2.usableCeilingForH, true);
  assert.equal(g2.detectablePairCount, 5);
  assert.equal(g2.everyGenomeCoveredByDetectablePair, true);
  assert.deepEqual(g2.pairSummaries.map((pair) => pair.correct), EXPECTED_G2_SCORES);
  assert.deepEqual(g2.pairSummaries.map((pair) => pair.detectable), [true, true, true, true, true]);
  assert.deepEqual(g2.pairSummaries.map((pair) => pair.band.label), [
    "strong_ceiling_signal",
    "strong_ceiling_signal",
    "strong_ceiling_signal",
    "strong_ceiling_signal",
    "strong_ceiling_signal",
  ]);

  const g5d3 = g5.diagnostics.D3_genome_propagation;
  assert.deepEqual(g5d3.measuredG2Pairs, EXPECTED_EDGES);
  assert.equal(g5d3.ordinalBands["5_correct_of_5"], "detectable_reference");
  assert.equal(g5d3.ordinalBands["4_correct_of_5"], "suggestive");
  assert.equal(g5d3.ordinalBands["0_to_3_correct_of_5"], "inconclusive");
  assert.ok(g5d3.g2CeilingConstraint.pair_3_4, "source G5 must retain the historical pair-3-4 limitation this amendment reconciles");

  const g6d3 = g6.diagnosticVerdictRules.D3_genome_propagation;
  assert.deepEqual(g6d3.g2DetectableCoreEdges, [[1, 2], [2, 3], [4, 5], [5, 1]]);
  assert.deepEqual(g6d3.g2MeasuredLowNonblockingEdge, [3, 4]);

  assert.equal(reconciliation.status, "frozen_pre_final_life_generation");
  assert.equal(reconciliation.preconditions.freshG2Verdict, "CLEAR");
  assert.equal(reconciliation.preconditions.freshG2DetectablePairs, 5);
  assert.equal(reconciliation.preconditions.freshG2EveryGenomeCovered, true);
  assert.equal(reconciliation.preconditions.replacementLifeGenerated, false);
  assert.equal(reconciliation.preconditions.replacementLifeOutputObserved, false);
  assert.equal(reconciliation.preconditions.finalLifeCognitionAuthorized, false);

  assert.equal(reconciliation.g5EffectiveReading.measurementChanged, false);
  assert.deepEqual(reconciliation.g5EffectiveReading.measuredG2Pairs, EXPECTED_EDGES);
  assert.deepEqual(reconciliation.g5EffectiveReading.freshG2CeilingConstraint.detectableMeasuredEdges, EXPECTED_EDGES);
  assert.deepEqual(reconciliation.g5EffectiveReading.freshG2CeilingConstraint.measuredLowNonblockingEdges, []);

  const effectiveD3 = reconciliation.g6D3EffectiveRule;
  assert.deepEqual(effectiveD3.g2DetectableCoreEdges, EXPECTED_EDGES);
  assert.deepEqual(effectiveD3.g2MeasuredLowNonblockingEdges, []);
  assert.equal(effectiveD3.directPropagationClearRequirement.eachOrdinalMinimumCorrectCoreEdges, 4);
  assert.equal(effectiveD3.directPropagationClearRequirement.atLeastOneOrdinalCorrectCoreEdges, 5);
  assert.equal(effectiveD3.cleanNegativeControlChanged, false);
  assert.equal(effectiveD3.lifeOnlyExposedInterpretationChanged, false);

  for (const [key, value] of Object.entries(reconciliation.unchangedAuthority)) {
    assert.equal(value, true, `${key} must remain unchanged`);
  }

  assert.equal(reconciliation.nonAdaptivity.freshG2WasPreLifeCalibration, true);
  assert.equal(reconciliation.nonAdaptivity.finalLifeOutcomeAvailableWhenRuleFrozen, false);
  assert.equal(reconciliation.nonAdaptivity.thresholdChosenFromFutureHOutcome, false);
  assert.equal(reconciliation.nonAdaptivity.weakFutureHOutcomeMayChangeThisRule, false);
  assert.equal(reconciliation.authorizationBoundary.thisAmendmentAuthorizesFinalLifeGeneration, false);
  assert.equal(reconciliation.authorizationBoundary.blockingGate, "Gate-G(2)");

  return {
    status: "CLEAR_REPLACEMENT_G56_RECONCILIATION_ZERO_CALL",
    g2PairScores: EXPECTED_G2_SCORES,
    detectableEdges: EXPECTED_EDGES,
    eachOrdinalMinimumCorrectCoreEdges: 4,
    atLeastOneOrdinalCorrectCoreEdges: 5,
    finalLifeCognitionAuthorized: false,
  };
}

function main() {
  if (!process.argv.includes("--verify")) {
    console.error("Usage: node tools/genesis/genesis-replacement-g56-reconciliation-verify.mjs --verify");
    process.exitCode = 2;
    return;
  }
  const result = verifyReplacementG56Reconciliation();
  console.log("PR39 REPLACEMENT G5/G6 RECONCILIATION: CLEAR — ZERO CALL");
  console.log(`Fresh G2 pair scores: ${result.g2PairScores.join(", ")}`);
  console.log("Fresh G2 topology: all 5 measured cycle edges detectable.");
  console.log(`Replacement D3 rule: both ordinals >=${result.eachOrdinalMinimumCorrectCoreEdges}/5; at least one ${result.atLeastOneOrdinalCorrectCoreEdges}/5.`);
  console.log("All non-topology G5/G6 authority: unchanged.");
  console.log("Final-life cognition: NOT AUTHORIZED.");
  console.log("Verifier made zero provider calls.");
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
