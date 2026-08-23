// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: canonical-situated-life-publication-and-atomicity

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { deriveGenesisLifeContinuity } from "../src/genesis-life-continuity-v1.mjs";
import { genesisLifeEpisodeEventId } from "../src/genesis-life-episode.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-situated-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_genesis_situated_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-20T00:00:00Z" },
    places: [
      { placeId: "place_home", description: "A modest family apartment used for ordinary household routines." },
      { placeId: "place_library", description: "A neighborhood public library used by local families and students." },
    ],
    householdShape: "A caregiver and two children share a stable household.",
    familyRelations: ["A caregiver and siblings share ordinary household responsibilities."],
    languages: ["English"],
    materialCircumstances: "Stable housing with ordinary budget constraints.",
    mobilityPattern: "Daily life is walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public school, neighborhood library, and ordinary local commerce.",
    culturalContext: "Mixed neighborhood peer groups and family routines.",
    availableInstitutions: ["public_school", "public_library", "local_commerce"],
    intellectualEnvironment: "Books and ordinary family discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary structural conditions only.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-20T00:00:00Z",
    },
    createdAt: "2026-08-20T00:00:00Z",
  };
}

function thread() {
  const value = structuredClone(mina);
  value.threadId = "thr_genesis_situated_001";
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt: "2026-08-20T00:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_genesis_situated_seed",
  };
  return value;
}

function initialRoster() {
  return [
    { participantId: "thr_genesis_situated_001", factualRoles: ["subject"], relationshipFacts: [] },
    {
      participantId: "person_situated_caregiver",
      factualRoles: ["caregiver"],
      relationshipFacts: ["Lives in the subject household and handles ordinary caregiver responsibilities."],
    },
    {
      participantId: "person_situated_sibling",
      factualRoles: ["sibling"],
      relationshipFacts: ["Lives in the subject household and is older than the subject."],
    },
  ];
}

function episodes() {
  const threadId = "thr_genesis_situated_001";
  return [
    {
      episodeId: "ep_situated_home_001",
      occurredAt: "2010-11-06T05:15:00Z",
      ageAtEvent: 6.2,
      placeRef: "place_home",
      participantRefs: [threadId, "person_situated_caregiver"],
      observableAction: "The child and caregiver sort groceries into cupboards and set aside two items for the next morning.",
      structureRef: null,
      introducedParticipants: [],
    },
    {
      episodeId: "ep_situated_library_001",
      occurredAt: "2012-06-09T11:30:00Z",
      ageAtEvent: 7.8,
      placeRef: "place_library",
      participantRefs: [threadId, "person_situated_peer"],
      observableAction: "The child and another child compare the return dates printed on two library receipts before choosing different shelves.",
      structureRef: null,
      introducedParticipants: [{
        provisionalPersonId: "person_situated_peer",
        roleRef: "peer",
        introducedAt: "2012-06-09T11:30:00Z",
      }],
    },
  ];
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0, seed: 39 },
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

function manifest(seedThread, lifeEpisodes) {
  return {
    genesisId: "gen_genesis_situated_001",
    threadId: seedThread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-19T23:59:59.999Z",
      justification: "The fixture admits bounded pre-entry life without a future role target.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_genesis_situated_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-20T00:02:00Z",
      resultingThreadVersion: seedThread.version + lifeEpisodes.length,
    },
    createdAt: "2026-08-20T00:00:30Z",
  };
}

function publicationCandidate() {
  const seedThread = thread();
  const lifeEpisodes = episodes();
  const world = worldSpec();
  const roster = initialRoster();
  return {
    world,
    birth: {
      manifest: manifest(seedThread, lifeEpisodes),
      thread: seedThread,
      episodes: lifeEpisodes,
      initialRoster: roster,
      lifeContinuity: deriveGenesisLifeContinuity({
        threadId: seedThread.threadId,
        worldSpec: world,
        initialRoster: roster,
        episodes: lifeEpisodes,
      }),
    },
  };
}

function parseRows(database, table) {
  return database.prepare(`SELECT record_json FROM ${table} ORDER BY record_json`).all()
    .map((row) => JSON.parse(row.record_json));
}

test("Genesis birth publishes participant/place continuity through canonical situated-life authority", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    const result = genesis.publishBirth(birth);
    assert.ok(result.situatedContinuity);
    genesis.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.equal(database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='genesis_life_continuity'",
    ).get(), undefined);
    const seedEventId = database.prepare(
      "SELECT event_id FROM thread_events WHERE thread_id=? AND event_type='THREAD_SEEDED'",
    ).get(birth.thread.threadId).event_id;

    const relations = parseRows(database, "life_relation_records");
    const caregiver = relations.find((record) => record.relatedParty.partyId === "person_situated_caregiver");
    assert.deepEqual(caregiver.factualRoleRefs, ["caregiver"]);
    assert.deepEqual(caregiver.relationshipFacts, ["Lives in the subject household and handles ordinary caregiver responsibilities."]);
    assert.deepEqual(caregiver.sourceReferences, [seedEventId]);

    const sibling = relations.find((record) => record.relatedParty.partyId === "person_situated_sibling");
    assert.equal(sibling.relationKind, "sibling");
    assert.deepEqual(sibling.factualRoleRefs, ["sibling"]);
    assert.deepEqual(sibling.relationshipFacts, ["Lives in the subject household and is older than the subject."]);
    assert.deepEqual(sibling.sourceReferences, [seedEventId]);

    const peer = relations.find((record) => record.relatedParty.partyId === "person_situated_peer");
    assert.equal(peer.relationKind, "social_contact");
    assert.deepEqual(peer.factualRoleRefs, ["peer"]);
    assert.deepEqual(peer.relationshipFacts, []);
    assert.deepEqual(peer.sourceReferences, [genesisLifeEpisodeEventId({
      threadId: birth.thread.threadId,
      genesisId: birth.manifest.genesisId,
      episode: birth.episodes[1],
    })]);

    const places = parseRows(database, "place_episode_records");
    assert.deepEqual(places.map((record) => record.place.placeId).sort(), ["place_home", "place_library"]);
    assert.equal(places.every((record) => record.episodeKind === "formative_presence"), true);
    assert.equal(places.every((record) => record.sourceReferences.length === 1), true);
    database.close();
  }));

test("situated continuity is inside the atomic Genesis birth transaction", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    assert.throws(
      () => genesis.publishBirth(birth, { failAfterSituatedContinuityForTest: true }),
      /simulated situated-continuity publication failure/u,
    );
    genesis.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    for (const [table, column, value] of [
      ["threads", "thread_id", birth.thread.threadId],
      ["thread_events", "thread_id", birth.thread.threadId],
      ["life_relation_records", "thread_id", birth.thread.threadId],
      ["place_episode_records", "thread_id", birth.thread.threadId],
      ["genesis_manifests", "genesis_id", birth.manifest.genesisId],
    ]) {
      assert.equal(database.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column}=?`).get(value).n, 0);
    }
    database.close();
  }));
