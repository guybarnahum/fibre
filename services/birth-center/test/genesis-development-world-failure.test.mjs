import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createGenesisBirthPublicationService } from "#services/world-kernel/src/genesis-birth-publication-service.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";

import { GENESIS_DEVELOPMENT_REQUEST_VERSION } from "../src/genesis-development-plan.mjs";
import { createGenesisDevelopmentService } from "../src/genesis-development-service.mjs";
import { createBirthCenterRuntime } from "../src/runtime.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

function developmentRequest(requestId) {
  const cohort = readJson("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[0];
  const worldSpec = readJson(slot.worldSpecPath);
  const genome = readJson(slot.genomePath);
  return {
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
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

function developmentService(runtime) {
  const counter = { calls: 0, passA: 0, passB: 0 };
  const adapter = deterministicCognition(counter);
  return {
    counter,
    service: createGenesisDevelopmentService({
      runtime,
      creativeAdapter: adapter,
      repairAdapter: adapter,
      now: () => "2026-08-31T23:32:00Z",
      randomIntFn: () => 0,
    }),
  };
}

test("World rejects divergent replay of a Birth Center-developed birth and preserves canonical Thread state", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-world-divergent-replay-"));
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

  const request = developmentRequest("birth-development-divergent-replay-001");
  const { service, counter } = developmentService(runtime);
  const first = await service.develop(request);
  assert.equal(first.status, "pending");
  assert.equal(counter.calls, 20);
  const saved = runtime.developmentRequestStore.get(request.requestId);
  assert.equal(saved.status, "submitted");
  assert.ok(saved.admission);

  assert.deepEqual(await runtime.handleWake(), { attempted: 1, published: 1 });
  const world = openWorldStore(worldStorage);
  t.after(() => world.close());
  const canonicalThread = world.getThread(first.threadId);
  assert.equal(world.listEvents(first.threadId).length, 15);

  const divergent = structuredClone(saved.admission);
  divergent.manifest.publication.publishedAt = new Date(
    Date.parse(divergent.manifest.publication.publishedAt) + 1_000,
  ).toISOString();
  await assert.rejects(
    worldPublisher.publishBirth(divergent),
    /Genesis birth replay conflicts with existing publication/,
  );
  assert.deepEqual(world.getThread(first.threadId), canonicalThread);
  assert.equal(world.listEvents(first.threadId).length, 15);
});

test("failed authoritative World birth may retain prerequisites but never leaks a live Thread", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-world-failed-admission-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const birthStorage = localStorage(join(root, "birth.sqlite"), "birth");
  const worldStorage = localStorage(join(root, "world.sqlite"), "world");
  const genesisStore = new GenesisStore(worldStorage);
  const genomeStore = new SymbolicGenomeStore(worldStorage);
  const errors = [];
  const worldPublisher = createGenesisBirthPublicationService({
    authority: {
      publishBirth(bundle) {
        return genesisStore.publishBirth(bundle, { failAfterSeedForTest: true });
      },
    },
    worldSpecAuthority: genesisStore,
    genomeAuthority: genomeStore,
  });
  const runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    now: () => "2026-08-31T23:31:00Z",
    nowMs: () => 1_788_218_260_000,
    onError(error) { errors.push(error); },
  });
  t.after(() => runtime.close());
  t.after(() => genomeStore.close());
  t.after(() => genesisStore.close());

  const request = developmentRequest("birth-development-failed-admission-001");
  const { service, counter } = developmentService(runtime);
  const first = await service.develop(request);
  assert.equal(first.status, "pending");
  assert.equal(counter.calls, 20);
  const saved = runtime.developmentRequestStore.get(request.requestId);
  assert.equal(saved.status, "submitted");
  assert.ok(saved.admission);
  assert.equal(saved.admission.symbolicGenomes.length, 1);
  const genomeId = saved.admission.symbolicGenomes[0].header.genomeId;

  await assert.rejects(
    runtime.handleWake(),
    /simulated Slice-A publication failure/,
  );
  assert.equal(errors.length, 1);
  assert.equal(runtime.provisionalBirthStore.countPending(), 1);
  assert.equal(genesisStore.getWorldSpec(request.worldSpec.worldSpecId).record.worldSpecId, request.worldSpec.worldSpecId);
  assert.equal(genomeStore.getGenome(genomeId).header.genomeId, genomeId);
  assert.equal(genesisStore.getManifest(first.genesisId, { required: false }), null);

  const world = openWorldStore(worldStorage);
  t.after(() => world.close());
  assert.equal(world.getThread(first.threadId, { required: false }), null);
  assert.equal(world.listEvents(first.threadId).length, 0);
});
