import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { openWorldStore } from "../src/persistence.mjs";
import { AUTOBIOGRAPHICAL_MEMORY_POLICY, autobiographicalMemoryId, normalizeAutobiographicalMemory } from "../src/autobiographical-memory-domain.mjs";
import { AutobiographicalMemoryConflictError, openAutobiographicalMemoryInspectionStore, openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
function withDatabase(run) {
  const dir = mkdtempSync(join(tmpdir(), "fibre-memory-"));
  const path = join(dir, "world.sqlite");
  try { return run(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function seed(path, thread = fixture) {
  const world = openWorldStore(path); world.seedThread(structuredClone(thread)); world.close();
  const db = new DatabaseSync(path);
  const row = db.prepare("SELECT event_id,occurred_at FROM thread_events WHERE thread_id=? ORDER BY sequence LIMIT 1").get(thread.threadId);
  db.close(); return row;
}
function record(event, revision = 1, overrides = {}) {
  return {
    memoryId: autobiographicalMemoryId({ threadId: fixture.threadId, originReference: event.event_id, slot: "seed-perspective" }),
    revision, threadId: fixture.threadId,
    subjectPeriod: { startAt: event.occurred_at, endAt: event.occurred_at },
    eventRefs: [event.event_id],
    rememberedMeaning: revision === 1 ? "I remember this as a beginning, while many details remain uncertain." : "I now interpret the same beginning more cautiously; the event is fixed but my perspective is not.",
    rememberedAt: "2026-08-13T16:00:00Z", asOf: "2026-08-13T16:00:00Z",
    confidence: revision === 1 ? 0.55 : 0.4,
    uncertainty: ["The cited event does not establish every autobiographical detail."],
    salience: 0.8, accessibility: revision === 1 ? "accessible" : "difficult",
    retentionState: revision === 1 ? "fragmentary" : "uncertain",
    authorship: { kind: "fibre_policy_derived", entityId: "fibre.world-kernel", policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY } },
    supportingEvidenceRefs: [], contradictingEvidenceRefs: [], visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: revision === 1 ? "2026-08-13T16:00:00Z" : "2026-08-13T16:01:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}), ...overrides,
  };
}

test("autobiographical memory reinterprets perspective without rewriting history or earning standing", () => withDatabase((path) => {
  const event = seed(path); const db = new DatabaseSync(path);
  const before = db.prepare("SELECT payload_json FROM thread_events WHERE event_id=?").get(event.event_id).payload_json; db.close();
  const store = openAutobiographicalMemoryStore(path); store.recordMemory(record(event)); store.recordMemory(record(event, 2));
  const history = store.memoryHistory(fixture.threadId, record(event).memoryId);
  assert.equal(history.length, 2); assert.notEqual(history[0].rememberedMeaning, history[1].rememberedMeaning);
  assert.deepEqual(store.inspectThread(fixture.threadId).standingCredit, { acceptedCausalAssertions: 0, endogenousEvidenceAssertions: 0 }); store.close();
  const check = new DatabaseSync(path); const after = check.prepare("SELECT payload_json FROM thread_events WHERE event_id=?").get(event.event_id).payload_json; check.close();
  assert.equal(after, before);
}));

test("memory admission rejects manufactured evidence and cannot erase prior evidence or widen visibility", () => withDatabase((path) => {
  const event = seed(path); const store = openAutobiographicalMemoryStore(path);
  assert.throws(() => store.recordMemory(record(event, 1, { eventRefs: ["evt_not_real"] })), AutobiographicalMemoryConflictError);
  assert.throws(() => store.recordMemory(record(event, 1, { supportingEvidenceRefs: ["evt_not_real"] })), AutobiographicalMemoryConflictError);
  store.recordMemory(record(event, 1, { supportingEvidenceRefs: [event.event_id] }));
  assert.throws(() => store.recordMemory(record(event, 2)), AutobiographicalMemoryConflictError);
  assert.throws(() => store.recordMemory(record(event, 2, { supportingEvidenceRefs: [event.event_id], visibility: "public" })), AutobiographicalMemoryConflictError);
  store.close();
}));

test("retraction preserves history while removing the current projection", () => withDatabase((path) => {
  const event = seed(path); const store = openAutobiographicalMemoryStore(path);
  store.recordMemory(record(event)); store.recordMemory(record(event, 2, { status: "retracted" }));
  assert.equal(store.memoryHistory(fixture.threadId, record(event).memoryId).length, 2); assert.equal(store.listCurrentMemories(fixture.threadId).length, 0); store.close();
}));

test("memory survives restart and read-only inspection cannot author", () => withDatabase((path) => {
  const event = seed(path); const writer = openAutobiographicalMemoryStore(path); writer.recordMemory(record(event)); writer.close();
  const reader = openAutobiographicalMemoryInspectionStore(path); assert.equal(reader.queryOnly(), true); assert.equal(reader.memoryHistory(fixture.threadId, record(event).memoryId).length, 1);
  assert.throws(() => reader.recordMemory(record(event, 2)), AutobiographicalMemoryConflictError); reader.close();
}));

test("memory schema refuses unwitnessed recall claims and self-authored Development labels", () => {
  const event = { event_id: "evt_example", occurred_at: "2026-08-02T17:00:00Z" }; const candidate = record(event);
  assert.throws(() => normalizeAutobiographicalMemory({ ...candidate, lastRecalledAt: candidate.recordedAt }));
  assert.throws(() => normalizeAutobiographicalMemory({ ...candidate, authorship: { ...candidate.authorship, kind: "thread_self_authored" } }));
});
