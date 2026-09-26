import test from "node:test";
import assert from "node:assert/strict";
import {sampleFamilyAncestry} from "../src/human-phenotype/index.mjs";

const profiles=[
  {id:"common",share:8,maternalAncestry:[{population:"a",share:1}],paternalAncestry:[{population:"a",share:1}]},
  {id:"mixed",share:2,maternalAncestry:[{population:"a",share:1}],paternalAncestry:[{population:"b",share:1}]}
];

test("family ancestry replays one sampled family history",()=>{
  const a=sampleFamilyAncestry({profiles,seed:"person-1"});
  const replay=sampleFamilyAncestry({profiles,seed:"person-1"});
  assert.deepEqual(a,replay,"family history must replay");
  assert.ok(a.maternal.ancestry.length&&a.paternal.ancestry.length,"both parental lineages are required");
});

test("population sampling can reach common and mixed family histories",()=>{
  const sampled=new Set(Array.from({length:64},(_,i)=>sampleFamilyAncestry({profiles,seed:`family-${i}`}).profileId));
  assert.ok(sampled.has("common"),"common family history must be reachable");
  assert.ok(sampled.has("mixed"),"mixed family history must be reachable");
});

test("a mixed family preserves distinct parental ancestry",()=>{
  const onlyMixed=[{id:"mixed",share:1,maternalAncestry:[{population:"a",share:3},{population:"b",share:1}],paternalAncestry:[{population:"c",share:1}]}];
  const family=sampleFamilyAncestry({profiles:onlyMixed,seed:"mixed-family"});
  assert.deepEqual(family.maternal.ancestry,[{population:"a",share:.75},{population:"b",share:.25}],"maternal ancestry must survive");
  assert.deepEqual(family.paternal.ancestry,[{population:"c",share:1}],"paternal ancestry must survive");
});
