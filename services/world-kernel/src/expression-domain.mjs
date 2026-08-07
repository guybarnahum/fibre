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
import { authorizationDigest } from "./runtime-domain.mjs";

const ACTIONS = new Set(["accept", "clarify", "negotiate", "delegate", "refuse"]);
const POSTURES = new Set([...ACTIONS, "noncommittal"]);
const MODES = new Set([
  "full_candor",
  "tactful_candor",
  "selective",
  "strategic_ambiguity",
  "evasive",
  "deceptive",
]);
const BANDS = new Set(["low", "contested", "high"]);
const KINDS = new Set(["human", "thread", "company", "institution", "other"]);
const CURRENT_AUTHORITY_STATUSES = new Set(["frozen", "dormant"]);
const HASH = /^sha256:[0-9a-f]{64}$/;

export class ExpressionNotFoundError extends Error {}
export class ExpressionConflictError extends Error {}
export class ExpressionRejectedError extends Error {}
export class ParticipationAuthorizationNotFoundError extends Error {}

function hash(name, value) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function uniq(name, value) {
  assertStringArray(name, value);
  if (new Set(value).size !== value.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
}

function entity(name, value) {
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["entityId", "kind", "displayName"]);
  assertId(`${name}.entityId`, value.entityId);
  if (!KINDS.has(value.kind)) throw new TypeError(`${name}.kind is invalid`);
  assertNonEmpty(`${name}.displayName`, value.displayName);
}

function sameEntity(left, right) {
  return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

function policy(name, value) {
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["id", "version"]);
  assertId(`${name}.id`, value.id);
  assertNonEmpty(`${name}.version`, value.version);
}

function decision(value, { allowAccept = true } = {}) {
  assertPlainObject("authorization decision", value);
  assertExactKeys("authorization decision", value, [
    "authorizedAction",
    "rationale",
    "obligationReferences",
  ]);
  if (!ACTIONS.has(value.authorizedAction)) {
    throw new TypeError("authorization decision.authorizedAction is invalid");
  }
  if (!allowAccept && value.authorizedAction === "accept") {
    throw new ExpressionRejectedError(
      "accepted participation must acquire runtime through the thaw authorization boundary",
    );
  }
  assertNonEmpty("authorization decision.rationale", value.rationale);
  uniq("authorization decision.obligationReferences", value.obligationReferences);
}

function current(thread, trace) {
  if (!trace?.privateStance) {
    throw new ExpressionRejectedError(
      `Request ${trace?.requestId ?? "<unknown>"} has no private participation stance`,
    );
  }
  if (!CURRENT_AUTHORITY_STATUSES.has(thread.status)) {
    throw new ExpressionRejectedError(
      `Thread ${thread.threadId} cannot issue participation authority from ${thread.status}`,
    );
  }
  if (
    trace.threadId !== thread.threadId ||
    trace.snapshotVersion !== thread.version ||
    trace.threadStateHash !== threadStateHash(thread)
  ) {
    throw new ExpressionRejectedError(
      `Request ${trace.requestId} is not current; submit a fresh request attempt before authorization`,
    );
  }
  if (
    trace.privateStance.requestId !== trace.requestId ||
    trace.privateStance.requestFingerprint !== trace.requestFingerprint ||
    !sameEntity(
      trace.privateStance.relationshipImpact?.entity,
      trace.request.requester,
    )
  ) {
    throw new IntegrityError("private stance does not match its request trace");
  }
}

function postureCompatible(authorizedAction, communicatedPosture) {
  if (authorizedAction === "accept") return communicatedPosture === "accept";
  return (
    communicatedPosture === authorizedAction ||
    communicatedPosture === "noncommittal"
  );
}

function assertRequestedPostureCompatible(authorization, communicatedPosture) {
  if (!postureCompatible(authorization.authorizedAction, communicatedPosture)) {
    throw new ExpressionRejectedError(
      `audience communication posture ${communicatedPosture} contradicts authorized action ${authorization.authorizedAction}`,
    );
  }
}

