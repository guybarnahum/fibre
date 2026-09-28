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


test("founder variation stays centered while facial systems remain coherent",()=>{
  const prior=referencePopulationPrior("east_asia.han_chinese");
  const cohort=Array.from({length:128},(_,index)=>
    expressPhysicalGenome(sampleFounderPhysicalGenome({
      ancestry:[{population:"Han Chinese family",share:1,referencePopulation:"east_asia.han_chinese"}],
      seed:`han-founder-${index}`,
    }))
  );

  const mean=key=>cohort.reduce((sum,person)=>sum+person[key],0)/cohort.length;
  const sd=key=>{
    const center=mean(key);
    return Math.sqrt(cohort.reduce((sum,person)=>sum+(person[key]-center)**2,0)/cohort.length);
  };
  const corr=(left,right)=>{
    const a=mean(left),b=mean(right);
    const covariance=cohort.reduce((sum,person)=>sum+(person[left]-a)*(person[right]-b),0)/cohort.length;
    return covariance/(sd(left)*sd(right));
  };

  for(const locus of ["zygomaticProjection","eyeSpacing","epicanthicFold","nasalBridgeHeight"]){
    assert.ok(Math.abs(mean(locus)-prior[locus])<.08,`${locus} drifted from population center`);
    assert.ok(sd(locus)>.04&&sd(locus)<.16,`${locus} variation is implausible`);
  }

  assert.ok(corr("faceBreadth","zygomaticProjection")>.2,"facial structure lost correlation");
  assert.ok(corr("epicanthicFold","upperEyelidExposure")<-.2,"eyelid structure lost correlation");
  assert.ok(corr("nasalBridgeHeight","noseProjection")>.2,"nasal structure lost correlation");
});


test("North and Southern Africa are explicit reference populations without invented deltas",()=>{
  assert.ok(referencePopulationIds.includes("afr_north"),"North Africa reference population is missing");
  assert.ok(referencePopulationIds.includes("afr_south"),"Southern Africa reference population is missing");
  assert.deepEqual(
    referencePopulationPrior("afr_north"),
    referencePopulationPrior("west_asia"),
    "uncalibrated North Africa should shrink to its declared calibration basis",
  );
  assert.deepEqual(
    referencePopulationPrior("afr_south"),
    referencePopulationPrior("afr_west"),
    "uncalibrated Southern Africa should shrink to its declared calibration basis",
  );
});


test("Middle East reference hierarchy preserves evidence without invented deltas",()=>{
  for(const id of [
    "middle_east",
    "middle_east.egypt",
    "middle_east.levant",
    "middle_east.arabia",
    "middle_east.mesopotamia",
    "middle_east.iran",
    "middle_east.anatolia",
  ]){
    assert.ok(referencePopulationIds.includes(id),`${id} reference population is missing`);
  }
  assert.deepEqual(
    referencePopulationPrior("middle_east.egypt"),
    referencePopulationPrior("afr_north"),
    "Egypt should shrink to its North-African calibration basis",
  );
  for(const id of [
    "middle_east",
    "middle_east.levant",
    "middle_east.arabia",
    "middle_east.mesopotamia",
    "middle_east.iran",
    "middle_east.anatolia",
  ]){
    assert.deepEqual(
      referencePopulationPrior(id),
      referencePopulationPrior("west_asia"),
      `${id} should shrink to the West-Asian calibration basis until calibrated`,
    );
  }
});


test("Polynesian hierarchy preserves specific lineage without inventing island deltas",()=>{
  const oceanic=referencePopulationPrior("oceania");
  const polynesian=referencePopulationPrior("oceania.polynesia");
  const hawaiian=referencePopulationPrior("oceania.polynesia.native_hawaiian");
  const samoan=referencePopulationPrior("oceania.polynesia.samoan");

  assert.ok(polynesian.faceBreadth>oceanic.faceBreadth,"Polynesian facial breadth calibration missing");
  assert.ok(polynesian.faceLength>oceanic.faceLength,"Polynesian facial-height calibration missing");
  assert.ok(polynesian.chinProjection>oceanic.chinProjection,"Polynesian chin projection calibration missing");
  assert.deepEqual(hawaiian,polynesian,"uncalibrated Native Hawaiian child should shrink to Polynesian prior");
  assert.deepEqual(samoan,polynesian,"uncalibrated Samoan child should shrink to Polynesian prior");
});
