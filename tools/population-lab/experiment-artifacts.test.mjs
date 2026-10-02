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


test("visual experiment lifecycle blocks deletion until visual work is terminal",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_visual_lifecycle";

  await store.start(experimentId,{
    startedAt:"2026-10-01T00:00:00.000Z",
    count:8,
  });
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>base</html>");
  await store.complete(experimentId,{people:1,warnings:0,images:0});

  await store.queueVisual(experimentId,{
    experimentId,
    requestedAt:"2026-10-01T00:01:00.000Z",
    sampleSize:4,
  });
  await assert.rejects(
    ()=>store.delete(experimentId),
    /queued or running experiment cannot be deleted/u,
    "queued visual work did not protect experiment artifacts",
  );
  await store.runningVisual(experimentId,{startedAt:"2026-10-01T00:01:01.000Z"});
  await assert.rejects(
    ()=>store.delete(experimentId),
    /queued or running experiment cannot be deleted/u,
    "running visual work did not protect experiment artifacts",
  );
  await store.failVisual(experimentId,new Error("fixture visual failure"));
  await assert.rejects(
    ()=>store.queueVisual(experimentId,{
      experimentId,
      requestedAt:"2026-10-01T00:02:00.000Z",
      sampleSize:4,
    }),
    /already has an attempt/u,
    "visual experiment silently reused immutable attempt identity",
  );
  assert.equal((await store.delete(experimentId)).deleted,true,"failed visual experiment could not be deleted");
});


test("completed visual evidence indexes generated assets without copying and deletes the experiment-owned set",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_visual_cleanup";

  await store.start(experimentId,{startedAt:"2026-10-01T00:00:00.000Z",count:8});
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>base</html>");
  await store.complete(experimentId,{people:1,warnings:0,images:0});
  await store.queueVisual(experimentId,{
    experimentId,
    requestedAt:"2026-10-01T00:01:00.000Z",
    sampleSize:4,
  });
  await store.runningVisual(experimentId,{startedAt:"2026-10-01T00:01:01.000Z"});

  const imageRef=populationLabExperimentRef(experimentId,"image:001:geometry");
  const receiptRef=populationLabExperimentRef(experimentId,"image:001:geometry:receipt");
  await infra.objects.putImmutable(imageRef,new Uint8Array([1,2,3]),"sha256:image",{mediaType:"image/png"});
  await infra.objects.putImmutable(receiptRef,new Uint8Array([4,5,6]),"sha256:receipt",{kind:"receipt"});

  await store.adoptImage(experimentId,{
    ordinal:1,
    role:"geometry",
    objectRef:imageRef,
    digest:"sha256:image",
    mediaType:"image/png",
  });
  await store.adoptArtifact(experimentId,{
    key:"visualReceipt001Geometry",
    objectRef:receiptRef,
    digest:"sha256:receipt",
  });
  await store.putVisualReport(experimentId,"<html>visual</html>");
  await store.completeVisual(experimentId,{sampleSize:1,images:1});

  const experiment=await store.get(experimentId);
  assert.equal(experiment.images[0].objectRef,imageRef,"generated image was not indexed");
  assert.equal(experiment.artifacts.visualReceipt001Geometry.objectRef,receiptRef,"generation receipt was not indexed");
  assert.ok(experiment.artifacts.visualReport?.objectRef,"visual report was not indexed");

  const deleted=await store.delete(experimentId);
  assert.equal(deleted.artifactCount,8,"experiment-owned visual artifacts were not fully deleted");
  assert.equal(await infra.objects.get(imageRef),null,"generated visual image remained after experiment deletion");
  assert.equal(await infra.objects.get(receiptRef),null,"generated visual receipt remained after experiment deletion");
});


test("visual launch failure retries only the exact persisted manifest before execution starts",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_visual_launch_retry";
  await store.start(experimentId,{startedAt:"2026-10-01T00:00:00.000Z",count:8});
  await store.putPopulation(experimentId,{people:[{id:"one"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>base</html>");
  await store.complete(experimentId,{people:1,warnings:0,images:0});

  const request={
    experimentId,
    requestedAt:"2026-10-01T00:01:00.000Z",
    sampleSize:4,
  };
  await store.queueVisual(experimentId,request);
  await store.failVisual(experimentId,new Error("workflow launch rejected provider id"));

  const retried=await store.retryQueuedVisual(experimentId);
  assert.deepEqual(retried,request,"visual launch retry changed immutable manifest");
  assert.equal((await store.get(experimentId)).visual.status,"queued","visual launch retry did not return to queued state");
});
