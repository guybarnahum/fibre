import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  AUTOBIOGRAPHICAL_MEMORY_V2_POLICY,
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
  autobiographicalMemoryRecordDigest,
  normalizeAutobiographicalMemory,
  rehydrateAutobiographicalMemory,
} from "../src/autobiographical-memory-domain.mjs";
import { buildAutobiographicalMemoryRecordedEvent } from "../src/autobiographical-memory-anchor.mjs";
import {
  openAutobiographicalMemoryInspectionStore,
  openAutobiographicalMemoryStore,
} from "../src/autobiographical-memory-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { MAX_CLAIM_PREDICATE_BYTES } from "../src/identity-claim-discipline.mjs";
import { legacySeedIdentityAssertions } from "../src/identity-provenance-domain.mjs";
import { canonicalJson, threadStateHash } from "../src/persistence-common.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-pre-g-stage4-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_pre_g_stage4_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-20T03:00:00Z" },
    places: [{ placeId: "place_pre_g_stage4", description: "Synthetic Stage-4 publication fixture." }],
    householdShape: "Two caregivers and one sibling.",
    familyRelations: ["Household members share ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and ordinary public services.",
    mobilityPattern: "Walking and public transit.",
    schoolingOrCommunityContext: "Public schools and community institutions.",
    culturalContext: "Mixed neighborhood institutions.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "teacher"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic Pre-G Stage-4 carry-forward fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-20T02:50:00Z",
    },
    createdAt: "2026-08-20T02:50:00Z",
  };
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

function longThread() {
  const threadId = `t${"x".repeat(255)}`;
  assert.equal(threadId.length, 256);
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-20T02:55:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_pre_g_stage4_long_thread_seed",
  };
  return thread;
}

function longBirthEpisodes() {
  return [{
    episodeId: "ep_pre_g_stage4_long_thread",
    occurredAt: "2008-05-01T16:00:00Z",
    ageAtEvent: 8,
    placeRef: "place_pre_g_stage4",
    participantRefs: [],
    observableAction: "The child returns a library book at the desk and chooses another from a nearby shelf.",
    structureRef: null,
    introducedParticipants: [],
  }];
}

function manifest(thread, publishedEpisodes = []) {
  return {
    genesisId: "gen_pre_g_stage4_long_thread",
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-20T02:59:00Z",
      justification: "Pre-G Stage-4 long Thread-ID regression.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_pre_g_stage4_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-20T03:00:00Z",
      resultingThreadVersion: thread.version + publishedEpisodes.length,
    },
    createdAt: "2026-08-20T02:52:00Z",
  };
}

function seedThread(path) {
  const world = openWorldStore(path);
  world.seedThread(structuredClone(mina));
  const event = world.listEvents(mina.threadId)[0];
  world.close();
  return event;
}

