import assert from "node:assert/strict";
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
    if (!this.database.rows.has(row.activity_id)) {
      row.rowid = ++this.database.lastRowId;
      this.database.rows.set(row.activity_id, row);
    }
    return { success: true };
  }

  async first() {
    if (!this.sql.startsWith("SELECT record_json FROM fibre_activity_log WHERE activity_id = ?")) {
      throw new Error(`unexpected D1 first: ${this.sql}`);
    }
    const row = this.database.rows.get(this.bindings[0]);
    return row ? { record_json: row.record_json } : null;
  }

  async all() {
    if (!this.sql.startsWith("SELECT record_json FROM fibre_activity_log")) {
      throw new Error(`unexpected D1 all: ${this.sql}`);
    }
    const columns = [...this.sql.matchAll(/([a-z_]+) = \?/gu)].map((match) => match[1]);
    const selected = [...this.database.rows.values()]
      .filter((row) => columns.every((column, index) => row[column] === this.bindings[index]))
      .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at)
        || left.recorded_at.localeCompare(right.recorded_at)
        || left.rowid - right.rowid)
      .map((row) => ({ record_json: row.record_json }));
    return { success: true, results: selected };
  }
}

class FakeD1Database {
  constructor({ failWrites = false } = {}) {
    this.rows = new Map();
    this.lastRowId = 0;
    this.failWrites = failWrites;
  }

  prepare(sql) {
    return new FakeD1Statement(this, sql);
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

test("Cloudflare Activity Log records idempotently, rejects divergent reuse, and queries by correlation", async () => {
  const database = new FakeD1Database();
  const telemetry = createCloudflareActivityTelemetryPort({ database });

  const first = await telemetry.record(activity());
  const replay = await telemetry.record(activity());
  assert.deepEqual(replay, first);
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
