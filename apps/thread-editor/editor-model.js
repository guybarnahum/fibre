export const DEFAULT_THREAD_ID = "thr_mina_001";

export function initials(name = "Thread") {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function requestSummary(request) {
  return {
    requestId: request.requestId,
    objective: request.objective ?? "Unnamed request",
    requester: request.requester?.displayName ?? request.requester?.entityId ?? "Unknown requester",
    desiredAction: request.desiredAction ?? "pending",
    dignityBand: request.dignityBand ?? "unrecorded",
    snapshotVersion: request.snapshotVersion ?? null,
    occurredAt: request.occurredAt ?? null,
  };
}

export function runtimeSummary(runtime) {
  return {
    sessionId: runtime.sessionId ?? runtime.session?.sessionId,
    requestId: runtime.requestId ?? runtime.session?.requestId,
    status: runtime.status ?? runtime.session?.status ?? "unknown",
    leaseStatus: runtime.leaseStatus ?? runtime.lease?.status ?? "unknown",
    guardianDecision: runtime.guardianDecision ?? runtime.goalGuardianAudit?.audit?.decision ?? null,
    desiredAction: runtime.desiredAction ?? runtime.authorization?.decision?.authorizedAction ?? null,
    startedAt: runtime.startedAt ?? runtime.session?.startedAt ?? null,
  };
}

export function expressionSummary(expression) {
  return {
    requestId: expression.requestId,
    authorizationId: expression.authorizationId ?? null,
    desiredAction: expression.desiredAction ?? null,
    authorizedAction: expression.authorizedAction ?? null,
    dignityBand: expression.dignityBand ?? null,
    strategyId: expression.strategyId ?? null,
    disclosureMode: expression.disclosureMode ?? null,
    communicatedPosture: expression.communicatedPosture ?? null,
    responseId: expression.responseId ?? null,
    recordedAt:
      expression.responseRecordedAt ??
      expression.strategyRecordedAt ??
      expression.authorizationIssuedAt ??
      expression.issuedAt ??
      null,
    complete: expression.strategyId !== null && expression.responseId !== null,
  };
}

function parsedTime(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function leaseExpirationState(lease, kernelTime) {
  if (lease?.status === "expired") return "expired";
  const expiresAt = parsedTime(lease?.expiresAt);
  if (expiresAt === null) return "not_applicable";
  const observedAt = parsedTime(kernelTime);
  if (observedAt === null) return "unknown";
  return expiresAt <= observedAt ? "expired" : "current";
}

export function lifecycleOutcome(runtimeDetail, freezeDetail, abandonDetail, kernelTime = null) {
  const session = runtimeDetail?.runtime?.session ?? runtimeDetail?.session ?? runtimeDetail;
  const lease = runtimeDetail?.runtime?.lease ?? runtimeDetail?.lease ?? null;
  if (freezeDetail?.freeze ?? freezeDetail?.report ?? freezeDetail?.reportId) {
    return { kind: "frozen", label: "Frozen", detail: "Authorization consumed and accepted life changes persisted." };
  }
  if (abandonDetail?.abandonment ?? abandonDetail?.record ?? abandonDetail?.abandonmentId) {
    return { kind: "abandoned", label: "Explicitly abandoned", detail: "Guardian-rejected episode closed without consumption." };
  }
  const expiration = leaseExpirationState(lease, kernelTime);
  if (expiration === "expired") {
    const pendingReclaim = lease?.status === "active";
    return {
      kind: "timeout",
      label: pendingReclaim ? "Timed out — not yet reclaimed" : "Timed out",
      detail: pendingReclaim
        ? "Kernel time passed lease expiry; the persisted lease remains active until a later acquisition reclaims it."
        : "Lease expired; no abandonment decision was synthesized.",
    };
  }
  if (session?.status === "aborted") {
    return { kind: "aborted", label: "Aborted", detail: "Runtime is closed and cannot continue work." };
  }
  if (session?.status === "completed") {
    return { kind: "completed", label: "Completed", detail: "Runtime completed." };
  }
  if (expiration === "unknown") {
    return {
      kind: "unknown",
      label: "Expiry unknown",
      detail: "The runtime has a lease expiry, but current kernel time is unavailable. The editor will not assert that it remains active.",
    };
  }
  return { kind: "active", label: "Active", detail: "Runtime remains active at the freshly observed kernel time." };
}

export async function loadRuntimeInspection({ basePath, fetchJson, optionalJson }) {
  if (typeof basePath !== "string" || basePath.length === 0) {
    throw new TypeError("basePath is required");
  }
  if (typeof fetchJson !== "function" || typeof optionalJson !== "function") {
    throw new TypeError("fetchJson and optionalJson are required");
  }
  const [health, runtime, integrity, freeze, freezeIntegrity, abandon, abandonIntegrity] = await Promise.all([
    fetchJson("/api/editor/health"),
    fetchJson(basePath),
    fetchJson(`${basePath}/integrity`),
    optionalJson(`${basePath}/freeze`),
    optionalJson(`${basePath}/freeze/integrity`),
    optionalJson(`${basePath}/abandon`),
    optionalJson(`${basePath}/abandon/integrity`),
  ]);
  const kernelTime = health?.kernel?.kernelTime ?? null;
  return {
    runtime,
    integrity,
    freeze,
    freezeIntegrity,
    abandon,
    abandonIntegrity,
    kernelTime,
    outcome: lifecycleOutcome(runtime, freeze, abandon, kernelTime),
  };
}

export function inspectionCounts(inspection) {
  const expressions = inspection?.private?.expressions ?? [];
  return {
    events: inspection?.events?.length ?? 0,
    requests: inspection?.private?.requests?.length ?? 0,
    runtimes: inspection?.private?.runtimes?.length ?? 0,
    expressions: expressions.length,
    completeExpressions: expressions.filter(
      (expression) => expression.strategyId !== null && expression.responseId !== null,
    ).length,
    memories: inspection?.thread?.memoryRefs?.length ?? 0,
    relationships: inspection?.thread?.relationshipRefs?.length ?? 0,
    unresolvedIntentions: inspection?.thread?.currentState?.unresolvedIntentions?.length ?? 0,
  };
}

export function formatJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}
