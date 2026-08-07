import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { openExpressionStore } from "../services/world-kernel/src/expression-store.mjs";
import { runM1ReviewedProof } from "./m1-reviewed-proof.mjs";
import {
  formatWorldDatabaseSummary,
  inspectWorldDatabase,
  openInspectorSourceDatabase,
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
  const expressionStore = openExpressionStore(databasePath);
  expressionStore.close();
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
    assert.equal(report.summary.tableCounts.disclosure_strategies, 0);
    assert.equal(report.summary.tableCounts.audience_participation_responses, 0);
    assert.equal(report.verification.verified.threads, 1);
    assert.equal(report.verification.verified.privateRequests, 0);
    assert.equal(report.verification.verified.expressionAuthorizations, 0);
    assert.equal(report.verification.verified.completeExpressionChains, 0);
    const summary = formatWorldDatabaseSummary(report);
    assert.match(summary, /Fibre world database: PASS/);
    assert.match(summary, /Source mode: read-only/);
    assert.match(summary, /Schema enforcement: complete/);
    assert.match(summary, /memories=1 including seeded/);
    assert.match(summary, /Disclosure strategies: 0/);
    assert.match(summary, /Audience responses: 0/);
    assert.match(summary, /Active runtime rows: sessions=0, leases=0/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("inspector source opener remains read-only even if query_only is disabled", () => {
  const { directory, databasePath } = seededDatabase();
  try {
    const source = openInspectorSourceDatabase(databasePath);
    try {
      assert.equal(Number(source.prepare("PRAGMA query_only").get().query_only), 1);
      source.exec("PRAGMA query_only=OFF");
      assert.equal(Number(source.prepare("PRAGMA query_only").get().query_only), 0);
      assert.throws(
        () => source.exec("PRAGMA user_version=99"),
        /readonly|read-only|attempt to write/i,
        "the source handle itself must be opened read-only, independent of query_only",
      );
    } finally {
      source.close();
    }
    const verification = new DatabaseSync(databasePath, { readOnly: true });
    try {
      assert.equal(Number(verification.prepare("PRAGMA user_version").get().user_version), 4);
    } finally {
      verification.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("inspector reports a source connection that lacks query_only protection", async () => {
  const { directory, databasePath } = seededDatabase();
  try {
    const report = await inspectWorldDatabase(databasePath, {
      openSourceDatabase(path) {
        return new DatabaseSync(path, {
          readOnly: false,
          enableForeignKeyConstraints: true,
        });
      },
    });
    assert.equal(report.verification.ok, false);
    assert.equal(report.verification.sourceReadOnly, false);
    assert.ok(
      report.verification.errors.includes(
        "source SQLite connection did not report query_only mode",
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database inspector verifies all three completed M1 expression chains", async () => {
  const proof = await runM1ReviewedProof({ keepDatabase: true });
  try {
    const report = await inspectWorldDatabase(proof.databasePath);
    assert.equal(report.verification.ok, true);
    assert.equal(report.verification.sourceReadOnly, true);
    assert.equal(report.summary.tableCounts.disclosure_strategies, 3);
    assert.equal(report.summary.tableCounts.audience_participation_responses, 3);
    assert.equal(report.verification.verified.expressionAuthorizations, 5);
    assert.equal(report.verification.verified.disclosureStrategies, 3);
    assert.equal(report.verification.verified.audienceResponses, 3);
    assert.equal(report.verification.verified.completeExpressionChains, 3);
    assert.deepEqual(report.summary.communicatedPostures, { accept: 2, refuse: 1 });
    assert.deepEqual(report.summary.disclosureModes, {
      full_candor: 1,
      tactful_candor: 2,
    });
    const summary = formatWorldDatabaseSummary(report);
    assert.match(summary, /completeExpressionChains=3/);
    assert.match(summary, /Disclosure modes: full_candor=1, tactful_candor=2|Disclosure modes: tactful_candor=2, full_candor=1/);
  } finally {
    rmSync(dirname(proof.databasePath), { recursive: true, force: true });
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
