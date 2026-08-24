import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMemoryId,
} from "../src/autobiographical-memory-domain.mjs";
import {
  AutobiographicalMemoryConflictError,
  openAutobiographicalMemoryStore,
} from "../src/autobiographical-memory-store.mjs";
import { publishMinimalGenesisPriorLifeFixture } from "./support/genesis-prior-life-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-life-event-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec(worldSpecId = "world_genesis_life_001") {
  return {
    worldSpecId,
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-15T19:30:00Z" },
    places: [
      { placeId: "place_harbor_city", description: "A multilingual coastal city with public schools and ordinary neighborhood routines." },
    ],
    householdShape: "Two caregivers and one younger sibling.",
    familyRelations: ["The siblings share ordinary household routines."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable housing and modest discretionary resources.",
    mobilityPattern: "Daily life is mostly walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public neighborhood schools and a local library.",
    culturalContext: "Bilingual family conversation and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library", "local_commerce"],
    intellectualEnvironment: "Books and ordinary family discussions are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "school_teacher", "librarian"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary structural conditions only.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-15T19:30:00Z",
    },
    createdAt: "2026-08-15T19:30:00Z",
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

function genesisThread(threadId = "thr_genesis_life_001") {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-15T19:31:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_provisional_not_authoritative",
  };
  return thread;
}

function episode(episodeId, occurredAt, ageAtEvent, observableAction) {
  return {
    episodeId,
    occurredAt,
    ageAtEvent,
    placeRef: "place_harbor_city",
    participantRefs: [],
    observableAction,
    structureRef: null,
    introducedParticipants: [],
  };
}

function episodes() {
  return [
    episode(
      "ep_childhood_library",
      "2004-03-08T16:15:00Z",
      7.1,
      "The child returns two library books at the desk and chooses another book from a nearby shelf.",
    ),
    episode(
      "ep_childhood_bus_stop",
      "2006-10-19T15:40:00Z",
      9.7,
      "After school, the child reads a temporary bus-stop notice and walks with a classmate toward the next stop.",
    ),
  ];
}

function manifest(thread, publishedEpisodes, { worldSpecId = "world_genesis_life_001", genesisId = "gen_genesis_life_001" } = {}) {
  return {
    genesisId,
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2019-12-31T23:59:59Z",
      justification: "The fixture admits bounded pre-entry life without a future role target.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-15T19:32:00Z",
      resultingThreadVersion: thread.version + publishedEpisodes.length,
    },
    createdAt: "2026-08-15T19:30:30Z",
  };
}

function memoryRecord(threadId, event, subjectPeriod, slot) {
  const subject = { originEventRef: event.eventId, slot };
  return {
    memoryId: autobiographicalMemoryId({
      threadId,
      originReference: subject.originEventRef,
      slot: subject.slot,
    }),
    revision: 1,
    threadId,
    subject,
    subjectPeriod,
    eventRefs: [event.eventId],
    rememberedMeaning: "I remember this ordinary childhood moment as a concrete part of that period, while accepting that memory is selective.",
    asOf: "2026-08-15T19:33:00Z",
    confidence: 0.6,
    uncertainty: ["The event record does not establish every detail of later recollection."],
    salience: 0.6,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_policy_derived",
      entityId: "fibre.world-kernel",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: "2026-08-15T19:33:00Z",
  };
}

function publish(databasePath, { threadId = "thr_genesis_life_001", worldSpecId = "world_genesis_life_001", genesisId = "gen_genesis_life_001", publishedEpisodes = episodes() } = {}) {
  const genesis = new GenesisStore(databasePath);
  genesis.recordWorldSpec(worldSpec(worldSpecId));
  const thread = genesisThread(threadId);
  const result = publishMinimalGenesisPriorLifeFixture(genesis, {
    manifest: manifest(thread, publishedEpisodes, { worldSpecId, genesisId }),
    thread,
    episodes: publishedEpisodes,
  });
  genesis.close();
  return { thread, result };
}

