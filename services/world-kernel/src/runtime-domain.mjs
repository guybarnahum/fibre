import { randomBytes } from "node:crypto";

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
import { currentEpisodeEvidenceRefsFromContext } from "./episode-evidence.mjs";

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const ACTIONS = new Set(["accept", "clarify", "negotiate", "delegate", "refuse"]);
const ENTITY_KINDS = new Set(["human", "thread", "company", "institution", "other"]);

export class RuntimeNotFoundError extends Error {}
export class RuntimeConflictError extends Error {}
export class RuntimeStateChangedError extends Error {}
export class ThawLeaseConflictError extends Error {}
export class RuntimeOrderError extends Error {}
export class RuntimeLeaseExpiredError extends Error {}
export class ParticipationAuthorizationRejectedError extends Error {}

export function newOpaqueId(prefix) {
  assertNonEmpty("ID prefix", prefix);
  return `${prefix}_${randomBytes(32).toString("hex")}`;
}

function assertSha256(name, value) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function assertEntity(name, entity) {
  assertPlainObject(name, entity);
  assertExactKeys(name, entity, ["entityId", "kind", "displayName"]);
  assertId(`${name}.entityId`, entity.entityId);
  if (!ENTITY_KINDS.has(entity.kind)) {
    throw new TypeError(`${name}.kind is invalid`);
  }
  assertNonEmpty(`${name}.displayName`, entity.displayName);
}

