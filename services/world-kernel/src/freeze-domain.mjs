import {
  IntegrityError,
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { currentEpisodeEvidenceRefsFromRuntime } from "./episode-evidence.mjs";

const DECISIONS = new Set(["accept", "reject"]);
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export class FreezeNotFoundError extends Error {}
export class FreezeConflictError extends Error {}
export class FreezeRejectedError extends Error {}
export class AuthorizationConsumedError extends Error {}
export class FreezeStateChangedError extends Error {}

function assertUniqueStrings(name, values) {
  assertStringArray(name, values);
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
}

function normalizeDecision(decision) {
  assertPlainObject("freeze lifeChangeDecision", decision);
  assertExactKeys("freeze lifeChangeDecision", decision, [
    "proposalIndex",
    "decision",
    "rationale",
  ]);
  assertFiniteNumber("freeze lifeChangeDecision.proposalIndex", decision.proposalIndex, {
    integer: true,
    minimum: 0,
  });
  if (!DECISIONS.has(decision.decision)) {
    throw new TypeError("freeze lifeChangeDecision.decision is invalid");
  }
  assertNonEmpty("freeze lifeChangeDecision.rationale", decision.rationale);
  return {
    proposalIndex: decision.proposalIndex,
    decision: decision.decision,
    rationale: decision.rationale,
  };
}

export function normalizeFreezeRequest(request) {
  assertPlainObject("freeze request", request);
  assertExactKeys("freeze request", request, [
    "operationId",
    "lifeChangeDecisions",
    "causationId",
    "correlationId",
  ]);
  assertId("freeze operationId", request.operationId);
  assertId("freeze causationId", request.causationId);
  if (request.correlationId !== undefined) {
    assertId("freeze correlationId", request.correlationId);
  }
  if (!Array.isArray(request.lifeChangeDecisions)) {
    throw new TypeError("freeze lifeChangeDecisions must be an array");
  }
  const decisions = request.lifeChangeDecisions.map(normalizeDecision)
    .sort((left, right) => left.proposalIndex - right.proposalIndex);
  if (new Set(decisions.map((decision) => decision.proposalIndex)).size !== decisions.length) {
    throw new TypeError("freeze lifeChangeDecisions must not repeat proposal indexes");
  }
  return {
    operationId: request.operationId,
    lifeChangeDecisions: decisions,
    causationId: request.causationId,
    correlationId: request.correlationId ?? request.causationId,
  };
}

export function freezeOperationDigest(threadId, sessionId, request) {
  assertId("threadId", threadId);
  assertId("sessionId", sessionId);
  const normalized = normalizeFreezeRequest(request);
  return `sha256:${sha256(canonicalJson({ threadId, sessionId, ...normalized }))}`;
}

export function freezeCommitDigest({
  threadId,
  requestId,
  sessionId,
  authorizationId,
  freezeReportId,
  actorRunId,
  actorOutputDigest,
  goalGuardianAuditId,
  goalGuardianAuditDigest,
  completedAt,
  operation,
  acceptedLifeChanges,
  rejectedLifeChanges,
  dischargedObligations,
  priorStateHash,
  resultingStatus,
}) {
  assertId("threadId", threadId);
  assertId("requestId", requestId);
  assertId("sessionId", sessionId);
  assertId("authorizationId", authorizationId);
  assertId("freezeReportId", freezeReportId);
  assertId("actorRunId", actorRunId);
  assertId("goalGuardianAuditId", goalGuardianAuditId);
  assertIsoTimestamp("completedAt", completedAt);
  const normalized = normalizeFreezeRequest(operation);
  for (const [name, value] of [
    ["actorOutputDigest", actorOutputDigest],
    ["goalGuardianAuditDigest", goalGuardianAuditDigest],
    ["priorStateHash", priorStateHash],
  ]) {
    if (!SHA256_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  }
  return `sha256:${sha256(canonicalJson({
    threadId,
    requestId,
    sessionId,
    authorizationId,
    freezeReportId,
    actorRunId,
    actorOutputDigest,
    goalGuardianAuditId,
    goalGuardianAuditDigest,
    completedAt,
    operation: normalized,
    acceptedLifeChanges,
    rejectedLifeChanges,
    dischargedObligations,
    priorStateHash,
    resultingStatus,
  }))}`;
}

export function freezeEventId(threadId, commitDigest) {
  assertId("threadId", threadId);
  if (!SHA256_PATTERN.test(commitDigest)) {
    throw new TypeError("freeze commit digest is invalid");
  }
  return `evt_${threadId}_freeze_${commitDigest.slice(7, 31)}`;
}

function memoryRecordId(threadId, sessionId, operationId, proposalIndex, proposal) {
  return `mem_${sha256(canonicalJson({
    threadId,
    sessionId,
    operationId,
    proposalIndex,
    kind: proposal.kind,
    summary: proposal.summary,
    evidenceRefs: proposal.evidenceRefs,
  }))}`;
}

export function memoryRecordDigest(memory) {
  return `sha256:${sha256(canonicalJson(memory))}`;
}

export function freezeReportDigest(report) {
  return `sha256:${sha256(canonicalJson(report))}`;
}

export function authorizationConsumptionDigest(consumption) {
  return `sha256:${sha256(canonicalJson(consumption))}`;
}

function assertRuntimeCanFreeze(thread, runtime, completedAt) {
  assertIsoTimestamp("freeze completedAt", completedAt);
  if (
    runtime.threadId !== thread.threadId ||
    runtime.snapshotVersion !== thread.version ||
    runtime.threadStateHash !== threadStateHash(thread)
  ) {
    throw new FreezeStateChangedError(
      `Thread ${thread.threadId} changed before runtime freeze`,
    );
  }
  if (runtime.session.status !== "active" || runtime.lease.status !== "active") {
    throw new FreezeRejectedError(
      `Runtime session ${runtime.session.sessionId} is not active`,
    );
  }
  if (Date.parse(completedAt) < Date.parse(runtime.lease.acquiredAt)) {
    throw new IntegrityError("kernel clock moved before lease acquisition");
  }
  if (Date.parse(completedAt) >= Date.parse(runtime.lease.expiresAt)) {
    throw new FreezeRejectedError(
      `Thaw lease ${runtime.lease.leaseId} expired before freeze`,
    );
  }
  if (runtime.authorization.authorizedAction !== "accept") {
    throw new FreezeRejectedError("freeze requires accepted participation authorization");
  }
  if (runtime.actorRun === null) {
    throw new FreezeRejectedError("freeze requires a persisted Actor run");
  }
  if (runtime.goalGuardianAudit === null) {
    throw new FreezeRejectedError("freeze requires a persisted Goal Guardian audit");
  }
  if (runtime.goalGuardianAudit.audit.decision !== "pass") {
    throw new FreezeRejectedError("freeze requires Goal Guardian decision pass");
  }
  const output = runtime.actorRun.output;
  if (!Array.isArray(output.toolCalls) || output.toolCalls.length !== 0) {
    throw new FreezeRejectedError("freeze rejects Actor output declaring tool calls");
  }
  if (!Array.isArray(output.proposedCommands) || output.proposedCommands.length !== 0) {
    throw new FreezeRejectedError("freeze rejects Actor output declaring direct commands");
  }
  if (!Array.isArray(output.proposedLifeChanges)) {
    throw new FreezeRejectedError("freeze requires Actor life-change proposals to be an array");
  }
}

function validateProposal(proposal, allowedEvidence, index) {
  assertPlainObject(`Actor life change ${index}`, proposal);
  assertExactKeys(`Actor life change ${index}`, proposal, ["kind", "summary", "evidenceRefs"]);
  if (proposal.kind !== "memory") {
    throw new FreezeRejectedError(`Actor life change ${index} has unsupported kind ${proposal.kind}`);
  }
  assertNonEmpty(`Actor life change ${index}.summary`, proposal.summary);
  assertUniqueStrings(`Actor life change ${index}.evidenceRefs`, proposal.evidenceRefs);
  if (
    proposal.evidenceRefs.length === 0 ||
    !proposal.evidenceRefs.every((reference) => allowedEvidence.has(reference))
  ) {
    throw new FreezeRejectedError(
      `Actor life change ${index} must cite selected Thread-owned evidence or evidence bound to the current runtime episode`,
    );
  }
}

export function buildFreezeOutcome(thread, runtime, request, metadata) {
  const normalized = normalizeFreezeRequest(request);
  assertPlainObject("freeze metadata", metadata);
  assertExactKeys("freeze metadata", metadata, ["reportId", "completedAt"]);
  assertId("freeze reportId", metadata.reportId);
  assertIsoTimestamp("freeze completedAt", metadata.completedAt);
  assertRuntimeCanFreeze(thread, runtime, metadata.completedAt);

  const proposals = runtime.actorRun.output.proposedLifeChanges;
  const decisions = normalized.lifeChangeDecisions;
  if (decisions.length !== proposals.length) {
    throw new FreezeRejectedError(
      `freeze requires one decision for each of ${proposals.length} proposed life changes`,
    );
  }
  for (let index = 0; index < proposals.length; index += 1) {
    if (decisions[index]?.proposalIndex !== index) {
      throw new FreezeRejectedError(
        `freeze life-change decisions must cover proposal index ${index} exactly once`,
      );
    }
  }

  const allowedEvidence = new Set([
    ...runtime.session.context.relevantMemories,
    ...runtime.session.context.relevantRelationships,
    ...currentEpisodeEvidenceRefsFromRuntime(runtime),
  ]);
  const acceptedLifeChanges = [];
  const rejectedLifeChanges = [];
  proposals.forEach((proposal, index) => {
    validateProposal(proposal, allowedEvidence, index);
    const decision = decisions[index];
    if (decision.decision === "accept") {
      acceptedLifeChanges.push({
        proposalIndex: index,
        kind: "memory",
        memoryId: memoryRecordId(
          thread.threadId,
          runtime.session.sessionId,
          normalized.operationId,
          index,
          proposal,
        ),
        summary: proposal.summary,
        evidenceRefs: [...proposal.evidenceRefs],
      });
    } else {
      rejectedLifeChanges.push({
        proposalIndex: index,
        kind: "memory",
        summary: proposal.summary,
        evidenceRefs: [...proposal.evidenceRefs],
        rationale: decision.rationale,
      });
    }
  });

  const dischargedObligations = [...runtime.authorization.obligationReferences];
  assertUniqueStrings("authorization obligationReferences", dischargedObligations);
  const unresolved = new Set(thread.currentState.unresolvedIntentions);
  for (const obligation of dischargedObligations) {
    if (!unresolved.has(obligation)) {
      throw new FreezeStateChangedError(
        `authorized obligation is no longer unresolved: ${obligation}`,
      );
    }
  }

  const operationDigest = freezeOperationDigest(
    thread.threadId,
    runtime.session.sessionId,
    normalized,
  );
  const commitDigest = freezeCommitDigest({
    threadId: thread.threadId,
    requestId: runtime.requestId,
    sessionId: runtime.session.sessionId,
    authorizationId: runtime.authorization.authorizationId,
    freezeReportId: metadata.reportId,
    actorRunId: runtime.actorRun.actorRunId,
    actorOutputDigest: runtime.actorRun.outputDigest,
    goalGuardianAuditId: runtime.goalGuardianAudit.auditId,
    goalGuardianAuditDigest: runtime.goalGuardianAudit.auditDigest,
    completedAt: metadata.completedAt,
    operation: normalized,
    acceptedLifeChanges,
    rejectedLifeChanges,
    dischargedObligations,
    priorStateHash: runtime.threadStateHash,
    resultingStatus: thread.status,
  });
  const eventId = freezeEventId(thread.threadId, commitDigest);
  const nextThread = {
    ...thread,
    version: thread.version + 1,
    status: thread.status,
    currentState: {
      ...thread.currentState,
      unresolvedIntentions: thread.currentState.unresolvedIntentions.filter(
        (intention) => !dischargedObligations.includes(intention),
      ),
    },
    memoryRefs: [
      ...thread.memoryRefs,
      ...acceptedLifeChanges.map((change) => change.memoryId),
    ],
    provenance: {
      ...thread.provenance,
      lastEventId: eventId,
    },
  };
  const resultingStateHash = threadStateHash(nextThread);
  const report = {
    reportId: metadata.reportId,
    eventId,
    threadId: thread.threadId,
    requestId: runtime.requestId,
    sessionId: runtime.session.sessionId,
    authorizationId: runtime.authorization.authorizationId,
    priorVersion: thread.version,
    resultingVersion: nextThread.version,
    priorStateHash: runtime.threadStateHash,
    resultingStateHash,
    acceptedLifeChanges,
    rejectedLifeChanges,
    dischargedObligations,
    completedAt: metadata.completedAt,
    causationId: normalized.causationId,
    correlationId: normalized.correlationId,
  };
  const reportDigest = freezeReportDigest(report);
  const eventPayload = {
    freezeReportId: report.reportId,
    freezeReportDigest: reportDigest,
    requestId: report.requestId,
    sessionId: report.sessionId,
    operation: normalized,
    operationDigest,
    actorRunId: runtime.actorRun.actorRunId,
    actorOutputDigest: runtime.actorRun.outputDigest,
    goalGuardianAuditId: runtime.goalGuardianAudit.auditId,
    goalGuardianAuditDigest: runtime.goalGuardianAudit.auditDigest,
    acceptedLifeChanges,
    rejectedLifeChanges,
    dischargedObligations,
    priorStateHash: report.priorStateHash,
    resultingStatus: nextThread.status,
  };
  return {
    operation: normalized,
    operationDigest,
    commitDigest,
    eventId,
    eventPayload,
    nextThread,
    resultingStateHash,
    report,
    reportDigest,
  };
}

export function applyFreezeEventToThread(thread, event) {
  if (thread === null) {
    throw new IntegrityError(`freeze event ${event.eventId} appears before a seed event`);
  }
  if (event.threadId !== thread.threadId || event.expectedVersion !== thread.version) {
    throw new IntegrityError(`freeze event ${event.eventId} does not match replay state`);
  }
  if (typeof event.authorizationId !== "string") {
    throw new IntegrityError(`freeze event ${event.eventId} requires authorization evidence`);
  }
  const payload = event.payload;
  assertPlainObject(`freeze event ${event.eventId} payload`, payload);
  assertExactKeys(`freeze event ${event.eventId} payload`, payload, [
    "freezeReportId",
    "freezeReportDigest",
    "requestId",
    "sessionId",
    "operation",
    "operationDigest",
    "actorRunId",
    "actorOutputDigest",
    "goalGuardianAuditId",
    "goalGuardianAuditDigest",
    "acceptedLifeChanges",
    "rejectedLifeChanges",
    "dischargedObligations",
    "priorStateHash",
    "resultingStatus",
  ]);
  assertId("freeze event freezeReportId", payload.freezeReportId);
  assertId("freeze event requestId", payload.requestId);
  assertId("freeze event sessionId", payload.sessionId);
  assertId("freeze event actorRunId", payload.actorRunId);
  assertId("freeze event goalGuardianAuditId", payload.goalGuardianAuditId);
  if (!SHA256_PATTERN.test(payload.freezeReportDigest)) {
    throw new IntegrityError(`freeze event ${event.eventId} report digest is invalid`);
  }
  if (payload.priorStateHash !== threadStateHash(thread)) {
    throw new IntegrityError(`freeze event ${event.eventId} prior-state witness failed`);
  }
  const operationDigest = freezeOperationDigest(thread.threadId, payload.sessionId, payload.operation);
  if (payload.operationDigest !== operationDigest || event.commandId !== payload.operation.operationId) {
    throw new IntegrityError(`freeze event ${event.eventId} operation witness failed`);
  }
  if (!Array.isArray(payload.acceptedLifeChanges) || !Array.isArray(payload.rejectedLifeChanges)) {
    throw new IntegrityError(`freeze event ${event.eventId} life-change lists are invalid`);
  }
  const memoryIds = [];
  for (const change of payload.acceptedLifeChanges) {
    assertPlainObject("accepted freeze life change", change);
    assertExactKeys("accepted freeze life change", change, [
      "proposalIndex", "kind", "memoryId", "summary", "evidenceRefs",
    ]);
    if (change.kind !== "memory") throw new IntegrityError("accepted freeze change is not memory");
    assertId("accepted freeze memoryId", change.memoryId);
    assertNonEmpty("accepted freeze summary", change.summary);
    assertUniqueStrings("accepted freeze evidenceRefs", change.evidenceRefs);
    memoryIds.push(change.memoryId);
  }
  if (new Set(memoryIds).size !== memoryIds.length) {
    throw new IntegrityError(`freeze event ${event.eventId} repeats memory IDs`);
  }
  assertUniqueStrings("freeze event dischargedObligations", payload.dischargedObligations);
  for (const obligation of payload.dischargedObligations) {
    if (!thread.currentState.unresolvedIntentions.includes(obligation)) {
      throw new IntegrityError(`freeze event ${event.eventId} discharges an absent obligation`);
    }
  }
  const expectedReport = {
    reportId: payload.freezeReportId,
    eventId: event.eventId,
    threadId: event.threadId,
    requestId: payload.requestId,
    sessionId: payload.sessionId,
    authorizationId: event.authorizationId,
    priorVersion: event.expectedVersion,
    resultingVersion: event.resultingVersion,
    priorStateHash: payload.priorStateHash,
    resultingStateHash: event.stateHash,
    acceptedLifeChanges: payload.acceptedLifeChanges,
    rejectedLifeChanges: payload.rejectedLifeChanges,
    dischargedObligations: payload.dischargedObligations,
    completedAt: event.occurredAt,
    causationId: event.causationId,
    correlationId: event.correlationId,
  };
  if (freezeReportDigest(expectedReport) !== payload.freezeReportDigest) {
    throw new IntegrityError(`freeze event ${event.eventId} report digest failed`);
  }
  const commitDigest = freezeCommitDigest({
    threadId: thread.threadId,
    requestId: payload.requestId,
    sessionId: payload.sessionId,
    authorizationId: event.authorizationId,
    freezeReportId: payload.freezeReportId,
    actorRunId: payload.actorRunId,
    actorOutputDigest: payload.actorOutputDigest,
    goalGuardianAuditId: payload.goalGuardianAuditId,
    goalGuardianAuditDigest: payload.goalGuardianAuditDigest,
    completedAt: event.occurredAt,
    operation: payload.operation,
    acceptedLifeChanges: payload.acceptedLifeChanges,
    rejectedLifeChanges: payload.rejectedLifeChanges,
    dischargedObligations: payload.dischargedObligations,
    priorStateHash: payload.priorStateHash,
    resultingStatus: payload.resultingStatus,
  });
  if (event.commandDigest !== commitDigest) {
    throw new IntegrityError(`freeze event ${event.eventId} commit digest failed`);
  }
  if (freezeEventId(thread.threadId, commitDigest) !== event.eventId) {
    throw new IntegrityError(`freeze event ${event.eventId} ID witness failed`);
  }
  if (payload.resultingStatus !== thread.status) {
    throw new IntegrityError(`freeze event ${event.eventId} changes lifecycle unexpectedly`);
  }
  return {
    ...thread,
    version: thread.version + 1,
    status: payload.resultingStatus,
    currentState: {
      ...thread.currentState,
      unresolvedIntentions: thread.currentState.unresolvedIntentions.filter(
        (intention) => !payload.dischargedObligations.includes(intention),
      ),
    },
    memoryRefs: [...thread.memoryRefs, ...memoryIds],
    provenance: { ...thread.provenance, lastEventId: event.eventId },
  };
}