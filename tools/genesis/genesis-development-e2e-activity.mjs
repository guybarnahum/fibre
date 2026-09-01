import {
  TELEMETRY_VERSION,
  createActivityRecorder,
  normalizeActivityQuery,
  normalizeActivityRecord,
} from "#infra/telemetry";
import {
  normalizeCloudflareEnvironment,
  readCloudflareOperatorState,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";

export const GENESIS_E2E_ACTIVITY_WRITER_VERSION = "fibre-genesis-e2e-activity-writer-v0.1";
export const GENESIS_E2E_ACTIVITY_SERVICE = "genesis-e2e";

const QUERY_COLUMN = Object.freeze({
  requestId: "request_id",
  genesisId: "genesis_id",
  threadId: "thread_id",
  stage: "stage",
  status: "status",
  service: "service",
  environment: "environment",
});

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNullable(value) {
  return value === null || value === undefined ? "NULL" : sqlString(value);
}

function resultRows(parsed) {
  const containers = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const container of containers) {
    const candidates = container?.results ?? container?.result?.results ?? container?.result ?? [];
    if (Array.isArray(candidates)) rows.push(...candidates);
  }
  return rows;
}

function parseWranglerJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

export function activityDatabaseName(state) {
  const matches = (state?.resources?.d1 ?? []).filter((database) => database.binding === "ACTIVITY_LOG");
  if (matches.length !== 1 || typeof matches[0]?.name !== "string" || matches[0].name === "") {
    throw new Error("Cloudflare operator state must contain exactly one ACTIVITY_LOG D1 database");
  }
  return matches[0].name;
}

export function buildActivityInsertSql(candidate) {
  const record = normalizeActivityRecord(candidate);
  const recordJson = JSON.stringify(record);
  return `INSERT INTO fibre_activity_log (
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
  ) VALUES (
    ${sqlString(record.activityId)},
    ${sqlString(record.occurredAt)},
    ${sqlString(record.recordedAt)},
    ${sqlString(record.environment)},
    ${sqlString(record.service)},
    ${sqlNullable(record.deploymentGitSha)},
    ${sqlNullable(record.requestId)},
    ${sqlNullable(record.genesisId)},
    ${sqlNullable(record.threadId)},
    ${sqlNullable(record.experienceId)},
    ${sqlNullable(record.sessionId)},
    ${sqlNullable(record.correlationId)},
    ${sqlNullable(record.causationId)},
    ${sqlString(record.stage)},
    ${sqlString(record.status)},
    ${record.attempt},
    ${sqlNullable(record.message)},
    ${record.error === null ? "NULL" : sqlString(JSON.stringify(record.error))},
    ${sqlString(JSON.stringify(record.evidence))},
    ${sqlString(recordJson)}
  )`;
}

function buildActivityQuerySql(candidate = {}) {
  const query = normalizeActivityQuery(candidate);
  const clauses = [];
  for (const [key, value] of Object.entries(query)) {
    clauses.push(`${QUERY_COLUMN[key]} = ${sqlString(value)}`);
  }
  const where = clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`;
  return `SELECT record_json FROM fibre_activity_log${where} ORDER BY occurred_at ASC, recorded_at ASC, rowid ASC`;
}

export function createWranglerActivityTelemetryPort({ databaseName, runner = runWrangler, cwd = process.cwd() } = {}) {
  const database = nonEmpty("Activity D1 database name", databaseName);
  if (typeof runner !== "function") throw new TypeError("Activity Wrangler runner must be a function");

  async function execute(sql) {
    return runner([
      "d1", "execute", database, "--remote", "--command", sql, "--json",
    ], { cwd });
  }

  async function record(candidate) {
    const normalized = normalizeActivityRecord(candidate);
    await execute(buildActivityInsertSql(normalized));
    return structuredClone(normalized);
  }

  async function query(candidate = {}) {
    const { stdout } = await execute(buildActivityQuerySql(candidate));
    const parsed = parseWranglerJson(stdout, "Wrangler D1 Activity query");
    return Object.freeze(resultRows(parsed).map((row) => {
      if (typeof row?.record_json !== "string") throw new Error("Wrangler D1 Activity row lacks record_json");
      return normalizeActivityRecord(JSON.parse(row.record_json));
    }));
  }

  return Object.freeze({ telemetryVersion: TELEMETRY_VERSION, record, query });
}

export async function createWranglerGenesisE2EActivityRecorder({
  repoRoot,
  environment = "staging",
  service = GENESIS_E2E_ACTIVITY_SERVICE,
  deploymentGitSha = null,
  runner = runWrangler,
  stateReader = readCloudflareOperatorState,
  now,
  activityIdFactory,
  onTelemetryError = () => {},
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const root = nonEmpty("repository root", repoRoot);
  if (typeof stateReader !== "function") throw new TypeError("Activity operator-state reader must be a function");
  const state = await stateReader({ repoRoot: root, environment: env });
  const databaseName = activityDatabaseName(state);
  const telemetry = createWranglerActivityTelemetryPort({ databaseName, runner, cwd: root });
  const recorder = createActivityRecorder({
    telemetry,
    environment: env,
    service: nonEmpty("Activity service", service),
    deploymentGitSha,
    ...(now ? { now } : {}),
    ...(activityIdFactory ? { activityIdFactory } : {}),
    onTelemetryError,
  });
  return Object.freeze({
    contract: GENESIS_E2E_ACTIVITY_WRITER_VERSION,
    databaseName,
    record: recorder.record,
    runStage: recorder.runStage,
  });
}
