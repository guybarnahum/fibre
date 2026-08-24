import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { GenesisConflictError, GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { genesisLifeEpisodeEventId } from "../src/genesis-life-episode.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
} from "../src/autobiographical-memory-domain.mjs";
import {
  AutobiographicalMemoryConflictError,
  openAutobiographicalMemoryInspectionStore,
  openAutobiographicalMemoryStore,
} from "../src/autobiographical-memory-store.mjs";
import { publishMinimalGenesisPriorLifeFixture } from "./support/genesis-prior-life-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;
const PUBLISHED_AT = "2026-08-18T22:40:00Z";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-memory-publish-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec(worldSpecId = "world_slice_d_publish_001") {
  return {
    worldSpecId,
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: PUBLISHED_AT },
    places: [{
      placeId: "place_slice_d_library",
      description: "A multilingual neighborhood with a public library and ordinary school routines.",
    }],
    householdShape: "Two caregivers and one younger sibling.",
    familyRelations: ["The siblings share ordinary household routines."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable housing and modest discretionary resources.",
    mobilityPattern: "Daily life is mostly walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public neighborhood schools and a local library.",
    culturalContext: "Bilingual family conversation and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary family discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "school_teacher", "librarian"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary structural conditions only.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-18T22:35:00Z",
    },
    createdAt: "2026-08-18T22:35:00Z",
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

function genesisThread(threadId = "thr_slice_d_publish_001") {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-18T22:36:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_slice_d_provisional_seed",
  };
  return thread;
}

function episode() {
  return {
    episodeId: "ep_slice_d_childhood_library",
    occurredAt: "2004-03-08T16:15:00Z",
    ageAtEvent: 7.1,
    placeRef: "place_slice_d_library",
    participantRefs: [],
    observableAction: "The child returns two library books and chooses another book from a nearby shelf.",
    structureRef: null,
    introducedParticipants: [],
  };
}

function manifest(thread, eventCount, {
  worldSpecId = "world_slice_d_publish_001",
  genesisId = "gen_slice_d_publish_001",
} = {}) {
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
      publishedAt: PUBLISHED_AT,
      resultingThreadVersion: thread.version + eventCount,
    },
    createdAt: "2026-08-18T22:35:30Z",
  };
}

function memoryFor(thread, genesisId, lifeEpisode, {
  revision = 1,
  durable = false,
  overrides = {},
} = {}) {
  const lifeEventId = genesisLifeEpisodeEventId({
    threadId: thread.threadId,
    genesisId,
    episode: lifeEpisode,
  });
  const subject = { originEventRef: lifeEventId, slot: "childhood-library" };
  const memoryId = autobiographicalMemoryId({
    threadId: thread.threadId,
    originReference: lifeEventId,
    slot: subject.slot,
  });
  const meaning = durable ? {
    rememberedMeaning: revision === 1
      ? "I came to associate quiet access to books with dependable room for my own attention."
      : "Years later, I still valued that privacy, but understood it as compatible with helping someone else choose for themselves.",
    meaningOutcome: "durable_meaning",
    meaningParts: [{
      meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
      meaning: revision === 1
        ? "The library felt dependable without requiring the memory to become a universal lesson."
        : "The old sense of privacy remained, while becoming less solitary in its later interpretation.",
    }],
  } : {
    rememberedMeaning: null,
    meaningOutcome: "no_durable_meaning",
    meaningParts: [],
  };
  return {
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision,
    threadId: thread.threadId,
    subject,
    subjectPeriod: { startAt: "2004-01-01T00:00:00Z", endAt: "2004-12-31T23:59:59Z" },
    eventRefs: [lifeEventId],
    rememberedContent: "I remember returning the books and choosing another one while the room was nearly empty.",
    ...meaning,
    asOf: revision === 1 ? "2009-01-01T00:00:00Z" : "2015-06-01T00:00:00Z",
    confidence: 0.6,
    uncertainty: ["The exact title is not retained."],
    salience: 0.6,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: revision === 1 ? [] : [lifeEventId],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: PUBLISHED_AT,
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
    ...overrides,
  };
}

function publish(databasePath, {
  threadId = "thr_slice_d_publish_001",
  worldSpecId = "world_slice_d_publish_001",
  genesisId = "gen_slice_d_publish_001",
  memories = null,
  options = {},
} = {}) {
  const thread = genesisThread(threadId);
  const lifeEpisode = episode();
  const memoryRecords = memories ?? [memoryFor(thread, genesisId, lifeEpisode)];
  const genesis = new GenesisStore(databasePath);
  genesis.recordWorldSpec(worldSpec(worldSpecId));
  const result = publishMinimalGenesisPriorLifeFixture(genesis, {
    manifest: manifest(thread, 1 + memoryRecords.length, { worldSpecId, genesisId }),
    thread,
    episodes: [lifeEpisode],
    memories: memoryRecords,
  }, options);
  genesis.close();
  return { thread, lifeEpisode, memories: memoryRecords, result };
}

