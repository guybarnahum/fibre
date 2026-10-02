import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "../src/experiment-artifacts.mjs";
import {buildPopulationLabVisualReview} from "../src/visual-review.mjs";

function completedVisualExperiment(){
  return {
    experimentId:"exp_visual_review",
    status:"completed",
    summary:{referencePopulation:"east_asia.japanese"},
    visual:{
      status:"completed",
      sampleSize:2,
      summary:{sampleSize:2,referencePopulation:"east_asia.japanese"},
    },
    images:[
      {ordinal:1,role:"geometry",objectRef:"population-lab:experiment:exp_visual_review:image:001:geometry",digest:"sha256:g1"},
      {ordinal:1,role:"portrait",objectRef:"population-lab:experiment:exp_visual_review:image:001:portrait",digest:"sha256:p1"},
      {ordinal:2,role:"geometry",objectRef:"population-lab:experiment:exp_visual_review:image:002:geometry",digest:"sha256:g2"},
      {ordinal:2,role:"portrait",objectRef:"population-lab:experiment:exp_visual_review:image:002:portrait",digest:"sha256:p2"},
    ],
  };
}

const input={
  decision:"supports_candidate",
  samples:[
    {ordinal:1,geometryFidelity:5,identityContinuity:4,surfaceRealism:5},
    {ordinal:2,geometryFidelity:4,identityContinuity:4,surfaceRealism:3},
  ],
  note:"Renderer preserved structure across the bounded sample.",
};

test("visual review scores every A/B sample and binds exact image evidence",()=>{
  const review=buildPopulationLabVisualReview({
    experiment:completedVisualExperiment(),
    input,
    reviewedAt:"2026-10-02T17:00:00.000Z",
  });

  assert.deepEqual(review.scores,{
    geometryFidelity:4.5,
    identityContinuity:4,
    surfaceRealism:4,
  },"review summary changed");
  assert.equal(review.evidence.images.length,4,"review lost exact image evidence");
  assert.equal(review.decision,"supports_candidate");
  assert.equal(review.referencePopulation,"east_asia.japanese");

  assert.throws(
    ()=>buildPopulationLabVisualReview({
      experiment:completedVisualExperiment(),
      input:{...input,samples:input.samples.slice(0,1)},
    }),
    /score every sample/u,
    "partial visual review was accepted",
  );

  const missingPair=completedVisualExperiment();
  missingPair.images=missingPair.images.filter(image=>!(image.ordinal===2&&image.role==="portrait"));
  assert.throws(
    ()=>buildPopulationLabVisualReview({experiment:missingPair,input}),
    /complete A\/B image evidence/u,
    "review accepted an incomplete A/B evidence pair",
  );
});

test("experiment store persists one immutable visual review",async()=>{
  const infra=createMemoryInfraDriver();
  const store=createPopulationLabExperimentStore(infra);
  const experimentId="exp_visual_review_store";

  await store.start(experimentId,{
    startedAt:"2026-10-02T16:00:00.000Z",
    referencePopulation:"east_asia.japanese",
  });
  await store.putPopulation(experimentId,{people:[{id:"one"},{id:"two"}]});
  await store.putResult(experimentId,{warnings:[]});
  await store.putReport(experimentId,"<html>base</html>");
  await store.complete(experimentId,{people:2,referencePopulation:"east_asia.japanese"});
  await store.queueVisual(experimentId,{
    experimentId,
    requestedAt:"2026-10-02T16:01:00.000Z",
    sampleSize:2,
  });
  await store.runningVisual(experimentId,{startedAt:"2026-10-02T16:01:01.000Z"});

  for(const [ordinal,role,bytes] of [
    [1,"geometry",[1]],[1,"portrait",[2]],[2,"geometry",[3]],[2,"portrait",[4]],
  ]){
    await store.putImage(experimentId,{ordinal,role,bytes:new Uint8Array(bytes)});
  }
  await store.completeVisual(experimentId,{
    sampleSize:2,
    images:4,
    referencePopulation:"east_asia.japanese",
  });

  const review=await store.putVisualReview(experimentId,input);
  const experiment=await store.get(experimentId);
  assert.equal(experiment.review.decision,"supports_candidate","review decision was not indexed");
  assert.equal(experiment.review.scores.geometryFidelity,4.5,"review score summary was not indexed");
  assert.equal(
    experiment.artifacts.visualReview.objectRef,
    populationLabExperimentRef(experimentId,"visual:review"),
    "visual review artifact identity changed",
  );
  assert.equal(review.samples.length,2);

  await assert.rejects(
    ()=>store.putVisualReview(experimentId,input),
    /already exists/u,
    "experiment accepted competing immutable visual reviews",
  );
});
