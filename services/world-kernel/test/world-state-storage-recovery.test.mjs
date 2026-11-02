import assert from "node:assert/strict";
import { mkdtempSync, rmSync,readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import {createThreadEventsTable} from "../src/thread-event-schema.mjs";

const mina=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-open-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive:true, force:true }); }
}

test("a new World activation restores interrupted event authority", () => {
  withDatabase((databasePath) => {
    const initial = openWorldStore(localWorldStateStorage(databasePath));
    initial.seedThread(mina);
    initial.close();

    const raw = new DatabaseSync(databasePath);
    const before=raw.prepare("SELECT COUNT(*) AS n FROM thread_events").get().n;
    assert.ok(before>0,"fixture has no event history");
    raw.exec("PRAGMA foreign_keys=OFF");
    createThreadEventsTable({exec:sql=>raw.exec(sql)},"thread_events_event_upgrade");
    raw.exec(`
      INSERT INTO thread_events_event_upgrade SELECT * FROM thread_events;
      DROP TABLE thread_events;
      CREATE TRIGGER test_external_thread_event_guard
        BEFORE INSERT ON threads
        WHEN EXISTS (SELECT 1 FROM thread_events)
        BEGIN SELECT RAISE(ABORT,'test guard'); END;
    `);
    raw.exec("PRAGMA foreign_keys=ON");
    raw.close();

    const recovered = openWorldStore(localWorldStateStorage(databasePath));
    recovered.close();

    const verified = new DatabaseSync(databasePath);
    const tables = new Set(verified.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('thread_events','thread_events_event_upgrade')",
    ).all().map((row) => row.name));
    assert.deepEqual(tables, new Set(["thread_events"]));
    assert.equal(verified.prepare("SELECT COUNT(*) AS n FROM thread_events").get().n,before,
      "interrupted upgrade lost event history");
    assert.deepEqual(verified.prepare("PRAGMA foreign_key_check").all(),[],
      "recovery broke World references");
    assert.ok(verified.prepare("PRAGMA index_list(thread_events)").all()
      .some(row=>row.name==="idx_thread_events_thread_sequence"),
      "recovered events lost their sequence index");
    assert.throws(()=>verified.exec("UPDATE thread_events SET sequence=sequence"),
      /append-only/u,"recovered event history became mutable");

    const trigger = verified.prepare(
      "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='test_external_thread_event_guard'",
    ).get();
    assert.equal(typeof trigger?.sql, "string");
    assert.match(trigger.sql, /FROM thread_events/);
    verified.close();
  });
});
