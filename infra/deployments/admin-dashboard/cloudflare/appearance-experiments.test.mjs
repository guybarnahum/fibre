import test from "node:test";
import assert from "node:assert/strict";

import {
  adminPopulationLabExperimentRequest,
  adminPopulationLabRerunSpec,
  adminPopulationLabShadowExperimentRequest,
  reconcileAdminPopulationLabAsset,
} from "./appearance-experiments.mjs";

test("Admin launches reproducible physical experiments only from resolved ancestry coverage",()=>{
  const request=adminPopulationLabExperimentRequest({
    action:"experiment",
    coverageKey:"reference:east_asia.korean",
    referencePopulation:"east_asia.korean",
    coverage:"broad",
    populations:["Korean"],
    threadIds:["thr_one"],
    places:[{displayName:"Seoul, South Korea"}],
    calibration:{id:"east_asia.korean",version:2},
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
    calibration:{id:"east_asia.korean",version:2},
    count:24,
  },{
    experimentId:"plexp_original",
    requestedAt:"2026-10-01T00:00:00.000Z",
  });

  const rerun=adminPopulationLabExperimentRequest(
    adminPopulationLabRerunSpec(original),
    {
      experimentId:"plexp_rerun",
      requestedAt:"2026-10-02T00:00:00.000Z",
    },
  );

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
    calibration:{id:"east_asia.japanese",version:1},
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
