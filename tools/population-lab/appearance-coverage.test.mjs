import assert from "node:assert/strict";
import test from "node:test";

import { analyzeAppearanceCoverage } from "../../core/src/population-context/appearance-coverage.mjs";

const thread=(threadId,name,referencePopulation)=>({
  threadId,
  displayName:name,
  birthPlace:"Test City",
  birthLocation:{displayName:"Test City",country:"Testland",city:"Test City",lat:10,long:20},
  physicalGenomeVersion:"physical-genome-v0.2",
  referencePopulation,
});

test("appearance coverage distinguishes explicit, broad, fallback, and missing ancestry",()=>{
  const threads=[
    thread("thr_korean","Korean Thread"),
    thread("thr_moroccan","Moroccan Thread"),
    thread("thr_missing","Missing Provenance"),
  ];
  const ancestryEvidence=[
    {
      threadId:"thr_korean",
      physicalAncestry:{
        maternal:[{population:"Korean family",share:1,referencePopulation:"east_asia.korean"}],
        paternal:[{population:"Korean family",share:1,referencePopulation:"east_asia.korean"}],
      },
    },
    {
      threadId:"thr_moroccan",
      physicalAncestry:{
        maternal:[{population:"Moroccan family",share:1,referencePopulation:"afr_north"}],
        paternal:[{population:"Moroccan family",share:1,referencePopulation:"afr_north"}],
      },
    },
  ];

  const result=analyzeAppearanceCoverage({threads,ancestryEvidence});

  assert.equal(result.threadCount,3);
  assert.equal(result.coverage.partial,2,"Korean calibration should remain explicitly partial");
  assert.equal(result.coverage.fallback,2,"North-African fallback was not exposed");
  assert.equal(result.coverage.missing,1,"missing ancestry provenance was hidden");
  assert.equal(result.holes[0].coverage,"missing");
  assert.equal(result.holes.some((hole)=>hole.referencePopulation==="afr_north"),true);
  assert.equal(result.holes.some((hole)=>hole.referencePopulation==="east_asia.korean"),true);
});

test("appearance coverage treats root priors as broad rather than absent",()=>{
  const result=analyzeAppearanceCoverage({
    threads:[thread("thr_south_asia","South Asian Thread")],
    ancestryEvidence:[{
      threadId:"thr_south_asia",
      physicalAncestry:{
        maternal:[{population:"Punjabi family",share:1,referencePopulation:"south_asia"}],
        paternal:[{population:"Punjabi family",share:1,referencePopulation:"south_asia"}],
      },
    }],
  });

  assert.equal(result.coverage.broad,2);
  assert.equal(result.holes[0].referencePopulation,"south_asia");
  assert.equal(result.holes[0].priority,4);
});