function oversizedHistoricalMemory(seedEvent) {
  const subject = { originEventRef: seedEvent.eventId, slot: "stage4-policy-drift" };
  const memoryId = autobiographicalMemoryId({
    threadId: mina.threadId,
    originReference: subject.originEventRef,
    slot: subject.slot,
  });
  return {
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision: 1,
    threadId: mina.threadId,
    subject,
    subjectPeriod: { startAt: seedEvent.occurredAt, endAt: seedEvent.occurredAt },
    eventRefs: [seedEvent.eventId],
    rememberedContent: `Historical admitted content: ${"x".repeat(AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxRememberedContentBytes)}`,
    rememberedMeaning: "I remember the beginning as an uncertain but personally significant transition.",
    meaningOutcome: "durable_meaning",
    meaningParts: [{
      meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
      meaning: "The beginning remained significant even though later memory policy changed.",
    }],
    asOf: "2026-08-20T03:10:00Z",
    confidence: 0.6,
    uncertainty: ["Historical admission does not make remembered interpretation external fact."],
    salience: 0.7,
    accessibility: "accessible",
    retentionState: "retained",
    authorship: {
      kind: "fibre_policy_derived",
      entityId: "fibre.world-kernel",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: "2026-08-20T03:10:00Z",
  };
}

function insertHistoricalMemory(path, record) {
  const digest = autobiographicalMemoryRecordDigest(record);
  const database = new DatabaseSync(path, { enableForeignKeyConstraints: true });
  const threadRow = database.prepare(
    "SELECT version,state_json FROM threads WHERE thread_id=?",
  ).get(record.threadId);
  const thread = JSON.parse(threadRow.state_json);
  const sequence = Number(database.prepare(
    "SELECT COALESCE(MAX(sequence),0)+1 AS next_sequence FROM thread_events WHERE thread_id=?",
  ).get(record.threadId).next_sequence);
  const { nextThread, event } = buildAutobiographicalMemoryRecordedEvent(thread, {
    memoryId: record.memoryId,
    revision: record.revision,
    memoryDigest: digest,
    recordedAt: record.recordedAt,
    sequence,
  });

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      INSERT INTO autobiographical_memory_records(
        memory_id,revision,thread_id,status,visibility,as_of,recorded_at,
        supersedes_revision,record_json,record_digest
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      record.memoryId,
      record.revision,
      record.threadId,
      record.status,
      record.visibility,
      record.asOf,
      record.recordedAt,
      null,
      canonicalJson(record),
      digest,
    );
    database.prepare(`
      INSERT INTO autobiographical_memory_lineage_heads(memory_id,revision,thread_id,head_digest,recorded_at)
      VALUES (?,?,?,?,?)
    `).run(record.memoryId, record.revision, record.threadId, digest, record.recordedAt);
    database.prepare(`
      INSERT INTO thread_events(
        event_id,thread_id,sequence,expected_version,resulting_version,event_type,
        command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
        authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      event.eventId,
      event.threadId,
      event.sequence,
      event.expectedVersion,
      event.resultingVersion,
      event.eventType,
      event.commandId,
      event.commandDigest,
      canonicalJson(event.payload),
      canonicalJson(event.actor),
      event.occurredAt,
      event.stateHash,
      event.authorizationId,
      event.causationId,
      event.correlationId,
      event.payloadSchemaVersion,
      canonicalJson(event.provenance),
    );
    database.prepare(`
      INSERT INTO commands(thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      event.threadId,
      event.commandId,
      event.commandDigest,
      event.expectedVersion,
      event.resultingVersion,
      event.eventId,
      event.occurredAt,
    );
    database.prepare(`
      UPDATE threads SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
      WHERE thread_id=? AND version=?
    `).run(
      nextThread.version,
      canonicalJson(nextThread),
      threadStateHash(nextThread),
      event.eventId,
      record.recordedAt,
      record.threadId,
      Number(threadRow.version),
    );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }
  return digest;
}

test("Genesis publication supports the full Thread-ID contract without exceeding claim-predicate budget", () =>
  withDatabase((databasePath) => {
    const shortAssertions = legacySeedIdentityAssertions(structuredClone(mina));
    assert.equal(shortAssertions[0].claimPredicate.subject, mina.threadId);

    const thread = longThread();
    const episodes = longBirthEpisodes();
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const published = genesis.publishBirth({
      manifest: manifest(thread, episodes),
      thread,
      episodes,
    });
    assert.equal(published.thread.threadId, thread.threadId);
    assert.equal(published.thread.version, thread.version + episodes.length);
    genesis.close();

    const world = openWorldStore(databasePath);
    const replayed = world.replayThread(thread.threadId);
    const events = world.listEvents(thread.threadId);
    world.close();
    assert.deepEqual(replayed, published.thread);
    assert.equal(events.length, 2);
    assert.ok(events.every((event) => event.eventId.length <= 256));
    assert.ok(events.every((event) => event.eventId.startsWith("evt_thread_")));

    const database = new DatabaseSync(databasePath);
    const rows = database.prepare(
      "SELECT thread_id,assertion_json FROM identity_assertion_records WHERE thread_id=? ORDER BY assertion_id",
    ).all(thread.threadId);
    database.close();
    assert.ok(rows.length >= 3);
    const assertions = rows.map((row) => JSON.parse(row.assertion_json));
    assert.ok(assertions.some((assertion) => assertion.claimPredicate.subject !== thread.threadId));
    for (const assertion of assertions) {
      assert.equal(assertion.threadId, thread.threadId);
      assert.ok(
        Buffer.byteLength(canonicalJson(assertion.claimPredicate), "utf8") <= MAX_CLAIM_PREDICATE_BYTES,
      );
    }
  }));

test("historical memories survive later content-policy tightening while new writes stay strict", () =>
  withDatabase((databasePath) => {
    const seedEvent = seedThread(databasePath);
    const historical = oversizedHistoricalMemory(seedEvent);
    assert.ok(
      Buffer.byteLength(historical.rememberedContent, "utf8") >
        AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxRememberedContentBytes,
    );
    assert.throws(
      () => normalizeAutobiographicalMemory(historical),
      /rememberedContent exceeds/,
    );
    assert.equal(
      rehydrateAutobiographicalMemory(historical).rememberedContent,
      historical.rememberedContent,
    );

    const digest = insertHistoricalMemory(databasePath, historical);
    assert.equal(digest, autobiographicalMemoryRecordDigest(historical));

    const reader = openAutobiographicalMemoryInspectionStore(databasePath);
    const history = reader.memoryHistory(mina.threadId, historical.memoryId);
    assert.equal(history.length, 1);
    assert.equal(history[0].rememberedContent, historical.rememberedContent);
    assert.equal(reader.listCurrentMemories(mina.threadId)[0].memoryId, historical.memoryId);
    reader.close();

    const writer = openAutobiographicalMemoryStore(databasePath);
    assert.throws(
      () => writer.recordMemory(historical),
      /rememberedContent exceeds/,
    );
    writer.close();
  }));