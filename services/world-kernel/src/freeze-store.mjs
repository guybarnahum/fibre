import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import { rowToEvent, validateStoredThread } from "./persistence-domain.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  AuthorizationConsumedError,
  FreezeConflictError,
  FreezeNotFoundError,
  FreezeRejectedError,
  FreezeStateChangedError,
  authorizationConsumptionDigest,
  freezeReportDigest,
  memoryRecordDigest,
} from "./freeze-domain.mjs";
import {
  actorOperationDigest,
  actorOutputDigest,
  authorizationDigest,
  executionContextDigest,
  goalGuardianOperationDigest,
  guardianAuditDigest,
  runtimeSessionDigest,
} from "./runtime-domain.mjs";
import {
  persistStructuredObligationDischarge,
  prepareStructuredObligationDischarge,
} from "./structured-obligation-discharge-store.mjs";

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function same(name, left, right) {
  if (left !== right) throw new IntegrityError(`${name} does not match its witness`);
}

export class FreezeStore {
  #database;

  constructor(databasePath) {
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    try {
      migrateDatabase(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  storageMetadata() {
    return {
      schemaVersion: Number(this.#database.prepare("PRAGMA user_version").get().user_version),
      busyTimeoutMs: Number(this.#database.prepare("PRAGMA busy_timeout").get().timeout),
    };
  }

  #rowBySession(threadId, sessionId) {
    return this.#database.prepare(`
      SELECT f.*, c.obligation_refs_json,c.consumption_digest,c.consumed_at,
        e.sequence,e.expected_version,e.resulting_version,e.event_type,e.command_id,
        e.command_digest,e.payload_json,e.actor_json,e.occurred_at,e.state_hash,
        e.authorization_id AS event_authorization_id,e.causation_id,e.correlation_id,
        e.payload_schema_version,e.provenance_json
      FROM freeze_reports f
      JOIN authorization_consumptions c ON c.authorization_id=f.authorization_id
      JOIN thread_events e ON e.event_id=f.event_id
      WHERE f.thread_id=? AND f.session_id=?
    `).get(threadId, sessionId);
  }

  #decode(row) {
    if (!row) return null;
    const report = parseJson(`freeze report ${row.report_id}`, row.report_json);
    const obligationReferences = parseJson(
      `authorization consumption ${row.authorization_id}`,
      row.obligation_refs_json,
    );
    const event = rowToEvent({
      event_id: row.event_id,
      thread_id: row.thread_id,
      sequence: row.sequence,
      expected_version: row.expected_version,
      resulting_version: row.resulting_version,
      event_type: row.event_type,
      command_id: row.command_id,
      command_digest: row.command_digest,
      payload_json: row.payload_json,
      actor_json: row.actor_json,
      occurred_at: row.occurred_at,
      state_hash: row.state_hash,
      authorization_id: row.event_authorization_id,
      causation_id: row.causation_id,
      correlation_id: row.correlation_id,
      payload_schema_version: row.payload_schema_version,
      provenance_json: row.provenance_json,
    });
    const consumption = {
      authorizationId: row.authorization_id,
      operationId: row.operation_id,
      operationDigest: row.operation_digest,
      sessionId: row.session_id,
      threadId: row.thread_id,
      requestId: row.request_id,
      eventId: row.event_id,
      consumedAt: row.consumed_at,
      obligationReferences,
    };
    same("freeze report ID", report.reportId, row.report_id);
    same("freeze report event", report.eventId, row.event_id);
    same("freeze report session", report.sessionId, row.session_id);
    same("freeze report authorization", report.authorizationId, row.authorization_id);
    same("freeze report digest", freezeReportDigest(report), row.report_digest);
    same(
      "authorization consumption digest",
      authorizationConsumptionDigest(consumption),
      row.consumption_digest,
    );
    same("freeze event type", event.eventType, "THREAD_FROZEN");
    same("freeze event authorization", event.authorizationId, row.authorization_id);
    same("freeze event report", event.payload.freezeReportId, row.report_id);
    same("freeze event report digest", event.payload.freezeReportDigest, row.report_digest);
    same("freeze event operation", event.commandId, row.operation_id);
    same("freeze event operation digest", event.payload.operationDigest, row.operation_digest);
    same("freeze prior version", report.priorVersion, event.expectedVersion);
    same("freeze resulting version", report.resultingVersion, event.resultingVersion);
    same("freeze resulting state", report.resultingStateHash, event.stateHash);
    same("freeze completion time", report.completedAt, event.occurredAt);
    same(
      "accepted freeze changes",
      canonicalJson(report.acceptedLifeChanges),
      canonicalJson(event.payload.acceptedLifeChanges),
    );
    same(
      "rejected freeze changes",
      canonicalJson(report.rejectedLifeChanges),
      canonicalJson(event.payload.rejectedLifeChanges),
    );
    same(
      "discharged freeze obligations",
      canonicalJson(report.dischargedObligations),
      canonicalJson(event.payload.dischargedObligations),
    );
    assertIsoTimestamp("freeze completedAt", row.completed_at);

    const memories = this.#database.prepare(`
      SELECT memory_id,thread_id,event_id,session_id,summary,evidence_refs_json,
        created_at,memory_digest
      FROM thread_memories WHERE event_id=? ORDER BY memory_id
    `).all(row.event_id).map((memoryRow) => {
      const memory = {
        memoryId: memoryRow.memory_id,
        threadId: memoryRow.thread_id,
        eventId: memoryRow.event_id,
        sessionId: memoryRow.session_id,
        summary: memoryRow.summary,
        evidenceRefs: parseJson(`memory ${memoryRow.memory_id} evidence`, memoryRow.evidence_refs_json),
        createdAt: memoryRow.created_at,
      };
      same("memory digest", memoryRecordDigest(memory), memoryRow.memory_digest);
      return memory;
    });
    same(
      "accepted memory set",
      canonicalJson(memories.map((memory) => memory.memoryId).sort()),
      canonicalJson(report.acceptedLifeChanges.map((change) => change.memoryId).sort()),
    );

    const threadRow = this.#database.prepare(
      "SELECT state_json,state_hash FROM threads WHERE thread_id=?",
    ).get(row.thread_id);
    if (!threadRow) throw new IntegrityError(`Thread ${row.thread_id} disappeared after freeze`);
    const thread = parseJson(`Thread ${row.thread_id}`, threadRow.state_json);
    validateStoredThread(row.thread_id, thread);
    same("current Thread state hash", threadStateHash(thread), threadRow.state_hash);
    if (thread.version < report.resultingVersion) {
      throw new IntegrityError(`Thread ${row.thread_id} regressed behind its freeze report`);
    }

    return {
      report,
      reportDigest: row.report_digest,
      consumption,
      consumptionDigest: row.consumption_digest,
      event,
      memories,
      thread,
    };
  }

  getFreeze(threadId, sessionId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const result = this.#decode(this.#rowBySession(threadId, sessionId));
    if (!result && required) {
      throw new FreezeNotFoundError(
        `Freeze report for runtime ${sessionId} was not found for Thread ${threadId}`,
      );
    }
    return result;
  }

  getAuthorizationConsumption(authorizationId) {
    assertId("authorizationId", authorizationId);
    const row = this.#database.prepare(`
      SELECT authorization_id,operation_id,operation_digest,session_id,thread_id,request_id,
        event_id,consumed_at,obligation_refs_json,consumption_digest
      FROM authorization_consumptions WHERE authorization_id=?
    `).get(authorizationId);
    if (!row) return null;
    const consumption = {
      authorizationId: row.authorization_id,
      operationId: row.operation_id,
      operationDigest: row.operation_digest,
      sessionId: row.session_id,
      threadId: row.thread_id,
      requestId: row.request_id,
      eventId: row.event_id,
      consumedAt: row.consumed_at,
      obligationReferences: parseJson(
        `authorization consumption ${authorizationId}`,
        row.obligation_refs_json,
      ),
    };
    same(
      "authorization consumption digest",
      authorizationConsumptionDigest(consumption),
      row.consumption_digest,
    );
    return { ...consumption, consumptionDigest: row.consumption_digest };
  }

  getFreezeByOperation(operationId, operationDigest, { required = false } = {}) {
    assertId("freeze operationId", operationId);
    const row = this.#database.prepare(
      "SELECT thread_id,session_id,operation_digest FROM freeze_reports WHERE operation_id=?",
    ).get(operationId);
    if (!row) {
      if (required) throw new FreezeNotFoundError(`Freeze operation ${operationId} was not found`);
      return null;
    }
    if (row.operation_digest !== operationDigest) {
      throw new FreezeConflictError(
        `Freeze operation ${operationId} was already used with different content`,
      );
    }
    return this.getFreeze(row.thread_id, row.session_id);
  }

  freezeRuntime(record) {
    const prior = this.getFreezeByOperation(record.operationId, record.operationDigest);
    if (prior) return { freeze: prior, idempotent: true };
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const raced = this.#database.prepare(
        "SELECT operation_digest FROM freeze_reports WHERE operation_id=?",
      ).get(record.operationId);
      if (raced) {
        this.#database.exec("COMMIT");
        return {
          freeze: this.getFreezeByOperation(record.operationId, record.operationDigest, { required: true }),
          idempotent: true,
        };
      }

      const runtime = this.#database.prepare(`
        SELECT s.status AS session_status,s.snapshot_version,s.thread_state_hash,
          s.request_id,s.context_json,s.context_digest,s.session_digest,s.started_at,
          s.lease_id,s.authorization_id,l.status AS lease_status,l.acquired_at,l.expires_at,
          a.authorization_json,a.authorization_digest,
          ar.actor_run_id,ar.operation_id AS actor_operation_id,
          ar.operation_digest AS actor_operation_digest,ar.input_digest,
          ar.output_json,ar.output_digest,ar.completed_at AS actor_completed_at,
          ga.audit_id,ga.operation_id AS guardian_operation_id,
          ga.operation_digest AS guardian_operation_digest,
          ga.context_digest AS guardian_context_digest,
          ga.actor_output_digest AS guardian_actor_output_digest,
          ga.audit_digest,ga.audit_json,ga.completed_at AS guardian_completed_at
        FROM runtime_sessions s
        JOIN thaw_leases l ON l.lease_id=s.lease_id
        JOIN participation_authorizations a ON a.authorization_id=s.authorization_id
        LEFT JOIN actor_runs ar ON ar.session_id=s.session_id
        LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
        WHERE s.thread_id=? AND s.session_id=?
      `).get(record.threadId, record.sessionId);
      if (!runtime) {
        throw new FreezeNotFoundError(
          `Runtime session ${record.sessionId} was not found for Thread ${record.threadId}`,
        );
      }
      if (runtime.session_status !== "active" || runtime.lease_status !== "active") {
        throw new FreezeRejectedError(`Runtime session ${record.sessionId} is not active`);
      }
      if (Date.parse(record.completedAt) >= Date.parse(runtime.expires_at)) {
        throw new FreezeRejectedError(`Runtime session ${record.sessionId} lease expired before freeze`);
      }
      if (
        runtime.authorization_id !== record.authorizationId ||
        runtime.actor_run_id !== record.actorRunId ||
        runtime.audit_id !== record.auditId ||
        runtime.output_digest !== record.actorOutputDigest ||
        runtime.audit_digest !== record.auditDigest ||
        runtime.context_digest !== record.contextDigest ||
        runtime.request_id !== record.requestId ||
        Number(runtime.snapshot_version) !== record.snapshotVersion ||
        runtime.thread_state_hash !== record.priorStateHash
      ) {
        throw new FreezeStateChangedError(
          `Runtime session ${record.sessionId} changed before freeze`,
        );
      }
      const authorization = parseJson(
        `authorization ${record.authorizationId}`,
        runtime.authorization_json,
      );
      const context = parseJson(`runtime context ${record.sessionId}`, runtime.context_json);
      const output = parseJson(`Actor output ${record.actorRunId}`, runtime.output_json);
      const audit = parseJson(`Goal Guardian audit ${record.auditId}`, runtime.audit_json);
      same("authorization digest", authorizationDigest(authorization), runtime.authorization_digest);
      same("execution context digest", executionContextDigest(context), runtime.context_digest);
      same(
        "runtime session digest",
        runtimeSessionDigest({
          sessionId: record.sessionId,
          leaseId: runtime.lease_id,
          authorizationId: runtime.authorization_id,
          threadId: record.threadId,
          requestId: runtime.request_id,
          snapshotVersion: Number(runtime.snapshot_version),
          threadStateHash: runtime.thread_state_hash,
          contextDigest: runtime.context_digest,
          startedAt: runtime.started_at,
        }),
        runtime.session_digest,
      );
      same("Actor output digest", actorOutputDigest(output), runtime.output_digest);
      same(
        "Actor operation digest",
        actorOperationDigest({
          threadId: record.threadId,
          sessionId: record.sessionId,
          operationId: runtime.actor_operation_id,
          contextDigest: runtime.input_digest,
          outputDigest: runtime.output_digest,
          completedAt: runtime.actor_completed_at,
        }),
        runtime.actor_operation_digest,
      );
      same("Goal Guardian audit digest", guardianAuditDigest(audit), runtime.audit_digest);
      same(
        "Goal Guardian operation digest",
        goalGuardianOperationDigest({
          threadId: record.threadId,
          sessionId: record.sessionId,
          operationId: runtime.guardian_operation_id,
          contextDigest: runtime.guardian_context_digest,
          actorOutputDigest: runtime.guardian_actor_output_digest,
          auditDigest: runtime.audit_digest,
          completedAt: runtime.guardian_completed_at,
        }),
        runtime.guardian_operation_digest,
      );
      if (authorization.authorizedAction !== "accept" || audit.decision !== "pass") {
        throw new FreezeRejectedError("freeze requires accepted authorization and Guardian pass");
      }

      const consumed = this.#database.prepare(
        "SELECT operation_id FROM authorization_consumptions WHERE authorization_id=?",
      ).get(record.authorizationId);
      if (consumed) {
        throw new AuthorizationConsumedError(
          `Participation Authorization ${record.authorizationId} was already consumed by ${consumed.operation_id}`,
        );
      }

      const structuredDischarge = prepareStructuredObligationDischarge(
        this.#database,
        authorization,
        runtime.authorization_digest,
        record,
      );

      const threadRow = this.#database.prepare(
        "SELECT version,status,state_json,state_hash FROM threads WHERE thread_id=?",
      ).get(record.threadId);
      if (!threadRow) throw new FreezeNotFoundError(`Thread ${record.threadId} was not found`);
      const thread = parseJson(`Thread ${record.threadId}`, threadRow.state_json);
      validateStoredThread(record.threadId, thread);
      if (
        Number(threadRow.version) !== record.snapshotVersion ||
        threadRow.state_hash !== record.priorStateHash ||
        threadStateHash(thread) !== record.priorStateHash
      ) {
        throw new FreezeStateChangedError(`Thread ${record.threadId} changed before freeze`);
      }
      for (const obligation of record.report.dischargedObligations) {
        if (!thread.currentState.unresolvedIntentions.includes(obligation)) {
          throw new FreezeStateChangedError(
            `authorized obligation is no longer unresolved: ${obligation}`,
          );
        }
      }

      const lastSequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS sequence FROM thread_events WHERE thread_id=?",
      ).get(record.threadId).sequence);
      this.#database.prepare(`
        INSERT INTO thread_events(
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'THREAD_FROZEN',?,?,?,?,?,?,?,?,?,1,?)
      `).run(
        record.eventId,
        record.threadId,
        lastSequence + 1,
        record.snapshotVersion,
        record.nextThread.version,
        record.operationId,
        record.commitDigest,
        canonicalJson(record.eventPayload),
        canonicalJson({
          entityId: "fibre.world-kernel",
          kind: "institution",
          displayName: "Fibre World Kernel",
        }),
        record.completedAt,
        record.resultingStateHash,
        record.authorizationId,
        record.causationId,
        record.correlationId,
        canonicalJson({ source: "freezeRuntime", adapter: "sqlite-v4" }),
      );
      const update = this.#database.prepare(`
        UPDATE threads SET version=?,status=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=? AND state_hash=?
      `).run(
        record.nextThread.version,
        record.nextThread.status,
        canonicalJson(record.nextThread),
        record.resultingStateHash,
        record.eventId,
        record.completedAt,
        record.threadId,
        record.snapshotVersion,
        record.priorStateHash,
      );
      if (Number(update.changes) !== 1) {
        throw new FreezeStateChangedError(`Thread ${record.threadId} changed during freeze`);
      }
      this.#database.prepare(`
        INSERT INTO commands(
          thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        record.threadId,
        record.operationId,
        record.commitDigest,
        record.snapshotVersion,
        record.nextThread.version,
        record.eventId,
        record.completedAt,
      );

      for (const memory of record.memories) {
        this.#database.prepare(`
          INSERT INTO thread_memories(
            memory_id,thread_id,event_id,session_id,summary,evidence_refs_json,created_at,memory_digest
          ) VALUES (?,?,?,?,?,?,?,?)
        `).run(
          memory.memoryId,
          memory.threadId,
          memory.eventId,
          memory.sessionId,
          memory.summary,
          canonicalJson(memory.evidenceRefs),
          memory.createdAt,
          memoryRecordDigest(memory),
        );
      }
      this.#database.prepare(`
        INSERT INTO authorization_consumptions(
          authorization_id,operation_id,operation_digest,session_id,thread_id,request_id,
          event_id,consumed_at,obligation_refs_json,consumption_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.authorizationId,
        record.operationId,
        record.operationDigest,
        record.sessionId,
        record.threadId,
        record.requestId,
        record.eventId,
        record.completedAt,
        canonicalJson(record.consumption.obligationReferences),
        record.consumptionDigest,
      );
      this.#database.prepare(`
        INSERT INTO freeze_reports(
          report_id,operation_id,operation_digest,session_id,thread_id,request_id,
          authorization_id,actor_run_id,audit_id,event_id,report_json,report_digest,completed_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.report.reportId,
        record.operationId,
        record.operationDigest,
        record.sessionId,
        record.threadId,
        record.requestId,
        record.authorizationId,
        record.actorRunId,
        record.auditId,
        record.eventId,
        canonicalJson(record.report),
        record.reportDigest,
        record.completedAt,
      );
      this.#database.prepare(
        "UPDATE runtime_sessions SET status='completed',completed_at=? WHERE session_id=? AND status='active'",
      ).run(record.completedAt, record.sessionId);
      this.#database.prepare(`
        UPDATE thaw_leases SET status='released',released_at=?,release_reason='freeze_completed'
        WHERE lease_id=? AND status='active'
      `).run(record.completedAt, record.leaseId);

      persistStructuredObligationDischarge(this.#database, structuredDischarge);

      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return {
      freeze: this.getFreeze(record.threadId, record.sessionId),
      idempotent: false,
    };
  }

  verifyFreezeIntegrity(threadId, sessionId) {
    const freeze = this.getFreeze(threadId, sessionId);
    return {
      threadId,
      sessionId,
      reportId: freeze.report.reportId,
      reportDigest: freeze.reportDigest,
      authorizationId: freeze.consumption.authorizationId,
      authorizationConsumptionDigest: freeze.consumptionDigest,
      eventId: freeze.event.eventId,
      resultingVersion: freeze.report.resultingVersion,
      resultingStateHash: freeze.report.resultingStateHash,
      acceptedMemoryIds: freeze.memories.map((memory) => memory.memoryId),
      dischargedObligations: [...freeze.report.dischargedObligations],
      runtimeCompleted: true,
      leaseReleased: true,
    };
  }
}

export function openFreezeStore(databasePath) {
  return new FreezeStore(databasePath);
}
