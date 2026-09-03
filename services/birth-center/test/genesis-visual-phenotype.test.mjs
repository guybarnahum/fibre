import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeNovoCanonicalVisualIdentity,
  deNovoVisualPhenotypeLoci,
} from "../src/genesis-visual-phenotype.mjs";
import { GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";

test("de-novo visual phenotype is deterministic, rich, and cross-age oriented", () => {
  const threadId = "thr_genesis_visual_phenotype_001";
  const first = buildDeNovoCanonicalVisualIdentity({ threadId });
  const replay = buildDeNovoCanonicalVisualIdentity({ threadId });

  assert.deepEqual(first, replay);
  assert.equal(first.policyRef, GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY);
  assert.equal(first.specification.subject.partyId, threadId);
  assert.ok(Buffer.byteLength(first.specification.subject.description, "utf8") >= 500);
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
