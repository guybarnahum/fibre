import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import {
  formatWorldDatabaseSummary,
  inspectWorldDatabase,
  parseInspectorArguments,
} from "./inspect-world-database.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function seededDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-inspector-test-"));
  const databasePath = join(directory, "world.sqlite");
  const store = openWorldStore(databasePath);
  try {
    store.seedThread(fixture);
  } finally {
    store.close();
  }
  return { directory, databasePath };
}

test("database inspector verifies and summarizes a clean Fibre world", async () => {
  const { directory, databasePath } = seededDatabase();
  try {
    const report = await inspectWorldDatabase(databasePath);
    assert.equal(report.verification.ok, true);
    assert.equal(report.verification.sourceReadOnly, true);
    assert.equal(report.verification.sourceSchema, true);
    assert.equal(report.verification.snapshotVerified, true);
    assert.equal(report.summary.threadCount, 1);
    assert.equal(report.summary.threads[0].threadId, fixture.threadId);
    assert.equal(report.summary.threads[0].name, "Mina Park");
    assert.deepEqual(report.summary.eventTypes, { THREAD_SEEDED: 1 });
    assert.equal(report.summary.activeSessionCount, 0);
    assert.equal(report.summary.activeLeaseCount, 0);
    assert.equal(report.verification.verified.threads, 1);
    assert.equal(report.verification.verified.privateRequests, 0);
    const summary = formatWorldDatabaseSummary(report);
    assert.match(summary, /Fibre world database: PASS/);
    assert.match(summary, /Source mode: read-only/);
    assert.match(summary, /Schema enforcement: complete/);
    assert.match(summary, /memories=1 including seeded/);
    assert.match(summary, /Active runtime rows: sessions=0, leases=0/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database inspector reports projection corruption without repairing it", async () => {
  const { directory, databasePath } = seededDatabase();
  const corruptHash = `sha256:${"0".repeat(64)}`;
  try {
    const database = new DatabaseSync(databasePath);
    try {
      database.prepare("UPDATE threads SET state_hash=? WHERE thread_id=?").run(
        corruptHash,
        fixture.threadId,
      );
    } finally {
      database.close();
    }

    const report = await inspectWorldDatabase(databasePath);
    assert.equal(report.verification.ok, false);
    assert.equal(report.verification.sqliteIntegrity, true);
    assert.ok(
      report.verification.errors.some((error) => /projection hash does not match state/.test(error)),
    );

    const source = new DatabaseSync(databasePath, { readOnly: true });
    try {
      assert.equal(
        source.prepare("SELECT state_hash FROM threads WHERE thread_id=?").get(fixture.threadId).state_hash,
        corruptHash,
        "inspection must not repair or otherwise mutate the source database",
      );
    } finally {
      source.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database inspector detects missing source enforcement without restoring it", async () => {
  const { directory, databasePath } = seededDatabase();
  try {
    const database = new DatabaseSync(databasePath);
    try {
      database.exec("DROP TRIGGER thread_events_no_delete");
    } finally {
      database.close();
    }

    const report = await inspectWorldDatabase(databasePath);
    assert.equal(report.verification.ok, false);
    assert.equal(report.verification.sourceSchema, false);
    assert.equal(report.verification.snapshotVerified, false);
    assert.equal(report.verification.domainRecords, false);
    assert.ok(
      report.verification.errors.some(
        (error) => /missing triggers:.*thread_events_no_delete/.test(error),
      ),
    );
    assert.ok(
      report.verification.errors.some(
        (error) => /domain verification skipped because source schema enforcement is incomplete/.test(error),
      ),
    );

    const source = new DatabaseSync(databasePath, { readOnly: true });
    try {
      assert.equal(
        source.prepare(
          "SELECT count(*) AS count FROM sqlite_master WHERE type='trigger' AND name='thread_events_no_delete'",
        ).get().count,
        0,
        "inspection must not restore enforcement objects in the source database",
      );
    } finally {
      source.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database inspector arguments keep path and JSON mode explicit", () => {
  assert.deepEqual(parseInspectorArguments(["world.sqlite", "--json"]), {
    help: false,
    json: true,
    databasePath: "world.sqlite",
  });
  assert.throws(
    () => parseInspectorArguments(["one.sqlite", "two.sqlite"]),
    /only one database path/,
  );
});
