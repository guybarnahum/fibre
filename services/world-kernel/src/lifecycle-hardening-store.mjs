import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  freezeReportDigest,
  memoryRecordDigest,
} from "./freeze-domain.mjs";
import { ParticipationAuthorizationRejectedError } from "./runtime-domain.mjs";
import {
  RuntimeAbandonConflictError,
  RuntimeAbandonNotFoundError,
  RuntimeAbandonRejectedError,
  runtimeAbandonRecordDigest,
} from "./lifecycle-hardening-domain.mjs";

const GENERATED_MEMORY_ID = /^mem_[0-9a-f]{64}$/;

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

function sorted(values) {
  return [...values].sort();
}

export class LifecycleHardeningStore {
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
      SELECT ra.*,
        s.status AS session_status,s.completed_at AS session_completed_at,s.lease_id,
        l.status AS lease_status,l.released_at,l.release_reason,
        ga.audit_json
      FROM runtime_abandons ra
      JOIN runtime_sessions s ON s.session_id=ra.session_id
      JOIN thaw_leases l ON l.lease_id=s.lease_id
      JOIN goal_guardian_audits ga ON ga.audit_id=ra.audit_id
      WHERE ra.thread_id=? AND ra.session_id=?
    `).get(threadId, sessionId);
  }

  #decodeAbandonment(row) {
    if (!row) return null;
    const record = parseJson(`runtime abandonment ${row.abandonment_id}`, row.record_json);
    same("runtime abandonment ID", record.abandonmentId, row.abandonment_id);
    same("runtime abandonment operation", record.operationId, row.operation_id);
    same("runtime abandonment operation digest", record.operationDigest, row.operation_digest);
    same("runtime abandonment session", record.sessionId, row.session_id);
    same("runtime abandonment Thread", record.threadId, row.thread_id);
    same("runtime abandonment request", record.requestId, row.request_id);
    same("runtime abandonment authorization", record.authorizationId, row.authorization_id);
    same("runtime abandonment Guardian audit", record.goalGuardianAuditId, row.audit_id);
    same("runtime abandonment reason", record.reason, row.reason);
    same("runtime abandonment time", record.abandonedAt, row.abandoned_at);
    same("runtime abandonment causation", record.causationId, row.causation_id);
    same("runtime abandonment correlation", record.correlationId, row.correlation_id);
    same("runtime abandonment digest", runtimeAbandonRecordDigest(record), row.record_digest);
    assertIsoTimestamp("runtime abandonment abandonedAt", row.abandoned_at);

    const audit = parseJson(`Goal Guardian audit ${row.audit_id}`, row.audit_json);
    if (audit.decision !== "reject") {
      throw new IntegrityError("runtime abandonment is not backed by a Guardian rejection");
    }
    if (
      row.session_status !== "aborted" ||
      row.lease_status !== "released" ||
      row.release_reason !== "guardian_rejected_abandon" ||
      row.session_completed_at !== row.abandoned_at ||
      row.released_at !== row.abandoned_at
    ) {
      throw new IntegrityError("runtime abandonment lifecycle state does not match its record");
    }
    const consumed = this.#database.prepare(
      "SELECT operation_id FROM authorization_consumptions WHERE authorization_id=?",
    ).get(row.authorization_id);
    if (consumed) {
      throw new IntegrityError("abandoned runtime authorization was also consumed");
    }
    const frozen = this.#database.prepare(
      "SELECT report_id FROM freeze_reports WHERE session_id=?",
    ).get(row.session_id);
    if (frozen) throw new IntegrityError("abandoned runtime also has a freeze report");

    return {
      record,
      recordDigest: row.record_digest,
      sessionStatus: row.session_status,
      leaseStatus: row.lease_status,
      releaseReason: row.release_reason,
      authorizationConsumed: false,
    };
  }

  getRuntimeAbandonment(threadId, sessionId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const result = this.#decodeAbandonment(this.#rowBySession(threadId, sessionId));
    if (!result && required) {
      throw new RuntimeAbandonNotFoundError(
        `Runtime abandonment for ${sessionId} was not found for Thread ${threadId}`,
      );
    }
    return result;
  }

  getRuntimeAbandonmentByOperation(operationId, operationDigest, { required = false } = {}) {
    assertId("runtime abandon operationId", operationId);
    const row = this.#database.prepare(
      "SELECT thread_id,session_id,operation_digest FROM runtime_abandons WHERE operation_id=?",
    ).get(operationId);
    if (!row) {
      if (required) {
        throw new RuntimeAbandonNotFoundError(
          `Runtime abandon operation ${operationId} was not found`,
        );
      }
      return null;
    }
    if (row.operation_digest !== operationDigest) {
      throw new RuntimeAbandonConflictError(
        `Runtime abandon operation ${operationId} was already used with different content`,
      );
    }
    return this.getRuntimeAbandonment(row.thread_id, row.session_id);
  }

  assertObligationsUnspent(threadId, obligationReferences) {
    assertId("threadId", threadId);
    if (!Array.isArray(obligationReferences)) return;
    for (const obligation of obligationReferences) {
      if (typeof obligation !== "string") continue;
      const spent = this.#database.prepare(`
        SELECT c.operation_id
        FROM authorization_consumptions c,
          json_each(c.obligation_refs_json) obligation
        WHERE c.thread_id=? AND obligation.value=?
        LIMIT 1
      `).get(threadId, obligation);
      if (spent) {
        throw new ParticipationAuthorizationRejectedError(
          `authorization obligation was already discharged by ${spent.operation_id}: ${obligation}`,
        );
      }
    }
  }

  abandonRejectedRuntime(record) {
    const prior = this.getRuntimeAbandonmentByOperation(
      record.operationId,
      record.operationDigest,
    );
    if (prior) return { abandonment: prior, idempotent: true };

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const raced = this.#database.prepare(
        "SELECT operation_digest FROM runtime_abandons WHERE operation_id=?",
      ).get(record.operationId);
      if (raced) {
        this.#database.exec("COMMIT");
        return {
          abandonment: this.getRuntimeAbandonmentByOperation(
            record.operationId,
            record.operationDigest,
            { required: true },
          ),
          idempotent: true,
        };
      }

      const runtime = this.#database.prepare(`
        SELECT s.status AS session_status,s.request_id,s.authorization_id,s.lease_id,
          l.status AS lease_status,l.acquired_at,l.expires_at,
          ga.audit_id,ga.audit_json,
          ra.operation_id AS abandon_operation_id,
          c.operation_id AS consumption_operation_id,
          f.report_id
        FROM runtime_sessions s
        JOIN thaw_leases l ON l.lease_id=s.lease_id
        LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
        LEFT JOIN runtime_abandons ra ON ra.session_id=s.session_id
        LEFT JOIN authorization_consumptions c ON c.authorization_id=s.authorization_id
        LEFT JOIN freeze_reports f ON f.session_id=s.session_id
        WHERE s.thread_id=? AND s.session_id=?
      `).get(record.threadId, record.sessionId);
      if (!runtime) {
        throw new RuntimeAbandonNotFoundError(
          `Runtime session ${record.sessionId} was not found for Thread ${record.threadId}`,
        );
      }
      if (runtime.abandon_operation_id) {
        throw new RuntimeAbandonConflictError(
          `Runtime session ${record.sessionId} was already abandoned by ${runtime.abandon_operation_id}`,
        );
      }
      if (runtime.session_status !== "active" || runtime.lease_status !== "active") {
        throw new RuntimeAbandonRejectedError(
          `Runtime session ${record.sessionId} is not active`,
        );
      }
      if (Date.parse(record.abandonedAt) < Date.parse(runtime.acquired_at)) {
        throw new IntegrityError("kernel clock moved before lease acquisition");
      }
      if (Date.parse(record.abandonedAt) >= Date.parse(runtime.expires_at)) {
        throw new RuntimeAbandonRejectedError(
          `Runtime session ${record.sessionId} lease expired before abandonment`,
        );
      }
      if (!runtime.audit_id) {
        throw new RuntimeAbandonRejectedError(
          `Runtime session ${record.sessionId} has no Goal Guardian audit`,
        );
      }
      const audit = parseJson(`Goal Guardian audit ${runtime.audit_id}`, runtime.audit_json);
      if (audit.decision !== "reject") {
        throw new RuntimeAbandonRejectedError(
          "runtime abandonment requires Goal Guardian decision reject",
        );
      }
      if (runtime.consumption_operation_id || runtime.report_id) {
        throw new RuntimeAbandonRejectedError(
          `Runtime session ${record.sessionId} already changed authoritative state`,
        );
      }
      for (const [name, actual, expected] of [
        ["request", record.requestId, runtime.request_id],
        ["authorization", record.authorizationId, runtime.authorization_id],
        ["Goal Guardian audit", record.goalGuardianAuditId, runtime.audit_id],
      ]) {
        if (actual !== expected) {
          throw new RuntimeAbandonConflictError(
            `Runtime abandonment ${name} binding changed before commit`,
          );
        }
      }
      const digest = runtimeAbandonRecordDigest(record.abandonment);
      same("runtime abandonment input digest", digest, record.recordDigest);

      this.#database.prepare(`
        INSERT INTO runtime_abandons(
          abandonment_id,operation_id,operation_digest,session_id,thread_id,request_id,
          authorization_id,audit_id,reason,record_json,record_digest,abandoned_at,
          causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.abandonment.abandonmentId,
        record.operationId,
        record.operationDigest,
        record.sessionId,
        record.threadId,
        record.requestId,
        record.authorizationId,
        record.goalGuardianAuditId,
        record.abandonment.reason,
        canonicalJson(record.abandonment),
        record.recordDigest,
        record.abandonedAt,
        record.abandonment.causationId,
        record.abandonment.correlationId,
      );
      const sessionUpdate = this.#database.prepare(`
        UPDATE runtime_sessions SET status='aborted',completed_at=?
        WHERE session_id=? AND status='active'
      `).run(record.abandonedAt, record.sessionId);
      const leaseUpdate = this.#database.prepare(`
        UPDATE thaw_leases
        SET status='released',released_at=?,release_reason='guardian_rejected_abandon'
        WHERE lease_id=? AND status='active'
      `).run(record.abandonedAt, runtime.lease_id);
      if (Number(sessionUpdate.changes) !== 1 || Number(leaseUpdate.changes) !== 1) {
        throw new RuntimeAbandonConflictError(
          `Runtime session ${record.sessionId} changed during abandonment`,
        );
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }

    return {
      abandonment: this.getRuntimeAbandonment(record.threadId, record.sessionId),
      idempotent: false,
    };
  }

  verifyRuntimeAbandonment(threadId, sessionId) {
    const abandonment = this.getRuntimeAbandonment(threadId, sessionId);
    return {
      threadId,
      sessionId,
      abandonmentId: abandonment.record.abandonmentId,
      operationId: abandonment.record.operationId,
      recordDigest: abandonment.recordDigest,
      reason: abandonment.record.reason,
      sessionAborted: abandonment.sessionStatus === "aborted",
      leaseReleased: abandonment.leaseStatus === "released",
      authorizationConsumed: abandonment.authorizationConsumed,
    };
  }

  verifyMemoryProjectionIntegrity(threadId, thread) {
    assertId("threadId", threadId);
    if (thread?.threadId !== threadId || !Array.isArray(thread?.memoryRefs)) {
      throw new IntegrityError(`Thread ${threadId} is unavailable for memory integrity`);
    }

    const memoryRows = this.#database.prepare(`
      SELECT memory_id,event_id,session_id,summary,evidence_refs_json,created_at,memory_digest
      FROM thread_memories WHERE thread_id=? ORDER BY memory_id
    `).all(threadId);
    const storedIds = [];
    const memoryById = new Map();
    for (const row of memoryRows) {
      const memory = {
        memoryId: row.memory_id,
        threadId,
        eventId: row.event_id,
        sessionId: row.session_id,
        summary: row.summary,
        evidenceRefs: parseJson(`memory ${row.memory_id} evidence`, row.evidence_refs_json),
        createdAt: row.created_at,
      };
      same("memory digest", memoryRecordDigest(memory), row.memory_digest);
      storedIds.push(row.memory_id);
      memoryById.set(row.memory_id, memory);
    }

    const reportRows = this.#database.prepare(`
      SELECT session_id,event_id,report_json,report_digest
      FROM freeze_reports WHERE thread_id=? ORDER BY completed_at,report_id
    `).all(threadId);
    const reportedIds = [];
    for (const row of reportRows) {
      const report = parseJson(`freeze report for ${row.session_id}`, row.report_json);
      same("freeze report digest", freezeReportDigest(report), row.report_digest);
      for (const change of report.acceptedLifeChanges) {
        const memory = memoryById.get(change.memoryId);
        if (!memory) {
          throw new IntegrityError(
            `freeze report ${report.reportId} accepted missing memory ${change.memoryId}`,
          );
        }
        same("memory event", memory.eventId, row.event_id);
        same("memory session", memory.sessionId, row.session_id);
        reportedIds.push(change.memoryId);
      }
    }

    const generatedProjectionIds = thread.memoryRefs.filter(
      (reference) => GENERATED_MEMORY_ID.test(reference),
    );
    const stored = canonicalJson(sorted(storedIds));
    same("freeze-report memory set", canonicalJson(sorted(reportedIds)), stored);
    same("Thread projection memory set", canonicalJson(sorted(generatedProjectionIds)), stored);

    return {
      threadId,
      freezeCreatedMemoryCount: storedIds.length,
      freezeCreatedMemoryIds: sorted(storedIds),
      reportCount: reportRows.length,
      matchesProjection: true,
    };
  }
}

export function openLifecycleHardeningStore(databasePath) {
  return new LifecycleHardeningStore(databasePath);
}