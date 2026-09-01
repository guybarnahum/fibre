import { infraCanonicalJson } from "../../internal.mjs";
import {
  ActivityTelemetryIdempotencyConflictError,
  TELEMETRY_VERSION,
  normalizeActivityQuery,
  normalizeActivityRecord,
} from "../../telemetry.mjs";

const QUERY_COLUMN = Object.freeze({
  requestId: "request_id",
  genesisId: "genesis_id",
  threadId: "thread_id",
  stage: "stage",
  status: "status",
  service: "service",
  environment: "environment",
});

function assertDatabase(database) {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("Cloudflare activity telemetry requires a D1 database binding");
  }
  return database;
}

function clone(value) {
  return structuredClone(value);
}

function serializedRecord(record) {
  return infraCanonicalJson(record);
}

function deserializeRecord(value) {
  if (typeof value !== "string" || value === "") {
    throw new Error("Cloudflare activity telemetry stored an invalid record payload");
  }
  return normalizeActivityRecord(JSON.parse(value));
}

export function createCloudflareActivityTelemetryPort({ database } = {}) {
  const db = assertDatabase(database);

  async function record(candidate) {
    const normalized = normalizeActivityRecord(candidate);
    const canonical = serializedRecord(normalized);
    await db.prepare(`
      INSERT OR IGNORE INTO fibre_activity_log (
        activity_id,
        occurred_at,
        recorded_at,
        environment,
        service,
        deployment_git_sha,
        request_id,
        genesis_id,
        thread_id,
        experience_id,
        session_id,
        correlation_id,
        causation_id,
        stage,
        status,
        attempt,
        message,
        error_json,
        evidence_json,
        record_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      normalized.activityId,
      normalized.occurredAt,
      normalized.recordedAt,
      normalized.environment,
      normalized.service,
      normalized.deploymentGitSha,
      normalized.requestId,
      normalized.genesisId,
      normalized.threadId,
      normalized.experienceId,
      normalized.sessionId,
      normalized.correlationId,
      normalized.causationId,
      normalized.stage,
      normalized.status,
      normalized.attempt,
      normalized.message,
      normalized.error === null ? null : infraCanonicalJson(normalized.error),
      infraCanonicalJson(normalized.evidence),
      canonical,
    ).run();

    const existing = await db.prepare(
      "SELECT record_json FROM fibre_activity_log WHERE activity_id = ? LIMIT 1",
    ).bind(normalized.activityId).first();
    if (!existing || typeof existing.record_json !== "string") {
      throw new Error(`Cloudflare activity ${normalized.activityId} was not readable after record`);
    }
    if (existing.record_json !== canonical) {
      throw new ActivityTelemetryIdempotencyConflictError(
        `activity ${normalized.activityId} was already recorded with different content`,
      );
    }
    return clone(deserializeRecord(existing.record_json));
  }

  async function query(candidate = {}) {
    const normalizedQuery = normalizeActivityQuery(candidate);
    const conditions = [];
    const bindings = [];
    for (const [key, value] of Object.entries(normalizedQuery)) {
      conditions.push(`${QUERY_COLUMN[key]} = ?`);
      bindings.push(value);
    }
    const where = conditions.length === 0 ? "" : ` WHERE ${conditions.join(" AND ")}`;
    const statement = db.prepare(
      `SELECT record_json FROM fibre_activity_log${where} ORDER BY occurred_at ASC, recorded_at ASC, rowid ASC`,
    );
    const result = bindings.length === 0
      ? await statement.all()
      : await statement.bind(...bindings).all();
    if (!result || !Array.isArray(result.results)) {
      throw new Error("Cloudflare activity telemetry query returned an invalid D1 result");
    }
    return Object.freeze(result.results.map((row) => clone(deserializeRecord(row.record_json))));
  }

  return Object.freeze({
    telemetryVersion: TELEMETRY_VERSION,
    record,
    query,
  });
}
