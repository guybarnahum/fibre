import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createActivityRecorder } from "#infra/telemetry";
import { createLocalInfraDriver } from "#infra/providers/local";
import { createLocalActivityTelemetryPort } from "#infra/providers/local/telemetry";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { createGenesisBirthPublicationService } from "#services/world-kernel/src/genesis-birth-publication-service.mjs";

import { GENESIS_DEVELOPMENT_REQUEST_VERSION } from "../src/genesis-development-plan.mjs";
import { createGenesisDevelopmentService } from "../src/genesis-development-service.mjs";
import { createBirthCenterRuntime } from "../src/runtime.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

function developmentRequest() {
  const cohort = readJson("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[0];
  const worldSpec = readJson(slot.worldSpecPath);
  const genome = readJson(slot.genomePath);
  return {
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId: "birth-development-world-admission-001",
    requestedAt: "2026-08-31T23:30:00Z",
    worldSpec,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  };
}

function deterministicCognition(counter) {
  return Object.freeze({
    provider: "fixture",
    modelId: "deterministic-genesis-cognition-v1",
    configuration: Object.freeze({ transport: "fixture", temperature: 0 }),
    async invoke(request) {
      counter.calls += 1;
      if (request.clientRequestId.includes(":pass-a:")) {
        counter.passA += 1;
        return {
          output: {
            observableAction: "The subject picked up a dropped notebook, compared its label with the items on the table, returned it to the stack, and moved the loose papers into a folder.",
            additionalParticipantRefs: [],
            additionalIntroductions: [],
            intellectualEncounter: null,
          },
          provenance: {
            provider: "fixture",
            modelId: "deterministic-genesis-cognition-v1",
            providerRequestId: `fixture-pass-a-${counter.passA}`,
          },
        };
      }
      if (request.clientRequestId.includes(":pass-b:")) {
        counter.passB += 1;
        return {
          output: {
            outcome: "not_remembered",
            episodeRefs: [],
            rememberedContent: null,
            uncertainty: [],
          },
          provenance: {
            provider: "fixture",
            modelId: "deterministic-genesis-cognition-v1",
            providerRequestId: `fixture-pass-b-${counter.passB}`,
          },
        };
      }
      throw new Error(`unexpected deterministic Genesis cognition call ${request.clientRequestId}`);
    },
  });
}

function localStorage(databasePath, scopeId) {
  const infraDriver = createLocalInfraDriver({
    stateScopes: { [scopeId]: databasePath },
    schedulerScopes: { [scopeId]: { onWake: () => {} } },
  });
  return Object.freeze({ infraDriver, stateScopeId: scopeId });
}

function activityRecorders() {
  const telemetry = createLocalActivityTelemetryPort();
  let sequence = 0;
  function recorder(service) {
    return createActivityRecorder({
      telemetry,
      environment: "test",
      service,
      now: () => `2026-09-01T00:00:00.${String(++sequence).padStart(3, "0")}Z`,
      activityIdFactory: () => `act_local_genesis_${String(++sequence).padStart(4, "0")}`,
    });
  }
  return Object.freeze({
    telemetry,
    birth: recorder("birth-center"),
    world: recorder("world-kernel"),
  });
}

function successfulStages(records) {
  return new Set(records
    .filter((record) => record.status === "succeeded")
    .map((record) => `${record.service}:${record.stage}`));
}

test("Birth Center develops a narrow request and World atomically admits the resulting canonical Thread", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-development-world-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const birthStorage = localStorage(join(root, "birth.sqlite"), "birth");
  const worldStorage = localStorage(join(root, "world.sqlite"), "world");
  const activity = activityRecorders();

  const genesisStore = new GenesisStore(worldStorage);
  const genomeStore = new SymbolicGenomeStore(worldStorage);
  const worldPublisher = createGenesisBirthPublicationService({
    authority: genesisStore,
    worldSpecAuthority: genesisStore,
    genomeAuthority: genomeStore,
    activityRecorder: activity.world,
  });
  const runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    activityRecorder: activity.birth,
    now: () => "2026-08-31T23:31:00Z",
    nowMs: () => 1_788_218_260_000,
  });
  t.after(() => runtime.close());
  t.after(() => genomeStore.close());
  t.after(() => genesisStore.close());

  const counter = { calls: 0, passA: 0, passB: 0 };
  const adapter = deterministicCognition(counter);
  const service = createGenesisDevelopmentService({
    runtime,
    creativeAdapter: adapter,
    repairAdapter: adapter,
    activityRecorder: activity.birth,
    now: () => "2026-08-31T23:32:00Z",
    randomIntFn: () => 0,
  });

  const first = await service.develop(developmentRequest());
  assert.equal(first.status, "pending");
  assert.equal(first.generated, true);
  assert.equal(counter.passA, 14);
  assert.equal(counter.passB, 6);
  assert.equal(counter.calls, 20);
  assert.equal(runtime.provisionalBirthStore.countPending(), 1);
  assert.equal(runtime.developmentRequestStore.get(developmentRequest().requestId).status, "submitted");

  const reconciliation = await runtime.handleWake();
  assert.deepEqual(reconciliation, { attempted: 1, published: 1 });
  assert.equal(runtime.provisionalBirthStore.countPending(), 0);

  const world = openWorldStore(worldStorage);
  t.after(() => world.close());
  const thread = world.getThread(first.threadId);
  assert.equal(thread.threadId, first.threadId);
  assert.equal(thread.status, "frozen");
  assert.equal(world.listEvents(first.threadId).length, 15);
  assert.deepEqual(world.replayThread(first.threadId), thread);

  const inspection = genesisStore.inspectGenesis(first.genesisId);
  assert.equal(inspection.threadPublished, true);
  assert.equal(inspection.manifest.manifest.threadId, first.threadId);
  assert.equal(inspection.worldSpec.record.worldSpecId, developmentRequest().worldSpec.worldSpecId);
  assert.equal(inspection.historicalEnvelopePlan.plan.envelopes.length, 14);
  assert.equal(genomeStore.listThreadGenomes(first.threadId).length, 1);

  const requestActivity = await activity.telemetry.query({ requestId: first.requestId });
  const stages = successfulStages(requestActivity);
  for (const expected of [
    "birth-center:birth.request.plan",
    "birth-center:birth.request.persist",
    "birth-center:birth.genesis.start",
    "birth-center:birth.genesis.compile",
    "birth-center:birth.publish.prepare",
    "birth-center:birth.publish.complete",
    "birth-center:birth.publish.world_submit",
    "world-kernel:world.worldspec.admission",
    "world-kernel:world.genome.admission",
    "world-kernel:world.thread.publication",
    "birth-center:birth.publish.world_ack",
  ]) {
    assert.equal(stages.has(expected), true, `missing successful activity stage ${expected}`);
  }

  const cognitionCalls = requestActivity.filter((record) => (
    record.service === "birth-center"
    && record.status === "succeeded"
    && record.stage.endsWith(".cognition_call")
  ));
  assert.equal(cognitionCalls.length, 20);
  assert.equal(
    cognitionCalls.filter((record) => record.stage === "birth.genesis.history.cognition_call").length,
    14,
  );
  assert.equal(
    cognitionCalls.filter((record) => record.stage === "birth.genesis.memory_selection.cognition_call").length,
    6,
  );
  const providerCommits = requestActivity.filter((record) => record.stage.endsWith(".provider_commit"));
  assert.equal(providerCommits.length, 20);
  assert.equal(providerCommits.every((record) => typeof record.evidence.providerRequestId === "string"), true);

  assert.equal(requestActivity.every((record) => record.genesisId === first.genesisId), true);
  assert.equal(requestActivity.every((record) => record.threadId === first.threadId), true);
  assert.deepEqual(
    (await activity.telemetry.query({ threadId: first.threadId })).map((record) => record.activityId),
    requestActivity.map((record) => record.activityId),
  );

  runtime.close();
  const replayCounter = { calls: 0, passA: 0, passB: 0 };
  const restarted = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    activityRecorder: activity.birth,
    now: () => "2026-08-31T23:33:00Z",
    nowMs: () => 1_788_218_380_000,
  });
  const replayService = createGenesisDevelopmentService({
    runtime: restarted,
    creativeAdapter: deterministicCognition(replayCounter),
    activityRecorder: activity.birth,
    now: () => "2026-08-31T23:34:00Z",
    randomIntFn: () => 1,
  });
  const replay = await replayService.develop(developmentRequest());
  assert.equal(replay.status, "published");
  assert.equal(replay.idempotent, true);
  assert.equal(replay.generated, false);
  assert.equal(replay.genesisId, first.genesisId);
  assert.equal(replay.threadId, first.threadId);
  assert.equal(replay.fibreIdentityNumber, first.fibreIdentityNumber);
  assert.equal(replayCounter.calls, 0);
  assert.equal(
    (await activity.telemetry.query({ requestId: first.requestId }))
      .some((record) => record.stage === "birth.request.resume" && record.status === "succeeded"),
    true,
  );
  restarted.close();
});