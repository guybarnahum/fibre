import test from "node:test";
import assert from "node:assert/strict";

import {adminPopulationLabExperimentRequest} from "./appearance-experiments.mjs";

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