function assertStoredPostureCompatible(strategy) {
  if (!postureCompatible(strategy.authorizedAction, strategy.communicatedPosture)) {
    throw new IntegrityError(
      "stored disclosure posture contradicts its participation authorization",
    );
  }
}

export function normalizeNonExecutionAuthorizationRequest(value) {
  assertPlainObject("non-execution authorization", value);
  assertExactKeys("non-execution authorization", value, [
    "operationId",
    "decision",
    "causationId",
    "correlationId",
  ]);
  assertId("authorization operationId", value.operationId);
  assertId("authorization causationId", value.causationId);
  if (value.correlationId !== undefined) {
    assertId("authorization correlationId", value.correlationId);
  }
  decision(value.decision, { allowAccept: false });
  return {
    operationId: value.operationId,
    decision: {
      authorizedAction: value.decision.authorizedAction,
      rationale: value.decision.rationale,
      obligationReferences: [...value.decision.obligationReferences],
    },
    causationId: value.causationId,
    correlationId: value.correlationId ?? value.causationId,
  };
}

export function nonExecutionAuthorizationOperationDigest(threadId, requestId, value) {
  const request = normalizeNonExecutionAuthorizationRequest(value);
  assertId("threadId", threadId);
  assertId("requestId", requestId);
  return `sha256:${sha256(canonicalJson({
    kind: "non_execution_participation_authorization",
    threadId,
    requestId,
    ...request,
  }))}`;
}

export function buildNonExecutionAuthorization(
  thread,
  trace,
  value,
  { authorizationId, issuedAt },
) {
  const request = normalizeNonExecutionAuthorizationRequest(value);
  current(thread, trace);
  assertId("authorizationId", authorizationId);
  assertIsoTimestamp("authorization issuedAt", issuedAt);

  const owned = new Set(thread.currentState.unresolvedIntentions);
  for (const reference of request.decision.obligationReferences) {
    if (!owned.has(reference)) {
      throw new ExpressionRejectedError(
        `authorization obligation is not recorded by the Thread: ${reference}`,
      );
    }
  }
  if (
    trace.privateStance.desiredAction !== request.decision.authorizedAction &&
    request.decision.obligationReferences.length === 0
  ) {
    throw new ExpressionRejectedError(
      "overriding private desire requires a recorded obligation reference",
    );
  }

  const authorization = {
    authorizationId,
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    threadStateHash: threadStateHash(thread),
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    requester: structuredClone(trace.request.requester),
    appraisalId: trace.appraisalId,
    stanceId: trace.privateStanceId,
    policy: structuredClone(trace.privateStance.policy),
    desiredAction: trace.privateStance.desiredAction,
    authorizedAction: request.decision.authorizedAction,
    dignityBand: trace.privateStance.dignityBand,
    score: trace.privateStance.score,
    rationale: request.decision.rationale,
    evidenceRefs: [...trace.privateStance.evidenceRefs],
    obligationReferences: [...request.decision.obligationReferences],
    relationshipImpact: structuredClone(trace.privateStance.relationshipImpact),
    issuedAt,
    causationId: request.causationId,
    correlationId: request.correlationId,
  };
  validateParticipationAuthorization(authorization);
  return authorization;
}

