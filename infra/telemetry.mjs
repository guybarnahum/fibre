import {
  assertInfraFiniteNumber,
  assertInfraId,
  assertInfraNonEmpty,
  assertInfraPlainObject,
} from "./internal.mjs";

export const TELEMETRY_VERSION = "infra-telemetry-v0.1";
export const ACTIVITY_RECORD_VERSION = "fibre-runtime-activity-v0.1";

export const ACTIVITY_STATUSES = Object.freeze([
  "started",
  "succeeded",
  "failed",
  "retrying",
]);

export const ACTIVITY_ERROR_CATEGORIES = Object.freeze([
  "validation",
  "invariant",
  "conflict",
  "authorization",
  "dependency",
  "provider",
  "timeout",
  "network",
  "storage",
  "queue",
  "workflow",
  "reconciliation",
  "unknown",
]);

export const ACTIVITY_EVIDENCE_KEYS = Object.freeze([
  "providerRequestId",
  "eventId",
  "commandId",
  "objectRef",
  "digest",
  "worldSpecId",
  "genomeId",
  "embodimentId",
  "fibreIdentityNumber",
  "queueMessageId",
  "workflowInstanceId",
]);

const ACTIVITY_STATUS_SET = new Set(ACTIVITY_STATUSES);
const ERROR_CATEGORY_SET = new Set(ACTIVITY_ERROR_CATEGORIES);
const EVIDENCE_KEY_SET = new Set(ACTIVITY_EVIDENCE_KEYS);
const ACTIVITY_KEYS = new Set([
  "activityVersion",
  "activityId",
  "occurredAt",
  "recordedAt",
  "environment",
  "service",
  "deploymentGitSha",
  "requestId",
  "genesisId",
  "threadId",
  "experienceId",
  "sessionId",
  "correlationId",
  "causationId",
  "stage",
  "status",
  "attempt",
  "message",
  "error",
  "evidence",
]);
const RECORDER_KEYS = new Set([
  "activityId",
  "occurredAt",
  "recordedAt",
  "requestId",
  "genesisId",
  "threadId",
  "experienceId",
  "sessionId",
  "correlationId",
  "causationId",
  "stage",
  "status",
  "attempt",
  "message",
  "error",
  "evidence",
]);
const QUERY_KEYS = new Set([
  "requestId",
  "genesisId",
  "threadId",
  "stage",
  "status",
  "service",
  "environment",
]);
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_MESSAGE_LENGTH = 2_048;

export class ActivityTelemetryIdempotencyConflictError extends Error {}

function assertExactKeys(name, value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
}

