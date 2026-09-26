import test from "node:test";
import assert from "node:assert/strict";
import {sampleInheritedPhenotype} from "../src/human-phenotype/index.mjs";

const parents = {
  maternalAncestry: [{population:"population-a",share:0.75},{population:"population-b",share:0.25}],
  paternalAncestry: [{population:"population-c",share:1}]
};

test("physical inheritance is deterministic and preserves both parents", () => {
  const a = sampleInheritedPhenotype({...parents, seed:"child-1"});
  const replay = sampleInheritedPhenotype({...parents, seed:"child-1"});
  const sibling = sampleInheritedPhenotype({...parents, seed:"child-2"});

  assert.deepEqual(a, replay, "inheritance must replay");
  assert.notDeepEqual(a.phenotype, sibling.phenotype, "siblings need inherited variation");
  assert.deepEqual(a.ancestry.inherited, [
    {population:"population-a",share:0.375},
    {population:"population-b",share:0.125},
    {population:"population-c",share:0.5}
  ], "both parents must contribute");
});
