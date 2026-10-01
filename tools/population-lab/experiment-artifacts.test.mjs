import test from "node:test";
import assert from "node:assert/strict";
import {createMemoryInfraDriver} from "#infra/providers/local";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "../../services/population-lab/src/experiment-artifacts.mjs";

test("Population Lab experiment store persists one provider-neutral experiment artifact set",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_test_001";

  await store.start(experimentId,{
    contract:"fibre-population-lab-manifest-v0.1",
    startedAt:"2026-10-01T00:00:00.000Z",
    count:2,
  });
  await store.putPopulation(experimentId,{people:[{id:"one"},{id:"two"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putImage(experimentId,{ordinal:1,role:"geometry",bytes:new Uint8Array([1,2,3])});
  await store.putImage(experimentId,{ordinal:1,role:"portrait",bytes:new Uint8Array([4,5,6])});
  await store.putReport(experimentId,"<html>report</html>");
  await store.complete(experimentId,{people:2,warnings:0});

  const experiment=await store.get(experimentId);
  assert.equal(experiment.status,"completed","experiment did not complete");
  assert.equal(experiment.images.length,2,"experiment lost image artifacts");
  assert.equal(experiment.summary.people,2,"experiment summary lost population count");
  for(const kind of ["manifest","population","result","report"]){
    assert.ok(experiment.artifacts[kind]?.objectRef,kind+" artifact is missing");
  }

  const report=await store.getArtifact(populationLabExperimentRef(experimentId,"report"));
  assert.equal(new TextDecoder().decode(report.bytes),"<html>report</html>","report bytes changed");

  const page=await store.list();
  assert.deepEqual(page.experiments.map(value=>value.experimentId),[experimentId],"experiment catalog listing is wrong");

  const deleted=await store.delete(experimentId);
  assert.equal(deleted.deleted,true,"experiment was not deleted");
  assert.equal(deleted.artifactCount,6,"experiment artifacts were not fully deleted");
  assert.equal(await store.get(experimentId),null,"deleted experiment remained indexed");
  assert.equal(await store.getArtifact(populationLabExperimentRef(experimentId,"report")),null,"deleted report bytes remained");
});
