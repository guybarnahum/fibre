import test from "node:test";
import assert from "node:assert/strict";
import {sampleFounderPhysicalGenome,expressPhysicalGenome} from "../src/human-phenotype/index.mjs";

const ancestry=[
  {population:"family-origin-a",share:.75,referencePopulation:"eur_south"},
  {population:"family-origin-b",share:.25,referencePopulation:"west_asia"}
];

test("founder genome replays while people from the same ancestry differ",()=>{
  const a=sampleFounderPhysicalGenome({ancestry,seed:"founder-a"});
  assert.deepEqual(a,sampleFounderPhysicalGenome({ancestry,seed:"founder-a"}),"founder must replay");
  assert.notDeepEqual(a,sampleFounderPhysicalGenome({ancestry,seed:"founder-b"}),"founders should differ");
  assert.notDeepEqual(expressPhysicalGenome(a),expressPhysicalGenome(sampleFounderPhysicalGenome({ancestry,seed:"founder-b"})),"founder phenotypes should differ");
});

test("ancestry provenance labels do not directly choose founder genetics",()=>{
  const make=population=>sampleFounderPhysicalGenome({
    ancestry:[{population,share:1,referencePopulation:"south_asia"}],
    seed:"same-founder"
  });
  assert.deepEqual(make("history-a"),make("history-b"),"provenance label must not select genetics");
});

test("population basis shifts founders without determining individuals",()=>{
  const cohort=referencePopulation=>Array.from({length:32},(_,i)=>
    expressPhysicalGenome(sampleFounderPhysicalGenome({
      ancestry:[{population:"same-history",share:1,referencePopulation}],
      seed:`founder-${i}`
    }))
  );
  const a=cohort("afr_west"),b=cohort("eur_north");
  const mean=(xs,key)=>xs.reduce((n,x)=>n+x[key],0)/xs.length;
  assert.notEqual(mean(a,"pigmentation"),mean(b,"pigmentation"),"population basis should shift founders");
  assert.ok(new Set(a.map(x=>x.faceBreadth.toFixed(2))).size>8,"individuals should vary");
});
