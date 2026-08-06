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

function leaseExpiredAt(lease, kernelTime) {
  if (lease?.status === "expired") return true;
  if (typeof lease?.expiresAt !== "string" || typeof kernelTime !== "string") return false;
  const expiresAt = Date.parse(lease.expiresAt);
  const observedAt = Date.parse(kernelTime);
  return Number.isFinite(expiresAt) && Number.isFinite(observedAt) && expiresAt <= observedAt;
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
  if (leaseExpiredAt(lease, kernelTime)) {
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
  return { kind: "active", label: "Active", detail: "Runtime remains active at the kernel-observed time." };
}

export function inspectionCounts(inspection) {
  return {
    events: inspection?.events?.length ?? 0,
    requests: inspection?.private?.requests?.length ?? 0,
    runtimes: inspection?.private?.runtimes?.length ?? 0,
    memories: inspection?.thread?.memoryRefs?.length ?? 0,
    relationships: inspection?.thread?.relationshipRefs?.length ?? 0,
    unresolvedIntentions: inspection?.thread?.currentState?.unresolvedIntentions?.length ?? 0,
  };
}

export function formatJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}
