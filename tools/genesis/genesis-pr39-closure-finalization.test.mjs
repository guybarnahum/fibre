import assert from "node:assert/strict";
import test from "node:test";

import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";

test("PR39 closure finalization freezes five genomes only after the World precommitment", () => {
  const frozen = loadPr39ClosureFinalization();
  assert.equal(frozen.finalization.status, "READY_FOR_ONE_PASS_GENERATION");
  assert.equal(frozen.finalization.finalGenomeAssignmentStatus, "FROZEN");
  assert.equal(frozen.finalization.generationAuthorized, true);
  assert.deepEqual(frozen.finalization.generationBlockers, []);
  assert.equal(frozen.precommitment.worldSet.genomeAssignmentStatus, "UNASSIGNED", "original World-before-genome witness must remain immutable");
  assert.equal(frozen.plans.slots.length, 5);
  assert.deepEqual(frozen.plans.slots.map((slot) => slot.originMode), [
    "de_novo",
    "synthetic_lineage",
    "de_novo",
    "de_novo",
    "synthetic_lineage",
  ]);
  assert.match(frozen.finalizationDigest, /^sha256:[0-9a-f]{64}$/u);
  for (const slot of frozen.plans.slots) {
    assert.equal(slot.genome.header.owner.ownerId, slot.threadId);
    assert.equal(slot.genome.header.genesisId, slot.genesisId);
    assert.equal(slot.genome.genomeDigest, slot.genomeDigest);
    assert.match(slot.worldSpecDigest, /^sha256:[0-9a-f]{64}$/u);
  }
});

test("PR39 final genome assignment is slot-index mechanical and World-independent", () => {
  const { plans } = loadPr39ClosureFinalization();
  assert.equal(plans.fixture.assignment.policy, "slot_index_template_remint_v1");
  assert.equal(plans.fixture.assignment.contentIndependentOfWorld, true);
  assert.equal(plans.fixture.assignment.worldsFrozenBeforeAssignment, true);
  for (const slot of plans.fixture.slots) {
    assert.equal(slot.templateGenomePath, `fixtures/genesis/pr39/genomes/thread-${String(slot.slot).padStart(2, "0")}.json`);
  }
});