test("Genesis atomically publishes v2 memory through #38 authority and counts its anchor in first-live version", () =>
  withDatabase((databasePath) => {
    const { thread, memories, result } = publish(databasePath);
    const memory = memories[0];

    const world = openWorldStore(databasePath);
    const events = world.listEvents(thread.threadId);
    assert.deepEqual(events.map((item) => item.eventType), [
      "THREAD_SEEDED",
      "THREAD_LIFE_EPISODE_RECORDED",
      "AUTOBIOGRAPHICAL_MEMORY_RECORDED",
    ]);
    assert.deepEqual(events.map((item) => item.sequence), [1, 2, 3]);
    assert.notEqual(events[2].commandId, null);
    assert.notEqual(events[2].commandDigest, null);
    assert.equal(events[2].occurredAt, PUBLISHED_AT);
    assert.equal(events[2].payload.memoryId, memory.memoryId);
    assert.equal(result.thread.version, thread.version + 2);
    assert.equal(result.manifest.publication.resultingThreadVersion, result.thread.version);
    assert.deepEqual(result.thread.memoryRefs, [memory.memoryId]);
    assert.deepEqual(world.getThread(thread.threadId), result.thread);
    assert.deepEqual(world.replayThread(thread.threadId), result.thread);
    assert.doesNotThrow(() => world.verifyThreadIntegrity(thread.threadId));
    world.close();

    const reader = openAutobiographicalMemoryInspectionStore(databasePath);
    const history = reader.memoryHistory(thread.threadId, memory.memoryId);
    assert.equal(history.length, 1);
    assert.equal(history[0].rememberedContent, memory.rememberedContent);
    assert.equal(history[0].rememberedMeaning, null);
    assert.equal(history[0].meaningOutcome, "no_durable_meaning");
    reader.close();

    const database = new DatabaseSync(databasePath);
    const companion = database.prepare(`
      SELECT status,memory_ref FROM memory_visual_companion_records
      WHERE thread_id=? AND memory_ref=? ORDER BY revision
    `).get(thread.threadId, memory.memoryId);
    database.close();
    assert.equal(companion.memory_ref, memory.memoryId);
    assert.equal(companion.status, "pending_generation");
  }));

test("Genesis publishes multiple meaning revisions through one memory lineage without rewriting Pass-B content", () =>
  withDatabase((databasePath) => {
    const thread = genesisThread("thr_slice_d_revisions_001");
    const lifeEpisode = episode();
    const genesisId = "gen_slice_d_revisions_001";
    const first = memoryFor(thread, genesisId, lifeEpisode, { durable: true });
    const second = memoryFor(thread, genesisId, lifeEpisode, { revision: 2, durable: true });
    const { result } = publish(databasePath, {
      threadId: thread.threadId,
      worldSpecId: "world_slice_d_revisions_001",
      genesisId,
      memories: [second, first],
    });
    assert.equal(result.thread.version, thread.version + 3);

    const reader = openAutobiographicalMemoryInspectionStore(databasePath);
    const history = reader.memoryHistory(thread.threadId, first.memoryId);
    assert.equal(history.length, 2);
    assert.equal(history[0].rememberedContent, history[1].rememberedContent);
    assert.notEqual(history[0].rememberedMeaning, history[1].rememberedMeaning);
    reader.close();

    const database = new DatabaseSync(databasePath);
    const companionCount = Number(database.prepare(
      "SELECT COUNT(*) AS count FROM memory_visual_companion_records WHERE thread_id=? AND memory_ref=?",
    ).get(thread.threadId, first.memoryId).count);
    database.close();
    assert.equal(companionCount, 1);
  }));

test("Genesis refuses to redefine the Pass-B recollection during a meaning revision", () =>
  withDatabase((databasePath) => {
    const thread = genesisThread("thr_slice_d_rewrite_001");
    const lifeEpisode = episode();
    const genesisId = "gen_slice_d_rewrite_001";
    const first = memoryFor(thread, genesisId, lifeEpisode, { durable: true });
    const second = memoryFor(thread, genesisId, lifeEpisode, {
      revision: 2,
      durable: true,
      overrides: { rememberedContent: "I now claim the childhood event was a completely different remembered scene." },
    });
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec("world_slice_d_rewrite_001"));
    assert.throws(
      () => publishMinimalGenesisPriorLifeFixture(genesis, {
        manifest: manifest(thread, 3, {
          worldSpecId: "world_slice_d_rewrite_001",
          genesisId,
        }),
        thread,
        episodes: [lifeEpisode],
        memories: [first, second],
      }),
      (error) => error instanceof GenesisConflictError && /cannot rewrite rememberedContent/.test(error.message),
    );
    genesis.close();
  }));

