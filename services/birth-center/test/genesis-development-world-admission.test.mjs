import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
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

test("Birth Center develops a narrow request and World atomically admits the resulting canonical Thread", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-development-world-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const birthStorage = localStorage(join(root, "birth.sqlite"), "birth");
  const worldStorage = localStorage(join(root, "world.sqlite"), "world");

  const genesisStore = new GenesisStore(worldStorage);
  const genomeStore = new SymbolicGenomeStore(worldStorage);
  const worldPublisher = createGenesisBirthPublicationService({
    authority: genesisStore,
    worldSpecAuthority: genesisStore,
    genomeAuthority: genomeStore,
  });
  const runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
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

  runtime.close();
  const replayCounter = { calls: 0, passA: 0, passB: 0 };
  const restarted = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    now: () => "2026-08-31T23:33:00Z",
    nowMs: () => 1_788_218_380_000,
  });
  const replayService = createGenesisDevelopmentService({
    runtime: restarted,
    creativeAdapter: deterministicCognition(replayCounter),
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
  restarted.close();
});