function assertIsoTimestamp(name, value) {
  assertInfraNonEmpty(name, value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO-8601 UTC timestamp`);
  }
}

function normalizeNullableId(name, value) {
  if (value === undefined || value === null) return null;
  assertInfraId(name, value);
  return value;
}

function normalizeDeploymentGitSha(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    throw new TypeError("activity.deploymentGitSha must be a 40-character lowercase Git SHA");
  }
  return value;
}

export function sanitizeActivityMessage(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new TypeError("activity.message must be a string or null");
  if (value.length > MAX_MESSAGE_LENGTH) throw new TypeError(`activity.message exceeds ${MAX_MESSAGE_LENGTH} characters`);
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/gu, "sk-[REDACTED]")
    .replace(/\bbfl_[A-Za-z0-9_-]{8,}/giu, "bfl_[REDACTED]")
    .replace(/\bcfk_[A-Za-z0-9_-]{8,}/giu, "cfk_[REDACTED]")
    .replace(/\b(api[_-]?key|token|authorization)\s*[:=]\s*[^\s,;]+/giu, "$1=[REDACTED]");
}

function normalizeActivityError(value) {
  if (value === undefined || value === null) return null;
  assertInfraPlainObject("activity.error", value);
  assertExactKeys("activity.error", value, new Set(["category", "code", "retryable"]));
  if (!ERROR_CATEGORY_SET.has(value.category)) throw new TypeError("activity.error.category is unsupported");
  assertInfraId("activity.error.code", value.code);
  if (typeof value.retryable !== "boolean") throw new TypeError("activity.error.retryable must be a boolean");
  return Object.freeze({
    category: value.category,
    code: value.code,
    retryable: value.retryable,
  });
}

function normalizeActivityEvidence(value) {
  if (value === undefined || value === null) return Object.freeze({});
  assertInfraPlainObject("activity.evidence", value);
  assertExactKeys("activity.evidence", value, EVIDENCE_KEY_SET);
  const normalized = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null) {
      normalized[key] = null;
      continue;
    }
    assertInfraNonEmpty(`activity.evidence.${key}`, item);
    normalized[key] = item;
  }
  return Object.freeze(normalized);
}

export function normalizeActivityRecord(candidate) {
  assertInfraPlainObject("activity", candidate);
  assertExactKeys("activity", candidate, ACTIVITY_KEYS);
  if (candidate.activityVersion !== ACTIVITY_RECORD_VERSION) {
    throw new TypeError(`unsupported activity record version ${candidate.activityVersion}`);
  }
  assertInfraId("activity.activityId", candidate.activityId);
  assertIsoTimestamp("activity.occurredAt", candidate.occurredAt);
  assertIsoTimestamp("activity.recordedAt", candidate.recordedAt);
  assertInfraId("activity.environment", candidate.environment);
  assertInfraId("activity.service", candidate.service);
  assertInfraId("activity.stage", candidate.stage);
  if (!ACTIVITY_STATUS_SET.has(candidate.status)) throw new TypeError("activity.status is unsupported");
  assertInfraFiniteNumber("activity.attempt", candidate.attempt, { integer: true, minimum: 1 });

  return Object.freeze({
    activityVersion: ACTIVITY_RECORD_VERSION,
    activityId: candidate.activityId,
    occurredAt: candidate.occurredAt,
    recordedAt: candidate.recordedAt,
    environment: candidate.environment,
    service: candidate.service,
    deploymentGitSha: normalizeDeploymentGitSha(candidate.deploymentGitSha),
    requestId: normalizeNullableId("activity.requestId", candidate.requestId),
    genesisId: normalizeNullableId("activity.genesisId", candidate.genesisId),
    threadId: normalizeNullableId("activity.threadId", candidate.threadId),
    experienceId: normalizeNullableId("activity.experienceId", candidate.experienceId),
    sessionId: normalizeNullableId("activity.sessionId", candidate.sessionId),
    correlationId: normalizeNullableId("activity.correlationId", candidate.correlationId),
    causationId: normalizeNullableId("activity.causationId", candidate.causationId),
    stage: candidate.stage,
    status: candidate.status,
    attempt: candidate.attempt,
    message: sanitizeActivityMessage(candidate.message),
    error: normalizeActivityError(candidate.error),
    evidence: normalizeActivityEvidence(candidate.evidence),
  });
}

export function normalizeActivityQuery(candidate = {}) {
  assertInfraPlainObject("activity query", candidate);
  assertExactKeys("activity query", candidate, QUERY_KEYS);
  const normalized = {};
  for (const key of ["requestId", "genesisId", "threadId", "stage", "service", "environment"]) {
    if (candidate[key] === undefined) continue;
    assertInfraId(`activity query.${key}`, candidate[key]);
    normalized[key] = candidate[key];
  }
  if (candidate.status !== undefined) {
    if (!ACTIVITY_STATUS_SET.has(candidate.status)) throw new TypeError("activity query.status is unsupported");
    normalized.status = candidate.status;
  }
  return Object.freeze(normalized);
}

export function assertTelemetryPort(port) {
  assertInfraPlainObject("infra telemetry port", port);
  if (port.telemetryVersion !== TELEMETRY_VERSION) {
    throw new TypeError(`unsupported infra telemetry version ${port.telemetryVersion}`);
  }
  for (const method of ["record", "query"]) {
    if (typeof port[method] !== "function") throw new TypeError(`infra telemetry.${method} must be a function`);
  }
  return port;
}

function defaultActivityIdFactory() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required to allocate activity IDs");
  }
  return `act_${globalThis.crypto.randomUUID()}`;
}

function defaultNow() {
  return new Date().toISOString();
}

function classifyRunStageError(error) {
  const category = ERROR_CATEGORY_SET.has(error?.activityCategory) ? error.activityCategory : "unknown";
  const code = typeof error?.code === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(error.code)
    ? error.code
    : "ERROR";
  return Object.freeze({
    category,
    code,
    retryable: error?.retryable === true,
  });
}

export function createActivityRecorder({
  telemetry,
  environment,
  service,
  deploymentGitSha = null,
  now = defaultNow,
  activityIdFactory = defaultActivityIdFactory,
} = {}) {
  assertTelemetryPort(telemetry);
  assertInfraId("activity recorder environment", environment);
  assertInfraId("activity recorder service", service);
  normalizeDeploymentGitSha(deploymentGitSha);
  if (typeof now !== "function") throw new TypeError("activity recorder now must be a function");
  if (typeof activityIdFactory !== "function") throw new TypeError("activity recorder activityIdFactory must be a function");

  async function record(candidate) {
    assertInfraPlainObject("activity recorder input", candidate);
    assertExactKeys("activity recorder input", candidate, RECORDER_KEYS);
    const occurredAt = candidate.occurredAt ?? now();
    const recordedAt = candidate.recordedAt ?? now();
    const activity = normalizeActivityRecord({
      activityVersion: ACTIVITY_RECORD_VERSION,
      activityId: candidate.activityId ?? activityIdFactory(),
      occurredAt,
      recordedAt,
      environment,
      service,
      deploymentGitSha,
      requestId: candidate.requestId ?? null,
      genesisId: candidate.genesisId ?? null,
      threadId: candidate.threadId ?? null,
      experienceId: candidate.experienceId ?? null,
      sessionId: candidate.sessionId ?? null,
      correlationId: candidate.correlationId ?? null,
      causationId: candidate.causationId ?? null,
      stage: candidate.stage,
      status: candidate.status,
      attempt: candidate.attempt ?? 1,
      message: candidate.message ?? null,
      error: candidate.error ?? null,
      evidence: candidate.evidence ?? {},
    });
    return telemetry.record(activity);
  }

  async function runStage(metadata, operation) {
    if (typeof operation !== "function") throw new TypeError("activity stage operation must be a function");
    assertInfraPlainObject("activity stage metadata", metadata);
    const common = { ...metadata };
    delete common.status;
    delete common.error;
    await record({ ...common, status: "started", error: null });
    try {
      const result = await operation();
      await record({ ...common, status: "succeeded", error: null });
      return result;
    } catch (error) {
      await record({
        ...common,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
        error: classifyRunStageError(error),
      });
      throw error;
    }
  }

  return Object.freeze({ record, runStage });
}
