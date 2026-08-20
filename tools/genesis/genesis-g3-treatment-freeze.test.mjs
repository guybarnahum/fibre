import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildG3WholeGenomeExposure,
  deriveG3PassBAssignment,
  g3ObservedCallArithmetic,
  verifyG3TreatmentFreeze,
} from "./genesis-g3-treatment-freeze.mjs";

function memory(formationMode) {
  return { formationMode };
}

test("G3 frozen treatment packet verifies exact 30-call / 33.3% arithmetic", () => {
  const { protocol, protocolDigest } = verifyG3TreatmentFreeze();
  assert.equal(protocol.cohort.threadCount, 5);
  assert.equal(protocol.cohort.passBCallsPerThread, 6);
  assert.equal(protocol.cohort.eligiblePassBCallCount, 30);
  assert.equal(protocol.directTreatmentArithmetic.lifePlusGenomeCalls, 10);
  assert.equal(protocol.directTreatmentArithmetic.lifeOnlyCalls, 20);
  assert.equal(protocol.directTreatmentArithmetic.lifePlusGenomeProportion, 1 / 3);
  assert.deepEqual(protocol.assignment.treatmentOrdinals, [3, 6]);
  assert.deepEqual(protocol.assignment.cleanControlOrdinals, [1, 2]);
  assert.deepEqual(protocol.assignment.conditionalPropagationOrdinals, [4, 5]);
  assert.match(protocolDigest, /^sha256:[0-9a-f]{64}$/);
});

test("G3 derives clean, treatment, and exposed strata only from frozen position plus admitted prior-memory mode", () => {
  assert.deepEqual(
    deriveG3PassBAssignment({ cohortSlot: 1, callOrdinal: 1, priorMemories: [] }),
    {
      assignmentRef: "pr39_g3_slot_1_pass_b_1",
      cohortSlot: 1,
      callOrdinal: 1,
      historyEpisodeHorizon: 4,
      formationMode: "life_only",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_only_unexposed",
      genomeExposurePolicyRef: null,
    },
  );

  const treatment = deriveG3PassBAssignment({ cohortSlot: 1, callOrdinal: 3, priorMemories: [memory("life_only")] });
  assert.equal(treatment.historyEpisodeHorizon, 6);
  assert.equal(treatment.formationMode, "life_plus_genome");
  assert.equal(treatment.analysisStratum, "life_plus_genome");
  assert.equal(treatment.genomeExposurePolicyRef, "pr39-g3-whole-genome-exposure-v1");

  const stillClean = deriveG3PassBAssignment({ cohortSlot: 1, callOrdinal: 4, priorMemories: [memory("life_only")] });
  assert.equal(stillClean.formationMode, "life_only");
  assert.equal(stillClean.analysisStratum, "life_only_unexposed");

  const exposed = deriveG3PassBAssignment({ cohortSlot: 1, callOrdinal: 4, priorMemories: [memory("life_plus_genome")] });
  assert.equal(exposed.formationMode, "life_only");
  assert.equal(exposed.priorTreatmentMemoryExposure, true);
  assert.equal(exposed.analysisStratum, "life_only_exposed");
});

test("G3 exposed stratum minimum is frozen at three early treatment memories / six follow-up calls", () => {
  const clear = g3ObservedCallArithmetic({ earlyTreatmentRememberedBySlot: [true, true, true, false, false] });
  assert.deepEqual(clear.callCounts, {
    life_only_unexposed: 14,
    life_only_exposed: 6,
    life_plus_genome: 10,
  });
  assert.equal(clear.exposedMinimumMet, true);
  assert.equal(clear.onFailure, null);

  const hold = g3ObservedCallArithmetic({ earlyTreatmentRememberedBySlot: [true, false, true, false, false] });
  assert.deepEqual(hold.callCounts, {
    life_only_unexposed: 16,
    life_only_exposed: 4,
    life_plus_genome: 10,
  });
  assert.equal(hold.exposedMinimumMet, false);
  assert.equal(hold.onFailure, "HOLD_D3_THREE_STRATUM_INTERPRETATION_PRESERVE_COHORT_NO_REGENERATION");
});

test("G3 treatment exposes the complete frozen six-locus genome in ordinal order", () => {
  const genomeBundle = JSON.parse(readFileSync("artifacts/validation/m2-pr39/g/genomes/genome-g2-04.json", "utf8"));
  const exposure = buildG3WholeGenomeExposure({ genomeBundle });
  assert.deepEqual(exposure.policy, { kind: "whole_genome", k: null });
  assert.equal(exposure.genomeRef, genomeBundle.header.genomeId);
  assert.equal(exposure.genomeDigest, genomeBundle.genomeDigest);
  assert.equal(exposure.totalLoci, 6);
  assert.deepEqual(exposure.loci.map((locus) => locus.ordinal), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(exposure.loci.map((locus) => locus.value), [...genomeBundle.loci].sort((a, b) => a.ordinal - b.ordinal).map((locus) => locus.value));
});
