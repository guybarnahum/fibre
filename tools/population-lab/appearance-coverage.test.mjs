import assert from "node:assert/strict";
import test from "node:test";

import { PHYSICAL_GENOME_VERSION } from "../../core/src/human-appearance/index.mjs";
import { analyzeAppearanceCoverage } from "../../core/src/population-context/appearance-coverage.mjs";

const thread=(threadId,name,referencePopulation)=>({
  threadId,
  displayName:name,
  birthPlace:"Test City",
  birthLocation:{displayName:"Test City",country:"Testland",city:"Test City",lat:10,long:20},
  physicalGenomeVersion:PHYSICAL_GENOME_VERSION,
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
        maternal:[{populationId:"morocco",population:"Moroccan family",share:1,referencePopulation:"afr_north"}],
        paternal:[{populationId:"morocco",population:"Moroccan family",share:1,referencePopulation:"afr_north"}],
      },
    },
  ];

  const result=analyzeAppearanceCoverage({threads,ancestryEvidence});

  assert.equal(result.threadCount,3);
  assert.equal(result.coverage.partial,2,"Korean calibration should remain explicitly partial");
  assert.equal(result.coverage.fallback,2,"North-African fallback was not exposed");
  assert.equal(result.coverage.missing,1,"missing ancestry provenance was hidden");
  assert.equal(result.holes[0].coverage,"missing");
  assert.equal(
    result.holes.some((hole)=>hole.referencePopulation==="afr_north.morocco"),
    true,
    "stable Moroccan ancestry did not resolve to the current calibration node",
  );
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


test("physical model drift is reported as appearance migration",()=>{
  const current=thread("thr_current","Current Thread");
  const stale={...thread("thr_stale","Stale Thread"),physicalGenomeVersion:"physical-genome-v0.1"};
  const evidence=(threadId)=>({
    threadId,
    calibrationDependencies:[],
    physicalAncestry:{
      maternal:[{population:"Family",share:1,referencePopulation:"west_asia"}],
      paternal:[{population:"Family",share:1,referencePopulation:"west_asia"}],
    },
  });

  const result=analyzeAppearanceCoverage({
    threads:[current,stale],
    ancestryEvidence:[evidence("thr_current"),evidence("thr_stale")],
  });

  const staleCandidate=result.migrationCandidates.find((entry)=>entry.threadId==="thr_stale");
  assert.equal(staleCandidate.reasons.includes("physical_model_outdated"),true);
  assert.equal(
    result.migrationCandidates.some((entry)=>entry.threadId==="thr_current"&&entry.reasons.includes("physical_model_outdated")),
    false,
    "current physical model was marked stale",
  );
});


test("admitted Thread without durable physical ancestry is a visible coverage hole",()=>{
  const result=analyzeAppearanceCoverage({
    threads:[{
      threadId:"thr_new_birth",
      displayName:"New Birth",
      birthPlace:"Tucson, United States",
      birthLocation:{displayName:"Tucson, United States",country:"United States",city:"Tucson",lat:32.22,long:-110.97},
      physicalGenomeVersion:null,
    }],
    ancestryEvidence:[],
  });

  assert.equal(result.coverage.missing,1);
  assert.equal(result.holes[0].threadIds.includes("thr_new_birth"),true);
  assert.equal(result.migrationCandidates.length,0,"missing ancestry provenance became an appearance migration");
});
