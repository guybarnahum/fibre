import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const MAX_FREEZE_RATIONALE_BYTES = 4096;

export class RuntimeAbandonNotFoundError extends Error {}
export class RuntimeAbandonConflictError extends Error {}
export class RuntimeAbandonRejectedError extends Error {}

export function assertFreezeRationaleBounds(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) return;
  if (!Array.isArray(request.lifeChangeDecisions)) return;
  request.lifeChangeDecisions.forEach((decision, index) => {
    if (decision === null || typeof decision !== "object" || Array.isArray(decision)) return;
    if (typeof decision.rationale !== "string") return;
    if (Buffer.byteLength(decision.rationale, "utf8") > MAX_FREEZE_RATIONALE_BYTES) {
      throw new TypeError(
        `freeze lifeChangeDecision ${index} rationale exceeds ${MAX_FREEZE_RATIONALE_BYTES} bytes`,
      );
    }
  });
}

export function normalizeRuntimeAbandonRequest(request) {
  assertPlainObject("runtime abandon request", request);
  assertExactKeys("runtime abandon request", request, [
    "operationId",
    "causationId",
    "correlationId",
  ]);
  assertId("runtime abandon operationId", request.operationId);
  assertId("runtime abandon causationId", request.causationId);
  if (request.correlationId !== undefined) {
    assertId("runtime abandon correlationId", request.correlationId);
  }
  return {
    operationId: request.operationId,
    causationId: request.causationId,
    correlationId: request.correlationId ?? request.causationId,
  };
}

export function runtimeAbandonOperationDigest(threadId, sessionId, request) {
  assertId("threadId", threadId);
  assertId("sessionId", sessionId);
  const normalized = normalizeRuntimeAbandonRequest(request);
  return `sha256:${sha256(canonicalJson({ threadId, sessionId, ...normalized }))}`;
}

export function runtimeAbandonRecordDigest(record) {
  assertPlainObject("runtime abandonment record", record);
  assertExactKeys("runtime abandonment record", record, [
    "abandonmentId",
    "operationId",
    "operationDigest",
    "sessionId",
    "threadId",
    "requestId",
    "authorizationId",
    "goalGuardianAuditId",
    "reason",
    "abandonedAt",
    "causationId",
    "correlationId",
  ]);
  for (const [name, value] of [
    ["abandonmentId", record.abandonmentId],
    ["operationId", record.operationId],
    ["sessionId", record.sessionId],
    ["threadId", record.threadId],
    ["requestId", record.requestId],
    ["authorizationId", record.authorizationId],
    ["goalGuardianAuditId", record.goalGuardianAuditId],
    ["causationId", record.causationId],
    ["correlationId", record.correlationId],
  ]) assertId(`runtime abandonment ${name}`, value);
  if (!/^sha256:[0-9a-f]{64}$/.test(record.operationDigest)) {
    throw new TypeError("runtime abandonment operationDigest is invalid");
  }
  if (record.reason !== "guardian_rejected") {
    throw new TypeError("runtime abandonment reason must be guardian_rejected");
  }
  assertIsoTimestamp("runtime abandonment abandonedAt", record.abandonedAt);
  return `sha256:${sha256(canonicalJson(record))}`;
}