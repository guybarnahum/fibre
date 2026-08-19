import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecombinedSymbolicGenome,
  buildSyntheticAncestorSymbolicGenome,
  replayRecombinationSelection,
} from "../src/symbolic-genome-domain.mjs";
import {
  syntheticLineageWitnessFromRecombinedGenome,
} from "../src/genesis-rich-life-domain.mjs";

function ancestor(ancestorId, genesisId, values) {
  return buildSyntheticAncestorSymbolicGenome({
    ancestorId,
    genesisId,
    values,
    createdAt: "2026-08-18T23:40:00Z",
  });
}

test("Slice E synthetic lineage witness is derived from a real deterministic textual crossover", () => {
  const a = ancestor("ancestor_slice_e_a", "gen_ancestor_e_a", [
    "Prefers to inspect concrete evidence before accepting a confident explanation.",
    "Enjoys making small practical objects with visible imperfections.",
    "Can stay engaged in a disagreement without needing immediate agreement.",
    "Often notices when a rule and an observed practice do not line up.",
  ]);
  const b = ancestor("ancestor_slice_e_b", "gen_ancestor_e_b", [
    "Returns to difficult texts when an unresolved detail remains interesting.",
    "Tends to include quieter people when a group choice is being made.",
    "Enjoys ordinary routines that leave room for private attention.",
    "Can change an interpretation without pretending the earlier one never existed.",
  ]);
  const child = buildRecombinedSymbolicGenome({
    threadId: "thr_slice_e_lineage_child",
    genesisId: "gen_slice_e_lineage_child",
    sourceGenomes: [a, b],
    selectionSeed: "slice-e-lineage-crossover-001",
    createdAt: "2026-08-18T23:41:00Z",
  });

  const witness = syntheticLineageWitnessFromRecombinedGenome(child);
  assert.equal(witness.genomeRef, child.header.genomeId);
  assert.deepEqual(witness.parentOrAncestorRefs, ["ancestor_slice_e_a", "ancestor_slice_e_b"]);
  assert.match(witness.recombinationWitnessRef, /^recomb_[0-9a-f]{40}$/);
  assert.equal(replayRecombinationSelection(child, [a, b]).length, child.loci.length);

  const inheritedSources = new Set(child.loci.map((locus) => locus.provenance.sourceGenomeRef));
  assert.equal(inheritedSources.has(a.header.genomeId), true);
  assert.equal(inheritedSources.has(b.header.genomeId), true);
});

test("Slice E refuses to call an arbitrary de-novo or Thread-parent genome synthetic lineage", () => {
  const deNovo = ancestor("ancestor_not_recombined", "gen_not_recombined", ["One proposition.", "Another proposition."]);
  assert.throws(() => syntheticLineageWitnessFromRecombinedGenome(deNovo), /requires a recombined symbolic genome/);

  const sourceThread = buildSyntheticAncestorSymbolicGenome({
    ancestorId: "ancestor_source_e",
    genesisId: "gen_source_e",
    values: ["Source proposition one.", "Source proposition two."],
    createdAt: "2026-08-18T23:42:00Z",
  });
  const sourceOther = buildSyntheticAncestorSymbolicGenome({
    ancestorId: "ancestor_source_f",
    genesisId: "gen_source_f",
    values: ["Other proposition one.", "Other proposition two."],
    createdAt: "2026-08-18T23:42:00Z",
  });
  const child = buildRecombinedSymbolicGenome({
    threadId: "thr_slice_e_lineage_check",
    genesisId: "gen_slice_e_lineage_check",
    sourceGenomes: [sourceThread, sourceOther],
    selectionSeed: "slice-e-lineage-check",
    createdAt: "2026-08-18T23:43:00Z",
  });
  const forged = structuredClone(child);
  forged.header.sourceEligibility.sourceOwners[0] = { kind: "thread", ownerId: "thr_existing_parent" };
  assert.throws(() => syntheticLineageWitnessFromRecombinedGenome(forged), /digest does not match|synthetic-ancestor source genomes/);
});
