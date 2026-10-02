import test from "node:test";
import assert from "node:assert/strict";

import {normalizeAssetGenerationJob} from "#services/asset-generator/src/index.mjs";
import {generatePhysicalCalibrationCohort} from "../src/physical-cohort.mjs";
import {
  POPULATION_LAB_VISUAL_PROVIDER_PROFILE,
  buildPopulationLabVisualPlan,
  renderPopulationLabVisualReport,
} from "../src/visual-experiment.mjs";

test("visual calibration samples four deterministic people and preserves geometry before surface",()=>{
  const people=[...generatePhysicalCalibrationCohort({
    referencePopulations:["middle_east.egypt"],
    count:24,
    seed:"visual-plan-test-v1",
  })];
  const populationBytes=new TextEncoder().encode(JSON.stringify({
    contract:"fibre-population-lab-population-v0.1",
    meta:{places:["middle_east.egypt"]},
    people,
  }));
  const plan=buildPopulationLabVisualPlan({
    request:{
      experimentId:"plexp_visual_001",
      requestedAt:"2026-10-01T00:00:00.000Z",
      sampleSize:4,
    },
    populationBytes,
  });

  assert.deepEqual(plan.samples.map(sample=>sample.personIndex),[0,8,15,23],"visual sample is not deterministic across the cohort");
  assert.equal(plan.samples.length,4,"visual calibration did not remain bounded");
  for(const sample of plan.samples){
    assert.equal(sample.geometryJob.providerProfile,POPULATION_LAB_VISUAL_PROVIDER_PROFILE,"geometry job changed provider profile");
    assert.deepEqual(sample.geometryJob.referenceObjectRefs,[],"geometry job unexpectedly has a reference image");
    assert.deepEqual(sample.portraitJob.referenceObjectRefs,[sample.geometryJob.outputObjectRef],"surface job lost its geometry anchor");
    assert.match(sample.geometryJob.outputObjectRef,/image:\d{3}:geometry$/u,"geometry output is outside experiment identity");
    assert.match(sample.portraitJob.outputObjectRef,/image:\d{3}:portrait$/u,"portrait output is outside experiment identity");
    assert.doesNotThrow(()=>normalizeAssetGenerationJob(sample.geometryJob),"geometry job violates Asset Generator contract");
    assert.doesNotThrow(()=>normalizeAssetGenerationJob(sample.portraitJob),"portrait job violates Asset Generator contract");
  }

  const report=renderPopulationLabVisualReport(plan);
  assert.match(report,/image\/001\/geometry/u,"visual report lost geometry anchor");
  assert.match(report,/image\/001\/portrait/u,"visual report lost final portrait");
  assert.match(report,/middle_east\.egypt/u,"visual report lost reference population");
  assert.match(report,/A · Geometry anchor/u,"visual report lost A/B geometry meaning");
  assert.match(report,/B · Final portrait/u,"visual report lost A/B portrait meaning");
  assert.match(report,/Geometry fidelity/u,"visual report lost human review rubric");
  assert.match(report,/Identity continuity/u,"visual report lost identity review criterion");
  assert.match(report,/Surface realism/u,"visual report lost surface review criterion");
  assert.match(report,/not appearance authority/u,"visual report blurred evidence and authority");

  const reviewed=renderPopulationLabVisualReport(plan,{review:{
    decision:"supports_candidate",
    scores:{geometryFidelity:4.5,identityContinuity:4.25,surfaceRealism:4},
    samples:plan.samples.map(sample=>({
      ordinal:sample.ordinal,
      geometryFidelity:5,
      identityContinuity:4,
      surfaceRealism:4,
      note:null,
    })),
    note:"Renderer fidelity is strong enough to support candidate review.",
  }});
  assert.match(reviewed,/Human review · Supports candidate/u,"report lost submitted review decision");
  assert.match(reviewed,/Geometry 5\/5 · Identity 4\/5 · Surface 4\/5/u,"report lost per-sample submitted scores");
  assert.match(reviewed,/Geometry 4\.5\/5 · Identity 4\.25\/5 · Surface 4\/5/u,"report lost review score summary");
});
