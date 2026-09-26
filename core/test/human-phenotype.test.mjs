import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleFounderPhysicalGenome,
  recombinePhysicalGenomes,
  phenotypeFromPhysicalGenome
} from "../src/human-phenotype/index.mjs";

const ancestry=[{population:"family-history",share:1,referencePopulation:"south_asia"}];

test("phenotype is pure expression of the inherited genome",()=>{
  const mother=sampleFounderPhysicalGenome({ancestry,seed:"mother"});
  const father=sampleFounderPhysicalGenome({ancestry,seed:"father"});
  const genome=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child"});
  const a=phenotypeFromPhysicalGenome(genome);
  const b=phenotypeFromPhysicalGenome(genome);
  assert.deepEqual(a,b,"phenotype must follow genome");
  assert.equal(a.version,"human-phenotype-v0.7","phenotype version must match");
  assert.ok(a.traits.faceWidth&&a.traits.noseProjection&&a.traits.hairTexture&&a.traits.eyeColor&&a.traits.adiposityTendency,"traits must be concrete");
});

test("different inherited genomes can express different people",()=>{
  const founder=seed=>phenotypeFromPhysicalGenome(sampleFounderPhysicalGenome({ancestry,seed}));
  const people=Array.from({length:24},(_,i)=>founder(`person-${i}`));
  const signatures=new Set(people.map(x=>JSON.stringify(x.traits)));
  assert.ok(signatures.size>1,"people should differ");
});
