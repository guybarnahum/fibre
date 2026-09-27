import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleFounderPhysicalGenome,
  expressPhysicalGenome,
  physicalGenomeLoci,
  referencePopulationIds,
  referencePopulationPrior,
} from "../src/human-phenotype/index.mjs";

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
  assert.ok(Math.abs(mean(a,"noseBreadth")-mean(b,"noseBreadth"))>.2,"population basis should shift morphology");
  assert.ok(new Set(a.map(x=>x.faceBreadth.toFixed(2))).size>8,"individuals should vary");
});


test("every reference population resolves every physical locus",()=>{
  for(const id of referencePopulationIds){
    const prior=referencePopulationPrior(id);
    for(const locus of physicalGenomeLoci){
      assert.ok(Number.isFinite(prior[locus]),`${id} missing ${locus}`);
    }
  }
});

test("unknown founder populations fail instead of becoming neutral",()=>{
  assert.throws(
    ()=>sampleFounderPhysicalGenome({
      ancestry:[{population:"unknown family",share:1,referencePopulation:"unknown_region"}],
      seed:"unknown-founder",
    }),
    /unknown physical reference population/u,
    "unknown population must fail",
  );
});


test("East Asian child priors change only evidence-backed anatomy",()=>{
  const east=referencePopulationPrior("east_asia");
  const han=referencePopulationPrior("east_asia.han_chinese");
  const northHan=referencePopulationPrior("east_asia.han_chinese.northern");
  const korean=referencePopulationPrior("east_asia.korean");
  const japanese=referencePopulationPrior("east_asia.japanese");

  assert.ok(han.eyeSpacing>east.eyeSpacing,"Han ocular spacing calibration missing");
  assert.ok(han.eyeShape<east.eyeShape,"Han fissure calibration missing");
  assert.ok(korean.zygomaticProjection>han.zygomaticProjection,"Korean malar calibration missing");
  assert.ok(korean.noseProjection>han.noseProjection,"Korean nasal-tip calibration missing");
  assert.ok(han.jawBreadth>korean.jawBreadth,"Chinese/Korean masseteric calibration missing");
  assert.ok(japanese.noseBreadth>korean.noseBreadth,"Japanese nasal breadth calibration missing");
  assert.deepEqual(northHan,han,"uncalibrated Han region must shrink to Han prior");
});