export function validateParticipationAuthorization(authorization) {
  assertPlainObject("participation authorization", authorization);
  for (const [name, value] of [
    ["authorizationId", authorization.authorizationId],
    ["threadId", authorization.threadId],
    ["requestId", authorization.requestId],
    ["appraisalId", authorization.appraisalId],
    ["stanceId", authorization.stanceId],
    ["causationId", authorization.causationId],
    ["correlationId", authorization.correlationId],
  ]) {
    assertId(`authorization.${name}`, value);
  }
  assertFiniteNumber("authorization.snapshotVersion", authorization.snapshotVersion, {
    integer: true,
    minimum: 1,
  });
  hash("authorization.threadStateHash", authorization.threadStateHash);
  hash("authorization.requestFingerprint", authorization.requestFingerprint);
  entity("authorization.requester", authorization.requester);
  policy("authorization.policy", authorization.policy);
  if (
    !ACTIONS.has(authorization.desiredAction) ||
    !ACTIONS.has(authorization.authorizedAction)
  ) {
    throw new TypeError("authorization action is invalid");
  }
  if (!BANDS.has(authorization.dignityBand)) {
    throw new TypeError("authorization dignityBand is invalid");
  }
  assertFiniteNumber("authorization.score", authorization.score);
  if (authorization.score < 0 || authorization.score > 100) {
    throw new TypeError("authorization.score must be between 0 and 100");
  }
  assertNonEmpty("authorization.rationale", authorization.rationale);
  uniq("authorization.evidenceRefs", authorization.evidenceRefs);
  uniq("authorization.obligationReferences", authorization.obligationReferences);
  assertPlainObject("authorization.relationshipImpact", authorization.relationshipImpact);
  assertIsoTimestamp("authorization.issuedAt", authorization.issuedAt);
  return authorization;
}

export function authorizationRecordDigest(authorization) {
  validateParticipationAuthorization(authorization);
  return authorizationDigest(authorization);
}

function strategyInput(value) {
  assertPlainObject("disclosure strategy", value);
  assertExactKeys("disclosure strategy", value, [
    "mode",
    "communicatedPosture",
    "publicRationaleIntent",
    "disclosedReasonCategories",
    "withheldReasonCategories",
    "safeReferences",
    "relationshipObjective",
    "selfProtectionObjective",
    "integrityConcern",
    "privateRationale",
  ]);
  if (!MODES.has(value.mode)) {
    throw new TypeError("disclosure strategy.mode is invalid");
  }
  if (!POSTURES.has(value.communicatedPosture)) {
    throw new TypeError("disclosure strategy.communicatedPosture is invalid");
  }
  assertNonEmpty(
    "disclosure strategy.publicRationaleIntent",
    value.publicRationaleIntent,
  );
  uniq(
    "disclosure strategy.disclosedReasonCategories",
    value.disclosedReasonCategories,
  );
  uniq(
    "disclosure strategy.withheldReasonCategories",
    value.withheldReasonCategories,
  );
  uniq("disclosure strategy.safeReferences", value.safeReferences);
  if (value.safeReferences.length !== 0) {
    throw new ExpressionRejectedError(
      "M1 expression cannot publish caller-designated references before an audience-safe reference registry exists",
    );
  }
  const visible = new Set(value.disclosedReasonCategories);
  for (const item of value.withheldReasonCategories) {
    if (visible.has(item)) {
      throw new TypeError(
        "a reason category cannot be both disclosed and withheld",
      );
    }
  }
  for (const key of [
    "relationshipObjective",
    "selfProtectionObjective",
    "integrityConcern",
  ]) {
    if (value[key] !== undefined) {
      assertNonEmpty(`disclosure strategy.${key}`, value[key]);
    }
  }
  assertNonEmpty("disclosure strategy.privateRationale", value.privateRationale);

  // In M1, mode is a restricted record of the Thread's intended disclosure
  // strategy. It is not an honesty classifier for the fixed audience message.
  return structuredClone(value);
}

export function normalizeDisclosureRequest(value) {
  assertPlainObject("disclosure request", value);
  assertExactKeys("disclosure request", value, [
    "operationId",
    "authorizationId",
    "strategy",
    "causationId",
    "correlationId",
  ]);
  assertId("disclosure operationId", value.operationId);
  assertId("disclosure authorizationId", value.authorizationId);
  assertId("disclosure causationId", value.causationId);
  if (value.correlationId !== undefined) {
    assertId("disclosure correlationId", value.correlationId);
  }
  return {
    operationId: value.operationId,
    authorizationId: value.authorizationId,
    strategy: strategyInput(value.strategy),
    causationId: value.causationId,
    correlationId: value.correlationId ?? value.causationId,
  };
}

