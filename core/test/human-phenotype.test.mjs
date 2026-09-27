import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleFounderPhysicalGenome,
  recombinePhysicalGenomes,
  phenotypeFromPhysicalGenome,
  physicalPhenotypeRenderingProjection
} from "../src/human-phenotype/index.mjs";

const ancestry=[{population:"family-history",share:1,referencePopulation:"south_asia"}];

test("phenotype is pure expression of the inherited genome",()=>{
  const mother=sampleFounderPhysicalGenome({ancestry,seed:"mother"});
  const father=sampleFounderPhysicalGenome({ancestry,seed:"father"});
  const genome=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child"});
  const a=phenotypeFromPhysicalGenome(genome);
  const b=phenotypeFromPhysicalGenome(genome);
  assert.deepEqual(a,b,"phenotype must follow genome");
  assert.equal(a.version,"human-phenotype-v0.11","phenotype version must match");
  assert.ok(
    a.traits.faceWidth&&a.traits.noseProjection&&a.traits.hairTexture&&a.traits.eyeColor&&a.traits.hairColor
    &&a.traits.eyeShape&&a.traits.epicanthicFold&&a.traits.upperEyelidExposure&&a.traits.orbitalDepth
    &&a.traits.zygomaticProjection&&a.traits.nasalBridgeHeight&&a.traits.bodyProportion
    &&a.traits.adiposityTendency&&a.traits.muscularityTendency,
    "phenotype must expose concrete inherited anatomy",
  );
});

test("different inherited genomes can express different people",()=>{
  const founder=seed=>phenotypeFromPhysicalGenome(sampleFounderPhysicalGenome({ancestry,seed}));
  const people=Array.from({length:24},(_,i)=>founder(`person-${i}`));
  const signatures=new Set(people.map(x=>JSON.stringify(x.traits)));
  assert.ok(signatures.size>1,"people should differ");
});


test("sex conditions androgenic expression without changing inherited genome",()=>{
  const genome=sampleFounderPhysicalGenome({ancestry,seed:"androgenic-carrier"});
  const before=JSON.stringify(genome);
  const female=phenotypeFromPhysicalGenome(genome,{sex:"female"});
  const male=phenotypeFromPhysicalGenome(genome,{sex:"male"});
  assert.equal(female.traits.facialHairTendency,"minimal","female facial hair must stay minimal");
  assert.equal(female.traits.hairlineLossTendency,"low","female hairline loss must stay low");
  assert.ok(["light","moderate","dense"].includes(male.traits.facialHairTendency),"male facial hair must express inherited tendency");
  assert.equal(JSON.stringify(genome),before,"sex must not change inherited genome");
});


test("east-asian founder ancestry survives as concrete facial anatomy, not a renderer label",()=>{
  const east=[{population:"family-history",share:1,referencePopulation:"east_asia"}];
  const north=[{population:"family-history",share:1,referencePopulation:"eur_north"}];
  const eastGenome=sampleFounderPhysicalGenome({ancestry:east,seed:"facial-structure-control"});
  const northGenome=sampleFounderPhysicalGenome({ancestry:north,seed:"facial-structure-control"});
  const eastFace=phenotypeFromPhysicalGenome(eastGenome,{sex:"female"});
  const northFace=phenotypeFromPhysicalGenome(northGenome,{sex:"female"});

  assert.ok(eastFace.latent.epicanthicFold>northFace.latent.epicanthicFold,"eyelid structure lost founder signal");
  assert.ok(eastFace.latent.zygomaticProjection>northFace.latent.zygomaticProjection,"cheek structure lost founder signal");
  assert.ok(eastFace.latent.nasalBridgeHeight<northFace.latent.nasalBridgeHeight,"nasal structure lost founder signal");

  const projection=physicalPhenotypeRenderingProjection(eastGenome,{sex:"female"}).description;
  assert.match(projection,/epicanthic fold:/u,"renderer lost eyelid anatomy");
  assert.match(projection,/zygomatic \/ cheekbone projection:/u,"renderer lost cheek anatomy");
  assert.match(projection,/nasal bridge height:/u,"renderer lost nasal anatomy");
  assert.doesNotMatch(projection,/east_asia|family-history/u,"ancestry label leaked into renderer");
});
