
import {
  IntegrityError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";
import { rowToEvent } from "./persistence-domain.mjs";
import {
  deterministicApplicability,
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "./obligation-domain.mjs";
import { applicabilityDecisionDigest } from "./obligation-schema.mjs";
import { authorizationDigest } from "./runtime-domain.mjs";
import {
  authorizationConsumptionDigest,
  freezeReportDigest,
} from "./freeze-domain.mjs";
import {
  normalizeStructuredObligationDischarge,
  structuredObligationDischargeDigest,
  structuredObligationDischargeId,
} from "./structured-obligation-discharge.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import {
  normalizeStructuredAuthorityWithdrawal,
  structuredAuthorityWithdrawalDigest,
} from "./structured-authority-withdrawal.mjs";
import {
  COMPELLED_EPISODE_HISTORY_PROFILE_VERSION,
  interruptedCompelledEpisodeActor,
  interruptedCompelledEpisodeCommandDigest,
  interruptedCompelledEpisodeCommandId,
  interruptedCompelledEpisodeEventId,
  interruptedCompelledEpisodePayload,
  interruptedCompelledEpisodeProvenance,
} from "./interrupted-compelled-episode.mjs";

const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;

const APPLICABILITY_KEYS = [
  "applicabilityId", "operationId", "inputDigest", "threadId", "snapshotVersion",
  "threadStateHash", "requestId", "requestFingerprint", "obligationId",
  "obligationRevision", "obligationDigest", "nominationSource", "result", "reasonCode",
  "policy", "evidenceReferences", "decidedAt", "causationId", "correlationId",
];
const STRUCTURED_AUTHORIZATION_KEYS = [
  "authorizationId", "threadId", "snapshotVersion", "threadStateHash", "requestId",
  "requestFingerprint", "requester", "appraisalId", "stanceId", "policy",
  "desiredAction", "authorizedAction", "dignityBand", "score", "participationBasis",
  "rationale", "evidenceRefs", "obligationReferences", "applicability",
  "relationshipImpact", "issuedAt", "causationId", "correlationId",
];
const STRUCTURED_APPLICABILITY_BINDING_KEYS = [
  "applicabilityId", "decisionDigest", "obligationId", "obligationRevision",
  "obligationDigest", "policy",
];
const FREEZE_REPORT_KEYS = [
  "reportId", "eventId", "threadId", "requestId", "sessionId", "authorizationId",
  "priorVersion", "resultingVersion", "priorStateHash", "resultingStateHash",
  "acceptedLifeChanges", "rejectedLifeChanges", "dischargedObligations",
  "completedAt", "causationId", "correlationId",
];

export class StructuredObligationInspectionNotFoundError extends Error {}

function assertObligationId(value) {
  if (typeof value !== "string" || !OBLIGATION_ID_PATTERN.test(value)) {
    throw new TypeError("obligationId must be obl_ followed by 64 lowercase hex characters");
  }
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function same(name, actual, expected) {
  if (actual !== expected) {
    throw new IntegrityError(`${name} does not match persisted evidence`);
  }
}

function nullable(value) {
  return value === undefined ? null : value;
}

function sameEntity(left, right) {
  return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

function rowToObligationRevision(row) {
  const obligation = normalizeStructuredObligation(
    parseJson(`obligation ${row.obligation_id} revision ${row.revision}`, row.obligation_json),
  );
  const digest = structuredObligationDigest(obligation);
  same("obligation digest", row.obligation_digest, digest);
  same("obligation canonical JSON", row.obligation_json, canonicalJson(obligation));
  same("obligation ID", row.obligation_id, obligation.obligationId);
  same("obligation revision", Number(row.revision), obligation.revision);
  same("obligation Thread", row.thread_id, obligation.threadId);
  same("obligation status", row.status, obligation.status);
  same("obligation predecessor", row.supersedes_revision, nullable(obligation.supersedesRevision));
  same("obligation effectiveAt", row.effective_at, obligation.effectiveAt);
  same("obligation expiresAt", row.expires_at, nullable(obligation.expiresAt));
  same("obligation standing visibility", row.standing_visibility, obligation.visibility.standing);
  same("obligation terms visibility", row.terms_visibility, obligation.visibility.terms);
  same("obligation legacy source", row.legacy_source_digest, nullable(obligation.legacySourceDigest));
  return {
    obligation,
    obligationDigest: digest,
    recordedAt: row.recorded_at,
  };
}

function assertHistory(history, threadId, obligationId) {
  if (history.length === 0) return;
  const first = history[0];
  if (first.obligation.revision !== 1 || first.obligation.supersedesRevision !== undefined) {
    throw new IntegrityError(`obligation ${obligationId} history does not begin at revision 1`);
  }
  const issuer = first.obligation.issuer;
  const legacy = nullable(first.obligation.legacySourceDigest);
  let terminalStatus = null;
  for (let index = 0; index < history.length; index += 1) {
    const current = history[index];
    const expectedRevision = index + 1;
    same("obligation history ID", current.obligation.obligationId, obligationId);
    same("obligation history Thread", current.obligation.threadId, threadId);
    same("obligation history revision", current.obligation.revision, expectedRevision);
    same(
      "obligation history predecessor",
      nullable(current.obligation.supersedesRevision),
      expectedRevision === 1 ? null : expectedRevision - 1,
    );
    if (!sameEntity(current.obligation.issuer, issuer)) {
      throw new IntegrityError(`obligation ${obligationId} changes issuer across revisions`);
    }
    if (nullable(current.obligation.legacySourceDigest) !== legacy) {
      throw new IntegrityError(`obligation ${obligationId} changes legacy origin across revisions`);
    }
    if (index > 0 && Date.parse(current.recordedAt) < Date.parse(history[index - 1].recordedAt)) {
      throw new IntegrityError(`obligation ${obligationId} recordedAt moves backwards`);
    }
    if (terminalStatus !== null && current.obligation.status !== terminalStatus) {
      throw new IntegrityError(`obligation ${obligationId} resurrects terminal status ${terminalStatus}`);
    }
    if (terminalStatus === null && current.obligation.status !== "active") {
      terminalStatus = current.obligation.status;
    }
  }
}

function rowToApplicability(row) {
  const decision = parseJson(`applicability ${row.applicability_id}`, row.decision_json);
  assertPlainObject("persisted applicability decision", decision);
  assertExactKeys("persisted applicability decision", decision, APPLICABILITY_KEYS);
  assertPlainObject("persisted applicability policy", decision.policy);
  assertExactKeys("persisted applicability policy", decision.policy, ["id", "version"]);
  if (decision.policy.id !== "structured_obligation_applicability" || decision.policy.version !== "1") {
    throw new IntegrityError(`applicability ${row.applicability_id} uses an unsupported policy`);
  }
  if (decision.result !== "applies" && decision.result !== "does_not_apply") {
    throw new IntegrityError(`applicability ${row.applicability_id} has an invalid result`);
  }
  if (!Array.isArray(decision.evidenceReferences) ||
      decision.evidenceReferences.some((reference) => typeof reference !== "string" || reference.length === 0) ||
      new Set(decision.evidenceReferences).size !== decision.evidenceReferences.length) {
    throw new IntegrityError(`applicability ${row.applicability_id} has invalid evidence references`);
  }
  assertIsoTimestamp("persisted applicability decidedAt", decision.decidedAt);
  const digest = applicabilityDecisionDigest(decision);
  same("applicability canonical JSON", row.decision_json, canonicalJson(decision));
  same("applicability digest", row.decision_digest, digest);
  const fields = [
    ["applicability ID", row.applicability_id, decision.applicabilityId],
    ["applicability operation", row.operation_id, decision.operationId],
    ["applicability Thread", row.thread_id, decision.threadId],
    ["applicability snapshot", Number(row.snapshot_version), decision.snapshotVersion],
    ["applicability Thread state", row.thread_state_hash, decision.threadStateHash],
    ["applicability request", row.request_id, decision.requestId],
    ["applicability request fingerprint", row.request_fingerprint, decision.requestFingerprint],
    ["applicability obligation", row.obligation_id, decision.obligationId],
    ["applicability obligation revision", Number(row.obligation_revision), decision.obligationRevision],
    ["applicability obligation digest", row.obligation_digest, decision.obligationDigest],
    ["applicability nomination source", row.nomination_source, decision.nominationSource],
    ["applicability result", row.result, decision.result],
    ["applicability reason", row.reason_code, decision.reasonCode],
    ["applicability policy ID", row.policy_id, decision.policy?.id],
    ["applicability policy version", row.policy_version, decision.policy?.version],
    ["applicability evidence", row.evidence_refs_json, canonicalJson(decision.evidenceReferences)],
    ["applicability time", row.decided_at, decision.decidedAt],
    ["applicability causation", row.causation_id, decision.causationId],
    ["applicability correlation", row.correlation_id, decision.correlationId],
  ];
  for (const [name, actual, expected] of fields) same(name, actual, expected);
  return { decision, decisionDigest: digest };
}

function rowToDischarge(row) {
  const discharge = normalizeStructuredObligationDischarge(
    parseJson(`structured discharge ${row.discharge_id}`, row.discharge_json),
  );
  const digest = structuredObligationDischargeDigest(discharge);
  same("structured discharge canonical JSON", row.discharge_json, canonicalJson(discharge));
  same("structured discharge digest", row.discharge_digest, digest);
  const fields = [
    ["discharge ID", row.discharge_id, discharge.dischargeId],
    ["discharge Thread", row.thread_id, discharge.threadId],
    ["discharge obligation", row.obligation_id, discharge.obligationId],
    ["discharge prior revision", Number(row.prior_revision), discharge.priorRevision],
    ["discharge prior digest", row.prior_obligation_digest, discharge.priorObligationDigest],
    ["discharge terminal revision", Number(row.terminal_revision), discharge.terminalRevision],
    ["discharge terminal digest", row.terminal_obligation_digest, discharge.terminalObligationDigest],
    ["discharge applicability", row.applicability_id, discharge.applicabilityId],
    ["discharge applicability digest", row.applicability_decision_digest, discharge.applicabilityDecisionDigest],
    ["discharge authorization", row.authorization_id, discharge.authorizationId],
    ["discharge authorization digest", row.authorization_digest, discharge.authorizationDigest],
    ["discharge consumption digest", row.authorization_consumption_digest, discharge.authorizationConsumptionDigest],
    ["discharge session", row.session_id, discharge.sessionId],
    ["discharge request", row.request_id, discharge.requestId],
    ["discharge freeze operation", row.freeze_operation_id, discharge.freezeOperationId],
    ["discharge freeze report", row.freeze_report_id, discharge.freezeReportId],
    ["discharge freeze report digest", row.freeze_report_digest, discharge.freezeReportDigest],
    ["discharge event", row.event_id, discharge.eventId],
    ["discharge time", row.discharged_at, discharge.dischargedAt],
    ["discharge reason", row.reason_code, discharge.reasonCode],
  ];
  for (const [name, actual, expected] of fields) same(name, actual, expected);
  same(
    "structured discharge deterministic ID",
    discharge.dischargeId,
    structuredObligationDischargeId(discharge),
  );
  return { discharge, dischargeDigest: digest };
}

export class StructuredObligationInspectionStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { readOnly: true, storeName: "StructuredObligationInspectionStore" });
  }

  close() {
    this.#database.close();
  }

  queryOnly() {
    return true;
  }

  #requireThread(threadId) {
    assertId("threadId", threadId);
    if (this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(threadId) === undefined) {
      throw new StructuredObligationInspectionNotFoundError(`Thread ${threadId} was not found`);
    }
  }

  #history(threadId, obligationId, { required = true } = {}) {
    this.#requireThread(threadId);
    assertObligationId(obligationId);
    const rows = this.#database.prepare(`
      SELECT obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
        supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
        legacy_source_digest,recorded_at
      FROM obligation_records
      WHERE thread_id=? AND obligation_id=?
      ORDER BY revision
    `).all(threadId, obligationId);
    if (rows.length === 0) {
      const foreign = this.#database.prepare(
        "SELECT thread_id FROM obligation_records WHERE obligation_id=? LIMIT 1",
      ).get(obligationId);
      if (required || foreign !== undefined) {
        throw new StructuredObligationInspectionNotFoundError(
          `Structured Obligation ${obligationId} was not found for Thread ${threadId}`,
        );
      }
      return [];
    }
    const history = rows.map(rowToObligationRevision);
    assertHistory(history, threadId, obligationId);
    for (const revision of history) {
      if (revision.obligation.status !== "discharged") continue;
      const witnesses = this.#database.prepare(`
        SELECT discharge_id,terminal_obligation_digest
        FROM structured_obligation_discharges
        WHERE thread_id=? AND obligation_id=? AND terminal_revision=?
      `).all(threadId, obligationId, revision.obligation.revision);
      if (witnesses.length !== 1) {
        throw new IntegrityError(
          `discharged obligation ${obligationId} revision ${revision.obligation.revision} must have exactly one discharge witness`,
        );
      }
      same(
        "discharged revision witness digest",
        witnesses[0].terminal_obligation_digest,
        revision.obligationDigest,
      );
    }
    return history;
  }

  #applicabilityRows(whereSql, params) {
    const rows = this.#database.prepare(`
      SELECT applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
        request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
        nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
        decision_json,decision_digest,decided_at,causation_id,correlation_id
      FROM obligation_applicability_decisions
      WHERE ${whereSql}
      ORDER BY decided_at,applicability_id
    `).all(...params);
    return rows.map((row) => {
      const record = rowToApplicability(row);
      const request = this.#database.prepare(`
        SELECT snapshot_version,thread_state_hash,request_fingerprint
        FROM activation_requests
        WHERE thread_id=? AND request_id=?
      `).get(record.decision.threadId, record.decision.requestId);
      if (request === undefined) {
        throw new IntegrityError(`applicability ${record.decision.applicabilityId} lost its activation request`);
      }
      same("applicability request snapshot", Number(request.snapshot_version), record.decision.snapshotVersion);
      same("applicability request state", request.thread_state_hash, record.decision.threadStateHash);
      same("applicability request fingerprint", request.request_fingerprint, record.decision.requestFingerprint);
      const obligation = this.#database.prepare(`
        SELECT obligation_json,obligation_digest,legacy_source_digest
        FROM obligation_records
        WHERE thread_id=? AND obligation_id=? AND revision=?
      `).get(
        record.decision.threadId,
        record.decision.obligationId,
        record.decision.obligationRevision,
      );
      if (obligation === undefined) {
        throw new IntegrityError(`applicability ${record.decision.applicabilityId} lost its obligation revision`);
      }
      const persistedObligation = normalizeStructuredObligation(
        parseJson(
          `applicability ${record.decision.applicabilityId} obligation revision`,
          obligation.obligation_json,
        ),
      );
      same(
        "applicability obligation content digest",
        obligation.obligation_digest,
        structuredObligationDigest(persistedObligation),
      );
      same("applicability stored obligation digest", obligation.obligation_digest, record.decision.obligationDigest);
      const legacyTombstoned = obligation.legacy_source_digest !== null &&
        this.#database.prepare(`
          SELECT 1 AS present FROM legacy_obligation_tombstones
          WHERE thread_id=? AND legacy_reference_digest=?
        `).get(record.decision.threadId, obligation.legacy_source_digest) !== undefined;
      const derived = deterministicApplicability(persistedObligation, {
        threadId: record.decision.threadId,
        requestFingerprint: record.decision.requestFingerprint,
        decidedAt: record.decision.decidedAt,
        legacyTombstoned,
      });
      same("applicability derived result", record.decision.result, derived.result);
      same("applicability derived reason", record.decision.reasonCode, derived.reasonCode);
      return record;
    });
  }

  #dischargeRows(whereSql, params) {
    const rows = this.#database.prepare(`
      SELECT discharge_id,thread_id,obligation_id,prior_revision,prior_obligation_digest,
        terminal_revision,terminal_obligation_digest,applicability_id,
        applicability_decision_digest,authorization_id,authorization_digest,
        authorization_consumption_digest,session_id,request_id,freeze_operation_id,
        freeze_report_id,freeze_report_digest,event_id,discharged_at,reason_code,
        discharge_json,discharge_digest
      FROM structured_obligation_discharges
      WHERE ${whereSql}
      ORDER BY discharged_at,discharge_id
    `).all(...params);
    return rows.map((row) => this.#verifyDischarge(rowToDischarge(row)));
  }

  #verifyDischarge(record) {
    const discharge = record.discharge;
    const history = this.#history(discharge.threadId, discharge.obligationId);
    const prior = history[discharge.priorRevision - 1];
    const terminal = history[discharge.terminalRevision - 1];
    if (prior === undefined || terminal === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost obligation history`);
    }
    same("discharge prior obligation digest", prior.obligationDigest, discharge.priorObligationDigest);
    same("discharge terminal obligation digest", terminal.obligationDigest, discharge.terminalObligationDigest);
    same("discharge prior status", prior.obligation.status, "active");
    same("discharge terminal status", terminal.obligation.status, "discharged");
    same("discharge terminal predecessor", terminal.obligation.supersedesRevision, discharge.priorRevision);
    same("discharge terminal recordedAt", terminal.recordedAt, discharge.dischargedAt);

    const applicabilityRow = this.#database.prepare(`
      SELECT applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
        request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
        nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
        decision_json,decision_digest,decided_at,causation_id,correlation_id
      FROM obligation_applicability_decisions WHERE applicability_id=?
    `).get(discharge.applicabilityId);
    if (applicabilityRow === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost applicability evidence`);
    }
    const applicability = rowToApplicability(applicabilityRow);
    same("discharge applicability digest", applicability.decisionDigest, discharge.applicabilityDecisionDigest);
    same("discharge applicability result", applicability.decision.result, "applies");
    same("discharge applicability Thread", applicability.decision.threadId, discharge.threadId);
    same("discharge applicability request", applicability.decision.requestId, discharge.requestId);
    same("discharge applicability obligation", applicability.decision.obligationId, discharge.obligationId);
    same("discharge applicability revision", applicability.decision.obligationRevision, discharge.priorRevision);
    same("discharge applicability obligation digest", applicability.decision.obligationDigest, discharge.priorObligationDigest);

    const authorizationRow = this.#database.prepare(`
      SELECT authorization_id,thread_id,request_id,authorization_json,authorization_digest
      FROM participation_authorizations WHERE authorization_id=?
    `).get(discharge.authorizationId);
    if (authorizationRow === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost authorization evidence`);
    }
    const authorization = parseJson(
      `authorization ${discharge.authorizationId}`,
      authorizationRow.authorization_json,
    );
    assertPlainObject("structured authorization", authorization);
    assertExactKeys("structured authorization", authorization, STRUCTURED_AUTHORIZATION_KEYS);
    assertPlainObject("structured authorization applicability", authorization.applicability);
    assertExactKeys(
      "structured authorization applicability",
      authorization.applicability,
      STRUCTURED_APPLICABILITY_BINDING_KEYS,
    );
    assertPlainObject("structured authorization applicability policy", authorization.applicability.policy);
    assertExactKeys("structured authorization applicability policy", authorization.applicability.policy, ["id", "version"]);
    if (authorization.authorizedAction !== "accept" || authorization.participationBasis !== "obligation_override") {
      throw new IntegrityError(`authorization ${discharge.authorizationId} is not structured compelled authority`);
    }
    if (!Array.isArray(authorization.obligationReferences) || authorization.obligationReferences.length !== 0) {
      throw new IntegrityError(`authorization ${discharge.authorizationId} carries legacy obligation authority`);
    }
    same("authorization canonical JSON", authorizationRow.authorization_json, canonicalJson(authorization));
    same("authorization content digest", authorizationRow.authorization_digest, authorizationDigest(authorization));
    same("discharge authorization digest", authorizationRow.authorization_digest, discharge.authorizationDigest);
    same("discharge authorization Thread", authorizationRow.thread_id, discharge.threadId);
    same("discharge authorization request", authorizationRow.request_id, discharge.requestId);
    same("discharge participation basis", authorization.participationBasis, "obligation_override");
    same("discharge authorization applicability ID", authorization.applicability?.applicabilityId, discharge.applicabilityId);
    same("discharge authorization applicability digest", authorization.applicability?.decisionDigest, discharge.applicabilityDecisionDigest);
    same("discharge authorization obligation", authorization.applicability?.obligationId, discharge.obligationId);
    same("discharge authorization obligation revision", authorization.applicability?.obligationRevision, discharge.priorRevision);
    same("discharge authorization obligation digest", authorization.applicability?.obligationDigest, discharge.priorObligationDigest);

    const consumptionRow = this.#database.prepare(`
      SELECT authorization_id,operation_id,operation_digest,session_id,thread_id,request_id,
        event_id,consumed_at,obligation_refs_json,consumption_digest
      FROM authorization_consumptions WHERE authorization_id=?
    `).get(discharge.authorizationId);
    if (consumptionRow === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost authorization consumption`);
    }
    const obligationReferences = parseJson(
      `authorization consumption ${discharge.authorizationId} obligation refs`,
      consumptionRow.obligation_refs_json,
    );
    const consumption = {
      authorizationId: consumptionRow.authorization_id,
      operationId: consumptionRow.operation_id,
      operationDigest: consumptionRow.operation_digest,
      sessionId: consumptionRow.session_id,
      threadId: consumptionRow.thread_id,
      requestId: consumptionRow.request_id,
      eventId: consumptionRow.event_id,
      consumedAt: consumptionRow.consumed_at,
      obligationReferences,
    };
    same("consumption canonical obligation refs", consumptionRow.obligation_refs_json, canonicalJson(obligationReferences));
    same("consumption content digest", consumptionRow.consumption_digest, authorizationConsumptionDigest(consumption));
    same("discharge consumption digest", consumptionRow.consumption_digest, discharge.authorizationConsumptionDigest);
    same("discharge consumption operation", consumptionRow.operation_id, discharge.freezeOperationId);
    same("discharge consumption session", consumptionRow.session_id, discharge.sessionId);
    same("discharge consumption Thread", consumptionRow.thread_id, discharge.threadId);
    same("discharge consumption request", consumptionRow.request_id, discharge.requestId);
    same("discharge consumption event", consumptionRow.event_id, discharge.eventId);
    same("structured consumption legacy refs", canonicalJson(obligationReferences), "[]");

    const runtime = this.#database.prepare(`
      SELECT authorization_id,thread_id,request_id,status
      FROM runtime_sessions WHERE session_id=?
    `).get(discharge.sessionId);
    if (runtime === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost runtime evidence`);
    }
    same("discharge runtime authorization", runtime.authorization_id, discharge.authorizationId);
    same("discharge runtime Thread", runtime.thread_id, discharge.threadId);
    same("discharge runtime request", runtime.request_id, discharge.requestId);
    same("discharge runtime status", runtime.status, "completed");

    const freezeRow = this.#database.prepare(`
      SELECT report_id,operation_id,session_id,thread_id,request_id,authorization_id,event_id,
        report_json,report_digest,completed_at
      FROM freeze_reports WHERE report_id=?
    `).get(discharge.freezeReportId);
    if (freezeRow === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost freeze evidence`);
    }
    const freezeReport = parseJson(`freeze report ${discharge.freezeReportId}`, freezeRow.report_json);
    assertPlainObject("structured discharge freeze report", freezeReport);
    assertExactKeys("structured discharge freeze report", freezeReport, FREEZE_REPORT_KEYS);
    assertIsoTimestamp("structured discharge freeze completedAt", freezeReport.completedAt);
    if (!Array.isArray(freezeReport.dischargedObligations) || freezeReport.dischargedObligations.length !== 0) {
      throw new IntegrityError(`freeze report ${discharge.freezeReportId} mixes legacy prose discharge with structured discharge`);
    }
    same("freeze report canonical JSON", freezeRow.report_json, canonicalJson(freezeReport));
    same("freeze report content digest", freezeRow.report_digest, freezeReportDigest(freezeReport));
    same("discharge freeze report digest", freezeRow.report_digest, discharge.freezeReportDigest);
    same("discharge freeze operation", freezeRow.operation_id, discharge.freezeOperationId);
    same("discharge freeze session", freezeRow.session_id, discharge.sessionId);
    same("discharge freeze Thread", freezeRow.thread_id, discharge.threadId);
    same("discharge freeze request", freezeRow.request_id, discharge.requestId);
    same("discharge freeze authorization", freezeRow.authorization_id, discharge.authorizationId);
    same("discharge freeze event", freezeRow.event_id, discharge.eventId);
    same("discharge freeze time", freezeRow.completed_at, discharge.dischargedAt);

    const event = this.#database.prepare(`
      SELECT thread_id,event_id,event_type,command_id,authorization_id,payload_json,occurred_at
      FROM thread_events WHERE event_id=?
    `).get(discharge.eventId);
    if (event === undefined) {
      throw new IntegrityError(`discharge ${discharge.dischargeId} lost freeze event`);
    }
    const eventPayload = parseJson(`freeze event ${discharge.eventId}`, event.payload_json);
    same("freeze event canonical payload", event.payload_json, canonicalJson(eventPayload));
    same("discharge event Thread", event.thread_id, discharge.threadId);
    same("discharge event type", event.event_type, "THREAD_FROZEN");
    same("discharge event command", event.command_id, discharge.freezeOperationId);
    same("discharge event authorization", event.authorization_id, discharge.authorizationId);
    same("discharge event report", eventPayload.freezeReportId, discharge.freezeReportId);
    same("discharge event report digest", eventPayload.freezeReportDigest, discharge.freezeReportDigest);
    same("discharge event session", eventPayload.sessionId, discharge.sessionId);
    same("discharge event request", eventPayload.requestId, discharge.requestId);
    same("discharge event time", event.occurred_at, discharge.dischargedAt);

    return {
      ...record,
      causalChainVerified: true,
    };
  }

  listThreadIds() {
    return this.#database.prepare("SELECT thread_id FROM threads ORDER BY thread_id")
      .all().map((row) => row.thread_id);
  }

  listObligations(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare(`
      SELECT DISTINCT obligation_id FROM obligation_records
      WHERE thread_id=? ORDER BY obligation_id
    `).all(threadId).map((row) => row.obligation_id);
    return ids.map((obligationId) => {
      const history = this.#history(threadId, obligationId);
      const current = history[history.length - 1];
      const discharges = this.#dischargeRows(
        "thread_id=? AND obligation_id=?",
        [threadId, obligationId],
      );
      return {
        obligationId,
        currentRevision: current.obligation.revision,
        status: current.obligation.status,
        issuer: structuredClone(current.obligation.issuer),
        effectiveAt: current.obligation.effectiveAt,
        expiresAt: current.obligation.expiresAt ?? null,
        standingVisibility: current.obligation.visibility.standing,
        termsVisibility: current.obligation.visibility.terms,
        obligationDigest: current.obligationDigest,
        revisionCount: history.length,
        dischargeCount: discharges.length,
        dischargedAt: discharges.at(-1)?.discharge.dischargedAt ?? null,
      };
    });
  }

  inspectObligation(threadId, obligationId) {
    const history = this.#history(threadId, obligationId);
    const applicability = this.#applicabilityRows(
      "thread_id=? AND obligation_id=?",
      [threadId, obligationId],
    );
    const discharges = this.#dischargeRows(
      "thread_id=? AND obligation_id=?",
      [threadId, obligationId],
    );
    return {
      obligationId,
      current: history.at(-1),
      history,
      applicability,
      discharges,
      integrity: {
        ok: true,
        revisionChainVerified: true,
        applicabilityBindingsVerified: true,
        dischargeCausalChainsVerified: discharges.every((item) => item.causalChainVerified),
      },
    };
  }

  listRequestApplicability(threadId, requestId) {
    this.#requireThread(threadId);
    assertId("requestId", requestId);
    const request = this.#database.prepare(
      "SELECT 1 AS present FROM activation_requests WHERE thread_id=? AND request_id=?",
    ).get(threadId, requestId);
    if (request === undefined) {
      throw new StructuredObligationInspectionNotFoundError(
        `activation request ${requestId} was not found for Thread ${threadId}`,
      );
    }
    return this.#applicabilityRows("thread_id=? AND request_id=?", [threadId, requestId]);
  }

  getRuntimeDischarge(threadId, sessionId) {
    this.#requireThread(threadId);
    assertId("sessionId", sessionId);
    const runtime = this.#database.prepare(
      "SELECT 1 AS present FROM runtime_sessions WHERE thread_id=? AND session_id=?",
    ).get(threadId, sessionId);
    if (runtime === undefined) {
      throw new StructuredObligationInspectionNotFoundError(
        `runtime session ${sessionId} was not found for Thread ${threadId}`,
      );
    }
    const rows = this.#dischargeRows("thread_id=? AND session_id=?", [threadId, sessionId]);
    if (rows.length > 1) {
      throw new IntegrityError(`runtime session ${sessionId} has multiple Structured Obligation discharges`);
    }
    return rows[0] ?? null;
  }

  getRuntimeAuthorityWithdrawal(threadId, sessionId) {
    this.#requireThread(threadId);
    assertId("sessionId", sessionId);
    const row = this.#database.prepare(`
      SELECT * FROM structured_authority_withdrawal_closures
      WHERE thread_id=? AND session_id=?
    `).get(threadId, sessionId);
    if (row === undefined) return null;
    const closure = normalizeStructuredAuthorityWithdrawal(
      parseJson(`authority withdrawal ${row.closure_id}`, row.closure_json),
    );
    same("authority withdrawal canonical JSON", row.closure_json, canonicalJson(closure));
    same("authority withdrawal digest", row.closure_digest, structuredAuthorityWithdrawalDigest(closure));
    same("authority withdrawal Thread", row.thread_id, closure.threadId);
    same("authority withdrawal session", row.session_id, closure.sessionId);
    same("authority withdrawal reason", closure.reasonCode, "governing_authority_withdrawn");
    const runtime = this.#database.prepare(`
      SELECT s.status,l.status AS lease_status,l.release_reason,a.authorization_json,a.authorization_digest,
        ar.actor_run_id,ar.output_digest,ga.audit_id,ga.audit_digest,ga.audit_json
      FROM runtime_sessions s
      JOIN thaw_leases l ON l.lease_id=s.lease_id
      JOIN participation_authorizations a ON a.authorization_id=s.authorization_id
      LEFT JOIN actor_runs ar ON ar.session_id=s.session_id
      LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
      WHERE s.thread_id=? AND s.session_id=?
    `).get(threadId, sessionId);
    if (runtime === undefined) throw new IntegrityError(`authority withdrawal ${closure.closureId} lost runtime evidence`);
    const authorization = parseJson(`authority withdrawal authorization ${closure.authorizationId}`, runtime.authorization_json);
    same("authority withdrawal authorization digest", runtime.authorization_digest, authorizationDigest(authorization));
    same("authority withdrawal authorization ID", authorization.authorizationId, closure.authorizationId);
    same("authority withdrawal participation basis", authorization.participationBasis, "obligation_override");
    same("authority withdrawal applicability", authorization.applicability.applicabilityId, closure.applicabilityId);
    same("authority withdrawal obligation", authorization.applicability.obligationId, closure.obligationId);
    same("authority withdrawal Actor", runtime.actor_run_id, closure.actorRunId);
    same("authority withdrawal Actor digest", runtime.output_digest, closure.actorOutputDigest);
    same("authority withdrawal Guardian", runtime.audit_id, closure.guardianAuditId);
    same("authority withdrawal Guardian digest", runtime.audit_digest, closure.guardianAuditDigest);
    const audit = parseJson(`authority withdrawal Guardian ${closure.guardianAuditId}`, runtime.audit_json);
    same("authority withdrawal Guardian decision", audit.decision, "pass");
    same("authority withdrawal runtime status", runtime.status, "aborted");
    same("authority withdrawal lease status", runtime.lease_status, "released");
    same("authority withdrawal lease reason", runtime.release_reason, "governing_authority_withdrawn");
    if (this.#database.prepare("SELECT 1 AS present FROM authorization_consumptions WHERE authorization_id=?").get(closure.authorizationId) !== undefined) {
      throw new IntegrityError(`authority withdrawal ${closure.closureId} unexpectedly consumed authorization`);
    }
    if (this.#database.prepare("SELECT 1 AS present FROM freeze_reports WHERE session_id=?").get(sessionId) !== undefined) {
      throw new IntegrityError(`authority withdrawal ${closure.closureId} unexpectedly has freeze evidence`);
    }
    const currentRow = this.#database.prepare(`
      SELECT obligation_json,obligation_digest FROM obligation_records
      WHERE thread_id=? AND obligation_id=? ORDER BY revision DESC LIMIT 1
    `).get(threadId, closure.obligationId);
    if (currentRow === undefined) throw new IntegrityError(`authority withdrawal ${closure.closureId} lost current obligation`);
    const current = normalizeStructuredObligation(parseJson("authority withdrawal current obligation", currentRow.obligation_json));
    same("authority withdrawal current obligation digest", currentRow.obligation_digest, structuredObligationDigest(current));
    same("authority withdrawal current revision", current.revision, closure.currentObligationRevision);
    same("authority withdrawal current digest witness", currentRow.obligation_digest, closure.currentObligationDigest);
    same("authority withdrawal current status", current.status, closure.currentObligationStatus);

    let historyEventVerified = null;
    if (closure.historyProfileVersion !== undefined) {
      same(
        "authority withdrawal history profile",
        closure.historyProfileVersion,
        COMPELLED_EPISODE_HISTORY_PROFILE_VERSION,
      );
      const expectedEventId = interruptedCompelledEpisodeEventId(closure.closureId);
      same("authority withdrawal Thread event", closure.threadEventId, expectedEventId);
      const eventRow = this.#database.prepare(`
        SELECT event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        FROM thread_events WHERE event_id=? AND thread_id=?
      `).get(expectedEventId, threadId);
      if (eventRow === undefined) {
        throw new IntegrityError(`authority withdrawal ${closure.closureId} lost its Thread life event`);
      }
      const event = rowToEvent(eventRow);
      same("authority withdrawal event type", event.eventType, "COMPELLED_EPISODE_INTERRUPTED");
      same("authority withdrawal event time", event.occurredAt, closure.closedAt);
      same("authority withdrawal event authorization privacy", event.authorizationId, null);
      same("authority withdrawal event payload", canonicalJson(event.payload), canonicalJson(interruptedCompelledEpisodePayload()));
      same("authority withdrawal event actor", canonicalJson(event.actor), canonicalJson(interruptedCompelledEpisodeActor()));
      same("authority withdrawal event provenance", canonicalJson(event.provenance), canonicalJson(interruptedCompelledEpisodeProvenance()));
      same("authority withdrawal event version step", event.resultingVersion, event.expectedVersion + 1);
      const expectedCommandId = interruptedCompelledEpisodeCommandId(closure.closureId);
      const expectedCommandDigest = interruptedCompelledEpisodeCommandDigest({
        closureId: closure.closureId,
        threadId,
        eventId: expectedEventId,
        commandId: expectedCommandId,
        occurredAt: closure.closedAt,
      });
      same("authority withdrawal event command", event.commandId, expectedCommandId);
      same("authority withdrawal event command digest", event.commandDigest, expectedCommandDigest);
      const command = this.#database.prepare(`
        SELECT command_digest,expected_version,resulting_version,event_id,created_at
        FROM commands WHERE thread_id=? AND command_id=?
      `).get(threadId, expectedCommandId);
      if (command === undefined) {
        throw new IntegrityError(`authority withdrawal ${closure.closureId} lost its Thread event command witness`);
      }
      same("authority withdrawal command digest", command.command_digest, expectedCommandDigest);
      same("authority withdrawal command expected version", Number(command.expected_version), event.expectedVersion);
      same("authority withdrawal command resulting version", Number(command.resulting_version), event.resultingVersion);
      same("authority withdrawal command event", command.event_id, expectedEventId);
      same("authority withdrawal command time", command.created_at, closure.closedAt);
      historyEventVerified = true;
    }
    return {
      closure,
      closureDigest: row.closure_digest,
      causalChainVerified: true,
      historyEventVerified,
    };
  }

  listAuthorityWithdrawals(threadId) {
    this.#requireThread(threadId);
    const sessions = this.#database.prepare(`
      SELECT session_id FROM structured_authority_withdrawal_closures
      WHERE thread_id=? ORDER BY closed_at,closure_id
    `).all(threadId);
    return sessions.map((row) => this.getRuntimeAuthorityWithdrawal(threadId, row.session_id));
  }

  verifyThread(threadId) {
    this.#requireThread(threadId);
    const obligations = this.listObligations(threadId);
    const applicability = this.#applicabilityRows("thread_id=?", [threadId]);
    const discharges = this.#dischargeRows("thread_id=?", [threadId]);
    const authorityWithdrawals = this.listAuthorityWithdrawals(threadId);
    const historyVisibleAuthorityWithdrawals = authorityWithdrawals.filter(
      (item) => item.historyEventVerified === true,
    ).length;
    return {
      ok: true,
      threadId,
      queryOnly: this.queryOnly(),
      obligations: obligations.length,
      applicabilityDecisions: applicability.length,
      discharges: discharges.length,
      authorityWithdrawals: authorityWithdrawals.length,
      historyVisibleAuthorityWithdrawals,
      legacyAuthorityWithdrawalsWithoutHistoryEvent:
        authorityWithdrawals.length - historyVisibleAuthorityWithdrawals,
      revisionChainsVerified: true,
      applicabilityBindingsVerified: true,
      dischargeCausalChainsVerified: discharges.every((item) => item.causalChainVerified),
      authorityWithdrawalCausalChainsVerified:
        authorityWithdrawals.every((item) => item.causalChainVerified),
      authorityWithdrawalHistoryEventsVerified:
        authorityWithdrawals.every((item) => item.historyEventVerified !== false),
    };
  }
}

export function openStructuredObligationInspectionStore(storage) {
  return new StructuredObligationInspectionStore(storage);
}
