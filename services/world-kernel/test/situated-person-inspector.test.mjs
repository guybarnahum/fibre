import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { inspectSituatedPerson } from "../src/situated-person-inspector.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

test("integrated situated-person inspection is query-only and preserves zero standing inflation", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-inspect-")); const db = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(localWorldStateStorage(db)); world.seedThread(structuredClone(fixture)); world.close();
    const report = inspectSituatedPerson(localWorldStateStorage(db), fixture.threadId);
    assert.deepEqual(report.inspectionMode, { identityQueryOnly: true, situatedLifeQueryOnly: true, embodimentQueryOnly: true });
    assert.equal(report.antiInflation.acceptedCausalAssertions, 0);
    assert.equal(report.antiInflation.endogenousEvidenceAssertions, 0);
    assert.equal(report.threadId, fixture.threadId);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
