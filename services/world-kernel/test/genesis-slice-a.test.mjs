import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  GenesisConflictError,
  GenesisStore,
} from "../src/genesis-store.mjs";
import {
  genesisRecordDigest,
  publicationValidatorSetWitness,
} from "../src/genesis-domain.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-a-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec(overrides = {}) {
  return {
    worldSpecId: "world_slice_a_001",
    timeFrame: {
      startAt: "2000-01-01T00:00:00Z",
      endAt: "2026-08-15T19:30:00Z",
    },
    places: [
      { placeId: "place_harbor_city", description: "A multilingual coastal city with public transit and neighborhood schools." },
    ],
    householdShape: "Two caregivers, one older sibling, and a grandparent living nearby.",
    familyRelations: ["The grandparent visits twice a week.", "The siblings share a bedroom during early childhood."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable rent, limited discretionary money, and reliable access to public services.",
    mobilityPattern: "One move within the same city during primary school.",
    schoolingOrCommunityContext: "Public neighborhood schools, local library, and after-school music program.",
    culturalContext: "Family rituals, bilingual conversation, neighborhood holidays, and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library", "music_program", "local_commerce"],
    intellectualEnvironment: "Books are common at home and adults disagree openly about civic and scientific questions.",
    affordedRoles: ["school_teacher", "librarian", "shopkeeper", "peer", "extended_family"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Authored from ordinary structural conditions without importing a named character or plot.",
      relocationWitness: "No source coordinates or source characters are retained.",
      familiarityProbe: null,
      createdAt: "2026-08-15T19:30:00Z",
    },
    createdAt: "2026-08-15T19:30:00Z",
    ...overrides,
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

function genesisThread(overrides = {}) {
  const thread = structuredClone(mina);
  thread.threadId = "thr_genesis_slice_a";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-15T19:31:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_provisional_not_authoritative",
  };
  return Object.assign(thread, overrides);
}

function publishedManifest(thread = genesisThread(), overrides = {}) {
  return {
    genesisId: "gen_slice_a_001",
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-15T19:29:00Z",
      justification: "Slice A fixture holds a young-adult entry boundary without future role information.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_slice_a_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-15T19:32:00Z",
      resultingThreadVersion: thread.version,
    },
    createdAt: "2026-08-15T19:30:30Z",
    ...overrides,
  };
}

function failedAttempt(overrides = {}) {
  return {
    attemptId: "gat_slice_a_001",
    genesisId: "gen_slice_a_001",
    provisionalThreadId: "thr_genesis_slice_a",
    candidateAttemptNumber: 1,
    scope: "record_repair",
    recordKind: "identity_assertion",
    failedPass: "publication_preflight",
    failedGate: "identity_single_material_proposition",
    recordRepairOrdinal: 1,
    rejectedContentDigest: sha("1"),
    rejectedContent: { meaning: "One claim; another claim." },
    inputDigest: sha("2"),
    outputDigest: sha("3"),
    recordedAt: "2026-08-15T19:31:30Z",
    ...overrides,
  };
}

test("Slice A WorldSpec is immutable, factual-shaped, and rejects extra personality fields", () =>
  withDatabase((databasePath) => {
    const store = new GenesisStore(databasePath);
    const created = store.recordWorldSpec(worldSpec());
    assert.equal(created.idempotent, false);
    assert.equal(store.recordWorldSpec(worldSpec()).idempotent, true);
    assert.throws(
      () => store.recordWorldSpec(worldSpec({ personality: "independent" })),
      /personality is not allowed/,
    );
    assert.equal(created.recordDigest, genesisRecordDigest("world_spec", created.record));
    store.close();
  }));

test("candidate Genesis audit state is not a live Thread authority", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    genesis.recordGenerationAttempt(failedAttempt());
    assert.equal(genesis.inspectGenesis("gen_slice_a_001").threadPublished, false);

    const world = openWorldStore(databasePath);
    assert.equal(world.getThread("thr_genesis_slice_a", { required: false }), null);
    world.close();
    genesis.close();
  }));

test("atomic birth publishes the existing Thread authority and final manifest without resetting version", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const thread = genesisThread();
    const result = genesis.publishBirth({ manifest: publishedManifest(thread), thread });
    assert.equal(result.thread.version, thread.version);
    assert.equal(result.manifest.publication.resultingThreadVersion, thread.version);

    const world = openWorldStore(databasePath);
    const live = world.getThread(thread.threadId);
    assert.equal(live.version, thread.version);
    assert.equal(world.listEvents(thread.threadId).length, 1);
    assert.equal(world.listEvents(thread.threadId)[0].eventType, "THREAD_SEEDED");
    assert.deepEqual(world.replayThread(thread.threadId), live);
    world.close();

    const inspection = genesis.inspectGenesis(result.manifest.genesisId);
    assert.equal(inspection.threadPublished, true);
    assert.equal(inspection.worldSpec.record.worldSpecId, "world_slice_a_001");
    assert.equal(inspection.manifest.manifest.publication.resultingThreadVersion, thread.version);
    genesis.close();
  }));

test("simulated failure after Thread seed rolls back the entire birth", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const thread = genesisThread();
    assert.throws(
      () => genesis.publishBirth(
        { manifest: publishedManifest(thread), thread },
        { failAfterSeedForTest: true },
      ),
      /simulated Slice-A publication failure/,
    );
    assert.equal(genesis.getManifest("gen_slice_a_001", { required: false }), null);

    const world = openWorldStore(databasePath);
    assert.equal(world.getThread(thread.threadId, { required: false }), null);
    world.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.equal(Number(raw.prepare(
      "SELECT COUNT(*) AS count FROM identity_assertion_records WHERE thread_id=?",
    ).get(thread.threadId).count), 0);
    raw.close();
    genesis.close();
  }));

test("birth is pinned to the current publication-validator witness", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const thread = genesisThread();
    const manifest = publishedManifest(thread);
    manifest.cognition.publicationValidatorSetWitness = {
      ...manifest.cognition.publicationValidatorSetWitness,
      situatedLifeContract: "stale-validator-set",
    };
    manifest.cognition.publicationValidatorSetWitness.digest = sha("9");
    assert.throws(
      () => genesis.publishBirth({ manifest, thread }),
      /validator witness does not match/,
    );
    genesis.close();
  }));

test("live #37 identity validation fails inside birth and leaves no half-born Thread", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const thread = genesisThread();
    thread.identity.selfDescription = "I am careful; I am also impatient with vague promises.";
    assert.throws(
      () => genesis.publishBirth({ manifest: publishedManifest(thread), thread }),
      /material proposition|bundle|assertion/i,
    );
    const world = openWorldStore(databasePath);
    assert.equal(world.getThread(thread.threadId, { required: false }), null);
    world.close();
    genesis.close();
  }));

test("Slice A adds provenance tables but no parallel biography, memory, relation, place, embodiment, or identity authority", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const tables = raw.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'genesis_%' ORDER BY name",
    ).all().map(({ name }) => name);
    assert.deepEqual(tables, [
      "genesis_generation_attempts",
      "genesis_manifests",
      "genesis_world_specs",
    ]);
    assert.equal(tables.some((name) => /biograph|memor|relation|place|embod|identity/.test(name)), false);
    raw.close();
    genesis.close();
  }));