test("Genesis memory subject must be an admitted Pass-A life event, never THREAD_SEEDED", () =>
  withDatabase((databasePath) => {
    const thread = genesisThread("thr_slice_d_seed_memory_001");
    const lifeEpisode = episode();
    const genesisId = "gen_slice_d_seed_memory_001";
    const valid = memoryFor(thread, genesisId, lifeEpisode);
    const invalidSubject = { originEventRef: thread.provenance.lastEventId, slot: "seed-is-not-childhood" };
    const invalid = {
      ...valid,
      memoryId: autobiographicalMemoryId({
        threadId: thread.threadId,
        originReference: invalidSubject.originEventRef,
        slot: invalidSubject.slot,
      }),
      subject: invalidSubject,
      eventRefs: [invalidSubject.originEventRef],
    };
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec("world_slice_d_seed_memory_001"));
    assert.throws(
      () => publishMinimalGenesisPriorLifeFixture(genesis, {
        manifest: manifest(thread, 2, {
          worldSpecId: "world_slice_d_seed_memory_001",
          genesisId,
        }),
        thread,
        episodes: [lifeEpisode],
        memories: [invalid],
      }),
      (error) => error instanceof GenesisConflictError && /not an admitted Pass-A life event/.test(error.message),
    );
    genesis.close();
  }));

test("failure after the first memory append rolls back Thread, events, memory, anchor, photo obligation and manifest together", () =>
  withDatabase((databasePath) => {
    const threadId = "thr_slice_d_atomic_rollback";
    const genesisId = "gen_slice_d_atomic_rollback";
    const thread = genesisThread(threadId);
    const lifeEpisode = episode();
    const memory = memoryFor(thread, genesisId, lifeEpisode);
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec("world_slice_d_atomic_rollback"));
    assert.throws(
      () => publishMinimalGenesisPriorLifeFixture(genesis, {
        manifest: manifest(thread, 2, {
          worldSpecId: "world_slice_d_atomic_rollback",
          genesisId,
        }),
        thread,
        episodes: [lifeEpisode],
        memories: [memory],
      }, { failAfterFirstMemoryForTest: true }),
      /simulated Slice-D memory publication failure/,
    );

    const database = new DatabaseSync(databasePath);
    for (const [table, where, args] of [
      ["threads", "thread_id=?", [threadId]],
      ["thread_events", "thread_id=?", [threadId]],
      ["commands", "thread_id=?", [threadId]],
      ["autobiographical_memory_records", "thread_id=?", [threadId]],
      ["autobiographical_memory_lineage_heads", "thread_id=?", [threadId]],
      ["memory_visual_companion_records", "thread_id=?", [threadId]],
      ["genesis_manifests", "genesis_id=?", [genesisId]],
    ]) {
      const count = Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).get(...args).count);
      assert.equal(count, 0, `${table} must roll back with birth`);
    }
    database.close();
    genesis.close();
  }));

test("ordinary #38 v2 writes use the same lineage rule that forbids Pass-C from rewriting Pass-B recollection", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    world.seedThread(structuredClone(mina));
    world.close();
    const database = new DatabaseSync(databasePath);
    const event = database.prepare(
      "SELECT event_id,occurred_at FROM thread_events WHERE thread_id=? ORDER BY sequence LIMIT 1",
    ).get(mina.threadId);
    database.close();

    const subject = { originEventRef: event.event_id, slot: "shared-v2-path" };
    const memoryId = autobiographicalMemoryId({
      threadId: mina.threadId,
      originReference: subject.originEventRef,
      slot: subject.slot,
    });
    const first = {
      recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
      memoryId,
      revision: 1,
      threadId: mina.threadId,
      subject,
      subjectPeriod: { startAt: event.occurred_at, endAt: event.occurred_at },
      eventRefs: [event.event_id],
      rememberedContent: "I remember the seeded beginning as a concrete event, though several details remain uncertain.",
      rememberedMeaning: null,
      meaningOutcome: "no_durable_meaning",
      meaningParts: [],
      asOf: "2026-08-18T20:00:00Z",
      confidence: 0.5,
      uncertainty: ["Some details remain uncertain."],
      salience: 0.5,
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
      recordedAt: "2030-01-01T00:00:00Z",
    };
    const writer = openAutobiographicalMemoryStore(databasePath);
    writer.recordMemory(first);
    assert.throws(
      () => writer.recordMemory({
        ...first,
        revision: 2,
        supersedesRevision: 1,
        status: "corrected",
        asOf: "2027-01-01T00:00:00Z",
        recordedAt: "2030-01-01T00:01:00Z",
        rememberedContent: "I replace the original recollection with a different scene during meaning revision.",
      }),
      (error) => error instanceof AutobiographicalMemoryConflictError && /cannot rewrite rememberedContent/.test(error.message),
    );
    writer.close();
  }));
