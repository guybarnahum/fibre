import test from "node:test";
import assert from "node:assert/strict";
import {sampleInheritedPhenotype} from "../src/human-phenotype/index.mjs";

const parents={
  maternalAncestry:[{population:"population-a",share:1,referencePopulation:"eur_north"}],
  paternalAncestry:[{population:"population-b",share:1,referencePopulation:"south_asia"}]
};

test("experimental founder phenotype replays and varies by child",()=>{
  const a=sampleInheritedPhenotype({...parents,seed:"child-1"});
  assert.deepEqual(a,sampleInheritedPhenotype({...parents,seed:"child-1"}),"inheritance must replay");
  assert.notDeepEqual(a.phenotype,sampleInheritedPhenotype({...parents,seed:"child-2"}).phenotype,"siblings should differ");
});

test("phenotype resolves concrete inherited traits",()=>{
  const samples=Array.from({length:24},(_,i)=>sampleInheritedPhenotype({...parents,seed:`traits-${i}`}).phenotype);
  assert.ok(samples.every(x=>x.version==="human-phenotype-v0.5"),"phenotype version must match");
  assert.ok(samples.every(x=>x.traits.faceWidth&&x.traits.noseProjection&&x.traits.hairTexture),"traits must be concrete");
  assert.ok(new Set(samples.map(x=>x.traits.faceWidth)).size>1,"faces should vary");
});

test("provenance labels do not directly choose appearance",()=>{
  const make=population=>sampleInheritedPhenotype({
    maternalAncestry:[{population,share:1,referencePopulation:"south_asia"}],
    paternalAncestry:[{population,share:1,referencePopulation:"south_asia"}],
    seed:"same"
  }).phenotype;
  assert.deepEqual(make("history-a"),make("history-b"),"provenance label must not select appearance");
});
