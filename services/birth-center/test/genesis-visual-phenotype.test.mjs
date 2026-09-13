import assert from "node:assert/strict";
import test from "node:test";

import { genesisSexForThread } from "../src/genesis-sex.mjs";
import {
  buildDeNovoCanonicalVisualIdentity,
  deNovoVisualPhenotypeLoci,
  recombineVisualPhenotypeLoci,
} from "../src/genesis-visual-phenotype.mjs";
import { GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY } from "fibre/world-kernel/genesis-authority-contracts";

const encoder = new TextEncoder();

test("de-novo visual phenotype consumes sex and remains deterministic, rich, and cross-age oriented", () => {
  const threadId = "thr_genesis_visual_phenotype_001";
  const sex = genesisSexForThread({ threadId });
  const first = buildDeNovoCanonicalVisualIdentity({ threadId, sex });
  const replay = buildDeNovoCanonicalVisualIdentity({ threadId, sex });

  assert.deepEqual(first, replay);
  assert.equal(first.policyRef, GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY);
  assert.equal(first.specification.subject.partyId, threadId);
  assert.match(first.specification.subject.description, new RegExp(`^adult ${sex} person;`, "u"));
  assert.ok(encoder.encode(first.specification.subject.description).byteLength >= 500);
  assert.match(first.specification.subject.description, /;/u);
  assert.match(first.specification.description, /Preserve sex/u);
  assert.match(first.specification.description, /age transformations/u);
  assert.match(first.specification.description, /normalized age 25/u);
  assert.throws(
    () => buildDeNovoCanonicalVisualIdentity({ threadId }),
    /sex must be female or male/u,
  );

  const loci = deNovoVisualPhenotypeLoci({ threadId });
  assert.ok(loci.length >= 10);
  assert.equal(new Set(loci.map((locus) => locus.domain)).size, loci.length);
  assert.ok(loci.every((locus) => locus.provenance.kind === "de_novo"));
});

test("Genesis sex assignment is deterministic and unbiased across Thread identities", () => {
  const sexes = Array.from({ length: 1_000 }, (_, index) => (
    genesisSexForThread({ threadId: `thr_sex_distribution_${index}` })
  ));
  const female = sexes.filter((sex) => sex === "female").length;
  const male = sexes.filter((sex) => sex === "male").length;

  assert.equal(female + male, sexes.length);
  assert.ok(female >= 450 && female <= 550, `expected ~50% female, got ${female}/${sexes.length}`);
  assert.ok(male >= 450 && male <= 550, `expected ~50% male, got ${male}/${sexes.length}`);
  assert.equal(
    genesisSexForThread({ threadId: "thr_sex_replay" }),
    genesisSexForThread({ threadId: "thr_sex_replay" }),
  );
});

test("different Thread identities do not collapse to one interchangeable phenotype", () => {
  const leftId = "thr_genesis_visual_phenotype_left";
  const rightId = "thr_genesis_visual_phenotype_right";
  const left = buildDeNovoCanonicalVisualIdentity({ threadId: leftId, sex: genesisSexForThread({ threadId: leftId }) });
  const right = buildDeNovoCanonicalVisualIdentity({ threadId: rightId, sex: genesisSexForThread({ threadId: rightId }) });

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