export function disclosureOperationDigest(threadId, requestId, value) {
  const request = normalizeDisclosureRequest(value);
  return `sha256:${sha256(canonicalJson({
    kind: "restricted_disclosure_strategy",
    threadId,
    requestId,
    ...request,
  }))}`;
}

function assertAuthorizationTraceBinding(trace, authorization) {
  validateParticipationAuthorization(authorization);
  if (
    !trace?.privateStance ||
    authorization.threadId !== trace.threadId ||
    authorization.snapshotVersion !== trace.snapshotVersion ||
    authorization.threadStateHash !== trace.threadStateHash ||
    authorization.requestId !== trace.requestId ||
    authorization.requestFingerprint !== trace.requestFingerprint ||
    authorization.appraisalId !== trace.appraisalId ||
    authorization.stanceId !== trace.privateStanceId ||
    authorization.desiredAction !== trace.privateStance.desiredAction ||
    authorization.dignityBand !== trace.privateStance.dignityBand ||
    authorization.score !== trace.privateStance.score ||
    !sameEntity(authorization.requester, trace.request.requester)
  ) {
    throw new IntegrityError(
      "participation authorization does not bind its request trace",
    );
  }
}

export function buildDisclosureStrategy(
  trace,
  authorization,
  value,
  { strategyId, recordedAt },
) {
  const request = normalizeDisclosureRequest(value);
  assertAuthorizationTraceBinding(trace, authorization);
  if (request.authorizationId !== authorization.authorizationId) {
    throw new ExpressionRejectedError(
      "disclosure request names a different participation authorization",
    );
  }
  assertRequestedPostureCompatible(
    authorization,
    request.strategy.communicatedPosture,
  );
  assertId("strategyId", strategyId);
  assertIsoTimestamp("disclosure recordedAt", recordedAt);

  const participationBasis =
    authorization.desiredAction === authorization.authorizedAction
      ? "aligned"
      : "obligation_override";
  if (
    participationBasis === "obligation_override" &&
    authorization.obligationReferences.length === 0
  ) {
    throw new IntegrityError(
      "authorization divergence is missing its governing obligation reference",
    );
  }

  const strategy = {
    strategyId,
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    threadStateHash: trace.threadStateHash,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    appraisalId: trace.appraisalId,
    stanceId: trace.privateStanceId,
    authorizationId: authorization.authorizationId,
    requester: structuredClone(trace.request.requester),
    audience: [structuredClone(trace.request.requester)],
    policy: structuredClone(authorization.policy),
    desiredAction: authorization.desiredAction,
    authorizedAction: authorization.authorizedAction,
    dignityBand: authorization.dignityBand,
    participationBasis,
    governingObligationReferences: [...authorization.obligationReferences],
    ...request.strategy,
    recordedAt,
    causationId: request.causationId,
    correlationId: request.correlationId,
  };
  validateDisclosureStrategy(strategy);
  return strategy;
}

