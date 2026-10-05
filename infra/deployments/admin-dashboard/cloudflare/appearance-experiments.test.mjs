import test from "node:test";
import assert from "node:assert/strict";

import {referencePopulationCalibration} from "#core/src/human-appearance/index.mjs";
import {
  adminPopulationLabExperimentRequest,
  adminPopulationLabRerunRequest,
  adminPopulationLabShadowBaseCalibration,
  adminPopulationLabShadowExperimentRequest,
  populationLabComparisonBaselineId,
  populationLabComparisonChanges,
  populationLabComparisonHealth,
  populationLabSameCohort,
  reconcileAdminPopulationLabAsset,
  withExperimentLifecycleHints,
} from "./appearance-experiments.mjs";

function calibration(id,version=referencePopulationCalibration(id).version){
  const base=referencePopulationCalibration(id);
  return Object.freeze({
    ...base,
    version,
    dependencyChain:Object.freeze(base.dependencyChain.map(entry=>Object.freeze(
      entry.id===id?{...entry,version}:entry
    ))),
  });
}

test("Admin launches reproducible physical experiments only from resolved ancestry coverage",()=>{
  const request=adminPopulationLabExperimentRequest({
    action:"experiment",
    coverageKey:"reference:east_asia.korean",
    referencePopulation:"east_asia.korean",
    coverage:"broad",
    populations:["Korean"],
    threadIds:["thr_one"],
    places:[{displayName:"Seoul, South Korea"}],
    calibration:calibration("east_asia.korean",2),
    count:24,
  },{
    experimentId:"plexp_test_001",
    requestedAt:"2026-10-01T00:00:00.000Z",
  });

  assert.equal(request.referencePopulation,"east_asia.korean","launch lost reference population");
  assert.equal(request.count,24,"launch lost cohort size");
  assert.equal(request.seed,"appearance:reference:east_asia.korean:east_asia.korean:2","launch seed is not reproducible");
  assert.equal(request.source.coverageKey,"reference:east_asia.korean","launch lost coverage provenance");
  assert.equal(request.images,false,"Admin physical experiment unexpectedly requested provider images");
});

test("Admin refuses to experiment around missing ancestry provenance",()=>{
  assert.throws(
    ()=>adminPopulationLabExperimentRequest({
      action:"experiment",
      coverageKey:"missing",
      referencePopulation:null,
    },{
      experimentId:"plexp_test_missing",
      requestedAt:"2026-10-01T00:00:00.000Z",
    }),
    /must have a reference population/u,
    "missing ancestry provenance was treated as calibration input",
  );
});


test("Admin visual experiments delegate generation only to Asset Generator reconcile",async()=>{
  let observed=null;
  const job={jobId:"assetjob_fixture"};
  const result=await reconcileAdminPopulationLabAsset({
    FIBRE_PRIVATE_TOKEN:"fixture-private-token-12345",
    ASSET_GENERATOR:{
      async fetch(request){
        observed={
          url:request.url,
          method:request.method,
          token:request.headers.get("x-fibre-private-token"),
          body:await request.json(),
        };
        return Response.json({ok:true,result:{state:"pending",workflowStatus:"queued"}});
      },
    },
  },job);

  assert.equal(result.state,"pending","Admin changed Asset Generator reconciliation state");
  assert.equal(observed.url,"https://fibre.internal/internal/generation/reconcile","Admin did not route service call through InfraDriver");
  assert.equal(observed.method,"POST","Admin used the wrong Asset Generator method");
  assert.equal(observed.token,"fixture-private-token-12345","Admin did not use the private service boundary");
  assert.deepEqual(observed.body,{job},"Admin changed the deterministic Asset Generator job");
});


test("rejected experiment rerun preserves source and cohort seed under a new identity",()=>{
  const original=adminPopulationLabExperimentRequest({
    action:"experiment",
    coverageKey:"reference:east_asia.korean",
    referencePopulation:"east_asia.korean",
    coverage:"broad",
    populations:["Korean"],
    threadIds:["thr_one"],
    places:[{displayName:"Seoul, South Korea"}],
    calibration:calibration("east_asia.korean",2),
    count:24,
  },{
    experimentId:"plexp_original",
    requestedAt:"2026-10-01T00:00:00.000Z",
  });

  const rerun=adminPopulationLabRerunRequest(original,{
    experimentId:"plexp_rerun",
    requestedAt:"2026-10-02T00:00:00.000Z",
  });

  assert.notEqual(rerun.experimentId,original.experimentId,"rerun overwrote experiment identity");
  assert.equal(rerun.seed,original.seed,"rerun changed deterministic cohort seed");
  assert.deepEqual(rerun.source,original.source,"rerun changed experiment source evidence");
});


