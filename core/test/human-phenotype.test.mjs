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


test("East Asian founder signal survives individual variation without renderer labels",()=>{
  const cohortMean=(referencePopulation,key)=>Array.from({length:64},(_,index)=>{
    const genome=sampleFounderPhysicalGenome({
      ancestry:[{population:"family-history",share:1,referencePopulation}],
      seed:`facial-structure-${index}`,
    });
    return phenotypeFromPhysicalGenome(genome,{sex:"female"}).latent[key];
  }).reduce((sum,value)=>sum+value,0)/64;

  assert.ok(
    cohortMean("east_asia.han_chinese","epicanthicFold")
      > cohortMean("eur_north","epicanthicFold")+.45,
    "eyelid structure lost population signal",
  );
  assert.ok(
    cohortMean("east_asia.han_chinese","zygomaticProjection")
      > cohortMean("eur_north","zygomaticProjection")+.25,
    "cheek structure lost population signal",
  );
  assert.ok(
    cohortMean("east_asia.han_chinese","nasalBridgeHeight")
      < cohortMean("eur_north","nasalBridgeHeight")-.35,
    "nasal bridge structure lost population signal",
  );
  assert.ok(
    cohortMean("east_asia.han_chinese","eyeShape")
      < cohortMean("eur_north","eyeShape")-.20,
    "eye opening structure lost population signal",
  );

  const genome=sampleFounderPhysicalGenome({
    ancestry:[{population:"family-history",share:1,referencePopulation:"east_asia.han_chinese"}],
    seed:"renderer-anatomy-proof",
  });
  const projection=physicalPhenotypeRenderingProjection(genome,{sex:"female"}).description;
  assert.match(projection,/epicanthic fold:/u,"renderer lost eyelid anatomy");
  assert.match(projection,/zygomatic \/ cheekbone projection:/u,"renderer lost cheek anatomy");
  assert.match(projection,/nasal bridge height:/u,"renderer lost nasal anatomy");
  assert.doesNotMatch(projection,/east_asia|han_chinese|family-history/u,"ancestry label leaked into renderer");
});
