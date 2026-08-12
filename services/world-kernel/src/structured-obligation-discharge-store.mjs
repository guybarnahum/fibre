import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  FreezeRejectedError,
  FreezeStateChangedError,
} from "./freeze-domain.mjs";
import {
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "./obligation-domain.mjs";
import {
  buildStructuredObligationDischarge,
  normalizeStructuredObligationDischarge,
  structuredObligationDischargeDigest,
} from "./structured-obligation-discharge.mjs";

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function same(name, actual, expected) {
  if (actual !== expected) {
    throw new IntegrityError(`${name} does not match its persisted witness`);
  }
}

function nullable(value) {
  return value === undefined ? null : value;
}

export function prepareStructuredObligationDischarge(
  database,
  authorization,
  authorizationDigestValue,
  record,
) {
  if (authorization.participationBasis === undefined) return null;
  if (authorization.participationBasis === "willing") {
    if (authorization.applicability !== null || authorization.obligationReferences.length !== 0) {
      throw new IntegrityError("willing structured authorization carries obligation authority");
    }
    return null;
  }
  if (authorization.participationBasis !== "obligation_override") {
    throw new IntegrityError(
      `unknown structured participation basis ${authorization.participationBasis}`,
    );
  }
  if (!authorization.applicability || authorization.obligationReferences.length !== 0) {
    throw new IntegrityError(
      "structured obligation override must carry applicability and no legacy obligation references",
    );
  }
  if (record.report.dischargedObligations.length !== 0) {
    throw new IntegrityError(
      "structured obligation override must not discharge legacy unresolved-intention prose",
    );
  }

  const binding = authorization.applicability;
  const applicabilityRow = database.prepare(`
    SELECT applicability_id,thread_id,snapshot_version,thread_state_hash,request_id,
      request_fingerprint,obligation_id,obligation_revision,obligation_digest,result,
      policy_id,policy_version,decision_digest,decided_at
    FROM obligation_applicability_decisions
    WHERE applicability_id=?
  `).get(binding.applicabilityId);
  if (applicabilityRow === undefined) {
    throw new FreezeStateChangedError(
      `Structured Obligation applicability ${binding.applicabilityId} disappeared before freeze`,
    );
  }
  same("structured applicability decision digest", applicabilityRow.decision_digest, binding.decisionDigest);
  same("structured applicability result", applicabilityRow.result, "applies");
  same("structured applicability thread", applicabilityRow.thread_id, record.threadId);
  same("structured applicability request", applicabilityRow.request_id, record.requestId);
  same("structured applicability snapshot", Number(applicabilityRow.snapshot_version), record.snapshotVersion);
  same("structured applicability state", applicabilityRow.thread_state_hash, record.priorStateHash);
  same("structured applicability request fingerprint", applicabilityRow.request_fingerprint, authorization.requestFingerprint);
  same("structured applicability obligation", applicabilityRow.obligation_id, binding.obligationId);
  same("structured applicability obligation revision", Number(applicabilityRow.obligation_revision), binding.obligationRevision);
  same("structured applicability obligation digest", applicabilityRow.obligation_digest, binding.obligationDigest);
  same("structured applicability policy", applicabilityRow.policy_id, "structured_obligation_applicability");
  same("structured applicability policy version", applicabilityRow.policy_version, "1");
  if (Date.parse(applicabilityRow.decided_at) > Date.parse(authorization.issuedAt)) {
    throw new IntegrityError("structured applicability postdates its authorization");
  }
  if (Date.parse(authorization.issuedAt) > Date.parse(record.completedAt)) {
    throw new IntegrityError("structured authorization postdates freeze completion");
  }

  const priorRow = database.prepare(`
    SELECT obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
      supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
      legacy_source_digest,recorded_at
    FROM obligation_records
    WHERE obligation_id=? AND revision=? AND thread_id=?
  `).get(binding.obligationId, binding.obligationRevision, record.threadId);
  if (priorRow === undefined) {
    throw new FreezeStateChangedError(
      `Structured Obligation ${binding.obligationId} revision ${binding.obligationRevision} disappeared before freeze`,
    );
  }
  if (priorRow.obligation_digest !== binding.obligationDigest) {
    throw new FreezeStateChangedError(
      `Structured Obligation ${binding.obligationId} digest changed before freeze`,
    );
  }
  const newer = database.prepare(`
    SELECT revision,status,obligation_digest
    FROM obligation_records
    WHERE obligation_id=? AND revision>?
    ORDER BY revision DESC LIMIT 1
  `).get(binding.obligationId, binding.obligationRevision);
  if (newer !== undefined) {
    throw new FreezeStateChangedError(
      `Structured Obligation ${binding.obligationId} advanced to revision ${newer.revision} before freeze`,
    );
  }
  if (priorRow.status !== "active") {
    throw new FreezeStateChangedError(
      `Structured Obligation ${binding.obligationId} is ${priorRow.status} before freeze`,
    );
  }
  if (Date.parse(priorRow.recorded_at) > Date.parse(record.completedAt)) {
    throw new IntegrityError("Structured Obligation revision postdates freeze completion");
  }
  if (Date.parse(record.completedAt) < Date.parse(priorRow.effective_at)) {
    throw new FreezeRejectedError(
      `Structured Obligation ${binding.obligationId} is not effective at freeze`,
    );
  }
  if (priorRow.expires_at !== null && Date.parse(record.completedAt) >= Date.parse(priorRow.expires_at)) {
    throw new FreezeRejectedError(
      `Structured Obligation ${binding.obligationId} expired before freeze`,
    );
  }
  if (priorRow.legacy_source_digest !== null) {
    const spent = database.prepare(`
      SELECT 1 AS present FROM legacy_obligation_tombstones
      WHERE thread_id=? AND legacy_reference_digest=?
    `).get(record.threadId, priorRow.legacy_source_digest);
    if (spent !== undefined) {
      throw new FreezeStateChangedError(
        `Structured Obligation ${binding.obligationId} maps to spent legacy authority`,
      );
    }
  }

  const currentObligation = normalizeStructuredObligation(
    parseJson(
      `Structured Obligation ${binding.obligationId} revision ${binding.obligationRevision}`,
      priorRow.obligation_json,
    ),
  );
  if (canonicalJson(currentObligation) !== priorRow.obligation_json) {
    throw new IntegrityError(
      `Structured Obligation ${binding.obligationId} is not stored as canonical JSON`,
    );
  }
  same(
    "Structured Obligation content digest",
    structuredObligationDigest(currentObligation),
    priorRow.obligation_digest,
  );

  try {
    return buildStructuredObligationDischarge({
      currentObligation,
      currentObligationDigest: priorRow.obligation_digest,
      applicability: binding,
      applicabilityDecisionDigest: binding.decisionDigest,
      authorizationId: authorization.authorizationId,
      authorizationDigest: authorizationDigestValue,
      authorizationConsumptionDigest: record.consumptionDigest,
      sessionId: record.sessionId,
      requestId: record.requestId,
      freezeOperationId: record.operationId,
      freezeReportId: record.report.reportId,
      freezeReportDigest: record.reportDigest,
      eventId: record.eventId,
      dischargedAt: record.completedAt,
    });
  } catch (error) {
    if (/descriptive recurrence/.test(error?.message ?? "")) {
      throw new FreezeRejectedError(error.message);
    }
    throw error;
  }
}

export function persistStructuredObligationDischarge(database, prepared) {
  if (prepared === null) return null;
  const terminal = normalizeStructuredObligation(prepared.terminalObligation);
  const terminalDigest = structuredObligationDigest(terminal);
  same("terminal Structured Obligation digest", terminalDigest, prepared.terminalObligationDigest);
  const discharge = normalizeStructuredObligationDischarge(prepared.discharge);
  const dischargeDigest = structuredObligationDischargeDigest(discharge);
  same("Structured Obligation discharge digest", dischargeDigest, prepared.dischargeDigest);

  database.prepare(`
    INSERT INTO obligation_records(
      obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
      supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
      legacy_source_digest,recorded_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    terminal.obligationId,
    terminal.revision,
    terminal.threadId,
    terminal.status,
    canonicalJson(terminal),
    terminalDigest,
    terminal.supersedesRevision,
    terminal.effectiveAt,
    nullable(terminal.expiresAt),
    terminal.visibility.standing,
    terminal.visibility.terms,
    nullable(terminal.legacySourceDigest),
    discharge.dischargedAt,
  );

  database.prepare(`
    INSERT INTO structured_obligation_discharges(
      discharge_id,thread_id,obligation_id,prior_revision,prior_obligation_digest,
      terminal_revision,terminal_obligation_digest,applicability_id,
      applicability_decision_digest,authorization_id,authorization_digest,
      authorization_consumption_digest,session_id,request_id,freeze_operation_id,
      freeze_report_id,freeze_report_digest,event_id,discharged_at,reason_code,
      discharge_json,discharge_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    discharge.dischargeId,
    discharge.threadId,
    discharge.obligationId,
    discharge.priorRevision,
    discharge.priorObligationDigest,
    discharge.terminalRevision,
    discharge.terminalObligationDigest,
    discharge.applicabilityId,
    discharge.applicabilityDecisionDigest,
    discharge.authorizationId,
    discharge.authorizationDigest,
    discharge.authorizationConsumptionDigest,
    discharge.sessionId,
    discharge.requestId,
    discharge.freezeOperationId,
    discharge.freezeReportId,
    discharge.freezeReportDigest,
    discharge.eventId,
    discharge.dischargedAt,
    discharge.reasonCode,
    canonicalJson(discharge),
    dischargeDigest,
  );
  return {
    terminalObligation: terminal,
    terminalObligationDigest: terminalDigest,
    discharge,
    dischargeDigest,
  };
}
