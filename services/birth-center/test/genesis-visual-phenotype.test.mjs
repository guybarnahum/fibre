import {
  physicalPhenotypeRenderingProjection,
  resolveBirthPhysicalInheritance,
} from "#core/src/human-phenotype/index.mjs";
import assert from "node:assert/strict";
import test from "node:test";

import { genesisSexForThread } from "../src/genesis-sex.mjs";
import {
  buildGenesisCanonicalVisualIdentity,
} from "../src/genesis-visual-phenotype.mjs";
import { GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY } from "fibre/world-kernel/genesis-authority-contracts";

const encoder = new TextEncoder();

const family=[{population:"family",share:1,referencePopulation:"west_asia"}];
const physicalGenome=seed=>resolveBirthPhysicalInheritance({maternalAncestry:family,paternalAncestry:family,seed}).genome;

test("Genesis embodiment is derived from inherited physical genome",()=>{
  const genome=physicalGenome("visual-one");
  const first=buildGenesisCanonicalVisualIdentity({threadId:"thr_visual_one",sex:"female",physicalGenome:genome});
  const replay=buildGenesisCanonicalVisualIdentity({threadId:"thr_visual_one",sex:"female",physicalGenome:genome});
  assert.deepEqual(first,replay,"same genome changed embodiment");
  assert.equal(first.policyRef,GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY);
  const projection=physicalPhenotypeRenderingProjection(genome,{sex:"female"});
  assert.ok(
    first.specification.subject.description.includes(projection.description),
    "Genesis embodiment lost physical rendering projection",
  );
  assert.deepEqual(
    Object.keys(projection.anatomy),
    ["face","eyes","noseMouth","pigmentationHair","body"],
    "physical projection lost an identity anatomy group",
  );
  assert.throws(()=>buildGenesisCanonicalVisualIdentity({threadId:"thr_missing",sex:"male"}),/requires the inherited physical genome/u);
});

test("different physical genomes can change embodiment",()=>{
  const left=buildGenesisCanonicalVisualIdentity({threadId:"thr_left",sex:"female",physicalGenome:physicalGenome("left")});
  const right=buildGenesisCanonicalVisualIdentity({threadId:"thr_right",sex:"female",physicalGenome:physicalGenome("right")});
  assert.notEqual(left.specification.subject.description,right.specification.subject.description,"physical inheritance became decorative");
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

