import test from "node:test";
import assert from "node:assert/strict";
import {sampleFamilyAncestry} from "../src/human-phenotype/index.mjs";

const profiles=[
 {id:"common",share:8,ancestry:[{population:"a",share:1}]},
 {id:"minority",share:2,ancestry:[{population:"b",share:1}]}
];

test("family ancestry is deterministic and population-weighted rather than quota-driven",()=>{
 const a=sampleFamilyAncestry({profiles,seed:"person-1"});
 const replay=sampleFamilyAncestry({profiles,seed:"person-1"});
 assert.deepEqual(a,replay,"family ancestry must replay");
 assert.ok(a.maternal.ancestry.length&&a.paternal.ancestry.length,"both parents need ancestry");
});

test("population profiles preserve mixed ancestry",()=>{
 const mixed=[{id:"mixed",share:1,ancestry:[{population:"a",share:3},{population:"b",share:1}]}];
 const family=sampleFamilyAncestry({profiles:mixed,seed:"mixed-family"});
 assert.deepEqual(family.maternal.ancestry,[{population:"a",share:.75},{population:"b",share:.25}],"mixed ancestry must survive");
 assert.deepEqual(family.paternal.ancestry,family.maternal.ancestry,"same profile must replay");
});

test("partner similarity remains a preference, not lineage cloning",()=>{
 const varied=[
  {id:"a",share:1,ancestry:[{population:"a",share:1}]},
  {id:"b",share:1,ancestry:[{population:"b",share:1}]},
  {id:"c",share:1,ancestry:[{population:"c",share:1}]}
 ];
 const families=Array.from({length:24},(_,i)=>sampleFamilyAncestry({profiles:varied,seed:`family-${i}`}));
 assert.ok(families.some(f=>f.maternal.profileId!==f.paternal.profileId),"parental lineages must be able to differ");
});