export function validateDisclosureStrategy(strategy) {
  assertPlainObject("stored disclosure strategy", strategy);
  assertExactKeys("stored disclosure strategy", strategy, [
    "strategyId",
    "threadId",
    "snapshotVersion",
    "threadStateHash",
    "requestId",
    "requestFingerprint",
    "appraisalId",
    "stanceId",
    "authorizationId",
    "requester",
    "audience",
    "policy",
    "desiredAction",
    "authorizedAction",
    "dignityBand",
    "participationBasis",
    "governingObligationReferences",
    "mode",
    "communicatedPosture",
    "publicRationaleIntent",
    "disclosedReasonCategories",
    "withheldReasonCategories",
    "safeReferences",
    "relationshipObjective",
    "selfProtectionObjective",
    "integrityConcern",
    "privateRationale",
    "recordedAt",
    "causationId",
    "correlationId",
  ]);
  for (const [name, value] of [
    ["strategyId", strategy.strategyId],
    ["threadId", strategy.threadId],
    ["requestId", strategy.requestId],
    ["appraisalId", strategy.appraisalId],
    ["stanceId", strategy.stanceId],
    ["authorizationId", strategy.authorizationId],
    ["causationId", strategy.causationId],
    ["correlationId", strategy.correlationId],
  ]) {
    assertId(`strategy.${name}`, value);
  }
  assertFiniteNumber("strategy.snapshotVersion", strategy.snapshotVersion, {
    integer: true,
    minimum: 1,
  });
  hash("strategy.threadStateHash", strategy.threadStateHash);
  hash("strategy.requestFingerprint", strategy.requestFingerprint);
  entity("strategy.requester", strategy.requester);
  if (!Array.isArray(strategy.audience) || strategy.audience.length !== 1) {
    throw new TypeError(
      "strategy audience must contain exactly the requester in M1",
    );
  }
  entity("strategy.audience[0]", strategy.audience[0]);
  if (!sameEntity(strategy.requester, strategy.audience[0])) {
    throw new TypeError("strategy audience must match requester in M1");
  }
  policy("strategy.policy", strategy.policy);
  if (
    !ACTIONS.has(strategy.desiredAction) ||
    !ACTIONS.has(strategy.authorizedAction) ||
    !BANDS.has(strategy.dignityBand)
  ) {
    throw new TypeError("strategy participation witness is invalid");
  }
  if (!new Set(["aligned", "obligation_override"]).has(strategy.participationBasis)) {
    throw new TypeError("strategy participationBasis is invalid");
  }
  if (
    strategy.participationBasis !==
    (strategy.desiredAction === strategy.authorizedAction
      ? "aligned"
      : "obligation_override")
  ) {
    throw new TypeError(
      "strategy participationBasis must derive from desired and authorized action",
    );
  }
  uniq(
    "strategy.governingObligationReferences",
    strategy.governingObligationReferences,
  );
  strategyInput({
    mode: strategy.mode,
    communicatedPosture: strategy.communicatedPosture,
    publicRationaleIntent: strategy.publicRationaleIntent,
    disclosedReasonCategories: strategy.disclosedReasonCategories,
    withheldReasonCategories: strategy.withheldReasonCategories,
    safeReferences: strategy.safeReferences,
    ...(strategy.relationshipObjective === undefined
      ? {}
      : { relationshipObjective: strategy.relationshipObjective }),
    ...(strategy.selfProtectionObjective === undefined
      ? {}
      : { selfProtectionObjective: strategy.selfProtectionObjective }),
    ...(strategy.integrityConcern === undefined
      ? {}
      : { integrityConcern: strategy.integrityConcern }),
    privateRationale: strategy.privateRationale,
  });
  assertStoredPostureCompatible(strategy);
  assertIsoTimestamp("strategy.recordedAt", strategy.recordedAt);
  return strategy;
}

export function disclosureStrategyDigest(strategy) {
  validateDisclosureStrategy(strategy);
  return `sha256:${sha256(canonicalJson(strategy))}`;
}

export function normalizeResponseRequest(value) {
  assertPlainObject("audience response request", value);
  assertExactKeys("audience response request", value, [
    "operationId",
    "strategyId",
    "causationId",
    "correlationId",
  ]);
  assertId("response operationId", value.operationId);
  assertId("response strategyId", value.strategyId);
  assertId("response causationId", value.causationId);
  if (value.correlationId !== undefined) {
    assertId("response correlationId", value.correlationId);
  }
  return {
    operationId: value.operationId,
    strategyId: value.strategyId,
    causationId: value.causationId,
    correlationId: value.correlationId ?? value.causationId,
  };
}

