import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateStoredThread } from "./persistence-domain.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  actorOutputDigest,
  authorizationDigest,
  guardianAuditDigest,
  newOpaqueId,
} from "./runtime-domain.mjs";
import { applicabilityDecisionDigest } from "./obligation-schema.mjs";
import {
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "./obligation-domain.mjs";
import {
  STRUCTURED_AUTHORITY_WITHDRAWAL_REASON,
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

export class StructuredAuthorityWithdrawalNotFoundError extends Error {}
export class StructuredAuthorityWithdrawalConflictError extends Error {}
export class StructuredAuthorityWithdrawalRejectedError extends Error {}

function parseJson(name, text) {
  try { return JSON.parse(text); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function same(name, left, right) {
  if (left !== right) throw new IntegrityError(`${name} does not match persisted evidence`);
}

function operationDigest(input) {
  return `sha256:${sha256(canonicalJson({
    kind: "structured_authority_withdrawal/1",
    operationId: input.operationId,
    threadId: input.threadId,
    sessionId: input.sessionId,
    causationId: input.causationId,
    correlationId: input.correlationId,
  }))}`;
}

function causeFor(current, authorizedRevision, closedAt, legacyTombstoned) {
  if (current.revision !== authorizedRevision) return "superseded";
  if (current.status !== "active") return "status_changed";
  if (current.expiresAt !== undefined && Date.parse(closedAt) >= Date.parse(current.expiresAt)) {
    return "expired";
  }
  if (legacyTombstoned) return "legacy_tombstoned";
  return null;
}

export class StructuredAuthorityWithdrawalStore {
  #database;

  constructor(databasePath) {
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    try { migrateDatabase(this.#database); }
    catch (error) { this.#database.close(); throw error; }
  }

  close() { this.#database.close(); }

  #rowByOperation(operationId) {
    return this.#database.prepare(
      "SELECT * FROM structured_authority_withdrawal_closures WHERE operation_id=?",
    ).get(operationId);
  }

  #rowBySession(threadId, sessionId) {
    return this.#database.prepare(
      "SELECT * FROM structured_authority_withdrawal_closures WHERE thread_id=? AND session_id=?",
    ).get(threadId, sessionId);
  }

  #decode(row) {
    if (row === undefined) return null;
    const closure = normalizeStructuredAuthorityWithdrawal(
      parseJson(`authority withdrawal ${row.closure_id}`, row.closure_json),
    );
    same("authority withdrawal canonical JSON", row.closure_json, canonicalJson(closure));
    same("authority withdrawal digest", row.closure_digest, structuredAuthorityWithdrawalDigest(closure));
    for (const [name, left, right] of [
      ["closure ID", row.closure_id, closure.closureId],
      ["operation", row.operation_id, closure.operationId],
      ["Thread", row.thread_id, closure.threadId],
      ["session", row.session_id, closure.sessionId],
      ["request", row.request_id, closure.requestId],
      ["authorization", row.authorization_id, closure.authorizationId],
      ["authorization digest", row.authorization_digest, closure.authorizationDigest],
      ["applicability", row.applicability_id, closure.applicabilityId],
      ["applicability digest", row.applicability_decision_digest, closure.applicabilityDecisionDigest],
      ["obligation", row.obligation_id, closure.obligationId],
      ["authorized obligation digest", row.authorized_obligation_digest, closure.authorizedObligationDigest],
      ["current obligation digest", row.current_obligation_digest, closure.currentObligationDigest],
      ["current obligation status", row.current_obligation_status, closure.currentObligationStatus],
      ["Actor run", row.actor_run_id, closure.actorRunId],
      ["Actor output digest", row.actor_output_digest, closure.actorOutputDigest],
      ["Guardian audit", row.guardian_audit_id, closure.guardianAuditId],
      ["Guardian audit digest", row.guardian_audit_digest, closure.guardianAuditDigest],
      ["withdrawal cause", row.withdrawal_cause, closure.withdrawalCause],
      ["reason", row.reason_code, closure.reasonCode],
      ["closedAt", row.closed_at, closure.closedAt],
    ]) same(`authority withdrawal ${name}`, left, right);
    same("authorized obligation revision", Number(row.authorized_obligation_revision), closure.authorizedObligationRevision);
    same("current obligation revision", Number(row.current_obligation_revision), closure.currentObligationRevision);
    return { closure, closureDigest: row.closure_digest, operationDigest: row.operation_digest };
  }

  getClosure(threadId, sessionId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const value = this.#decode(this.#rowBySession(threadId, sessionId));
    if (value === null && required) {
      throw new StructuredAuthorityWithdrawalNotFoundError(
        `authority-withdrawal closure was not found for runtime ${sessionId}`,
      );
    }
    return value;
  }

  closeWithdrawnAuthority(input) {
    assertPlainObject("authority withdrawal input", input);
    assertExactKeys("authority withdrawal input", input, [
      "operationId", "threadId", "sessionId", "closedAt", "causationId", "correlationId",
    ]);
    for (const key of ["operationId", "threadId", "sessionId", "causationId", "correlationId"]) {
      assertId(`authority withdrawal ${key}`, input[key]);
    }
    assertIsoTimestamp("authority withdrawal closedAt", input.closedAt);
    const expectedOperationDigest = operationDigest(input);
    const priorRow = this.#rowByOperation(input.operationId);
    if (priorRow !== undefined) {
      if (priorRow.operation_digest !== expectedOperationDigest) {
        throw new StructuredAuthorityWithdrawalConflictError(
          `authority-withdrawal operation ${input.operationId} was already used with different input`,
        );
      }
      return { ...this.#decode(priorRow), idempotent: true };
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const raced = this.#rowByOperation(input.operationId);
      if (raced !== undefined) {
        if (raced.operation_digest !== expectedOperationDigest) {
          throw new StructuredAuthorityWithdrawalConflictError(
            `authority-withdrawal operation ${input.operationId} raced with different input`,
          );
        }
        this.#database.exec("COMMIT");
        return { ...this.#decode(raced), idempotent: true };
      }
      const existingSession = this.#rowBySession(input.threadId, input.sessionId);
      if (existingSession !== undefined) {
        throw new StructuredAuthorityWithdrawalConflictError(
          `runtime ${input.sessionId} already has an authority-withdrawal closure`,
        );
      }

      const runtime = this.#database.prepare(`
        SELECT s.request_id,s.authorization_id,s.lease_id,s.status AS session_status,
          l.status AS lease_status,l.acquired_at,l.expires_at,
          a.authorization_json,a.authorization_digest,
          ar.actor_run_id,ar.output_json,ar.output_digest,
          ga.audit_id,ga.audit_json,ga.audit_digest
        FROM runtime_sessions s
        JOIN thaw_leases l ON l.lease_id=s.lease_id
        JOIN participation_authorizations a ON a.authorization_id=s.authorization_id
        LEFT JOIN actor_runs ar ON ar.session_id=s.session_id
        LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
        WHERE s.thread_id=? AND s.session_id=?
      `).get(input.threadId, input.sessionId);
      if (runtime === undefined) {
        throw new StructuredAuthorityWithdrawalNotFoundError(
          `runtime ${input.sessionId} was not found for Thread ${input.threadId}`,
        );
      }
      if (runtime.session_status !== "active" || runtime.lease_status !== "active") {
        throw new StructuredAuthorityWithdrawalRejectedError("authority withdrawal requires an active runtime and lease");
      }
      if (Date.parse(input.closedAt) < Date.parse(runtime.acquired_at)) {
        throw new StructuredAuthorityWithdrawalRejectedError("authority withdrawal cannot predate lease acquisition");
      }
      if (runtime.actor_run_id === null || runtime.audit_id === null) {
        throw new StructuredAuthorityWithdrawalRejectedError("authority withdrawal requires completed Actor and Goal Guardian evidence");
      }
      const authorization = parseJson(`authorization ${runtime.authorization_id}`, runtime.authorization_json);
      same("authorization digest", runtime.authorization_digest, authorizationDigest(authorization));
      if (authorization.participationBasis !== "obligation_override" || authorization.applicability === null) {
        throw new StructuredAuthorityWithdrawalRejectedError("authority withdrawal applies only to structured compelled participation");
      }
      const applicability = this.#database.prepare(`
        SELECT decision_json,decision_digest FROM obligation_applicability_decisions
        WHERE applicability_id=?
      `).get(authorization.applicability.applicabilityId);
      if (applicability === undefined) throw new IntegrityError("structured authorization lost applicability evidence");
      const decision = parseJson("authority-withdrawal applicability", applicability.decision_json);
      same("applicability digest", applicability.decision_digest, applicabilityDecisionDigest(decision));
      if (decision.result !== "applies") throw new IntegrityError("structured authorization references non-applicable evidence");

      const actorOutput = parseJson(`Actor output ${runtime.actor_run_id}`, runtime.output_json);
      same("Actor output digest", runtime.output_digest, actorOutputDigest(actorOutput));
      const guardianAudit = parseJson(`Goal Guardian audit ${runtime.audit_id}`, runtime.audit_json);
      same("Goal Guardian audit digest", runtime.audit_digest, guardianAuditDigest(guardianAudit));
      if (guardianAudit.decision !== "pass") {
        throw new StructuredAuthorityWithdrawalRejectedError("Goal Guardian reject uses the historical rejection-abandonment path");
      }
      for (const [table, column] of [
        ["authorization_consumptions", "authorization_id"],
        ["freeze_reports", "session_id"],
        ["structured_obligation_discharges", "session_id"],
      ]) {
        if (this.#database.prepare(`SELECT 1 AS present FROM ${table} WHERE ${column}=?`).get(
          table === "authorization_consumptions" ? runtime.authorization_id : input.sessionId,
        ) !== undefined) {
          throw new StructuredAuthorityWithdrawalRejectedError("runtime already changed authoritative state");
        }
      }

      const authorizedRevision = Number(authorization.applicability.obligationRevision);
      const authorizedRow = this.#database.prepare(`
        SELECT obligation_json,obligation_digest FROM obligation_records
        WHERE thread_id=? AND obligation_id=? AND revision=?
      `).get(input.threadId, authorization.applicability.obligationId, authorizedRevision);
      if (authorizedRow === undefined) throw new IntegrityError("structured authorization lost its obligation revision");
      const authorizedObligation = normalizeStructuredObligation(parseJson("authorized obligation", authorizedRow.obligation_json));
      same("authorized obligation digest", authorizedRow.obligation_digest, structuredObligationDigest(authorizedObligation));
      same("authorization obligation digest", authorizedRow.obligation_digest, authorization.applicability.obligationDigest);

      const currentRow = this.#database.prepare(`
        SELECT obligation_json,obligation_digest,recorded_at
        FROM obligation_records WHERE thread_id=? AND obligation_id=?
        ORDER BY revision DESC LIMIT 1
      `).get(input.threadId, authorization.applicability.obligationId);
      if (currentRow === undefined) throw new IntegrityError("structured obligation disappeared before authority-withdrawal closure");
      if (Date.parse(currentRow.recorded_at) > Date.parse(input.closedAt)) {
        throw new IntegrityError("current Structured Obligation revision postdates authority-withdrawal closure");
      }
      const current = normalizeStructuredObligation(parseJson("current obligation", currentRow.obligation_json));
      same("current obligation digest", currentRow.obligation_digest, structuredObligationDigest(current));

      const eligibilityAt = new Date(Math.min(
        Date.parse(input.closedAt),
        Date.parse(runtime.expires_at),
      )).toISOString();
      const causalRow = this.#database.prepare(`
        SELECT obligation_json,obligation_digest,legacy_source_digest
        FROM obligation_records
        WHERE thread_id=? AND obligation_id=? AND julianday(recorded_at)<=julianday(?)
        ORDER BY revision DESC LIMIT 1
      `).get(input.threadId, authorization.applicability.obligationId, eligibilityAt);
      if (causalRow === undefined) throw new IntegrityError("structured obligation has no causal revision at withdrawal boundary");
      const causalObligation = normalizeStructuredObligation(
        parseJson("causal obligation at authority-withdrawal boundary", causalRow.obligation_json),
      );
      same("causal obligation digest", causalRow.obligation_digest, structuredObligationDigest(causalObligation));
      const causalTombstoned = causalRow.legacy_source_digest !== null &&
        this.#database.prepare(`
          SELECT 1 AS present FROM legacy_obligation_tombstones
          WHERE thread_id=? AND legacy_reference_digest=? AND julianday(consumed_at)<=julianday(?)
        `).get(input.threadId, causalRow.legacy_source_digest, eligibilityAt) !== undefined;
      const withdrawalCause = causeFor(
        causalObligation,
        authorizedRevision,
        eligibilityAt,
        causalTombstoned,
      );
      if (withdrawalCause === null) {
        throw new StructuredAuthorityWithdrawalRejectedError(
          "the governing Structured Obligation remains current execution authority",
        );
      }

      const closureId = newOpaqueId("obw");
      const threadEventId = interruptedCompelledEpisodeEventId(closureId);
      const eventCommandId = interruptedCompelledEpisodeCommandId(closureId);
      const eventCommandDigest = interruptedCompelledEpisodeCommandDigest({
        closureId,
        threadId: input.threadId,
        eventId: threadEventId,
        commandId: eventCommandId,
        occurredAt: input.closedAt,
      });
      const threadRow = this.#database.prepare(`
        SELECT version,status,state_json,state_hash,last_event_id,updated_at
        FROM threads WHERE thread_id=?
      `).get(input.threadId);
      if (threadRow === undefined) throw new IntegrityError(`Thread ${input.threadId} disappeared before interrupted-episode history append`);
      const thread = parseJson(`Thread ${input.threadId}`, threadRow.state_json);
      validateStoredThread(input.threadId, thread);
      same("interrupted episode Thread state hash", threadRow.state_hash, threadStateHash(thread));
      same("interrupted episode Thread version", Number(threadRow.version), thread.version);
      same("interrupted episode Thread status", threadRow.status, thread.status);
      same("interrupted episode Thread last event", threadRow.last_event_id, thread.provenance.lastEventId);
      if (Date.parse(input.closedAt) < Date.parse(threadRow.updated_at)) {
        throw new IntegrityError("authority-withdrawal life event would move Thread history backwards in time");
      }
      const sequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS last_sequence FROM thread_events WHERE thread_id=?",
      ).get(input.threadId).last_sequence) + 1;
      const nextThread = {
        ...thread,
        version: thread.version + 1,
        provenance: { ...thread.provenance, lastEventId: threadEventId },
      };
      validateStoredThread(input.threadId, nextThread);
      const nextStateJson = canonicalJson(nextThread);
      const nextStateHash = threadStateHash(nextThread);
      this.#database.prepare(`
        INSERT INTO thread_events(
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'COMPELLED_EPISODE_INTERRUPTED',?,?,?,?,?,?,NULL,?,?,1,?)
      `).run(
        threadEventId,input.threadId,sequence,thread.version,nextThread.version,
        eventCommandId,eventCommandDigest,canonicalJson(interruptedCompelledEpisodePayload()),
        canonicalJson(interruptedCompelledEpisodeActor()),input.closedAt,nextStateHash,
        eventCommandId,eventCommandId,canonicalJson(interruptedCompelledEpisodeProvenance()),
      );
      const threadUpdate = this.#database.prepare(`
        UPDATE threads SET version=?,status=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=? AND state_hash=?
      `).run(
        nextThread.version,nextThread.status,nextStateJson,nextStateHash,threadEventId,input.closedAt,
        input.threadId,thread.version,threadRow.state_hash,
      );
      if (Number(threadUpdate.changes) !== 1) {
        throw new StructuredAuthorityWithdrawalConflictError("Thread changed during authority-withdrawal history append");
      }
      this.#database.prepare(`
        INSERT INTO commands(
          thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        input.threadId,eventCommandId,eventCommandDigest,thread.version,nextThread.version,
        threadEventId,input.closedAt,
      );

      const closure = normalizeStructuredAuthorityWithdrawal({
        closureId,
        operationId: input.operationId,
        threadId: input.threadId,
        sessionId: input.sessionId,
        requestId: runtime.request_id,
        authorizationId: runtime.authorization_id,
        authorizationDigest: runtime.authorization_digest,
        applicabilityId: authorization.applicability.applicabilityId,
        applicabilityDecisionDigest: applicability.decision_digest,
        obligationId: authorization.applicability.obligationId,
        authorizedObligationRevision: authorizedRevision,
        authorizedObligationDigest: authorizedRow.obligation_digest,
        currentObligationRevision: current.revision,
        currentObligationDigest: currentRow.obligation_digest,
        currentObligationStatus: current.status,
        actorRunId: runtime.actor_run_id,
        actorOutputDigest: runtime.output_digest,
        guardianAuditId: runtime.audit_id,
        guardianAuditDigest: runtime.audit_digest,
        guardianDecision: "pass",
        withdrawalCause,
        reasonCode: STRUCTURED_AUTHORITY_WITHDRAWAL_REASON,
        closedAt: input.closedAt,
        causationId: input.causationId,
        correlationId: input.correlationId,
        historyProfileVersion: COMPELLED_EPISODE_HISTORY_PROFILE_VERSION,
        threadEventId,
      });
      const closureDigest = structuredAuthorityWithdrawalDigest(closure);
      this.#database.prepare(`
        INSERT INTO structured_authority_withdrawal_closures(
          closure_id,operation_id,operation_digest,thread_id,session_id,request_id,
          authorization_id,authorization_digest,applicability_id,applicability_decision_digest,
          obligation_id,authorized_obligation_revision,authorized_obligation_digest,
          current_obligation_revision,current_obligation_digest,current_obligation_status,
          actor_run_id,actor_output_digest,guardian_audit_id,guardian_audit_digest,
          withdrawal_cause,reason_code,closure_json,closure_digest,closed_at,causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        closure.closureId,input.operationId,expectedOperationDigest,closure.threadId,closure.sessionId,closure.requestId,
        closure.authorizationId,closure.authorizationDigest,closure.applicabilityId,closure.applicabilityDecisionDigest,
        closure.obligationId,closure.authorizedObligationRevision,closure.authorizedObligationDigest,
        closure.currentObligationRevision,closure.currentObligationDigest,closure.currentObligationStatus,
        closure.actorRunId,closure.actorOutputDigest,closure.guardianAuditId,closure.guardianAuditDigest,
        closure.withdrawalCause,closure.reasonCode,canonicalJson(closure),closureDigest,closure.closedAt,
        closure.causationId,closure.correlationId,
      );
      const sessionUpdate = this.#database.prepare(`
        UPDATE runtime_sessions SET status='aborted',completed_at=?
        WHERE session_id=? AND status='active'
      `).run(closure.closedAt, closure.sessionId);
      const leaseUpdate = this.#database.prepare(`
        UPDATE thaw_leases SET status='released',released_at=?,release_reason='governing_authority_withdrawn'
        WHERE lease_id=? AND status='active'
      `).run(closure.closedAt, runtime.lease_id);
      if (Number(sessionUpdate.changes) !== 1 || Number(leaseUpdate.changes) !== 1) {
        throw new StructuredAuthorityWithdrawalConflictError("runtime changed during authority-withdrawal closure");
      }
      const persisted = this.#decode(this.#rowBySession(input.threadId, input.sessionId));
      this.#database.exec("COMMIT");
      return { ...persisted, idempotent: false };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }
}

export function openStructuredAuthorityWithdrawalStore(databasePath) {
  return new StructuredAuthorityWithdrawalStore(databasePath);
}
