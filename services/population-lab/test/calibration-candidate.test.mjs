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

async function completedMoroccoExperiment(store,experimentId,calibration){
  await store.start(experimentId,{
    startedAt:"2026-10-02T00:00:00.000Z",
    referencePopulation:"afr_north.morocco",
    source:{calibration},
  });
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>evidence</html>");
  await store.complete(experimentId,{
    people:1,
    warnings:0,
    referencePopulation:"afr_north.morocco",
  });
}

test("calibration candidate is durable evidence, not appearance authority",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_candidate_morocco";
  const beforeCalibration=referencePopulationCalibration("afr_north.morocco");
  const beforePrior=referencePopulationPrior("afr_north.morocco");

  await completedMoroccoExperiment(store,experimentId,beforeCalibration);
  const candidate=await store.putCalibrationCandidate(experimentId,{
    values:{faceBreadth:.12,noseBreadth:.08},
    variation:{familyFactorMultiplier:1.08},
    rationale:"Bounded Population Lab evidence supports a Morocco-specific refinement.",
    createdAt:"2026-10-02T00:01:00.000Z",
  });

  assert.equal(candidate.baseCalibration.version,1,"candidate lost the reviewed base version");
  assert.equal(candidate.proposedCalibration.version,2,"candidate did not propose one local version advance");
  assert.deepEqual(
    candidate.proposedCalibration.values.map(change=>change.locus),
    ["faceBreadth","noseBreadth"],
    "candidate changed the wrong physical axes",
  );
  assert.deepEqual(
    candidate.proposedCalibration.variation.map(change=>change.parameter),
    ["familyFactorMultiplier"],
    "candidate changed the wrong variation parameters",
  );

  const experiment=await store.get(experimentId);
  const candidateRef=experiment.artifacts.calibrationCandidate?.objectRef;
  assert.equal(candidateRef,populationLabExperimentRef(experimentId,"calibration:candidate"),
    "candidate evidence was not indexed with the experiment");
  const stored=await store.getArtifact(candidateRef);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(stored.bytes)),
    candidate,
    "stored candidate evidence changed",
  );

  assert.deepEqual(referencePopulationCalibration("afr_north.morocco"),beforeCalibration,
    "candidate changed calibration authority");
  assert.deepEqual(referencePopulationPrior("afr_north.morocco"),beforePrior,
    "candidate changed the active physical prior");

  await assert.rejects(
    ()=>store.putCalibrationCandidate(experimentId,{
      values:{faceBreadth:.2},
      rationale:"second candidate",
    }),
    /already exists/u,
    "experiment accepted competing immutable candidates",
  );

  const deleted=await store.delete(experimentId);
  assert.equal(deleted.artifactCount,5,"candidate evidence escaped whole-experiment cleanup");
});

test("candidate requires the experiment's complete admitted calibration snapshot",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_candidate_incomplete";
  const incomplete={
    ...referencePopulationCalibration("afr_north.morocco"),
    prior:null,
  };
  await completedMoroccoExperiment(store,experimentId,incomplete);

  await assert.rejects(
    ()=>store.putCalibrationCandidate(experimentId,{
      values:{faceBreadth:.12},
      rationale:"incomplete evidence must not define a calibration candidate",
    }),
    /prior snapshot is required/u,
    "candidate accepted incomplete calibration authority",
  );
});
