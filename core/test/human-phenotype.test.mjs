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

test("inherited latent coordinates use the full unit interval",()=>{
 const samples=Array.from({length:12},(_,i)=>sampleInheritedPhenotype({...parents,seed:`range-${i}`}).phenotype.latent);
 const values=samples.flatMap(Object.values);
 assert.ok(values.every(v=>v>=0&&v<=1),"latent coordinates must stay within unit interval");
 assert.ok(values.some(v=>v>0.5),"latent coordinates must reach upper half");
});

test("correlated phenotype resolves concrete inherited traits", () => {
  const samples = Array.from({length:24}, (_,i) =>
    sampleInheritedPhenotype({...parents, seed:`traits-${i}`}).phenotype
  );
  assert.ok(samples.every(p => p.version === "human-phenotype-v0.4"), "phenotype version must identify correlated sampler");
  assert.ok(samples.every(p => p.traits.faceWidth && p.traits.noseProjection && p.traits.hairTexture), "inherited traits must be concrete");
  assert.ok(new Set(samples.map(p => p.traits.faceWidth)).size > 1, "face width must vary");
  assert.ok(new Set(samples.map(p => p.traits.noseProjection)).size > 1, "nose projection must vary");
  assert.ok(new Set(samples.map(p => p.traits.hairTexture)).size > 1, "hair texture must vary");
});

test("ancestral geography weakly conditions pigmentation without determining an individual", () => {
  const cohort = sourceLatitude => Array.from({length:64}, (_,i) =>
    sampleInheritedPhenotype({
      maternalAncestry:[{population:"same-provenance",share:1,sourceLatitude}],
      paternalAncestry:[{population:"same-provenance",share:1,sourceLatitude}],
      seed:`cohort-${i}`
    }).phenotype
  );
  const equatorial=cohort(2),highLatitude=cohort(60);
  const mean=xs=>xs.reduce((n,x)=>n+x.latent.pigmentation,0)/xs.length;
  assert.notEqual(mean(equatorial),mean(highLatitude),"ancestral geography must shift pigmentation distribution");
  assert.ok(new Set(equatorial.map(x=>x.traits.pigmentation)).size>1,"ancestry must not dictate pigmentation");
});

test("population labels alone have no physical authority", () => {
  const a=sampleInheritedPhenotype({maternalAncestry:[{population:"label-a",share:1}],paternalAncestry:[{population:"label-a",share:1}],seed:"same"});
  const b=sampleInheritedPhenotype({maternalAncestry:[{population:"label-b",share:1}],paternalAncestry:[{population:"label-b",share:1}],seed:"same"});
  assert.deepEqual(a.phenotype,b.phenotype,"population labels must not select appearance");
});

test("mixed parents recombine supported physical priors rather than collapse to one midpoint", () => {
  const mixed=Array.from({length:32},(_,i)=>sampleInheritedPhenotype({
    maternalAncestry:[{population:"maternal",share:1,sourceLatitude:5}],
    paternalAncestry:[{population:"paternal",share:1,sourceLatitude:60}],
    seed:`mixed-${i}`
  }).phenotype.experimentalPopulationPrior.pigmentation);
  assert.ok(new Set(mixed.map(x=>x.toFixed(4))).size>1,"mixed inheritance must recombine by child");
});
