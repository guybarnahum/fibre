import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
  autobiographicalMemoryRecordDigest,
  normalizeAutobiographicalMemory,
} from "../src/autobiographical-memory-domain.mjs";
import {
  openAutobiographicalMemoryInspectionStore,
  openAutobiographicalMemoryStore,
} from "../src/autobiographical-memory-store.mjs";
import { genesisMeaningPartId } from "../src/genesis-pass-c-domain.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-memory-v2-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const world = openWorldStore(localWorldStateStorage(databasePath));
  world.seedThread(structuredClone(fixture));
  world.close();
  const database = new DatabaseSync(databasePath);
  const event = database.prepare(
    "SELECT event_id,occurred_at FROM thread_events WHERE thread_id=? ORDER BY sequence LIMIT 1",
  ).get(fixture.threadId);
  database.close();
  return event;
}

function legacyRecord(event) {
  const subject = { originEventRef: event.event_id, slot: "legacy-memory" };
  return {
    memoryId: autobiographicalMemoryId({
      threadId: fixture.threadId,
      originReference: subject.originEventRef,
      slot: subject.slot,
    }),
    revision: 1,
    threadId: fixture.threadId,
    subject,
    subjectPeriod: { startAt: event.occurred_at, endAt: event.occurred_at },
    eventRefs: [event.event_id],
    rememberedMeaning: "I remember this event as an uncertain but personally meaningful beginning.",
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
}

function genesisRecord(event, revision = 1, overrides = {}) {
  const subject = { originEventRef: event.event_id, slot: "genesis-memory" };
  const memoryId = autobiographicalMemoryId({
    threadId: fixture.threadId,
    originReference: subject.originEventRef,
    slot: subject.slot,
  });
  return {
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision,
    threadId: fixture.threadId,
    subject,
    subjectPeriod: { startAt: event.occurred_at, endAt: event.occurred_at },
    eventRefs: [event.event_id],
    rememberedContent: "I remember the beginning as a concrete scene, while several details remain uncertain.",
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
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: revision === 1 ? "2030-01-01T00:01:00Z" : "2030-01-01T00:02:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
    ...overrides,
  };
}

function durableMeaning(memoryId) {
  return {
    rememberedMeaning: "I came to treat beginnings as concrete events that need not immediately resolve into a lesson.",
    meaningOutcome: "durable_meaning",
    meaningParts: [
      {
        meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
        meaning: "The remembered scene can remain specific even while its significance stays partly unsettled.",
      },
      {
        meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 2 }),
        meaning: "A beginning can matter without becoming a universal rule for later choices.",
      },
    ],
  };
}

test("legacy #38 autobiographical-memory records retain their admitted v1 shape", () => {
  const event = { event_id: "evt_legacy_memory_shape", occurred_at: "2026-08-18T19:00:00Z" };
  const candidate = legacyRecord(event);
  const normalized = normalizeAutobiographicalMemory(candidate);
  assert.equal(Object.hasOwn(normalized, "recordFormat"), false);
  assert.equal(normalized.rememberedMeaning, candidate.rememberedMeaning);
  assert.equal(Object.hasOwn(normalized, "rememberedContent"), false);
});

test("v2 keeps remembered content separate from nullable durable meaning", () => {
  const event = { event_id: "evt_genesis_memory_shape", occurred_at: "2026-08-18T19:00:00Z" };
  const noMeaning = genesisRecord(event);
  const normalized = normalizeAutobiographicalMemory(noMeaning);
  assert.equal(normalized.rememberedContent, noMeaning.rememberedContent);
  assert.equal(normalized.meaningOutcome, "no_durable_meaning");
  assert.equal(normalized.rememberedMeaning, null);
  assert.deepEqual(normalized.meaningParts, []);

  const withMeaning = genesisRecord(event, 1, durableMeaning(noMeaning.memoryId));
  const normalizedMeaning = normalizeAutobiographicalMemory(withMeaning);
  assert.equal(normalizedMeaning.rememberedContent, noMeaning.rememberedContent);
  assert.equal(normalizedMeaning.meaningOutcome, "durable_meaning");
  assert.equal(normalizedMeaning.meaningParts.length, 2);
  assert.notEqual(normalizedMeaning.rememberedContent, normalizedMeaning.rememberedMeaning);
});

