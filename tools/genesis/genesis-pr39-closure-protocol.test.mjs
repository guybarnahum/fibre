import assert from "node:assert/strict";
import test from "node:test";

import {
  PR39_CLOSURE_PROTOCOL_VERSION,
  PR39_FINAL_WORLD_SET_VERSION,
  loadPr39ClosurePrecommitment,
} from "./genesis-pr39-closure-protocol.mjs";

test("PR39 closure precommitment freezes five fresh Worlds before genome assignment", () => {
  const precommitment = loadPr39ClosurePrecommitment();
  assert.equal(precommitment.protocol.protocolVersion, PR39_CLOSURE_PROTOCOL_VERSION);
  assert.equal(precommitment.worldSet.worldSetVersion, PR39_FINAL_WORLD_SET_VERSION);
  assert.equal(precommitment.worldSet.genomeAssignmentStatus, "UNASSIGNED");
  assert.equal(precommitment.protocol.finalGenomeAssignmentStatus, "UNASSIGNED");
  assert.equal(precommitment.protocol.generationAuthorized, false);
  assert.equal(precommitment.worlds.length, 5);
  assert.deepEqual(precommitment.worlds.map((item) => item.label), [
    "Sapporo",
    "Kochi",
    "Malmö",
    "Valparaíso",
    "Wellington",
  ]);
  assert.match(precommitment.precommitmentDigest, /^sha256:[0-9a-f]{64}$/u);
  for (const item of precommitment.worlds) {
    assert.match(item.worldDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(item.world.worldAuthorship.familiarityProbe, null);
    assert.match(item.world.worldAuthorship.abstractionMethod, /before any final-cohort genome assignment/iu);
  }
});

test("PR39 convergent pair is evaluator-only and does not require convergence", () => {
  const { protocol } = loadPr39ClosurePrecommitment();
  assert.deepEqual(protocol.convergentPair.slots, [1, 2]);
  assert.deepEqual(protocol.convergentPair.labels, ["Sapporo", "Kochi"]);
  assert.equal(protocol.convergentPair.mustNotEnterWorldSpecOrGenerationPrompt, true);
  assert.equal(protocol.convergentPair.convergenceRequiredInOutput, false);
  assert.notEqual(protocol.convergentPair.routeA, protocol.convergentPair.routeB);
});

test("PR39 D1-D5 rules are frozen before output and preserve weak-result interpretations", () => {
  const { protocol } = loadPr39ClosurePrecommitment();
  assert.deepEqual(Object.keys(protocol.diagnostics), ["D1", "D2", "D3", "D4", "D5"]);
  assert.deepEqual(protocol.diagnostics.D1.conditions, ["raw", "setting_style_normalized"]);
  assert.match(protocol.diagnostics.D1.interpretation.closureReading, /default to redesign rather than resampling/iu);
  assert.match(protocol.diagnostics.D3.interpretation.negativeControlFailure, /blocks a clean genome-propagation reading/iu);
  assert.equal(protocol.diagnostics.D4.interpretation.noQuota, true);
  assert.match(protocol.diagnostics.D5.interpretation.cohortOverreachConcern, /at least 4\/5 Threads have zero/iu);
  assert.ok(protocol.globalInterpretationRules.some((item) => /No threshold may be changed after final output is read/iu.test(item)));
  assert.ok(protocol.globalInterpretationRules.some((item) => /never silently replaced/iu.test(item)));
});

test("PR39 rater discipline excludes generation authority and does not pretend replicate-family independence", () => {
  const { protocol } = loadPr39ClosurePrecommitment();
  const excluded = new Set(protocol.raterDiscipline.ratersNeverReceive);
  for (const item of [
    "world_specs",
    "genome_assignment_labels",
    "compiler_prompts",
    "treatment_labels",
    "analysis_strata",
    "build_diagnostics",
    "thread_ids",
    "genesis_ids",
  ]) {
    assert.ok(excluded.has(item), `missing rater exclusion ${item}`);
  }
  assert.equal(protocol.raterDiscipline.replicatesPerTrial, 3);
  assert.equal(protocol.raterDiscipline.majorityVotesRequired, 2);
  assert.match(protocol.raterDiscipline.independenceCaveat, /not independent model families/iu);
});