function createPreEpisodeSchema(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE threads (
      thread_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL CHECK (version >= 1),
      status TEXT NOT NULL CHECK (status IN ('frozen','thawing','active','freezing','dormant','retired')),
      state_json TEXT NOT NULL CHECK (json_valid(state_json)),
      state_hash TEXT NOT NULL CHECK (state_hash LIKE 'sha256:%'),
      last_event_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE thread_events (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_type TEXT NOT NULL CHECK (event_type IN ('THREAD_SEEDED','SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED','AUTOBIOGRAPHICAL_MEMORY_RECORDED')),
      command_id TEXT,
      command_digest TEXT,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      actor_json TEXT NOT NULL CHECK (json_valid(actor_json)),
      occurred_at TEXT NOT NULL,
      state_hash TEXT NOT NULL CHECK (state_hash LIKE 'sha256:%'),
      authorization_id TEXT,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      payload_schema_version INTEGER NOT NULL CHECK (payload_schema_version >= 1),
      provenance_json TEXT NOT NULL CHECK (json_valid(provenance_json)),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      UNIQUE (thread_id, sequence),
      CHECK (
        (event_type = 'THREAD_SEEDED' AND command_id IS NULL AND command_digest IS NULL)
        OR
        (event_type IN ('SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED','AUTOBIOGRAPHICAL_MEMORY_RECORDED') AND command_id IS NOT NULL AND command_digest IS NOT NULL)
      )
    ) STRICT;
    CREATE TABLE commands (
      thread_id TEXT NOT NULL,
      command_id TEXT NOT NULL,
      command_digest TEXT NOT NULL,
      expected_version INTEGER NOT NULL CHECK (expected_version >= 1),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (thread_id, command_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (event_id) REFERENCES thread_events(event_id)
    ) STRICT;
    PRAGMA user_version = 6;
  `);
  database.close();
}

test("Genesis publishes Pass-A episodes as uncommanded authoritative history with derived versions and replay", () =>
  withDatabase((databasePath) => {
    const publishedEpisodes = episodes();
    const { thread, result } = publish(databasePath, { publishedEpisodes });

    const world = openWorldStore(databasePath);
    const events = world.listEvents(thread.threadId);
    assert.equal(events.length, 1 + publishedEpisodes.length);
    assert.deepEqual(events.map((item) => item.eventType), [
      "THREAD_SEEDED",
      "THREAD_LIFE_EPISODE_RECORDED",
      "THREAD_LIFE_EPISODE_RECORDED",
    ]);
    assert.deepEqual(events.map((item) => item.sequence), [1, 2, 3]);
    assert.equal(events[0].occurredAt, result.manifest.publication.publishedAt);
    assert.equal(events[1].occurredAt, publishedEpisodes[0].occurredAt);
    assert.ok(Date.parse(events[1].occurredAt) < Date.parse(events[0].occurredAt));
    assert.equal(events[1].commandId, null);
    assert.equal(events[1].commandDigest, null);
    assert.equal(events[2].commandId, null);
    assert.equal(events[2].commandDigest, null);

    assert.equal(events[0].resultingVersion, thread.version);
    assert.equal(events[1].expectedVersion, thread.version);
    assert.equal(events[1].resultingVersion, thread.version + 1);
    assert.equal(events[2].expectedVersion, thread.version + 1);
    assert.equal(events[2].resultingVersion, thread.version + 2);
    assert.notEqual(events[0].stateHash, events[1].stateHash);
    assert.notEqual(events[1].stateHash, events[2].stateHash);

    assert.equal(events[0].payload.snapshot.version, thread.version);
    assert.equal(events[0].payload.snapshot.provenance.lastEventId, events[0].eventId);
    assert.equal(result.thread.version, thread.version + publishedEpisodes.length);
    assert.equal(result.manifest.publication.resultingThreadVersion, result.thread.version);
    assert.equal(result.thread.provenance.lastEventId, events.at(-1).eventId);

    const live = world.getThread(thread.threadId);
    assert.deepEqual(live, result.thread);
    assert.deepEqual(world.replayThread(thread.threadId), live);
    assert.equal(world.verifyThreadIntegrity(thread.threadId).eventCount, events.length);
    world.close();
  }));

test("#38 memory can cite a Genesis life episode while THREAD_SEEDED remains an invalid childhood anchor", () =>
  withDatabase((databasePath) => {
    const publishedEpisodes = [episodes()[0]];
    const { thread } = publish(databasePath, { publishedEpisodes });

    const world = openWorldStore(databasePath);
    const events = world.listEvents(thread.threadId);
    const seedEvent = events[0];
    const lifeEvent = events[1];
    assert.equal(lifeEvent.eventType, "THREAD_LIFE_EPISODE_RECORDED");
    world.close();

    const childhood = {
      startAt: "2004-01-01T00:00:00Z",
      endAt: "2004-12-31T23:59:59Z",
    };
    const memoryStore = openAutobiographicalMemoryStore(databasePath);
    assert.doesNotThrow(() => memoryStore.recordMemory(
      memoryRecord(thread.threadId, lifeEvent, childhood, "genesis-childhood-life-event"),
    ));
    assert.throws(
      () => memoryStore.recordMemory(
        memoryRecord(thread.threadId, seedEvent, childhood, "genesis-seed-not-childhood"),
      ),
      (error) => error instanceof AutobiographicalMemoryConflictError && /falls outside subjectPeriod/.test(error.message),
    );
    memoryStore.close();

    const verified = openWorldStore(databasePath);
    assert.doesNotThrow(() => verified.verifyThreadIntegrity(thread.threadId));
    verified.close();
  }));

test("same-version migration rebuilds a pre-existing event CHECK before Genesis life episode publication", () =>
  withDatabase((databasePath) => {
    createPreEpisodeSchema(databasePath);

    const migrated = openWorldStore(databasePath);
    assert.equal(migrated.storageMetadata().schemaVersion, 6);
    migrated.close();

    let database = new DatabaseSync(databasePath);
    const schema = database.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='thread_events'",
    ).get().sql;
    assert.match(schema, /THREAD_LIFE_EPISODE_RECORDED/);
    database.close();

    const publishedEpisodes = [episodes()[0]];
    const { thread } = publish(databasePath, {
      threadId: "thr_genesis_migrated_001",
      worldSpecId: "world_genesis_migrated_001",
      genesisId: "gen_genesis_migrated_001",
      publishedEpisodes,
    });
    const world = openWorldStore(databasePath);
    assert.deepEqual(world.listEvents(thread.threadId).map((item) => item.eventType), [
      "THREAD_SEEDED",
      "THREAD_LIFE_EPISODE_RECORDED",
    ]);
    assert.doesNotThrow(() => world.verifyThreadIntegrity(thread.threadId));
    world.close();
  }));

test("Genesis publication is the only operational thread_events writer that names the uncommanded life episode type", () => {
  const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
  const namedWriters = readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => ({
      name: entry.name,
      source: readFileSync(join(sourceDirectory, entry.name), "utf8"),
    }))
    .filter(({ source }) => source.includes("INSERT INTO thread_events"))
    .filter(({ source }) => source.includes("THREAD_LIFE_EPISODE_RECORDED"))
    .map(({ name }) => basename(name))
    .sort();

  assert.deepEqual(namedWriters, ["genesis-store.mjs", "persistence-sqlite.mjs"]);
});
