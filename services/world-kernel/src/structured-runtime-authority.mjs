import {
  IntegrityError,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { ParticipationAuthorizationRejectedError } from "./runtime-domain.mjs";

const CURRENT_AUTHORITY_STATUSES = new Set(["frozen", "dormant"]);
const APPLICABILITY_ID_PATTERN = /^oba_[0-9a-f]{64}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

function sameEntity(left, right) {
  return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

function assertSha256(name, value) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function assertCurrentTrace(thread, trace) {
  if (trace?.privateStance === null || trace?.privateStance === undefined) {
    throw new ParticipationAuthorizationRejectedError(
      `Request ${trace?.requestId ?? "<unknown>"} has no private participation stance`,
    );
  }
  if (!CURRENT_AUTHORITY_STATUSES.has(thread.status)) {
    throw new ParticipationAuthorizationRejectedError(
      `Thread ${thread.threadId} cannot acquire participation authority from ${thread.status}`,
    );
  }
  const stateHash = threadStateHash(thread);
  if (
    trace.threadId !== thread.threadId ||
    trace.snapshotVersion !== thread.version ||
    trace.threadStateHash !== stateHash
  ) {
    throw new ParticipationAuthorizationRejectedError(
      `Request ${trace.requestId} is not current; submit and appraise a fresh request attempt`,
    );
  }
  if (
    trace.privateStance.threadId !== trace.threadId ||
    trace.privateStance.snapshotVersion !== trace.snapshotVersion ||
    trace.privateStance.requestId !== trace.requestId ||
    trace.privateStance.requestFingerprint !== trace.requestFingerprint ||
    !sameEntity(trace.privateStance.relationshipImpact?.entity, trace.request.requester)
  ) {
    throw new IntegrityError("private stance does not match its request trace");
  }
  return stateHash;
}

function assertApplicabilityRecord(thread, trace, record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new ParticipationAuthorizationRejectedError(
      "compelled participation requires a persisted Fibre applicability decision",
    );
  }
  const { decision, decisionDigest } = record;
  if (decision === null || typeof decision !== "object" || Array.isArray(decision)) {
    throw new IntegrityError("persisted applicability record has no decision body");
  }
  if (typeof decision.applicabilityId !== "string" || !APPLICABILITY_ID_PATTERN.test(decision.applicabilityId)) {
    throw new IntegrityError("persisted applicability decision ID is invalid");
  }
  assertSha256("persisted applicability decision digest", decisionDigest);
  if (decision.result !== "applies") {
    throw new ParticipationAuthorizationRejectedError(
      `applicability decision ${decision.applicabilityId} does not authorize participation`,
    );
  }
  if (
    decision.threadId !== thread.threadId ||
    decision.snapshotVersion !== thread.version ||
    decision.threadStateHash !== threadStateHash(thread) ||
    decision.requestId !== trace.requestId ||
    decision.requestFingerprint !== trace.requestFingerprint
  ) {
    throw new ParticipationAuthorizationRejectedError(
      `applicability decision ${decision.applicabilityId} does not bind the current Thread request`,
    );
  }
  if (
    decision.policy?.id !== "structured_obligation_applicability" ||
    decision.policy?.version !== "1"
  ) {
    throw new ParticipationAuthorizationRejectedError(
      `applicability decision ${decision.applicabilityId} uses an unsupported policy`,
    );
  }
  assertId("applicability obligationId", decision.obligationId);
  assertFiniteNumber("applicability obligationRevision", decision.obligationRevision, {
    integer: true,
    minimum: 1,
  });
  assertSha256("applicability obligationDigest", decision.obligationDigest);
  return { decision, decisionDigest };
}

export function structuredApplicabilityOperationId(runtimeOperationId) {
  assertId("runtime operationId", runtimeOperationId);
  return `appop_${sha256(canonicalJson({
    kind: "structured_obligation_applicability",
    runtimeOperationId,
  }))}`;
}

export function structuredRuntimeRationale(trace, applicabilityRecord = null) {
  if (applicabilityRecord === null) {
    return "Authorize the Thread's willing, high-dignity Fibre-derived private acceptance.";
  }
  const { decision, decisionDigest } = applicabilityRecord;
  return `Authorize compelled participation under Fibre applicability ${decision.applicabilityId} (${decisionDigest}) while preserving the Thread's private ${trace.privateStance.desiredAction} stance.`;
}

export function buildStructuredParticipationAuthorization(
  thread,
  trace,
  applicabilityRecord,
  metadata,
) {
  const stateHash = assertCurrentTrace(thread, trace);
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new TypeError("authorization metadata is required");
  }
  assertId("authorizationId", metadata.authorizationId);
  assertIsoTimestamp("authorization issuedAt", metadata.issuedAt);
  assertId("authorization causationId", metadata.causationId);
  assertId("authorization correlationId", metadata.correlationId);

  const willing = trace.privateStance.desiredAction === "accept";
  let applicability = null;
  let participationBasis;
  if (willing) {
    if (trace.privateStance.dignityBand !== "high") {
      throw new ParticipationAuthorizationRejectedError(
        "a willing accept authorization requires high dignity",
      );
    }
    if (applicabilityRecord !== null) {
      throw new ParticipationAuthorizationRejectedError(
        "willing acceptance must not invoke obligation authority unnecessarily",
      );
    }
    participationBasis = "willing";
  } else {
    const persisted = assertApplicabilityRecord(thread, trace, applicabilityRecord);
    participationBasis = "obligation_override";
    applicability = {
      applicabilityId: persisted.decision.applicabilityId,
      decisionDigest: persisted.decisionDigest,
      obligationId: persisted.decision.obligationId,
      obligationRevision: persisted.decision.obligationRevision,
      obligationDigest: persisted.decision.obligationDigest,
      policy: { ...persisted.decision.policy },
    };
  }

  const authorization = {
    authorizationId: metadata.authorizationId,
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    threadStateHash: stateHash,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    requester: structuredClone(trace.request.requester),
    appraisalId: trace.appraisalId,
    stanceId: trace.privateStanceId,
    policy: structuredClone(trace.privateStance.policy),
    desiredAction: trace.privateStance.desiredAction,
    authorizedAction: "accept",
    dignityBand: trace.privateStance.dignityBand,
    score: trace.privateStance.score,
    participationBasis,
    rationale: structuredRuntimeRationale(trace, applicabilityRecord),
    evidenceRefs: [...trace.privateStance.evidenceRefs],
    // Historical M1 readers retain this field, but it carries no authority in Structured Obligation v1.
    obligationReferences: [],
    applicability,
    relationshipImpact: structuredClone(trace.privateStance.relationshipImpact),
    issuedAt: metadata.issuedAt,
    causationId: metadata.causationId,
    correlationId: metadata.correlationId,
  };
  assertNonEmpty("authorization rationale", authorization.rationale);
  assertFiniteNumber("authorization score", authorization.score);
  return authorization;
}
