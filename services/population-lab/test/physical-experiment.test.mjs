import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";
import {createPopulationLabExperimentStore} from "../src/experiment-artifacts.mjs";
import {
  normalizePhysicalExperimentRequest,
  runPersistedPhysicalExperiment,
} from "../src/physical-experiment.mjs";

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
