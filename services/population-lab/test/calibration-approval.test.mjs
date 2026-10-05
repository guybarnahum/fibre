import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";
import {
  referencePopulationCalibration,
  referencePopulationPrior,
} from "../../../core/src/human-appearance/index.mjs";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "../src/experiment-artifacts.mjs";
import {projectCalibrationCandidateImpact} from "../src/calibration-approval.mjs";

test("approved calibration remains evidence until runtime admission",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_approval_japanese";
  const calibration=referencePopulationCalibration("east_asia.japanese");
  const beforeCalibration=referencePopulationCalibration("east_asia.japanese");
  const beforePrior=referencePopulationPrior("east_asia.japanese");

  await store.start(experimentId,{
    experimentId,
    startedAt:"2026-10-02T22:00:00.000Z",
    referencePopulation:"east_asia.japanese",
    source:{calibration},
  });
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>baseline</html>");
  await store.complete(experimentId,{people:1,referencePopulation:"east_asia.japanese"});

  await store.queueVisual(experimentId,{
    experimentId,
    requestedAt:"2026-10-02T22:01:00.000Z",
    sampleSize:1,
  });
  await store.runningVisual(experimentId,{startedAt:"2026-10-02T22:01:01.000Z"});
  await store.putImage(experimentId,{ordinal:1,role:"geometry",bytes:new Uint8Array([1])});
  await store.putImage(experimentId,{ordinal:1,role:"portrait",bytes:new Uint8Array([2])});
  await store.completeVisual(experimentId,{
    sampleSize:1,
    images:2,
    referencePopulation:"east_asia.japanese",
  });
  await store.putVisualReview(experimentId,{
    decision:"supports_candidate",
    samples:[{
      ordinal:1,
      geometryFidelity:5,
      identityContinuity:5,
      surfaceRealism:4,
    }],
  });
  const candidate=await store.putCalibrationCandidate(experimentId,{
    values:{faceBreadth:.35},
    rationale:"Reviewed fixture refinement.",
  });

  const impact=projectCalibrationCandidateImpact({
    candidate,
    coverage:{
      contract:"fibre-appearance-coverage-v0.1",
      lineages:[
        {
          threadId:"thr_japanese",
          calibration:{dependencyChain:calibration.dependencyChain},
        },
        {
          threadId:"thr_unrelated",
          calibration:{dependencyChain:referencePopulationCalibration("south_asia").dependencyChain},
        },
      ],
    },
  });
  assert.deepEqual(impact.threadIds,["thr_japanese"],"approval impact included unrelated Threads");

  const approval=await store.putCalibrationApproval(experimentId,{
    approvedBy:"operator@example.com",
    approvedAt:"2026-10-02T22:02:00.000Z",
    impact,
    currentCalibration:calibration,
  });
  assert.equal(approval.approvedBy,"operator@example.com","approval lost human reviewer identity");
  assert.equal(approval.admission.id,"east_asia.japanese","approval lost admission target");
  assert.equal(approval.admission.version,calibration.version+1,"approval lost next calibration version");
  assert.equal(approval.admission.values.faceBreadth,.35,"approval lost reviewed value");
  assert.equal(approval.impact.threadCount,1,"approval lost projected Thread impact");

  const experiment=await store.get(experimentId);
  assert.equal(
    experiment.artifacts.calibrationApproval.objectRef,
    populationLabExperimentRef(experimentId,"calibration:approval"),
    "approval evidence was not indexed",
  );

  assert.deepEqual(referencePopulationCalibration("east_asia.japanese"),beforeCalibration,
    "approval silently changed calibration authority");
  assert.deepEqual(referencePopulationPrior("east_asia.japanese"),beforePrior,
    "approval silently changed canonical prior");

  await assert.rejects(
    ()=>store.putCalibrationApproval(experimentId,{approvedBy:"other@example.com",impact,currentCalibration:calibration}),
    /already exists/u,
    "experiment accepted competing immutable approvals",
  );
  await assert.rejects(
    ()=>store.delete(experimentId),
    /approved calibration experiment cannot be deleted/u,
    "approved calibration evidence was deletable",
  );
});

test("approval rejects a candidate whose frozen base is no longer World current",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_stale_approval";
  const calibration=referencePopulationCalibration("east_asia.japanese");

  await store.start(experimentId,{
    experimentId,
    startedAt:"2026-10-02T23:00:00.000Z",
    referencePopulation:"east_asia.japanese",
    source:{calibration},
  });
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>baseline</html>");
  await store.complete(experimentId,{people:1,referencePopulation:"east_asia.japanese"});
  await store.queueVisual(experimentId,{experimentId,requestedAt:"2026-10-02T23:01:00.000Z",sampleSize:1});
  await store.runningVisual(experimentId);
  await store.putImage(experimentId,{ordinal:1,role:"geometry",bytes:new Uint8Array([1])});
  await store.putImage(experimentId,{ordinal:1,role:"portrait",bytes:new Uint8Array([2])});
  await store.completeVisual(experimentId,{sampleSize:1,images:2,referencePopulation:"east_asia.japanese"});
  await store.putVisualReview(experimentId,{
    decision:"supports_candidate",
    samples:[{ordinal:1,geometryFidelity:5,identityContinuity:5,surfaceRealism:5}],
  });
  const candidate=await store.putCalibrationCandidate(experimentId,{
    values:{faceBreadth:.35},
    rationale:"Stale-base fixture.",
  });
  const impact={
    referencePopulation:candidate.referencePopulation,
    fromVersion:candidate.baseCalibration.version,
    toVersion:candidate.proposedCalibration.version,
    threadIds:[],
    threadCount:0,
    lineageCount:0,
  };
  await assert.rejects(
    ()=>store.putCalibrationApproval(experimentId,{
      approvedBy:"operator@example.com",
      impact,
      currentCalibration:{
        ...calibration,
        version:calibration.version+1,
        dependencyChain:calibration.dependencyChain.map(entry=>
          entry.id===calibration.id?{...entry,version:entry.version+1}:entry
        ),
      },
    }),
    /base is no longer current/u,
    "approval accepted stale calibration evidence",
  );
});

test("candidate impact includes descendant dependency chains",()=>{
  const target=referencePopulationCalibration("east_asia");
  const candidate={
    contract:"fibre-population-lab-calibration-candidate-v0.1",
    experimentId:"exp_east_asia",
    referencePopulation:"east_asia",
    baseCalibration:{id:"east_asia",version:target.version,dependencyChain:target.dependencyChain},
    proposedCalibration:{id:"east_asia",version:target.version+1,values:[],variation:[]},
    rationale:"fixture",
    createdAt:"2026-10-02T22:00:00.000Z",
  };
  const impact=projectCalibrationCandidateImpact({
    candidate,
    coverage:{
      contract:"fibre-appearance-coverage-v0.1",
      lineages:[
        {threadId:"thr_jp",calibration:referencePopulationCalibration("east_asia.japanese")},
        {threadId:"thr_kr",calibration:referencePopulationCalibration("east_asia.korean")},
        {threadId:"thr_sa",calibration:referencePopulationCalibration("south_asia")},
      ],
    },
  });
  assert.deepEqual(impact.threadIds,["thr_jp","thr_kr"],"parent calibration impact missed descendants");
});
