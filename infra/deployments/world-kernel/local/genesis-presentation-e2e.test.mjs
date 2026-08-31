import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createNodeServiceHandler } from "#infra/providers/local/service";
import { createGenesisPresentationWriteApi } from "#services/thread-presentation/src/http/genesis-write-api.mjs";
import { createPresentationReadApi } from "#services/thread-presentation/src/http/read-api.mjs";
import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { attachTestCivilRegistration } from "#services/world-kernel/test/support/civil-registration-fixture.mjs";
import { createScriptedGuardianModelAdapter } from "#services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";
import { startWorldKernelFromEnvironment } from "./server.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const PRIVATE_TOKEN = "genesis-presentation-e2e-private-token";
const sha = (char) => `sha256:${char.repeat(64)}`;

function worldSpec() {
  return {
    worldSpecId: "world_genesis_presentation_e2e_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-30T03:59:00Z" },
    places: [{ placeId: "place_genesis_presentation_e2e", description: "A bounded ordinary city context." }],
    householdShape: "One ordinary household.",
    familyRelations: ["Household members share ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and ordinary public services.",
    mobilityPattern: "Walking and public transit.",
    schoolingOrCommunityContext: "Public schools and community institutions.",
    culturalContext: "Mixed neighborhood institutions.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "peer", "teacher"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic Genesis-to-presentation integration fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-30T03:55:00Z",
    },
    createdAt: "2026-08-30T03:55:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 39 },
  });
  return {
    passA: surface("a"),
    passB: surface("c"),
    passC: surface("d"),
    recordRepair: surface("e"),
    policyVersion: "genesis-v1",
    eventStructurePoolDigest: sha("f"),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function birth(threadId) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.status = "active";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-30T03:56:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${threadId}`,
  };

  return attachTestCivilRegistration({
    manifest: {
      genesisId: `gen_${threadId}`,
      threadId,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-30T03:54:00Z",
        justification: "Genesis-to-presentation integration fixture.",
        policyRef: "entry-policy-v1",
      },
      worldSpecRef: worldSpec().worldSpecId,
      sourceBundleRefs: [],
      parentOrAncestorRefs: [],
      genomeRef: null,
      cognition: cognition(),
      publication: {
        status: "published",
        publishedAt: "2026-08-30T03:58:00Z",
        resultingThreadVersion: thread.version,
      },
      createdAt: "2026-08-30T03:55:30Z",
    },
    thread,
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("test HTTP server did not bind a TCP address");
  return address;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function waitForPublicSnapshot(readApi, threadId, { timeoutMs = 3_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await readApi.fetch(new Request(`http://presentation.local/api/threads/${threadId}/snapshot`));
    if (response.status === 200) return response.json();
    assert.equal(response.status, 404);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`public Thread Presentation for ${threadId} was not projected before timeout`);
}

async function waitForDeliveredOutbox(outbox, genesisId, { timeoutMs = 3_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = outbox.get(genesisId);
    if (current?.state === "delivered") return current;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Genesis presentation outbox ${genesisId} was not delivered before timeout`);
}

test("authoritative Genesis birth automatically becomes a persisted public non-fixture Thread Presentation", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-presentation-e2e-"));
  const databasePath = join(directory, "world.sqlite");
  const presentationInfra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra: presentationInfra });
  const writeApi = createGenesisPresentationWriteApi({
    presentationServer,
    privateToken: PRIVATE_TOKEN,
  });
  const presentationHttp = createServer(createNodeServiceHandler({ service: writeApi }));
  const presentationAddress = await listen(presentationHttp);
  const readApi = createPresentationReadApi({
    infra: presentationInfra,
    presentationServer,
    openStream() {
      throw new Error("stream route is not part of the Genesis presentation e2e proof");
    },
  });

  let world = null;
  try {
    world = await startWorldKernelFromEnvironment({
      FIBRE_WORLD_DATABASE: databasePath,
      FIBRE_WORLD_HOST: "127.0.0.1",
      FIBRE_WORLD_PORT: "0",
      FIBRE_PRIVATE_TOKEN: PRIVATE_TOKEN,
      FIBRE_THREAD_PRESENTATION_URL: `http://127.0.0.1:${presentationAddress.port}`,
      FIBRE_WORLD_RECONCILIATION_MS: "100",
    }, {
      guardianModelAdapter: createScriptedGuardianModelAdapter(),
    });

    world.genesisStore.recordWorldSpec(worldSpec());
    const candidate = birth("thr_genesis_presentation_e2e_001");
    const published = await world.birthPublisher.publishBirth(candidate);

    assert.equal(published.thread.threadId, candidate.thread.threadId);
    assert.equal(published.manifest.genesisId, candidate.manifest.genesisId);

    const publicSnapshot = await waitForPublicSnapshot(readApi, candidate.thread.threadId);
    assert.equal(publicSnapshot.pointer.threadId, candidate.thread.threadId);
    assert.equal(publicSnapshot.snapshot.presentation.manifest.threadId, candidate.thread.threadId);
    assert.equal(publicSnapshot.snapshot.presentation.manifest.fixture, false);
    assert.equal(publicSnapshot.snapshot.presentation.manifest.lifecycleStatus, "active");
    assert.equal(publicSnapshot.snapshot.presentation.subject.displayName, candidate.thread.identity.name);
    assert.equal(
      publicSnapshot.snapshot.presentation.introduction.summary,
      candidate.thread.identity.selfDescription,
    );
    assert.deepEqual(
      publicSnapshot.snapshot.presentation.origins.map(({ summary }) => summary),
      candidate.thread.identity.culture,
    );
    assert.deepEqual(
      publicSnapshot.snapshot.presentation.places.map(({ displayName }) => displayName),
      [candidate.thread.identity.birthCity, candidate.thread.identity.currentWorkCity],
    );
    assert.equal(
      publicSnapshot.snapshot.presentation.civilIdentity.fibreIdentityNumber,
      candidate.manifest.publication.civilRegistration.fibreIdentityNumber,
    );
    assert.equal(publicSnapshot.snapshot.presentation.visualIdentity, null);
    assert.equal(publicSnapshot.snapshot.presentation.identityCard, null);
    assert.deepEqual(publicSnapshot.snapshot.media.assets, []);
    assert.equal(JSON.stringify(publicSnapshot).includes(candidate.thread.identity.portraitRef), false);
    assert.equal(JSON.stringify(publicSnapshot).includes(candidate.thread.identity.voiceRef), false);

    const discovery = await readApi.fetch(new Request("http://presentation.local/api/threads"));
    assert.equal(discovery.status, 200);
    const discoveryBody = await discovery.json();
    assert.equal(discoveryBody.threads.length, 1);
    assert.equal(discoveryBody.threads[0].threadId, candidate.thread.threadId);

    const outbox = await waitForDeliveredOutbox(
      world.presentationOutboxStore,
      candidate.manifest.genesisId,
    );
    assert.equal(outbox.attemptCount, 1);
    assert.equal(outbox.lastError, null);
  } finally {
    await world?.close();
    await close(presentationHttp);
    rmSync(directory, { recursive: true, force: true });
  }
});