function sameEntity(left, right) {
  return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

function assertUniqueRefs(name, refs) {
  assertStringArray(name, refs);
  if (new Set(refs).size !== refs.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
}

export function validateAcquireRuntimeRequest(request) {
  assertPlainObject("runtime acquisition", request);
  assertExactKeys("runtime acquisition", request, [
    "operationId",
    "decision",
    "selection",
    "causationId",
    "correlationId",
  ]);
  assertId("runtime acquisition operationId", request.operationId);
  assertId("runtime acquisition causationId", request.causationId);
  if (request.correlationId !== undefined) {
    assertId("runtime acquisition correlationId", request.correlationId);
  }

  assertPlainObject("runtime acquisition decision", request.decision);
  assertExactKeys("runtime acquisition decision", request.decision, [
    "authorizedAction",
    "rationale",
    "obligationReferences",
  ]);
  if (!ACTIONS.has(request.decision.authorizedAction)) {
    throw new TypeError("runtime acquisition decision.authorizedAction is invalid");
  }
  assertNonEmpty("runtime acquisition decision.rationale", request.decision.rationale);
  assertUniqueRefs(
    "runtime acquisition decision.obligationReferences",
    request.decision.obligationReferences,
  );

  const selection = request.selection ?? {};
  assertPlainObject("runtime acquisition selection", selection);
  assertExactKeys("runtime acquisition selection", selection, [
    "memoryRefs",
    "relationshipRefs",
  ]);
  if (selection.memoryRefs !== undefined) {
    assertUniqueRefs("runtime acquisition selection.memoryRefs", selection.memoryRefs);
  }
  if (selection.relationshipRefs !== undefined) {
    assertUniqueRefs(
      "runtime acquisition selection.relationshipRefs",
      selection.relationshipRefs,
    );
  }
}

export function runtimeAcquireOperationDigest(threadId, requestId, request) {
  validateAcquireRuntimeRequest(request);
  assertId("threadId", threadId);
  assertId("requestId", requestId);
  return `sha256:${sha256(canonicalJson({
    threadId,
    requestId,
    operationId: request.operationId,
    decision: request.decision,
    selection: request.selection ?? {},
    causationId: request.causationId,
    correlationId: request.correlationId ?? request.causationId,
  }))}`;
}

function assertCurrentTrace(thread, trace) {
  if (trace.privateStance === null) {
    throw new ParticipationAuthorizationRejectedError(
      `Request ${trace.requestId} has no private participation stance`,
    );
  }
  if (thread.status !== "frozen" && thread.status !== "dormant") {
    throw new ParticipationAuthorizationRejectedError(
      `Thread ${thread.threadId} cannot acquire a thaw lease from ${thread.status}`,
    );
  }
  if (
    trace.threadId !== thread.threadId ||
    trace.snapshotVersion !== thread.version ||
    trace.threadStateHash !== threadStateHash(thread)
  ) {
    throw new ParticipationAuthorizationRejectedError(
      `Request ${trace.requestId} is not current; submit a new requestId under the same correlationId and appraise the current Thread snapshot`,
    );
  }
  if (
    trace.privateStance.threadId !== trace.threadId ||
    trace.privateStance.snapshotVersion !== trace.snapshotVersion ||
    trace.privateStance.requestId !== trace.requestId ||
    trace.privateStance.requestFingerprint !== trace.requestFingerprint
  ) {
    throw new IntegrityError("private stance does not match its request trace");
  }
  if (!sameEntity(trace.privateStance.relationshipImpact.entity, trace.request.requester)) {
    throw new IntegrityError("private stance relationship target does not match requester");
  }
}

export function buildParticipationAuthorization(thread, trace, decision, metadata) {
  assertCurrentTrace(thread, trace);
  assertPlainObject("authorization metadata", metadata);
  assertExactKeys("authorization metadata", metadata, [
    "authorizationId",
    "issuedAt",
    "causationId",
    "correlationId",
  ]);
  assertId("authorizationId", metadata.authorizationId);
  assertIsoTimestamp("authorization issuedAt", metadata.issuedAt);
  assertId("authorization causationId", metadata.causationId);
  assertId("authorization correlationId", metadata.correlationId);

  assertPlainObject("authorization decision", decision);
  assertExactKeys("authorization decision", decision, [
    "authorizedAction",
    "rationale",
    "obligationReferences",
  ]);
  if (decision.authorizedAction !== "accept") {
    throw new ParticipationAuthorizationRejectedError(
      `Thaw requires authorizedAction accept, not ${decision.authorizedAction}`,
    );
  }
  assertNonEmpty("authorization rationale", decision.rationale);
  assertUniqueRefs("authorization obligationReferences", decision.obligationReferences);
  const ownedObligations = new Set(thread.currentState.unresolvedIntentions);
  for (const reference of decision.obligationReferences) {
    if (!ownedObligations.has(reference)) {
      throw new ParticipationAuthorizationRejectedError(
        `authorization obligation is not recorded by the Thread: ${reference}`,
      );
    }
  }
  if (
    trace.privateStance.desiredAction !== decision.authorizedAction &&
    decision.obligationReferences.length === 0
  ) {
    throw new ParticipationAuthorizationRejectedError(
      "overriding private desire requires a recorded obligation reference",
    );
  }
  if (
    trace.privateStance.desiredAction === "accept" &&
    trace.privateStance.dignityBand !== "high"
  ) {
    throw new ParticipationAuthorizationRejectedError(
      "a dignity-based accept authorization requires high dignity",
    );
  }

  const authorization = {
    authorizationId: metadata.authorizationId,
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    threadStateHash: threadStateHash(thread),
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    requester: { ...trace.request.requester },
    appraisalId: trace.appraisalId,
    stanceId: trace.privateStanceId,
    policy: { ...trace.privateStance.policy },
    desiredAction: trace.privateStance.desiredAction,
    authorizedAction: decision.authorizedAction,
    dignityBand: trace.privateStance.dignityBand,
    score: trace.privateStance.score,
    rationale: decision.rationale,
    evidenceRefs: [...trace.privateStance.evidenceRefs],
    obligationReferences: [...decision.obligationReferences],
    relationshipImpact: structuredClone(trace.privateStance.relationshipImpact),
    issuedAt: metadata.issuedAt,
    causationId: metadata.causationId,
    correlationId: metadata.correlationId,
  };
  assertEntity("authorization.requester", authorization.requester);
  assertFiniteNumber("authorization.score", authorization.score);
  return authorization;
}

export function authorizationDigest(authorization) {
  return `sha256:${sha256(canonicalJson(authorization))}`;
}

function selectOwnedRefs(owned, selected, name) {
  assertUniqueRefs(`${name}.owned`, owned);
  const included = selected === undefined ? [...owned] : [...selected];
  assertUniqueRefs(name, included);
  const ownedSet = new Set(owned);
  for (const reference of included) {
    if (!ownedSet.has(reference)) {
      throw new TypeError(`${name} contains a ref not owned by the Thread: ${reference}`);
    }
  }
  const selectedSet = new Set(included);
  return {
    included,
    excluded: owned.filter((reference) => !selectedSet.has(reference)),
  };
}

export function buildExecutionContext(thread, trace, authorization, selection = {}) {
  assertCurrentTrace(thread, trace);
  if (
    authorization.threadId !== thread.threadId ||
    authorization.snapshotVersion !== thread.version ||
    authorization.threadStateHash !== threadStateHash(thread) ||
    authorization.requestId !== trace.requestId ||
    authorization.requestFingerprint !== trace.requestFingerprint ||
    authorization.appraisalId !== trace.appraisalId ||
    authorization.stanceId !== trace.privateStanceId ||
    authorization.authorizedAction !== "accept" ||
    !sameEntity(authorization.requester, trace.request.requester)
  ) {
    throw new IntegrityError("participation authorization does not bind the current request trace");
  }
  assertPlainObject("execution selection", selection);
  assertExactKeys("execution selection", selection, ["memoryRefs", "relationshipRefs"]);
  const memories = selectOwnedRefs(
    thread.memoryRefs,
    selection.memoryRefs,
    "execution selection.memoryRefs",
  );
  const relationships = selectOwnedRefs(
    thread.relationshipRefs,
    selection.relationshipRefs,
    "execution selection.relationshipRefs",
  );
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    threadStateHash: threadStateHash(thread),
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    requester: { ...trace.request.requester },
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    objective: trace.request.objective,
    ...(trace.request.statedNeed === undefined ? {} : { statedNeed: trace.request.statedNeed }),
    ...(trace.request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: trace.request.acceptanceCriteria }),
    permissions: [...trace.request.permissions],
    relevantMemories: memories.included,
    excludedMemories: memories.excluded,
    relevantRelationships: relationships.included,
    excludedRelationships: relationships.excluded,
    ...(thread.accounts === undefined ? {} : { budgets: { ...thread.accounts } }),
    participation: structuredClone(authorization),
    auditPolicies: ["dignity_guardian", "goal_guardian", "self_examiner_steward"],
  };
}

