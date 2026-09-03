import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeNovoCanonicalVisualIdentity,
  deNovoVisualPhenotypeLoci,
  recombineVisualPhenotypeLoci,
} from "../src/genesis-visual-phenotype.mjs";
import { GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY } from "fibre/world-kernel/genesis-authority-contracts";

const encoder = new TextEncoder();

test("de-novo visual phenotype is deterministic, rich, and cross-age oriented", () => {
  const threadId = "thr_genesis_visual_phenotype_001";
  const first = buildDeNovoCanonicalVisualIdentity({ threadId });
  const replay = buildDeNovoCanonicalVisualIdentity({ threadId });

  assert.deepEqual(first, replay);
  assert.equal(first.policyRef, GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY);
  assert.equal(first.specification.subject.partyId, threadId);
  assert.ok(encoder.encode(first.specification.subject.description).byteLength >= 500);
  assert.match(first.specification.subject.description, /;/u);
  assert.match(first.specification.description, /age transformations/u);
  assert.match(first.specification.description, /normalized age 25/u);

  const loci = deNovoVisualPhenotypeLoci({ threadId });
  assert.ok(loci.length >= 10);
  assert.equal(new Set(loci.map((locus) => locus.domain)).size, loci.length);
  assert.ok(loci.every((locus) => locus.provenance.kind === "de_novo"));
});

test("different Thread identities do not collapse to one interchangeable phenotype", () => {
  const left = buildDeNovoCanonicalVisualIdentity({ threadId: "thr_genesis_visual_phenotype_left" });
  const right = buildDeNovoCanonicalVisualIdentity({ threadId: "thr_genesis_visual_phenotype_right" });

  assert.notEqual(left.specification.subject.description, right.specification.subject.description);
});

test("synthetic-lineage phenotype recombines textual loci from parent identities", () => {
  const parentIds = ["thr_visual_parent_a", "thr_visual_parent_b"];
  const loci = recombineVisualPhenotypeLoci({
    threadId: "thr_visual_child",
    parentIds,
  });

  assert.ok(loci.every((locus) => locus.provenance.kind === "inherited"));
  assert.ok(loci.every((locus) => parentIds.includes(locus.provenance.sourceOwnerId)));
  assert.ok(new Set(loci.map((locus) => locus.provenance.sourceOwnerId)).size >= 1);
});
