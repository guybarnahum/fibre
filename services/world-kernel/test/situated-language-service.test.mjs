import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { SituatedLanguageService } from "../src/situated-language-service.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

test("language formation requires a real lived event and remains context-only", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-language-")); const db = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(db); const seeded = world.seedThread(structuredClone(fixture)).thread; world.close();
    const service = new SituatedLanguageService(db);
    const input = {
      threadId: fixture.threadId,
      kind: "household_language_use",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.",
      relationWitnesses: [], placeWitnesses: [], recordedAt: "2026-08-13T16:02:00Z",
    };
    assert.throws(() => service.recordLanguageFormation({ ...input, eventReferences: ["evt_invented"] }), /does not exist/);
    const stored = service.recordLanguageFormation({ ...input, eventReferences: [seeded.provenance.lastEventId] });
    assert.equal(stored.assertion.domain, "language_formation");
    assert.equal(stored.assertion.behavioralStatus, "context_only");
    assert.equal(stored.registryVersion, "2");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
