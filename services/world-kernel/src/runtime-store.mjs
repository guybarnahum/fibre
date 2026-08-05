import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  RuntimeConflictError,
  RuntimeLeaseExpiredError,
  RuntimeNotFoundError,
  RuntimeOrderError,
  RuntimeStateChangedError,
  ThawLeaseConflictError,
  actorOperationDigest,
  actorOutputDigest,
  assertRuntimeDigest,
  authorizationDigest,
  executionContextDigest,
  goalGuardianOperationDigest,
  guardianAuditDigest,
  runtimeAcquireOperationDigest,
  runtimeSessionDigest,
} from "./runtime-domain.mjs";

const ID = {
  authorization: /^auth_[0-9a-f]{64}$/,
  lease: /^lease_[0-9a-f]{64}$/,
  session: /^run_[0-9a-f]{64}$/,
  actor: /^act_[0-9a-f]{64}$/,
  audit: /^gga_[0-9a-f]{64}$/,
};

function json(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function same(name, left, right) {
  if (left !== right) throw new IntegrityError(`${name} does not match its witness`);
}

function opaque(name, value, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new IntegrityError(`${name} is invalid`);
  }
}

function storedTimestamp(name, value, { nullable = false } = {}) {
  if (nullable && value === null) return;
  try {
    assertIsoTimestamp(name, value);
  } catch (error) {
    throw new IntegrityError(`${name} is invalid: ${error.message}`);
  }
}

export class RuntimeStore {
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