export function executionContextDigest(context) {
  return `sha256:${sha256(canonicalJson(context))}`;
}

export function runtimeSessionDigest({
  sessionId,
  leaseId,
  authorizationId,
  threadId,
  requestId,
  snapshotVersion,
  threadStateHash: stateHash,
  contextDigest,
  startedAt,
}) {
  return `sha256:${sha256(canonicalJson({
    sessionId,
    leaseId,
    authorizationId,
    threadId,
    requestId,
    snapshotVersion,
    threadStateHash: stateHash,
    contextDigest,
    startedAt,
  }))}`;
}

export function deterministicActorOutput(context) {
  assertPlainObject("execution context", context);
  assertId("execution context threadId", context.threadId);
  assertId("execution context requestId", context.requestId);
  assertNonEmpty("execution context objective", context.objective);
  assertStringArray("execution context permissions", context.permissions);
  if (context.participation?.authorizedAction !== "accept") {
    throw new ParticipationAuthorizationRejectedError(
      "deterministic Actor requires accepted participation authorization",
    );
  }
  const criteria = context.acceptanceCriteria ?? "No explicit acceptance criteria were supplied.";
  const willingParticipation = context.participation.desiredAction === "accept";
  const episodeEvidenceRefs = currentEpisodeEvidenceRefsFromContext(context);
  return {
    worker: { kind: "deterministic_actor", version: "1" },
    threadId: context.threadId,
    snapshotVersion: context.snapshotVersion,
    requestId: context.requestId,
    requestFingerprint: context.requestFingerprint,
    objective: context.objective,
    summary: `Prepared a bounded deterministic plan for: ${context.objective}`,
    steps: [
      { ordinal: 1, action: "confirm_scope", detail: criteria },
      {
        ordinal: 2,
        action: "use_selected_context",
        detail: `Use ${context.relevantMemories.length} selected memories and ${context.relevantRelationships.length} selected relationships.`,
      },
      {
        ordinal: 3,
        action: "prepare_deliverable",
        detail: "Produce the requested bounded deliverable without directly mutating authoritative world state.",
      },
    ],
    toolCalls: [],
    proposedCommands: [],
    proposedLifeChanges: willingParticipation
      ? [{
          kind: "memory",
          summary: `I accepted ${context.requester.displayName}'s request and prepared a bounded plan for: ${context.objective}. The authorized acceptance criteria were: ${criteria}`,
          evidenceRefs: episodeEvidenceRefs,
        }]
      : [],
  };
}