export function responseOperationDigest(threadId, requestId, value) {
  const request = normalizeResponseRequest(value);
  return `sha256:${sha256(canonicalJson({
    kind: "audience_participation_response",
    threadId,
    requestId,
    ...request,
  }))}`;
}

function message(strategy) {
  if (
    strategy.participationBasis === "obligation_override" &&
    strategy.authorizedAction === "accept" &&
    strategy.mode === "full_candor"
  ) {
    return "I can proceed with this request because I have a recorded obligation to do so.";
  }
  return {
    accept:
      strategy.participationBasis === "aligned"
        ? "I can take this on."
        : "I can proceed with this request.",
    clarify: "I need clarification before I can decide whether to participate.",
    negotiate: "I am open to this request if we can revise the terms first.",
    delegate: "I recommend routing this request to another participant.",
    refuse: "I will not take this request on.",
    noncommittal: "I am not committing to this request at this time.",
  }[strategy.communicatedPosture];
}

export function buildAudienceResponse(
  strategy,
  value,
  { responseId, recordedAt },
) {
  validateDisclosureStrategy(strategy);
  const request = normalizeResponseRequest(value);
  if (request.strategyId !== strategy.strategyId) {
    throw new ExpressionRejectedError(
      "audience response names a different disclosure strategy",
    );
  }
  assertId("responseId", responseId);
  assertIsoTimestamp("response recordedAt", recordedAt);
  const response = {
    responseId,
    threadId: strategy.threadId,
    requestId: strategy.requestId,
    authorizationId: strategy.authorizationId,
    strategyId: strategy.strategyId,
    audience: structuredClone(strategy.audience),
    communicatedPosture: strategy.communicatedPosture,
    message: message(strategy),
    safeReferences: [],
    deliveryStatus: "not_sent",
    performedActionStatus: "none_recorded",
    completionStatus: "not_claimed",
    recordedAt,
    causationId: request.causationId,
    correlationId: request.correlationId,
  };
  validateAudienceResponse(response);
  return response;
}

export function validateAudienceResponse(response) {
  assertPlainObject("audience response", response);
  assertExactKeys("audience response", response, [
    "responseId",
    "threadId",
    "requestId",
    "authorizationId",
    "strategyId",
    "audience",
    "communicatedPosture",
    "message",
    "safeReferences",
    "deliveryStatus",
    "performedActionStatus",
    "completionStatus",
    "recordedAt",
    "causationId",
    "correlationId",
  ]);
  for (const [name, value] of [
    ["responseId", response.responseId],
    ["threadId", response.threadId],
    ["requestId", response.requestId],
    ["authorizationId", response.authorizationId],
    ["strategyId", response.strategyId],
    ["causationId", response.causationId],
    ["correlationId", response.correlationId],
  ]) {
    assertId(`response.${name}`, value);
  }
  if (!Array.isArray(response.audience) || response.audience.length !== 1) {
    throw new TypeError(
      "response audience must contain exactly one requester in M1",
    );
  }
  entity("response.audience[0]", response.audience[0]);
  if (!POSTURES.has(response.communicatedPosture)) {
    throw new TypeError("response.communicatedPosture is invalid");
  }
  assertNonEmpty("response.message", response.message);
  uniq("response.safeReferences", response.safeReferences);
  if (response.safeReferences.length !== 0) {
    throw new TypeError("M1 response safeReferences must be empty");
  }
  if (
    response.deliveryStatus !== "not_sent" ||
    response.performedActionStatus !== "none_recorded" ||
    response.completionStatus !== "not_claimed"
  ) {
    throw new TypeError(
      "M1 audience response cannot claim delivery, performed action, or completion",
    );
  }
  assertIsoTimestamp("response.recordedAt", response.recordedAt);
  return response;
}

export function audienceResponseDigest(response) {
  validateAudienceResponse(response);
  return `sha256:${sha256(canonicalJson(response))}`;
}