  #row(threadId, sessionId) {
    return this.#database.prepare(`
      SELECT s.*, a.operation_id AS acquire_operation_id, a.operation_json AS acquire_operation_json,
        a.operation_digest AS acquire_operation_digest, a.appraisal_id, a.stance_id,
        a.request_fingerprint, a.authorization_json, a.authorization_digest,
        l.status AS lease_status, l.acquired_at, l.expires_at, l.released_at, l.release_reason,
        ar.actor_run_id, ar.operation_id AS actor_operation_id, ar.operation_digest AS actor_operation_digest,
        ar.input_digest AS actor_input_digest, ar.output_json, ar.output_digest,
        ar.completed_at AS actor_completed_at,
        ga.audit_id, ga.operation_id AS guardian_operation_id,
        ga.operation_digest AS guardian_operation_digest,
        ga.context_digest AS guardian_context_digest,
        ga.actor_output_digest AS guardian_actor_output_digest,
        ga.audit_json, ga.audit_digest, ga.completed_at AS guardian_completed_at
      FROM runtime_sessions s
      JOIN participation_authorizations a ON a.authorization_id=s.authorization_id
      JOIN thaw_leases l ON l.lease_id=s.lease_id
      LEFT JOIN actor_runs ar ON ar.session_id=s.session_id
      LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
      WHERE s.thread_id=? AND s.session_id=?
    `).get(threadId, sessionId);
  }

  #decode(row) {
    if (!row) return null;
    opaque("authorizationId", row.authorization_id, ID.authorization);
    opaque("leaseId", row.lease_id, ID.lease);
    opaque("sessionId", row.session_id, ID.session);
    [
      row.thread_state_hash,
      row.request_fingerprint,
      row.authorization_digest,
      row.acquire_operation_digest,
      row.context_digest,
      row.session_digest,
    ].forEach((value, index) => assertRuntimeDigest(`runtime digest ${index}`, value));
    storedTimestamp("lease acquiredAt", row.acquired_at);
    storedTimestamp("lease expiresAt", row.expires_at);
    storedTimestamp("lease releasedAt", row.released_at, { nullable: true });
    storedTimestamp("session startedAt", row.started_at);
    storedTimestamp("session completedAt", row.completed_at, { nullable: true });

    const authorization = json(`authorization ${row.authorization_id}`, row.authorization_json);
    const context = json(`context ${row.session_id}`, row.context_json);
    const operation = json(`acquire operation ${row.acquire_operation_id}`, row.acquire_operation_json);
    same(
      "acquire digest",
      runtimeAcquireOperationDigest(row.thread_id, row.request_id, operation),
      row.acquire_operation_digest,
    );
    same("authorization ID", authorization.authorizationId, row.authorization_id);
    same("authorization thread", authorization.threadId, row.thread_id);
    same("authorization request", authorization.requestId, row.request_id);
    same("authorization digest", authorizationDigest(authorization), row.authorization_digest);
    same("authorization state", authorization.threadStateHash, row.thread_state_hash);
    same("context thread", context.threadId, row.thread_id);
    same("context request", context.requestId, row.request_id);
    same("context authorization", context.participation.authorizationId, row.authorization_id);
    same("context digest", executionContextDigest(context), row.context_digest);
    same(
      "session digest",
      runtimeSessionDigest({
        sessionId: row.session_id,
        leaseId: row.lease_id,
        authorizationId: row.authorization_id,
        threadId: row.thread_id,
        requestId: row.request_id,
        snapshotVersion: Number(row.snapshot_version),
        threadStateHash: row.thread_state_hash,
        contextDigest: row.context_digest,
        startedAt: row.started_at,
      }),
      row.session_digest,
    );

    const runtime = {
      threadId: row.thread_id,
      requestId: row.request_id,
      snapshotVersion: Number(row.snapshot_version),
      threadStateHash: row.thread_state_hash,
      authorization,
      authorizationDigest: row.authorization_digest,
      acquireOperationId: row.acquire_operation_id,
      acquireOperation: operation,
      acquireOperationDigest: row.acquire_operation_digest,
      lease: {
        leaseId: row.lease_id,
        status: row.lease_status,
        acquiredAt: row.acquired_at,
        expiresAt: row.expires_at,
        releasedAt: row.released_at,
        releaseReason: row.release_reason,
      },
      session: {
        sessionId: row.session_id,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        context,
        contextDigest: row.context_digest,
        sessionDigest: row.session_digest,
      },
      actorRun: null,
      goalGuardianAudit: null,
    };

    if (row.actor_run_id) {
      opaque("actorRunId", row.actor_run_id, ID.actor);
      storedTimestamp("Actor completedAt", row.actor_completed_at);
      const output = json(`Actor output ${row.actor_run_id}`, row.output_json);
      same("Actor input", row.actor_input_digest, row.context_digest);
      same("Actor output digest", actorOutputDigest(output), row.output_digest);
      same(
        "Actor operation digest",
        actorOperationDigest({
          threadId: row.thread_id,
          sessionId: row.session_id,
          operationId: row.actor_operation_id,
          contextDigest: row.actor_input_digest,
          outputDigest: row.output_digest,
          completedAt: row.actor_completed_at,
        }),
        row.actor_operation_digest,
      );
      runtime.actorRun = {
        actorRunId: row.actor_run_id,
        operationId: row.actor_operation_id,
        operationDigest: row.actor_operation_digest,
        inputDigest: row.actor_input_digest,
        output,
        outputDigest: row.output_digest,
        completedAt: row.actor_completed_at,
      };
    }

    if (row.audit_id) {
      if (!runtime.actorRun) throw new IntegrityError("Goal Guardian audit exists without Actor run");
      opaque("goalGuardianAuditId", row.audit_id, ID.audit);
      storedTimestamp("Goal Guardian completedAt", row.guardian_completed_at);
      const audit = json(`Goal Guardian audit ${row.audit_id}`, row.audit_json);
      same("Guardian context", row.guardian_context_digest, row.context_digest);
      same("Guardian Actor", row.guardian_actor_output_digest, row.output_digest);
      same("Guardian audit digest", guardianAuditDigest(audit), row.audit_digest);
      same(
        "Guardian operation digest",
        goalGuardianOperationDigest({
          threadId: row.thread_id,
          sessionId: row.session_id,
          operationId: row.guardian_operation_id,
          contextDigest: row.guardian_context_digest,
          actorOutputDigest: row.guardian_actor_output_digest,
          auditDigest: row.audit_digest,
          completedAt: row.guardian_completed_at,
        }),
        row.guardian_operation_digest,
      );
      runtime.goalGuardianAudit = {
        auditId: row.audit_id,
        operationId: row.guardian_operation_id,
        operationDigest: row.guardian_operation_digest,
        audit,
        auditDigest: row.audit_digest,
        completedAt: row.guardian_completed_at,
      };
    }
    return runtime;
  }

  getRuntime(threadId, sessionId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const runtime = this.#decode(this.#row(threadId, sessionId));
    if (!runtime && required) {
      throw new RuntimeNotFoundError(
        `Runtime session ${sessionId} was not found for Thread ${threadId}`,
      );
    }
    return runtime;
  }

  getRuntimeByAcquireOperation(operationId, operationDigest, { required = false } = {}) {
    const row = this.#database.prepare(`
      SELECT a.thread_id, s.session_id, a.operation_digest
      FROM participation_authorizations a
      JOIN runtime_sessions s ON s.authorization_id=a.authorization_id
      WHERE a.operation_id=?
    `).get(operationId);
    if (!row) {
      if (required) throw new RuntimeNotFoundError(`Runtime operation ${operationId} was not found`);
      return null;
    }
    if (row.operation_digest !== operationDigest) {
      throw new RuntimeConflictError(
        `Runtime operation ${operationId} was already used with different content`,
      );
    }
    return this.getRuntime(row.thread_id, row.session_id);
  }

  #runtimeByWorkerOperation(table, operationId, expectedThreadId, expectedSessionId) {
    const row = this.#database.prepare(
      `SELECT thread_id, session_id FROM ${table} WHERE operation_id=?`,
    ).get(operationId);
    if (!row) return null;
    if (row.thread_id !== expectedThreadId || row.session_id !== expectedSessionId) {
      throw new RuntimeConflictError(
        `Runtime operation ${operationId} was already used for another session`,
      );
    }
    return this.getRuntime(row.thread_id, row.session_id);
  }

  getRuntimeByActorOperation(operationId, threadId, sessionId) {
    assertId("Actor operationId", operationId);
    return this.#runtimeByWorkerOperation("actor_runs", operationId, threadId, sessionId);
  }

  getRuntimeByGuardianOperation(operationId, threadId, sessionId) {
    assertId("Goal Guardian operationId", operationId);
    return this.#runtimeByWorkerOperation(
      "goal_guardian_audits",
      operationId,
      threadId,
      sessionId,
    );
  }

  listRuntimeSummaries(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT s.session_id,s.request_id,s.snapshot_version,s.status,s.started_at,
        l.lease_id,l.status AS lease_status,l.acquired_at,l.expires_at,
        a.authorization_id,ar.actor_run_id,ga.audit_id,
        json_extract(ga.audit_json,'$.decision') AS guardian_decision
      FROM runtime_sessions s
      JOIN thaw_leases l ON l.lease_id=s.lease_id
      JOIN participation_authorizations a ON a.authorization_id=s.authorization_id
      LEFT JOIN actor_runs ar ON ar.session_id=s.session_id
      LEFT JOIN goal_guardian_audits ga ON ga.session_id=s.session_id
      WHERE s.thread_id=? ORDER BY s.started_at,s.session_id
    `).all(threadId).map((row) => ({
      threadId,
      sessionId: row.session_id,
      requestId: row.request_id,
      snapshotVersion: Number(row.snapshot_version),
      status: row.status,
      startedAt: row.started_at,
      lease: {
        leaseId: row.lease_id,
        status: row.lease_status,
        acquiredAt: row.acquired_at,
        expiresAt: row.expires_at,
      },
      authorizationId: row.authorization_id,
      actorRunId: row.actor_run_id,
      goalGuardianAuditId: row.audit_id,
      goalGuardianDecision: row.guardian_decision,
    }));
  }

  acquireRuntime(record) {
    const prior = this.getRuntimeByAcquireOperation(record.operationId, record.operationDigest);
    if (prior) return { runtime: prior, idempotent: true };
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const thread = this.#database.prepare(
        "SELECT version,status,state_json,state_hash FROM threads WHERE thread_id=?",
      ).get(record.threadId);
      if (!thread) throw new RuntimeNotFoundError(`Thread ${record.threadId} was not found`);
      if (
        Number(thread.version) !== record.snapshotVersion ||
        thread.state_hash !== record.threadStateHash ||
        !["frozen", "dormant"].includes(thread.status)
      ) {
        throw new RuntimeStateChangedError(
          `Thread ${record.threadId} changed before thaw lease acquisition`,
        );
      }
      if (threadStateHash(json(`Thread ${record.threadId}`, thread.state_json)) !== record.threadStateHash) {
        throw new IntegrityError(`Thread ${record.threadId} state hash failed during thaw`);
      }
      const trace = this.#database.prepare(`
        SELECT a.appraisal_id,s.stance_id,s.thread_state_hash,
          s.request_fingerprint,s.stance_digest
        FROM request_appraisals a
        JOIN private_participation_stances s ON s.appraisal_id=a.appraisal_id
        WHERE a.thread_id=? AND a.request_id=?
      `).get(record.threadId, record.requestId);
      if (
        !trace ||
        trace.appraisal_id !== record.appraisalId ||
        trace.stance_id !== record.stanceId ||
        trace.thread_state_hash !== record.threadStateHash ||
        trace.request_fingerprint !== record.requestFingerprint ||
        trace.stance_digest !== record.stanceDigest
      ) {
        throw new RuntimeStateChangedError(
          `Request ${record.requestId} changed before thaw lease acquisition`,
        );
      }
      const active = this.#database.prepare(
        "SELECT lease_id,expires_at FROM thaw_leases WHERE thread_id=? AND status='active'",
      ).get(record.threadId);
      if (active) {
        if (Date.parse(active.expires_at) > Date.parse(record.acquiredAt)) {
          throw new ThawLeaseConflictError(
            `Thread ${record.threadId} already has active thaw lease ${active.lease_id}`,
          );
        }
        this.#database.prepare(`
          UPDATE runtime_sessions SET status='aborted',completed_at=?
          WHERE lease_id=? AND status='active'
        `).run(record.acquiredAt, active.lease_id);
        this.#database.prepare(`
          UPDATE thaw_leases
          SET status='expired',released_at=?,release_reason='lease_expired'
          WHERE lease_id=? AND status='active'
        `).run(record.acquiredAt, active.lease_id);
      }
      this.#database.prepare(
        "INSERT INTO participation_authorizations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        record.authorizationId,
        record.operationId,
        canonicalJson(record.operation),
        record.operationDigest,
        record.threadId,
        record.requestId,
        record.appraisalId,
        record.stanceId,
        record.snapshotVersion,
        record.threadStateHash,
        record.requestFingerprint,
        canonicalJson(record.authorization),
        record.authorizationDigest,
        record.authorization.issuedAt,
        record.authorization.causationId,
        record.authorization.correlationId,
      );
      this.#database.prepare(`
        INSERT INTO thaw_leases(
          lease_id,authorization_id,thread_id,snapshot_version,thread_state_hash,
          status,acquired_at,expires_at
        ) VALUES (?,?,?,?,?,'active',?,?)
      `).run(
        record.leaseId,
        record.authorizationId,
        record.threadId,
        record.snapshotVersion,
        record.threadStateHash,
        record.acquiredAt,
        record.expiresAt,
      );
      this.#database.prepare(`
        INSERT INTO runtime_sessions(
          session_id,lease_id,authorization_id,thread_id,request_id,
          snapshot_version,thread_state_hash,context_json,context_digest,session_digest,status,started_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,'active',?)
      `).run(
        record.sessionId,
        record.leaseId,
        record.authorizationId,
        record.threadId,
        record.requestId,
        record.snapshotVersion,
        record.threadStateHash,
        canonicalJson(record.context),
        record.contextDigest,
        record.sessionDigest,
        record.acquiredAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { runtime: this.getRuntime(record.threadId, record.sessionId), idempotent: false };
  }

  #active(runtime, completedAt) {
    assertIsoTimestamp("runtime completedAt", completedAt);
    if (runtime.session.status !== "active" || runtime.lease.status !== "active") {
      throw new RuntimeOrderError(`Runtime session ${runtime.session.sessionId} is not active`);
    }
    if (Date.parse(completedAt) < Date.parse(runtime.lease.acquiredAt)) {
      throw new IntegrityError("kernel clock moved before lease acquisition");
    }
    if (Date.parse(completedAt) >= Date.parse(runtime.lease.expiresAt)) {
      throw new RuntimeLeaseExpiredError(
        `Thaw lease ${runtime.lease.leaseId} expired before runtime work completed`,
      );
    }
  }

  runActor(record) {
    const prior = this.getRuntimeByActorOperation(
      record.operationId,
      record.threadId,
      record.sessionId,
    );
    if (prior) return { runtime: prior, idempotent: true };
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const runtime = this.getRuntime(record.threadId, record.sessionId);
      this.#active(runtime, record.completedAt);
      if (runtime.actorRun) {
        throw new RuntimeConflictError(`Runtime session ${record.sessionId} already has an Actor run`);
      }
      if (record.inputDigest !== runtime.session.contextDigest) {
        throw new IntegrityError("Actor input digest does not match runtime context");
      }
      this.#database.prepare("INSERT INTO actor_runs VALUES (?,?,?,?,?,?,?,?,?,?)").run(
        record.actorRunId,
        record.operationId,
        record.operationDigest,
        record.sessionId,
        record.threadId,
        runtime.requestId,
        record.inputDigest,
        canonicalJson(record.output),
        record.outputDigest,
        record.completedAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { runtime: this.getRuntime(record.threadId, record.sessionId), idempotent: false };
  }

  runGoalGuardian(record) {
    const prior = this.getRuntimeByGuardianOperation(
      record.operationId,
      record.threadId,
      record.sessionId,
    );
    if (prior) return { runtime: prior, idempotent: true };
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const runtime = this.getRuntime(record.threadId, record.sessionId);
      this.#active(runtime, record.completedAt);
      if (!runtime.actorRun) {
        throw new RuntimeOrderError(
          `Runtime session ${record.sessionId} must run the Actor before Goal Guardian`,
        );
      }
      if (runtime.goalGuardianAudit) {
        throw new RuntimeConflictError(
          `Runtime session ${record.sessionId} already has a Goal Guardian audit`,
        );
      }
      if (
        record.contextDigest !== runtime.session.contextDigest ||
        record.actorOutputDigest !== runtime.actorRun.outputDigest
      ) {
        throw new IntegrityError("Goal Guardian inputs do not match persisted runtime witnesses");
      }
      this.#database.prepare(
        "INSERT INTO goal_guardian_audits VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        record.auditId,
        record.operationId,
        record.operationDigest,
        record.sessionId,
        runtime.actorRun.actorRunId,
        record.threadId,
        runtime.requestId,
        record.contextDigest,
        record.actorOutputDigest,
        canonicalJson(record.audit),
        record.auditDigest,
        record.completedAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { runtime: this.getRuntime(record.threadId, record.sessionId), idempotent: false };
  }

  verifyRuntimeIntegrity(threadId, sessionId) {
    const runtime = this.getRuntime(threadId, sessionId);
    return {
      threadId: runtime.threadId,
      requestId: runtime.requestId,
      snapshotVersion: runtime.snapshotVersion,
      threadStateHash: runtime.threadStateHash,
      authorizationId: runtime.authorization.authorizationId,
      authorizationDigest: runtime.authorizationDigest,
      leaseId: runtime.lease.leaseId,
      leaseStatus: runtime.lease.status,
      sessionId: runtime.session.sessionId,
      sessionStatus: runtime.session.status,
      contextDigest: runtime.session.contextDigest,
      sessionDigest: runtime.session.sessionDigest,
      actorRunId: runtime.actorRun?.actorRunId ?? null,
      actorOutputDigest: runtime.actorRun?.outputDigest ?? null,
      goalGuardianAuditId: runtime.goalGuardianAudit?.auditId ?? null,
      goalGuardianAuditDigest: runtime.goalGuardianAudit?.auditDigest ?? null,
      goalGuardianDecision: runtime.goalGuardianAudit?.audit.decision ?? null,
    };
  }
}

export function openRuntimeStore(databasePath) {
  return new RuntimeStore(databasePath);
}