export function actorOutputDigest(output) {
  return `sha256:${sha256(canonicalJson(output))}`;
}

export function auditActorOutput(context, output) {
  assertPlainObject("Actor output", output);
  const allowedEvidence = new Set([
    ...context.relevantMemories,
    ...context.relevantRelationships,
    ...currentEpisodeEvidenceRefsFromContext(context),
  ]);
  const checks = [
    {
      code: "THREAD_BOUND",
      passed: output.threadId === context.threadId && output.snapshotVersion === context.snapshotVersion,
      detail: "Actor output remains bound to the thawed Thread snapshot.",
    },
    {
      code: "REQUEST_BOUND",
      passed:
        output.requestId === context.requestId &&
        output.requestFingerprint === context.requestFingerprint,
      detail: "Actor output remains bound to the authorized request.",
    },
    {
      code: "OBJECTIVE_BOUND",
      passed: output.objective === context.objective,
      detail: "Actor output preserves the authorized objective.",
    },
    {
      code: "AUTHORIZATION_ACCEPTED",
      passed: context.participation?.authorizedAction === "accept",
      detail: "Execution context contains an accepted authorization.",
    },
    {
      code: "NO_TOOL_CALLS",
      passed: Array.isArray(output.toolCalls) && output.toolCalls.length === 0,
      detail: "The Actor declares no external tool calls in its returned proposal.",
    },
    {
      code: "NO_DIRECT_WORLD_MUTATION",
      passed: Array.isArray(output.proposedCommands) && output.proposedCommands.length === 0,
      detail: "The Actor declares no direct authoritative command in its returned proposal.",
    },
    {
      code: "BOUNDED_LIFE_CHANGES",
      passed:
        Array.isArray(output.proposedLifeChanges) &&
        output.proposedLifeChanges.every(
          (change) =>
            change?.kind === "memory" &&
            typeof change.summary === "string" &&
            change.summary.length > 0 &&
            Array.isArray(change.evidenceRefs) &&
            change.evidenceRefs.length > 0 &&
            change.evidenceRefs.every((reference) => allowedEvidence.has(reference)),
        ),
      detail: "Proposed life changes are memory proposals citing selected Thread-owned or current-episode evidence.",
    },
  ];
  const passed = checks.every((check) => check.passed);
  return {
    guardian: { kind: "goal_guardian", version: "1" },
    threadId: context.threadId,
    snapshotVersion: context.snapshotVersion,
    requestId: context.requestId,
    requestFingerprint: context.requestFingerprint,
    objective: context.objective,
    contextDigest: executionContextDigest(context),
    actorOutputDigest: actorOutputDigest(output),
    decision: passed ? "pass" : "reject",
    checks,
  };
}

export function guardianAuditDigest(audit) {
  return `sha256:${sha256(canonicalJson(audit))}`;
}

export function assertRuntimeDigest(name, value) {
  assertSha256(name, value);
}

export function actorOperationDigest({
  threadId,
  sessionId,
  operationId,
  contextDigest,
  outputDigest,
  completedAt,
}) {
  return `sha256:${sha256(canonicalJson({
    kind: "deterministic_actor",
    version: "1",
    threadId,
    sessionId,
    operationId,
    contextDigest,
    outputDigest,
    completedAt,
  }))}`;
}

export function goalGuardianOperationDigest({
  threadId,
  sessionId,
  operationId,
  contextDigest,
  actorOutputDigest: actorDigest,
  auditDigest,
  completedAt,
}) {
  return `sha256:${sha256(canonicalJson({
    kind: "goal_guardian",
    version: "1",
    threadId,
    sessionId,
    operationId,
    contextDigest,
    actorOutputDigest: actorDigest,
    auditDigest,
    completedAt,
  }))}`;
}
