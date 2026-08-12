import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const CLOSURE_ID = /^obw_[0-9a-f]{64}$/;
const OBLIGATION_ID = /^obl_[0-9a-f]{64}$/;
const STATUS = new Set(["active", "satisfied", "expired", "revoked", "discharged"]);
const CAUSE = new Set(["superseded", "status_changed", "expired", "legacy_tombstoned"]);

function digest(name, value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

export const STRUCTURED_AUTHORITY_WITHDRAWAL_REASON = "governing_authority_withdrawn";

export function normalizeStructuredAuthorityWithdrawal(value) {
  assertPlainObject("Structured authority withdrawal", value);
  assertExactKeys("Structured authority withdrawal", value, [
    "closureId", "operationId", "threadId", "sessionId", "requestId",
    "authorizationId", "authorizationDigest", "applicabilityId",
    "applicabilityDecisionDigest", "obligationId", "authorizedObligationRevision",
    "authorizedObligationDigest", "currentObligationRevision", "currentObligationDigest",
    "currentObligationStatus", "actorRunId", "actorOutputDigest", "guardianAuditId",
    "guardianAuditDigest", "guardianDecision", "withdrawalCause", "reasonCode",
    "closedAt", "causationId", "correlationId",
  ]);
  if (typeof value.closureId !== "string" || !CLOSURE_ID.test(value.closureId)) {
    throw new TypeError("closureId must be obw_ followed by 64 lowercase hex characters");
  }
  for (const key of [
    "operationId", "threadId", "sessionId", "requestId", "authorizationId",
    "applicabilityId", "actorRunId", "guardianAuditId", "causationId", "correlationId",
  ]) assertId(`Structured authority withdrawal ${key}`, value[key]);
  if (typeof value.obligationId !== "string" || !OBLIGATION_ID.test(value.obligationId)) {
    throw new TypeError("Structured authority withdrawal obligationId is invalid");
  }
  for (const key of ["authorizedObligationRevision", "currentObligationRevision"]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 1) {
      throw new TypeError(`Structured authority withdrawal ${key} must be a positive integer`);
    }
  }
  for (const key of [
    "authorizationDigest", "applicabilityDecisionDigest", "authorizedObligationDigest",
    "currentObligationDigest", "actorOutputDigest", "guardianAuditDigest",
  ]) digest(`Structured authority withdrawal ${key}`, value[key]);
  if (!STATUS.has(value.currentObligationStatus)) {
    throw new TypeError("Structured authority withdrawal currentObligationStatus is invalid");
  }
  if (value.guardianDecision !== "pass") {
    throw new TypeError("Structured authority withdrawal requires Goal Guardian pass");
  }
  if (!CAUSE.has(value.withdrawalCause)) {
    throw new TypeError("Structured authority withdrawal withdrawalCause is invalid");
  }
  if (value.reasonCode !== STRUCTURED_AUTHORITY_WITHDRAWAL_REASON) {
    throw new TypeError("Structured authority withdrawal reasonCode is invalid");
  }
  assertIsoTimestamp("Structured authority withdrawal closedAt", value.closedAt);
  return structuredClone(value);
}

export function structuredAuthorityWithdrawalDigest(value) {
  return `sha256:${sha256(canonicalJson(normalizeStructuredAuthorityWithdrawal(value)))}`;
}
