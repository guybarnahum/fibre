import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  ACTIVITY_RECORD_VERSION,
  ActivityTelemetryIdempotencyConflictError,
  createActivityRecorder,
} from "#infra/telemetry";
import { createCloudflareActivityTelemetryPort } from "#infra/providers/cloudflare/telemetry";

const INSERT_COLUMNS = Object.freeze([
  "activity_id",
  "occurred_at",
  "recorded_at",
  "environment",
  "service",
  "deployment_git_sha",
  "request_id",
  "genesis_id",
  "thread_id",
  "experience_id",
  "session_id",
  "correlation_id",
  "causation_id",
  "stage",
  "status",
  "attempt",
  "message",
  "error_json",
  "evidence_json",
  "record_json",
]);

class FakeD1Statement {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql.replace(/\s+/gu, " ").trim();
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new FakeD1Statement(this.database, this.sql, bindings);
  }

  async run() {
    if (!this.sql.startsWith("INSERT OR IGNORE INTO fibre_activity_log")) {
      throw new Error(`unexpected D1 run: ${this.sql}`);
    }
    if (this.database.failWrites) throw new Error("simulated D1 unavailable");
    const row = Object.fromEntries(INSERT_COLUMNS.map((column, index) => [column, this.bindings[index]]));
    const created = !this.database.rows.has(row.activity_id);
    if (created) {
      row.rowid = ++this.database.lastRowId;
      this.database.rows.set(row.activity_id, row);
    }
    return {
      success:true,
      meta:{ changes:created ? 1 : 0, rows_read:1, rows_written:created ? 5 : 0 },
    };
  }

  async first() {
    if (!this.sql.startsWith("SELECT record_json FROM fibre_activity_log WHERE activity_id = ?")) {
      throw new Error(`unexpected D1 first: ${this.sql}`);
    }
    this.database.reads += 1;
    const row = this.database.rows.get(this.bindings[0]);
    return row ? { record_json: row.record_json } : null;
  }

  async all() {
    if (!this.sql.startsWith("SELECT record_json FROM fibre_activity_log")) {
      throw new Error(`unexpected D1 all: ${this.sql}`);
    }
    this.database.reads += 1;
    const columns = [...this.sql.matchAll(/([a-z_]+) = \?/gu)].map((match) => match[1]);
    const selected = [...this.database.rows.values()]
      .filter((row) => columns.every((column, index) => row[column] === this.bindings[index]))
      .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at)
        || left.recorded_at.localeCompare(right.recorded_at)
        || left.rowid - right.rowid)
      .map((row) => ({ record_json: row.record_json }));
    return { success:true, results:selected, meta:{ rows_read:selected.length + 2, rows_written:0 } };
  }
}

class FakeD1Database {
  constructor({ failWrites = false } = {}) {
    this.rows = new Map();
    this.lastRowId = 0;
    this.reads = 0;
    this.failWrites = failWrites;
  }

  prepare(sql) {
    return new FakeD1Statement(this, sql);
  }
}

class SqliteD1Statement {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new SqliteD1Statement(this.database, this.sql, bindings);
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { success: true, meta: { changes: Number(result.changes ?? 0) } };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) ?? null;
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.bindings) };
  }
}

class SqliteD1Database {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    for (const migration of [
      "../providers/cloudflare/d1/0001_activity_log.sql",
      "../providers/cloudflare/d1/0003_activity_thread_heads.sql",
    ]) {
      this.database.exec(readFileSync(new URL(migration, import.meta.url), "utf8"));
    }
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database, sql);
  }

  close() {
    this.database.close();
  }
}

function activity(overrides = {}) {
  return {
    activityVersion: ACTIVITY_RECORD_VERSION,
    activityId: "act_cloud_001",
    occurredAt: "2026-09-01T06:20:00.000Z",
    recordedAt: "2026-09-01T06:20:00.001Z",
    environment: "staging",
    service: "birth-center",
    deploymentGitSha: "9baa39c426496d0437a0760ec6f297e4d72a2d9b",
    requestId: "req_cloud_001",
    genesisId: "gen_cloud_001",
    threadId: "thr_cloud_001",
    experienceId: null,
    sessionId: null,
    correlationId: null,
    causationId: null,
    stage: "birth.request.persist",
    status: "succeeded",
    attempt: 1,
    message: null,
    error: null,
    evidence: { digest: `sha256:${"a".repeat(64)}` },
    ...overrides,
  };
}

