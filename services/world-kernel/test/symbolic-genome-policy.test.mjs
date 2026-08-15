import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeNovoSymbolicGenome,
  normalizeSymbolicGenomeHeader,
  normalizeSymbolicGenomeMutation,
  symbolicGenomeMutationId,
} from "../src/symbolic-genome-domain.mjs";

const createdAt = "2026-08-15T18:00:00Z";

test("symbolic genome authorities fail closed on unknown policy versions", () => {
  const genome = buildDeNovoSymbolicGenome({
    threadId: "thr_policy_probe",
    genesisId: "gen_policy_probe",
    values: ["tries a different route after a failed attempt", "notices when another person is carrying too much work"],
    createdAt,
  });

  assert.throws(
    () => normalizeSymbolicGenomeHeader({
      ...genome.header,
      inheritancePolicy: { id: "fibre_symbolic_genome", version: "2" },
    }),
    /not a supported v1 policy/,
  );

  const mutationPolicy = { id: "bounded_textual_locus_replacement", version: "1" };
  const mutation = {
    mutationId: symbolicGenomeMutationId({
      genomeId: genome.header.genomeId,
      ordinal: 1,
      replacementValue: "tries a third route when the first two fail",
      policy: mutationPolicy,
    }),
    genomeId: genome.header.genomeId,
    ordinal: 1,
    operation: "replace_locus",
    policy: mutationPolicy,
    sourceGenomeRef: "genome_source_probe",
    sourceLocusRef: "gloc_source_probe",
    priorValueDigest: `sha256:${"0".repeat(64)}`,
    replacementValue: "tries a third route when the first two fail",
    createdAt,
  };

  assert.doesNotThrow(() => normalizeSymbolicGenomeMutation(mutation));
  assert.throws(
    () => normalizeSymbolicGenomeMutation({
      ...mutation,
      policy: { id: mutationPolicy.id, version: "2" },
    }),
    /not a supported v1 policy/,
  );
});
