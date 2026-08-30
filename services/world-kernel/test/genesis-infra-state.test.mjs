import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { CivilRegistryStore } from "../src/civil-registry-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { GenesisPresentationOutboxStore } from "../src/genesis-presentation-outbox-store.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { attachTestCivilRegistration } from "./support/civil-registration-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function worldSpec() {
  return {
    worldSpecId: "world_birth_infra_atomic_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-29T23:59:00Z" },
    places: [{ placeId: "place_birth_infra", description: "A bounded ordinary city context." }],
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
      abstractionMethod: "Synthetic atomic-birth infrastructure fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-29T23:55:00Z",
    },
    createdAt: "2026-08-29T23:55:00Z",
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

function thread(threadId) {
  const value = structuredClone(mina);
  value.threadId = threadId;
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt: "2026-08-29T23:56:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${threadId}`,
  };
  return value;
}

function birth(threadId) {
  const value = thread(threadId);
  return attachTestCivilRegistration({
    manifest: {
      genesisId: `gen_${threadId}`,
      threadId,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-29T23:54:00Z",
        justification: "Atomic-birth state-boundary fixture.",
        policyRef: "entry-policy-v1",
      },
      worldSpecRef: worldSpec().worldSpecId,
      sourceBundleRefs: [],
      parentOrAncestorRefs: [],
      genomeRef: null,
      cognition: cognition(),
      publication: {
        status: "published",
        publishedAt: "2026-08-29T23:58:00Z",
        resultingThreadVersion: value.version,
      },
      createdAt: "2026-08-29T23:55:30Z",
    },
    thread: value,
  });
}

function assertBirthAbsent(storage, candidate) {
  const world = openWorldStore(storage);
  try {
    assert.equal(world.getThread(candidate.thread.threadId, { required: false }), null);
  } finally {
    world.close();
  }

  const genesis = new GenesisStore(storage, { readOnly: true });
  try {
    assert.equal(genesis.getManifest(candidate.manifest.genesisId, { required: false }), null);
  } finally {
    genesis.close();
  }

  const registry = new CivilRegistryStore(storage);
  try {
    assert.equal(
      registry.getCivilRegistrationByThreadId(candidate.thread.threadId, { required: false }),
      null,
    );
  } finally {
    registry.close();
  }

  const outbox = new GenesisPresentationOutboxStore(storage);
  try {
    assert.equal(outbox.get(candidate.manifest.genesisId), null);
  } finally {
    outbox.close();
  }
}

test("Genesis birth commits Thread, manifest, FIN, and presentation outbox atomically through Infra state", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-infra-state-"));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const storage = { infraDriver, stateScopeId: "world" };

  try {
    const genesis = new GenesisStore(storage);
    genesis.recordWorldSpec(worldSpec());

    const committed = birth("thr_birth_infra_committed");
    const published = genesis.publishBirth(committed);
    assert.equal(published.thread.threadId, committed.thread.threadId);
    assert.equal(published.manifest.genesisId, committed.manifest.genesisId);

    const world = openWorldStore(storage);
    const events = world.listEvents(committed.thread.threadId);
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, "THREAD_SEEDED");
    assert.equal(world.getThread(committed.thread.threadId).threadId, committed.thread.threadId);
    world.close();

    const registry = new CivilRegistryStore(storage);
    const registration = registry.getCivilRegistrationByThreadId(committed.thread.threadId);
    assert.equal(registration.threadId, committed.thread.threadId);
    assert.equal(registration.birthEventRef, events[0].eventId);
    assert.equal(
      registration.fibreIdentityNumber,
      committed.manifest.publication.civilRegistration.fibreIdentityNumber,
    );
    registry.close();

    const outbox = new GenesisPresentationOutboxStore(storage);
    const pending = outbox.get(committed.manifest.genesisId);
    assert.equal(pending.genesisId, committed.manifest.genesisId);
    assert.equal(pending.threadId, committed.thread.threadId);
    assert.deepEqual(pending.manifest, committed.manifest);
    assert.equal(pending.publicationDigest, published.recordDigest);
    assert.equal(pending.publishedAt, committed.manifest.publication.publishedAt);
    assert.equal(pending.state, "pending");
    assert.equal(pending.attemptCount, 0);
    outbox.close();

    const afterSeed = birth("thr_birth_infra_rollback_seed");
    assert.throws(
      () => genesis.publishBirth(afterSeed, { failAfterSeedForTest: true }),
      /simulated Slice-A publication failure/,
    );
    assertBirthAbsent(storage, afterSeed);

    const afterManifest = birth("thr_birth_infra_rollback_manifest");
    assert.throws(
      () => genesis.publishBirth(afterManifest, { failAfterManifestForTest: true }),
      /simulated post-manifest publication failure/,
    );
    assertBirthAbsent(storage, afterManifest);

    genesis.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