test("new Activity facts stay write-only while D1 cost remains attributable to the Fibre operation", async () => {
  const database = new FakeD1Database();
  const costs = [];
  const telemetry = createCloudflareActivityTelemetryPort({
    database,
    onCost(operation, result) {
      costs.push({
        operation,
        rowsRead:result.meta.rows_read,
        rowsWritten:result.meta.rows_written,
      });
    },
  });

  const first = await telemetry.record(activity());
  assert.equal(database.reads, 0, "a new observational fact should not be reread immediately");
  assert.deepEqual(costs, [{ operation:"activity.record", rowsRead:1, rowsWritten:5 }]);

  const replay = await telemetry.record(activity());
  assert.deepEqual(replay, first);
  assert.equal(database.reads, 1, "an idempotent retry must verify the durable fact");
  assert.deepEqual(costs.slice(1), [
    { operation:"activity.record", rowsRead:1, rowsWritten:0 },
    { operation:"activity.retry_verify", rowsRead:3, rowsWritten:0 },
  ]);
  assert.equal(database.rows.size, 1);

  await telemetry.record(activity({
    activityId: "act_cloud_002",
    occurredAt: "2026-09-01T06:20:01.000Z",
    recordedAt: "2026-09-01T06:20:01.001Z",
    service: "world-kernel",
    stage: "world.thread.publication",
  }));
  await telemetry.record(activity({
    activityId: "act_other_001",
    requestId: "req_other_001",
    genesisId: "gen_other_001",
    threadId: "thr_other_001",
  }));

  const correlated = await telemetry.query({ requestId: "req_cloud_001" });
  assert.deepEqual(correlated.map((record) => record.activityId), ["act_cloud_001", "act_cloud_002"]);
  assert.deepEqual(
    (await telemetry.query({ threadId: "thr_cloud_001", service: "world-kernel" })).map((record) => record.activityId),
    ["act_cloud_002"],
  );

  await assert.rejects(
    telemetry.record(activity({ message: "different bytes for the same activity id" })),
    ActivityTelemetryIdempotencyConflictError,
  );
  assert.equal(database.rows.size, 3);
});

test("Cloudflare Activity replay accepts legacy v0.1 JSON without operation linkage fields", async () => {
  const database = new FakeD1Database();
  const legacy = activity();
  database.rows.set(legacy.activityId, {
    activity_id: legacy.activityId,
    record_json: JSON.stringify(legacy),
    rowid: 1,
  });
  database.lastRowId = 1;

  const telemetry = createCloudflareActivityTelemetryPort({ database });
  const replay = await telemetry.record(legacy);
  assert.equal(replay.activityId, legacy.activityId);
  assert.equal(replay.operationId, null);
  assert.equal(replay.parentOperationId, null);
  assert.equal(database.rows.size, 1);
});

test("Activity Log migration and provider execute against SQLite-compatible D1 semantics", async (t) => {
  const database = new SqliteD1Database();
  t.after(() => database.close());
  const telemetry = createCloudflareActivityTelemetryPort({ database });

  await telemetry.record(activity());
  await telemetry.record(activity({
    activityId: "act_cloud_sqlite_002",
    occurredAt: "2026-09-01T06:20:02.000Z",
    recordedAt: "2026-09-01T06:20:02.001Z",
    service: "world-kernel",
    stage: "world.genome.admission",
    status: "started",
  }));

  const records = await telemetry.query({ genesisId: "gen_cloud_001" });
  assert.deepEqual(records.map((record) => record.activityId), [
    "act_cloud_001",
    "act_cloud_sqlite_002",
  ]);
  assert.equal(records[0].deploymentGitSha, "9baa39c426496d0437a0760ec6f297e4d72a2d9b");
  assert.equal(records[0].environment, "staging");
  const head = database.database.prepare(
    "SELECT thread_id,last_activity_at FROM fibre_activity_thread_heads WHERE environment=?",
  ).get("staging");
  assert.equal(head?.thread_id, "thr_cloud_001", "Thread activity head must stay bound to the Thread");
  assert.equal(head?.last_activity_at, "2026-09-01T06:20:02.000Z", "Thread activity head must advance with new observational Activity");
  const indexes = database.database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'fibre_activity_log' ORDER BY name",
  ).all().map((row) => row.name);
  assert.deepEqual(indexes, [
    "fibre_activity_genesis_idx",
    "fibre_activity_request_idx",
    "fibre_activity_service_stage_idx",
    "fibre_activity_thread_idx",
    "sqlite_autoindex_fibre_activity_log_1",
  ]);
});

test("Activity recorder remains best-effort when the Cloudflare D1 Activity Log is unavailable", async () => {
  const telemetry = createCloudflareActivityTelemetryPort({ database: new FakeD1Database({ failWrites: true }) });
  const observed = [];
  const recorder = createActivityRecorder({
    telemetry,
    environment: "staging",
    service: "asset-generator",
    now: () => "2026-09-01T06:21:00.000Z",
    activityIdFactory: () => "act_best_effort_001",
    onTelemetryError(error, record) {
      observed.push({ error: error.message, activityId: record.activityId });
    },
  });

  const returned = await recorder.record({
    requestId: "req_best_effort_001",
    threadId: "thr_best_effort_001",
    stage: "asset.request.execute",
    status: "started",
    attempt: 1,
  });
  assert.equal(returned.activityId, "act_best_effort_001");
  assert.deepEqual(observed, [{ error: "simulated D1 unavailable", activityId: "act_best_effort_001" }]);
});