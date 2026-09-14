import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-open-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive:true, force:true }); }
}

test("World DB open restores an interrupted event table and every dependent trigger", () => {
  withDatabase((databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const initial = openWorldStore(storage);
    initial.close();

    const raw = new DatabaseSync(databasePath);
    raw.exec(`
      PRAGMA foreign_keys=OFF;
      ALTER TABLE thread_events RENAME TO thread_events_event_upgrade;
      CREATE TRIGGER test_external_thread_event_guard
        BEFORE INSERT ON threads
        WHEN EXISTS (SELECT 1 FROM thread_events)
        BEGIN SELECT RAISE(ABORT,'test guard'); END;
      PRAGMA foreign_keys=ON;
    `);
    raw.close();

    const recovered = openWorldStore(storage);
    recovered.close();

    const verified = new DatabaseSync(databasePath);
    const tables = new Set(verified.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('thread_events','thread_events_event_upgrade')",
    ).all().map((row) => row.name));
    assert.deepEqual(tables, new Set(["thread_events"]));

    const trigger = verified.prepare(
      "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='test_external_thread_event_guard'",
    ).get();
    assert.equal(typeof trigger?.sql, "string");
    assert.match(trigger.sql, /FROM thread_events/);
    verified.close();
  });
});
