import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { embodimentId, embodimentSpecificationDigest } from "../src/embodiment-domain.mjs";
import { EmbodimentConflictError, openEmbodimentInspectionStore, openEmbodimentStore } from "../src/embodiment-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
const spec = { method: "generated", description: "Neutral portrait of Mina", model: "replaceable-renderer" };
function portrait(revision = 1) {
  return { embodimentId: embodimentId({ threadId: fixture.threadId, kind: "portrait", lineage: "primary" }), revision, threadId: fixture.threadId, kind: "portrait", representationKind: "synthetic_generation", truthStatus: "synthetic_representation_not_historical_evidence", rightsBasis: "generated_no_human_source", permissionReferences: [], sourceReferences: ["ias_identity_source"], specification: spec, specificationDigest: embodimentSpecificationDigest(spec), status: "pending_generation", unavailableReason: null, asset: null, visibility: "private", recordedAt: revision === 1 ? "2026-08-13T16:00:00Z" : "2026-08-13T16:01:00Z", ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}) };
}
function withDb(run) { const dir = mkdtempSync(join(tmpdir(), "fibre-emb-hostile-")); const db = join(dir, "world.sqlite"); try { const w = openWorldStore(db); w.seedThread(structuredClone(fixture)); w.close(); return run(db); } finally { rmSync(dir, { recursive: true, force: true }); } }

test("embodiment lineage cannot switch synthetic representation into captured truth", () => withDb((db) => {
  const store = openEmbodimentStore(db); store.record(portrait(1));
  const forged = { ...portrait(2), representationKind: "captured_source", truthStatus: "captured_source_evidence", rightsBasis: "thread_self_owned" };
  assert.throws(() => store.record(forged), EmbodimentConflictError); store.close();
}));

test("embodiment inspection is query-only and cannot author", () => withDb((db) => {
  const writer = openEmbodimentStore(db); writer.record(portrait(1)); writer.close();
  const inspector = openEmbodimentInspectionStore(db); assert.equal(inspector.queryOnly(), true);
  assert.equal(inspector.inspectThread(fixture.threadId).embodiment.length, 1);
  assert.throws(() => inspector.record(portrait(2)), EmbodimentConflictError); inspector.close();
}));