test("v2 meaning outcome and independently citable part identity are mechanically coherent", () => {
  const event = { event_id: "evt_genesis_memory_coherence", occurred_at: "2026-08-18T19:00:00Z" };
  const base = genesisRecord(event);
  assert.throws(
    () => normalizeAutobiographicalMemory({ ...base, rememberedMeaning: "A durable meaning appeared despite a no-meaning outcome." }),
    /rememberedMeaning=null/,
  );
  assert.throws(
    () => normalizeAutobiographicalMemory({ ...base, meaningOutcome: "durable_meaning" }),
    /rememberedMeaning/,
  );

  const durable = genesisRecord(event, 1, durableMeaning(base.memoryId));
  assert.throws(
    () => normalizeAutobiographicalMemory({
      ...durable,
      meaningParts: [{ ...durable.meaningParts[0], meaningPartId: "mpart_0000000000000000000000000000000000000000" }],
    }),
    /not stable for memory\+ordinal/,
  );
  assert.throws(
    () => normalizeAutobiographicalMemory({ ...base, recordFormat: "autobiographical_memory_future" }),
    /unsupported autobiographical memory recordFormat/,
  );
});

test("Pass C and the memory ledger derive exactly the same MeaningPart identity", () => {
  const memoryId = `mem_${"a".repeat(64)}`;
  assert.equal(
    genesisMeaningPartId({ memoryRef: memoryId, ordinal: 3 }),
    autobiographicalMeaningPartId({ memoryId, ordinal: 3 }),
  );
  assert.equal(
    genesisMeaningPartId({ memoryRef: "mem_provisional_slice_d", ordinal: 1 }),
    autobiographicalMeaningPartId({ memoryId: "mem_provisional_slice_d", ordinal: 1 }),
  );
});

test("v2 digest binds remembered content and durable meaning independently", () => {
  const event = { event_id: "evt_genesis_memory_digest", occurred_at: "2026-08-18T19:00:00Z" };
  const base = genesisRecord(event);
  const baseDigest = autobiographicalMemoryRecordDigest(base);
  assert.notEqual(
    autobiographicalMemoryRecordDigest({ ...base, rememberedContent: `${base.rememberedContent} Another detail.` }),
    baseDigest,
  );
  const durable = genesisRecord(event, 1, durableMeaning(base.memoryId));
  assert.notEqual(autobiographicalMemoryRecordDigest(durable), baseDigest);
});

test("the existing #38 store persists and reopens v2 memory without a parallel Genesis memory authority", () =>
  withDatabase((databasePath) => {
    const event = seed(databasePath);
    const first = genesisRecord(event);
    const writer = openAutobiographicalMemoryStore(localWorldStateStorage(databasePath));
    writer.recordMemory(first);

    const {
      recordFormat: ignoredFormat,
      rememberedContent: ignoredContent,
      meaningOutcome: ignoredOutcome,
      meaningParts: ignoredParts,
      ...legacyRevision
    } = genesisRecord(event, 2, {
      rememberedMeaning: "This attempts to reinterpret a v2 lineage as the legacy v1 record shape.",
    });
    assert.equal(typeof ignoredFormat, "string");
    assert.equal(typeof ignoredContent, "string");
    assert.equal(typeof ignoredOutcome, "string");
    assert.ok(Array.isArray(ignoredParts));
    assert.throws(() => writer.recordMemory(legacyRevision), /cannot change record format/);

    writer.recordMemory(genesisRecord(event, 2, durableMeaning(first.memoryId)));
    writer.close();

    const reader = openAutobiographicalMemoryInspectionStore(localWorldStateStorage(databasePath));
    const history = reader.memoryHistory(fixture.threadId, first.memoryId);
    assert.equal(history.length, 2);
    assert.equal(history[0].recordFormat, AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2);
    assert.equal(history[0].meaningOutcome, "no_durable_meaning");
    assert.equal(history[0].rememberedMeaning, null);
    assert.equal(history[1].meaningOutcome, "durable_meaning");
    assert.equal(history[1].rememberedContent, history[0].rememberedContent);
    assert.equal(history[1].meaningParts.length, 2);
    reader.close();

    const database = new DatabaseSync(databasePath);
    const parallelGenesisMemoryTables = database.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('genesis_memories','genesis_memory_records','genesis_meanings')
    `).all();
    const visualCompanions = database.prepare(`
      SELECT COUNT(*) AS count FROM memory_visual_companion_records WHERE memory_ref=?
    `).get(first.memoryId);
    database.close();
    assert.deepEqual(parallelGenesisMemoryTables, []);
    assert.equal(Number(visualCompanions.count), 1);
  }));
