import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";
import {createPopulationLabExperimentStore} from "../src/experiment-artifacts.mjs";
import {
  buildPhysicalExperimentEvidence,
  normalizePhysicalExperimentRequest,
  runPersistedPhysicalExperiment,
} from "../src/physical-experiment.mjs";
import {referencePopulationCalibration} from "../../../core/src/human-appearance/index.mjs";

test("controlled physical experiment runs from queued evidence to persisted completion",async()=>{
  const store=createPopulationLabExperimentStore(createMemoryInfraDriver());
  const request=normalizePhysicalExperimentRequest({
    experimentId:"exp_physical_001",
    referencePopulation:"east_asia.korean",
    count:8,
    seed:"physical-test-v1",
    requestedAt:"2026-10-01T00:00:00.000Z",
    source:{coverageKey:"reference:east_asia.korean"},
  });
  await store.queue(request.experimentId,request);

  await runPersistedPhysicalExperiment({
    request,
    artifacts:store,
    startedAt:"2026-10-01T00:00:01.000Z",
  });

  const experiment=await store.get(request.experimentId);
  assert.equal(experiment.status,"completed","experiment did not complete");
  assert.equal(experiment.summary.people,8,"experiment lost cohort size");
  assert.equal(experiment.summary.referencePopulation,"east_asia.korean","experiment lost reference population");
  assert.ok(experiment.artifacts.population?.objectRef,"population artifact missing");
  assert.ok(experiment.artifacts.result?.objectRef,"result artifact missing");
  assert.ok(experiment.artifacts.report?.objectRef,"report artifact missing");

  const report=await store.getArtifact(experiment.artifacts.report.objectRef);
  assert.match(new TextDecoder().decode(report.bytes),/east_asia\.korean/u,"report lost experiment population");
});

test("queued experiments cannot be deleted while execution may still write artifacts",async()=>{
  const store=createPopulationLabExperimentStore(createMemoryInfraDriver());
  const request=normalizePhysicalExperimentRequest({
    experimentId:"exp_physical_queued",
    referencePopulation:"east_asia.korean",
    count:8,
    seed:"queued-test-v1",
    requestedAt:"2026-10-01T00:00:00.000Z",
  });
  await store.queue(request.experimentId,request);
  await assert.rejects(
    ()=>store.delete(request.experimentId),
    /queued or running experiment cannot be deleted/u,
    "queued experiment deletion was accepted",
  );
});


test("baseline experiment consumes its frozen admitted calibration snapshot",()=>{
  const calibration=referencePopulationCalibration("east_asia.japanese");
  const baseline=normalizePhysicalExperimentRequest({
    experimentId:"exp_dynamic_baseline",
    referencePopulation:"east_asia.japanese",
    count:8,
    seed:"dynamic-baseline-seed",
    requestedAt:"2026-10-02T17:00:00.000Z",
    source:{calibration},
  });
  const shifted=normalizePhysicalExperimentRequest({
    ...baseline,
    experimentId:"exp_dynamic_baseline_shifted",
    source:{calibration:{
      ...calibration,
      prior:{...calibration.prior,faceBreadth:.18},
    }},
  });

  const before=buildPhysicalExperimentEvidence(baseline);
  const after=buildPhysicalExperimentEvidence(shifted);
  assert.notEqual(
    after.people[0].inheritance.phenotype.latent.faceBreadth,
    before.people[0].inheritance.phenotype.latent.faceBreadth,
    "baseline experiment ignored its admitted calibration snapshot",
  );
});

test("shadow experiment reuses the cohort seed while changing only proposed calibration behavior",()=>{
  const calibration=referencePopulationCalibration("east_asia.japanese");
  const baseline=normalizePhysicalExperimentRequest({
    experimentId:"exp_shadow_baseline",
    referencePopulation:"east_asia.japanese",
    count:8,
    seed:"shadow-comparison-seed",
    requestedAt:"2026-10-02T18:00:00.000Z",
    source:{calibration},
  });
  const shadow=normalizePhysicalExperimentRequest({
    ...baseline,
    experimentId:"exp_shadow_candidate",
    shadowCalibration:{
      referencePopulation:"east_asia.japanese",
      baseCalibration:calibration,
      values:{faceBreadth:.18},
      variation:{},
      rationale:"Fixture candidate for controlled comparison.",
      evidence:["doi:10.0000/fibre-shadow-fixture"],
    },
  });

  const before=buildPhysicalExperimentEvidence(baseline);
  const after=buildPhysicalExperimentEvidence(shadow);

  assert.deepEqual(
    after.people.map(person=>[person.name,person.sex]),
    before.people.map(person=>[person.name,person.sex]),
    "shadow experiment changed deterministic cohort identity",
  );
  assert.notEqual(
    after.people[0].inheritance.phenotype.latent.faceBreadth,
    before.people[0].inheritance.phenotype.latent.faceBreadth,
    "shadow experiment did not apply proposed calibration",
  );
  assert.equal(
    after.people[0].inheritance.phenotype.latent.faceLength,
    before.people[0].inheritance.phenotype.latent.faceLength,
    "shadow experiment changed an unproposed physical axis",
  );
});
