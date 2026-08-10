import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "./obligation-domain.mjs";

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;
const APPLICABILITY_ID_PATTERN = /^oba_[0-9a-f]{64}$/;
const DISCHARGE_ID_PATTERN = /^obd_[0-9a-f]{64}$/;

function assertSha256(name, value) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function assertPattern(name, value, pattern, description) {
  assertNonEmpty(name, value);
  if (!pattern.test(value)) throw new TypeError(`${name} must be ${description}`);
}

export function buildDischargedObligationRevision(currentRecord, dischargedAt) {
  const current = normalizeStructuredObligation(structuredClone(currentRecord));
  assertIsoTimestamp("structured obligation dischargedAt", dischargedAt);
  if (current.status !== "active") {
    throw new TypeError(
      `structured obligation ${current.obligationId} cannot discharge from ${current.status}`,
    );
  }
  if (Date.parse(dischargedAt) < Date.parse(current.effectiveAt)) {
    throw new TypeError(
      `structured obligation ${current.obligationId} is not yet effective at discharge`,
    );
  }
  if (current.expiresAt !== undefined && Date.parse(dischargedAt) >= Date.parse(current.expiresAt)) {
    throw new TypeError(
      `structured obligation ${current.obligationId} expired before discharge`,
    );
  }
  if (current.recurrence.kind !== "none") {
    throw new TypeError(
      `structured obligation ${current.obligationId} has descriptive recurrence and cannot auto-discharge in v1`,
    );
  }
  return normalizeStructuredObligation({
    ...current,
    revision: current.revision + 1,
    status: "discharged",
    supersedesRevision: current.revision,
  });
}

export function structuredObligationDischargeId({
  threadId,
  obligationId,
  authorizationId,
  freezeOperationId,
}) {
  assertId("structured discharge threadId", threadId);
  assertPattern(
    "structured discharge obligationId",
    obligationId,
    OBLIGATION_ID_PATTERN,
    "obl_ followed by 64 lowercase hex characters",
  );
  assertId("structured discharge authorizationId", authorizationId);
  assertId("structured discharge freezeOperationId", freezeOperationId);
  return `obd_${sha256(canonicalJson({
    kind: "structured_obligation_discharge",
    threadId,
    obligationId,
    authorizationId,
    freezeOperationId,
  }))}`;
}

export function normalizeStructuredObligationDischarge(record) {
  assertPlainObject("structured obligation discharge", record);
  assertExactKeys("structured obligation discharge", record, [
    "dischargeId",
    "threadId",
    "obligationId",
    "priorRevision",
    "priorObligationDigest",
    "terminalRevision",
    "terminalObligationDigest",
    "applicabilityId",
    "applicabilityDecisionDigest",
    "authorizationId",
    "authorizationDigest",
    "sessionId",
    "requestId",
    "freezeOperationId",
    "freezeReportId",
    "eventId",
    "dischargedAt",
    "reasonCode",
  ]);
  assertPattern(
    "structured discharge dischargeId",
    record.dischargeId,
    DISCHARGE_ID_PATTERN,
    "obd_ followed by 64 lowercase hex characters",
  );
  assertId("structured discharge threadId", record.threadId);
  assertPattern(
    "structured discharge obligationId",
    record.obligationId,
    OBLIGATION_ID_PATTERN,
    "obl_ followed by 64 lowercase hex characters",
  );
  for (const [name, value] of [
    ["priorRevision", record.priorRevision],
    ["terminalRevision", record.terminalRevision],
  ]) {
    assertFiniteNumber(`structured discharge ${name}`, value, {
      integer: true,
      minimum: 1,
    });
  }
  if (record.terminalRevision !== record.priorRevision + 1) {
    throw new TypeError("structured discharge terminalRevision must immediately follow priorRevision");
  }
  assertSha256("structured discharge priorObligationDigest", record.priorObligationDigest);
  assertSha256("structured discharge terminalObligationDigest", record.terminalObligationDigest);
  assertPattern(
    "structured discharge applicabilityId",
    record.applicabilityId,
    APPLICABILITY_ID_PATTERN,
    "oba_ followed by 64 lowercase hex characters",
  );
  assertSha256(
    "structured discharge applicabilityDecisionDigest",
    record.applicabilityDecisionDigest,
  );
  assertId("structured discharge authorizationId", record.authorizationId);
  assertSha256("structured discharge authorizationDigest", record.authorizationDigest);
  assertId("structured discharge sessionId", record.sessionId);
  assertId("structured discharge requestId", record.requestId);
  assertId("structured discharge freezeOperationId", record.freezeOperationId);
  assertId("structured discharge freezeReportId", record.freezeReportId);
  assertId("structured discharge eventId", record.eventId);
  assertIsoTimestamp("structured discharge dischargedAt", record.dischargedAt);
  if (record.reasonCode !== "runtime_completed_guardian_pass") {
    throw new TypeError("structured discharge reasonCode is invalid");
  }
  return {
    dischargeId: record.dischargeId,
    threadId: record.threadId,
    obligationId: record.obligationId,
    priorRevision: record.priorRevision,
    priorObligationDigest: record.priorObligationDigest,
    terminalRevision: record.terminalRevision,
    terminalObligationDigest: record.terminalObligationDigest,
    applicabilityId: record.applicabilityId,
    applicabilityDecisionDigest: record.applicabilityDecisionDigest,
    authorizationId: record.authorizationId,
    authorizationDigest: record.authorizationDigest,
    sessionId: record.sessionId,
    requestId: record.requestId,
    freezeOperationId: record.freezeOperationId,
    freezeReportId: record.freezeReportId,
    eventId: record.eventId,
    dischargedAt: record.dischargedAt,
    reasonCode: record.reasonCode,
  };
}

export function buildStructuredObligationDischarge({
  currentObligation,
  currentObligationDigest,
  applicability,
  applicabilityDecisionDigest,
  authorizationId,
  authorizationDigest,
  sessionId,
  requestId,
  freezeOperationId,
  freezeReportId,
  eventId,
  dischargedAt,
}) {
  const current = normalizeStructuredObligation(structuredClone(currentObligation));
  assertSha256("structured discharge currentObligationDigest", currentObligationDigest);
  if (structuredObligationDigest(current) !== currentObligationDigest) {
    throw new TypeError("structured discharge current obligation digest does not match content");
  }
  const terminal = buildDischargedObligationRevision(current, dischargedAt);
  const terminalDigest = structuredObligationDigest(terminal);
  const discharge = normalizeStructuredObligationDischarge({
    dischargeId: structuredObligationDischargeId({
      threadId: current.threadId,
      obligationId: current.obligationId,
      authorizationId,
      freezeOperationId,
    }),
    threadId: current.threadId,
    obligationId: current.obligationId,
    priorRevision: current.revision,
    priorObligationDigest: currentObligationDigest,
    terminalRevision: terminal.revision,
    terminalObligationDigest: terminalDigest,
    applicabilityId: applicability.applicabilityId,
    applicabilityDecisionDigest,
    authorizationId,
    authorizationDigest,
    sessionId,
    requestId,
    freezeOperationId,
    freezeReportId,
    eventId,
    dischargedAt,
    reasonCode: "runtime_completed_guardian_pass",
  });
  return {
    terminalObligation: terminal,
    terminalObligationDigest: terminalDigest,
    discharge,
    dischargeDigest: structuredObligationDischargeDigest(discharge),
  };
}

export function structuredObligationDischargeDigest(record) {
  return `sha256:${sha256(canonicalJson(normalizeStructuredObligationDischarge(record)))}`;
}
