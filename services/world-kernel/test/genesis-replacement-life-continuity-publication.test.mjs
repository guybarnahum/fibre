// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r2-atomic-life-continuity
// fibre-test-disposition: consolidate-into-permanent-genesis-birth-invariant-after-pr39

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { deriveGenesisLifeContinuity } from "../src/genesis-life-continuity-v1.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-r2-life-continuity-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_r2_continuity_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-20T00:00:00Z" },
    places: [
      { placeId: "place_home", description: "A modest family apartment used for ordinary household routines." },
      { placeId: "place_library", description: "A neighborhood public library used by local families and students." },
    ],
    householdShape: "Two caregivers and two children.",
    familyRelations: ["The children share ordinary household routines with their caregivers."],
    languages: ["English"],
    materialCircumstances: "Stable housing and modest discretionary resources.",
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
  value.threadId = "thr_r2_continuity_001";
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt: "2026-08-20T00:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_r2_provisional_seed",
  };
  return value;
}

function episodes() {
  const threadId = "thr_r2_continuity_001";
  return [
    {
      episodeId: "ep_r2_home_001",
      occurredAt: "2010-11-06T05:15:00Z",
      ageAtEvent: 6.2,
      placeRef: "place_home",
      participantRefs: [threadId, "person_r2_caregiver"],
      observableAction: "The child and caregiver sort groceries into cupboards and set aside two items for the next morning.",
      structureRef: null,
      introducedParticipants: [],
    },
    {
      episodeId: "ep_r2_library_001",
      occurredAt: "2012-06-09T11:30:00Z",
      ageAtEvent: 7.8,
      placeRef: "place_library",
      participantRefs: [threadId, "person_r2_peer"],
      observableAction: "The child and another child compare the return dates printed on two library receipts before choosing different shelves.",
      structureRef: null,
      introducedParticipants: [
        {
          provisionalPersonId: "person_r2_peer",
          roleRef: "peer",
          introducedAt: "2012-06-09T11:30:00Z",
        },
      ],
    },
  ];
}

function initialRoster() {
  return [
    { participantId: "thr_r2_continuity_001", factualRoles: [], relationshipFacts: [] },
    {
      participantId: "person_r2_caregiver",
      factualRoles: ["caregiver"],
      relationshipFacts: ["This person is a primary caregiver in the Thread's starting household."],
    },
    {
      participantId: "person_r2_sibling",
      factualRoles: ["sibling"],
      relationshipFacts: ["This person is a sibling in the Thread's starting household."],
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
    genesisId: "gen_r2_continuity_001",
    threadId: seedThread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-19T23:59:59.999Z",
      justification: "The fixture admits bounded pre-entry life without a future role target.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_r2_continuity_001",
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
  const lifeContinuity = deriveGenesisLifeContinuity({
    threadId: seedThread.threadId,
    worldSpec: world,
    initialRoster: initialRoster(),
    episodes: lifeEpisodes,
  });
  return {
    world,
    birth: {
      manifest: manifest(seedThread, lifeEpisodes),
      thread: seedThread,
      episodes: lifeEpisodes,
      lifeContinuity,
    },
  };
}

test("replacement birth atomically publishes neutral people/place continuity with admitted life", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    const result = genesis.publishReplacementBirth(birth);

    assert.deepEqual(result.lifeContinuity, birth.lifeContinuity);
    const stored = genesis.getLifeContinuity(birth.thread.threadId);
    assert.deepEqual(stored.record, birth.lifeContinuity);
    assert.equal(stored.worldSpecId, world.worldSpecId);

    const sibling = stored.record.people.find((person) => person.participantId === "person_r2_sibling");
    assert.deepEqual(sibling.episodeRefs, []);
    assert.equal(sibling.firstObservedAt, null);
    assert.equal(sibling.lastObservedAt, null);
    assert.deepEqual(sibling.relationshipFacts, ["This person is a sibling in the Thread's starting household."]);

    const peer = stored.record.people.find((person) => person.participantId === "person_r2_peer");
    assert.equal(peer.origin, "pass_a_introduction");
    assert.deepEqual(peer.roleRefs, ["peer"]);
    assert.deepEqual(peer.episodeRefs, ["ep_r2_library_001"]);

    const inspected = genesis.inspectGenesis(birth.manifest.genesisId);
    assert.deepEqual(inspected.lifeContinuity.record, birth.lifeContinuity);
    assert.equal(inspected.threadPublished, true);
    genesis.close();
  }));

test("replacement birth refuses publication without continuity", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    const withoutContinuity = structuredClone(birth);
    delete withoutContinuity.lifeContinuity;
    assert.throws(() => genesis.publishReplacementBirth(withoutContinuity), /requires lifeContinuity/u);
    genesis.close();
  }));

test("failure after continuity insertion rolls back Thread, life events, continuity and manifest together", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    assert.throws(
      () => genesis.publishReplacementBirth(birth, { failAfterContinuityForTest: true }),
      /simulated R2 life-continuity publication failure/u,
    );
    genesis.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const threadId = birth.thread.threadId;
    const genesisId = birth.manifest.genesisId;
    assert.equal(database.prepare("SELECT count(*) AS n FROM threads WHERE thread_id=?").get(threadId).n, 0);
    assert.equal(database.prepare("SELECT count(*) AS n FROM thread_events WHERE thread_id=?").get(threadId).n, 0);
    assert.equal(database.prepare("SELECT count(*) AS n FROM genesis_life_continuity WHERE thread_id=?").get(threadId).n, 0);
    assert.equal(database.prepare("SELECT count(*) AS n FROM genesis_manifests WHERE genesis_id=?").get(genesisId).n, 0);
    database.close();
  }));

test("continuity tampering cannot be published by replacement birth", () =>
  withDatabase((databasePath) => {
    const { world, birth } = publicationCandidate();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(world);
    const tampered = structuredClone(birth);
    const peer = tampered.lifeContinuity.people.find((person) => person.participantId === "person_r2_peer");
    peer.roleRefs = ["galactic_emperor"];
    assert.throws(() => genesis.publishReplacementBirth(tampered), /not afforded by WorldSpec/u);
    genesis.close();
  }));
