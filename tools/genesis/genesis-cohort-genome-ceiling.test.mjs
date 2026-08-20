import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeG2Ceiling,
  verifyG2GenomeFreeze,
} from "./genesis-cohort-genome-ceiling.mjs";

function pairResult(pair, correct) {
  return {
    pair,
    raw: {
      result: {
        trials: 24,
        correct,
        accuracy: correct / 24,
        exactOneSidedBinomialP: 0.01,
      },
    },
  };
}

test("G2 frozen cohort packet verifies worlds, genomes, assignment, lineage replay, and pair balance", () => {
  const verified = verifyG2GenomeFreeze();

  assert.equal(verified.protocol.protocolVersion, "pr39-slice-g2-cohort-genome-freeze-v2");
  assert.equal(verified.protocol.status, "frozen_pre_control");
  assert.equal(verified.bindings.size, 5);
  assert.equal(verified.genomes.size, 5);
  assert.deepEqual(
    verified.protocol.assignmentPolicy.mapping,
    [
      { cohortSlot: 1, genomeSourceSlot: 4 },
      { cohortSlot: 2, genomeSourceSlot: 5 },
      { cohortSlot: 3, genomeSourceSlot: 1 },
      { cohortSlot: 4, genomeSourceSlot: 3 },
      { cohortSlot: 5, genomeSourceSlot: 2 },
    ],
  );
  assert.equal(verified.lineageEvidence.length, 2);
  assert.deepEqual(
    verified.lineageEvidence.map(({ slot, genomeSourceSlot, contributionCounts }) => ({ slot, genomeSourceSlot, contributionCounts })),
    [
      { slot: 2, genomeSourceSlot: 5, contributionCounts: [3, 3] },
      { slot: 5, genomeSourceSlot: 2, contributionCounts: [3, 3] },
    ],
  );
  assert.match(verified.protocolDigest, /^sha256:[0-9a-f]{64}$/);

  const schedule = verified.protocol.control.pairSchedule;
  assert.equal(schedule.length, 5);
  for (let slot = 1; slot <= 5; slot += 1) {
    assert.equal(schedule.filter((pair) => pair.genomeASlot === slot).length, 1);
    assert.equal(schedule.filter((pair) => pair.genomeBSlot === slot).length, 1);
  }
});

test("G2 ceiling CLEAR requires at least three detectable pairs covering every genome", () => {
  const { protocol } = verifyG2GenomeFreeze();
  const schedule = protocol.control.pairSchedule;
  const result = summarizeG2Ceiling({
    protocol,
    pairResults: [
      pairResult(schedule[0], 17),
      pairResult(schedule[1], 17),
      pairResult(schedule[2], 12),
      pairResult(schedule[3], 17),
      pairResult(schedule[4], 12),
    ],
  });

  assert.equal(result.verdict, "CLEAR");
  assert.equal(result.usableCeilingForH, true);
  assert.equal(result.detectablePairCount, 3);
  assert.equal(result.everyGenomeCoveredByDetectablePair, true);
  assert.deepEqual(result.coveredGenomeSlots, [1, 2, 3, 4, 5]);
  assert.equal("exactOneSidedBinomialP" in result.aggregate, false);
});

test("G2 ceiling HOLDs when detectable-pair count is below the frozen minimum", () => {
  const { protocol } = verifyG2GenomeFreeze();
  const schedule = protocol.control.pairSchedule;
  const result = summarizeG2Ceiling({
    protocol,
    pairResults: [
      pairResult(schedule[0], 17),
      pairResult(schedule[1], 16),
      pairResult(schedule[2], 16),
      pairResult(schedule[3], 17),
      pairResult(schedule[4], 16),
    ],
  });

  assert.equal(result.verdict, "HOLD");
  assert.equal(result.usableCeilingForH, false);
  assert.equal(result.detectablePairCount, 2);
});

test("G2 ceiling HOLDs when one cohort genome has no detectable incident pair", () => {
  const { protocol } = verifyG2GenomeFreeze();
  const schedule = protocol.control.pairSchedule;
  const result = summarizeG2Ceiling({
    protocol,
    pairResults: [
      pairResult(schedule[0], 17),
      pairResult(schedule[1], 17),
      pairResult(schedule[2], 17),
      pairResult(schedule[3], 16),
      pairResult(schedule[4], 16),
    ],
  });

  assert.equal(result.detectablePairCount, 3);
  assert.equal(result.everyGenomeCoveredByDetectablePair, false);
  assert.equal(result.verdict, "HOLD");
  assert.equal(result.usableCeilingForH, false);
});