test("Admin shadow experiment preserves the baseline cohort seed and source",()=>{
  const baseline=adminPopulationLabExperimentRequest({
    action:"experiment",
    coverageKey:"reference:east_asia.japanese",
    referencePopulation:"east_asia.japanese",
    coverage:"partial",
    populations:["Japanese"],
    threadIds:["thr_one"],
    places:[{displayName:"Tokyo, Japan"}],
    calibration:calibration("east_asia.japanese",1),
    count:24,
  },{
    experimentId:"plexp_shadow_base",
    requestedAt:"2026-10-02T18:00:00.000Z",
  });

  const shadow=adminPopulationLabShadowExperimentRequest(
    baseline,
    {
      values:{faceBreadth:.18},
      variation:{},
      rationale:"Fixture proposal with explicit provenance.",
      evidence:["doi:10.0000/fibre-shadow-fixture"],
    },
    {
      experimentId:"plexp_shadow_candidate",
      requestedAt:"2026-10-02T18:01:00.000Z",
    },
  );

  assert.notEqual(shadow.experimentId,baseline.experimentId,"shadow experiment reused baseline identity");
  assert.equal(shadow.seed,baseline.seed,"shadow experiment changed deterministic cohort seed");
  assert.equal(shadow.source.shadowOfExperimentId,baseline.experimentId,"shadow experiment lost baseline provenance");
  assert.deepEqual(shadow.source.calibration,baseline.source.calibration,"shadow experiment changed base calibration snapshot");
  assert.equal(shadow.shadowCalibration.values.faceBreadth,.18,"shadow experiment lost proposed calibration");
});


test("Admin permits the exact admitted refinement to seed the next shadow",()=>{
  const baseManifest={
    experimentId:"plexp_admitted_v2",
    referencePopulation:"middle_east.egypt",
    count:24,
    seed:"appearance:egypt",
    source:{calibration:calibration("middle_east.egypt",1)},
    shadowCalibration:{
      referencePopulation:"middle_east.egypt",
      baseCalibration:calibration("middle_east.egypt",1),
      values:{noseBreadth:.12},
      variation:{},
      rationale:"Admitted v2",
      evidence:[{source:"fixture",note:null}],
    },
  };
  const current={
    ...calibration("middle_east.egypt",2),
    admissionEvidence:{approvalExperimentId:"plexp_admitted_v2"},
  };

  assert.equal(
    adminPopulationLabShadowBaseCalibration(baseManifest,current),
    current,
    "exact admitted refinement could not seed the next shadow",
  );
  assert.throws(
    ()=>adminPopulationLabShadowBaseCalibration(baseManifest,{
      ...current,
      admissionEvidence:{approvalExperimentId:"plexp_other"},
    }),
    /current admitted calibration evidence/u,
    "unadmitted refinement was allowed to seed another shadow",
  );
});


test("rejected shadow rerun preserves the exact shadow proposal",()=>{
  const baseline=adminPopulationLabExperimentRequest({
    action:"experiment",
    coverageKey:"reference:east_asia.japanese",
    referencePopulation:"east_asia.japanese",
    coverage:"partial",
    calibration:calibration("east_asia.japanese",1),
    count:24,
  },{
    experimentId:"plexp_shadow_rerun_base",
    requestedAt:"2026-10-02T18:00:00.000Z",
  });
  const shadow=adminPopulationLabShadowExperimentRequest(
    baseline,
    {
      values:{faceBreadth:.18},
      variation:{familyFactorMultiplier:1.08},
      rationale:"Fixture shadow proposal.",
      evidence:["doi:10.0000/fibre-shadow-rerun"],
    },
    {
      experimentId:"plexp_shadow_rerun_first",
      requestedAt:"2026-10-02T18:01:00.000Z",
    },
  );
  const rerun=adminPopulationLabRerunRequest(shadow,{
    experimentId:"plexp_shadow_rerun_second",
    requestedAt:"2026-10-02T18:02:00.000Z",
  });

  assert.equal(rerun.seed,shadow.seed,"shadow rerun changed cohort seed");
  assert.deepEqual(rerun.shadowCalibration,shadow.shadowCalibration,"shadow rerun changed proposed calibration");
  assert.deepEqual(rerun.source,shadow.source,"shadow rerun changed research provenance");
});


test("numerical experiment lifecycle publishes Admin live hints",async()=>{
  const transitions=[];
  const published=[];
  const store={
    async running(experimentId){
      transitions.push("running:"+experimentId);
      return {status:"running"};
    },
    async complete(experimentId){
      transitions.push("completed:"+experimentId);
      return {status:"completed"};
    },
    async fail(experimentId){
      transitions.push("failed:"+experimentId);
      return {status:"failed"};
    },
  };
  const wrapped=withExperimentLifecycleHints(
    store,
    async(experimentId,aspect)=>published.push([experimentId,aspect]),
  );

  await wrapped.running("plexp_live");
  await wrapped.complete("plexp_live");
  await wrapped.fail("plexp_failed");

  assert.deepEqual(
    transitions,
    ["running:plexp_live","completed:plexp_live","failed:plexp_failed"],
    "lifecycle wrapper changed experiment state transitions",
  );
  assert.deepEqual(
    published,
    [
      ["plexp_live","running"],
      ["plexp_live","completed"],
      ["plexp_failed","failed"],
    ],
    "numerical lifecycle stopped publishing Admin live hints",
  );
});


