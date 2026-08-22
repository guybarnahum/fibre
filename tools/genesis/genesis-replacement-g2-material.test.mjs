import assert from "node:assert/strict";
import test from "node:test";

import {
  FRESH_DE_NOVO_LOCI,
  FRESH_SYNTHETIC_PARENT_LOCI,
  buildFreshGenomeSources,
  verifyFreshAuthoredLoci,
} from "./genesis-replacement-g2-material.mjs";

test("replacement G2 freezes 42 unique non-geographic atomic source loci", () => {
  assert.deepEqual(verifyFreshAuthoredLoci(), { valueCount: 42, uniqueCount: 42 });
  assert.equal(Object.values(FRESH_DE_NOVO_LOCI).flat().length, 18);
  assert.equal(
    Object.values(FRESH_SYNTHETIC_PARENT_LOCI).flatMap((pair) => [...pair.a, ...pair.b]).length,
    24,
  );
});

test("replacement G2 source genomes use five fresh identities and preserved origin composition", () => {
  const sources = buildFreshGenomeSources();
  assert.equal(sources.length, 5);
  assert.deepEqual(sources.map(({ sourceSlot }) => sourceSlot), [1, 2, 3, 4, 5]);
  assert.equal(sources.filter(({ originMode }) => originMode === "de_novo").length, 3);
  assert.equal(sources.filter(({ originMode }) => originMode === "synthetic_lineage").length, 2);
  assert.equal(new Set(sources.map(({ threadId }) => threadId)).size, 5);
  assert.equal(new Set(sources.map(({ genesisId }) => genesisId)).size, 5);
  assert.equal(new Set(sources.map(({ bundle }) => bundle.genomeDigest)).size, 5);
  for (const source of sources) {
    assert.match(source.threadId, /^thr_pr39_rg2_0[1-5]$/);
    assert.match(source.genesisId, /^genesis_pr39_rg2_0[1-5]$/);
    assert.equal(source.bundle.loci.length, 6);
    assert.equal(source.bundle.mutations.length, 0);
    assert.equal(source.bundle.header.owner.kind, "thread");
    assert.equal(source.bundle.header.owner.ownerId, source.threadId);
    assert.equal(source.bundle.header.genesisId, source.genesisId);
  }
});

test("replacement G2 synthetic children are deterministic two-parent recombinations", () => {
  const sources = buildFreshGenomeSources();
  for (const source of sources.filter(({ originMode }) => originMode === "synthetic_lineage")) {
    assert.equal(source.parents.length, 2);
    assert.equal(source.bundle.header.originKind, "recombined");
    assert.equal(source.contributionCounts.length, 2);
    assert.equal(source.contributionCounts[0] + source.contributionCounts[1], 6);
    assert.ok(source.contributionCounts[0] >= 1);
    assert.ok(source.contributionCounts[1] >= 1);
    assert.equal(new Set(source.parents.map(({ bundle }) => bundle.header.genomeId)).size, 2);
  }
});