test("Population Lab comparison reports exact calibration and observed mean shifts",()=>{
  const shadow={
    referencePopulation:"middle_east.egypt",
    values:{noseBreadth:.12},
    variation:{familyFactorMultiplier:1.08},
  };
  const baselineResult={
    stats:{physicalCalibration:{populations:{
      "middle_east.egypt":{loci:{noseBreadth:{prior:-.04,mean:-.021}}},
    }}},
  };
  const shadowResult={
    stats:{physicalCalibration:{populations:{
      "middle_east.egypt":{loci:{noseBreadth:{prior:.12,mean:.139}}},
    }}},
  };

  assert.deepEqual(
    populationLabComparisonChanges({shadow,baselineResult,shadowResult}),
    [
      {
        kind:"value",
        parameter:"noseBreadth",
        before:-.04,
        after:.12,
        baselineMean:-.021,
        shadowMean:.139,
        baselineSd:null,
        shadowSd:null,
        baselineP05:null,
        shadowP05:null,
        baselineP95:null,
        shadowP95:null,
      },
      {
        kind:"variation",
        parameter:"familyFactorMultiplier",
        before:null,
        after:1.08,
        baselineMean:null,
        shadowMean:null,
        baselineSd:null,
        shadowSd:null,
        baselineP05:null,
        shadowP05:null,
        baselineP95:null,
        shadowP95:null,
      },
    ],
    "comparison stopped exposing the reviewed before/after evidence",
  );
});


test("visual comparison pairs only the same deterministic cohort",()=>{
  assert.equal(
    populationLabSameCohort(
      {seed:"appearance:egypt:1",count:24},
      {seed:"appearance:egypt:1",count:24},
    ),
    true,
    "matching deterministic cohorts stopped pairing",
  );
  assert.equal(
    populationLabSameCohort(
      {seed:"appearance:egypt:1",count:24},
      {seed:"appearance:egypt:2",count:24},
    ),
    false,
    "different cohort seeds were paired as the same people",
  );
  assert.equal(
    populationLabSameCohort(
      {seed:"appearance:egypt:1",count:24},
      {seed:"appearance:egypt:1",count:48},
    ),
    false,
    "different cohort sizes were paired as the same people",
  );
});


test("Population Lab comparison keeps cohort health side by side",()=>{
  const baselineResult={stats:{physicalCalibration:{
    warnings:[],
    populations:{"middle_east.egypt":{
      uniqueShare:1,
      maxCenterError:.031,
      medianSd:.091,
      minSd:.061,
      maxSd:.142,
      resemblance:{siblingToUnrelatedRatio:.61,childToUnrelatedRatio:.67},
    }},
  }}};
  const shadowResult={stats:{physicalCalibration:{
    warnings:["middle_east.egypt center drift >0.08"],
    populations:{"middle_east.egypt":{
      uniqueShare:1,
      maxCenterError:.034,
      medianSd:.091,
      minSd:.061,
      maxSd:.142,
      resemblance:{siblingToUnrelatedRatio:.61,childToUnrelatedRatio:.67},
    }},
  }}};

  assert.deepEqual(
    populationLabComparisonHealth({
      referencePopulation:"middle_east.egypt",
      baselineResult,
      shadowResult,
    }),
    [
      {metric:"Unique share",baseline:1,shadow:1},
      {metric:"Max center error",baseline:.031,shadow:.034},
      {metric:"Median spread",baseline:.091,shadow:.091},
      {metric:"Min spread",baseline:.061,shadow:.061},
      {metric:"Max spread",baseline:.142,shadow:.142},
      {metric:"Sibling / unrelated",baseline:.61,shadow:.61},
      {metric:"Child / unrelated",baseline:.67,shadow:.67},
      {metric:"Warnings",baseline:0,shadow:1,integer:true},
    ],
    "comparison health stopped preserving baseline/refinement evidence",
  );
});


test("comparison resolves the durable baseline linkage",()=>{
  assert.equal(
    populationLabComparisonBaselineId({
      shadowManifest:{source:{}},
      shadowExperiment:{
        baselineExperimentId:"baseline_catalog",
        summary:{shadowOfExperimentId:"baseline_summary"},
      },
    }),
    "baseline_catalog",
    "comparison lost durable baseline linkage",
  );
  assert.equal(
    populationLabComparisonBaselineId({
      shadowManifest:{source:{shadowOfExperimentId:"baseline_manifest"}},
      shadowExperiment:{baselineExperimentId:"baseline_catalog"},
    }),
    "baseline_manifest",
    "manifest baseline linkage stopped taking precedence",
  );
});
