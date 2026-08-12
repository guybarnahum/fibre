export function createRuntimeTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS participation_authorizations (
      authorization_id TEXT PRIMARY KEY CHECK (length(authorization_id)=69 AND substr(authorization_id,1,5)='auth_' AND substr(authorization_id,6) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_json TEXT NOT NULL CHECK (json_valid(operation_json)),
      operation_digest TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      appraisal_id TEXT NOT NULL,
      stance_id TEXT NOT NULL UNIQUE,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      authorization_json TEXT NOT NULL CHECK (json_valid(authorization_json)),
      authorization_digest TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thaw_leases (
      lease_id TEXT PRIMARY KEY CHECK (length(lease_id)=70 AND substr(lease_id,1,6)='lease_' AND substr(lease_id,7) NOT GLOB '*[^0-9a-f]*'),
      authorization_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','expired','released')),
      acquired_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      released_at TEXT,
      release_reason TEXT,
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((status='active' AND released_at IS NULL AND release_reason IS NULL) OR (status<>'active' AND released_at IS NOT NULL AND release_reason IS NOT NULL))
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_thaw_leases_one_active_per_thread
      ON thaw_leases(thread_id) WHERE status='active';

    CREATE TABLE IF NOT EXISTS runtime_sessions (
      session_id TEXT PRIMARY KEY CHECK (length(session_id)=68 AND substr(session_id,1,4)='run_' AND substr(session_id,5) NOT GLOB '*[^0-9a-f]*'),
      lease_id TEXT NOT NULL UNIQUE,
      authorization_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL,
      context_json TEXT NOT NULL CHECK (json_valid(context_json)),
      context_digest TEXT NOT NULL,
      session_digest TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','completed','aborted')),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (lease_id) REFERENCES thaw_leases(lease_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((status='active' AND completed_at IS NULL) OR (status<>'active' AND completed_at IS NOT NULL))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS actor_runs (
      actor_run_id TEXT PRIMARY KEY CHECK (length(actor_run_id)=68 AND substr(actor_run_id,1,4)='act_' AND substr(actor_run_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      input_digest TEXT NOT NULL,
      output_json TEXT NOT NULL CHECK (json_valid(output_json)),
      output_digest TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS goal_guardian_audits (
      audit_id TEXT PRIMARY KEY CHECK (length(audit_id)=68 AND substr(audit_id,1,4)='gga_' AND substr(audit_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      actor_run_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      context_digest TEXT NOT NULL,
      actor_output_digest TEXT NOT NULL,
      audit_json TEXT NOT NULL CHECK (json_valid(audit_json)),
      audit_digest TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (actor_run_id) REFERENCES actor_runs(actor_run_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_runtime_sessions_thread_started
      ON runtime_sessions(thread_id, started_at, session_id);
    CREATE TRIGGER IF NOT EXISTS participation_authorizations_no_update
      BEFORE UPDATE ON participation_authorizations
      BEGIN SELECT RAISE(ABORT,'participation_authorizations is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS participation_authorizations_no_delete
      BEFORE DELETE ON participation_authorizations
      BEGIN SELECT RAISE(ABORT,'participation_authorizations is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS structured_participation_basis_known
      BEFORE INSERT ON participation_authorizations
      WHEN json_extract(NEW.authorization_json,'$.participationBasis') IS NOT NULL
        AND json_extract(NEW.authorization_json,'$.participationBasis') NOT IN ('willing','obligation_override')
      BEGIN SELECT RAISE(ABORT,'structured participation basis is invalid'); END;

    CREATE TRIGGER IF NOT EXISTS structured_willing_authorization_guard
      BEFORE INSERT ON participation_authorizations
      WHEN json_extract(NEW.authorization_json,'$.participationBasis')='willing'
        AND (
          json_extract(NEW.authorization_json,'$.desiredAction')<>'accept' OR
          json_extract(NEW.authorization_json,'$.authorizedAction')<>'accept' OR
          json_extract(NEW.authorization_json,'$.dignityBand')<>'high' OR
          COALESCE(json_array_length(json_extract(NEW.authorization_json,'$.obligationReferences')),-1)<>0 OR
          COALESCE(json_type(NEW.authorization_json,'$.applicability'),'null')<>'null'
        )
      BEGIN SELECT RAISE(ABORT,'willing participation authorization contradicts private consent'); END;

    CREATE TRIGGER IF NOT EXISTS structured_obligation_authorization_guard
      BEFORE INSERT ON participation_authorizations
      WHEN json_extract(NEW.authorization_json,'$.participationBasis')='obligation_override'
        AND (
          json_extract(NEW.authorization_json,'$.desiredAction')='accept' OR
          json_extract(NEW.authorization_json,'$.authorizedAction')<>'accept' OR
          COALESCE(json_array_length(json_extract(NEW.authorization_json,'$.obligationReferences')),-1)<>0 OR
          NOT EXISTS (
            SELECT 1
            FROM obligation_applicability_decisions decision
            JOIN obligation_records obligation
              ON obligation.obligation_id=decision.obligation_id
             AND obligation.revision=decision.obligation_revision
             AND obligation.thread_id=decision.thread_id
             AND obligation.obligation_digest=decision.obligation_digest
            WHERE decision.applicability_id=json_extract(NEW.authorization_json,'$.applicability.applicabilityId')
              AND decision.decision_digest=json_extract(NEW.authorization_json,'$.applicability.decisionDigest')
              AND decision.result='applies'
              AND decision.policy_id='structured_obligation_applicability'
              AND decision.policy_version='1'
              AND decision.thread_id=NEW.thread_id
              AND decision.request_id=NEW.request_id
              AND decision.snapshot_version=NEW.snapshot_version
              AND decision.thread_state_hash=NEW.thread_state_hash
              AND decision.request_fingerprint=NEW.request_fingerprint
              AND decision.decided_at<=NEW.issued_at
              AND decision.obligation_id=json_extract(NEW.authorization_json,'$.applicability.obligationId')
              AND decision.obligation_revision=json_extract(NEW.authorization_json,'$.applicability.obligationRevision')
              AND decision.obligation_digest=json_extract(NEW.authorization_json,'$.applicability.obligationDigest')
              AND json_extract(NEW.authorization_json,'$.applicability.policy.id')='structured_obligation_applicability'
              AND json_extract(NEW.authorization_json,'$.applicability.policy.version')='1'
              AND obligation.status='active'
              AND obligation.recorded_at<=NEW.issued_at
              AND obligation.effective_at<=NEW.issued_at
              AND (obligation.expires_at IS NULL OR NEW.issued_at<obligation.expires_at)
              AND json_extract(obligation.obligation_json,'$.scope.binding.kind')='request_fingerprint'
              AND json_extract(obligation.obligation_json,'$.scope.binding.requestFingerprint')=NEW.request_fingerprint
              AND NOT EXISTS (
                SELECT 1 FROM obligation_records newer
                WHERE newer.obligation_id=obligation.obligation_id
                  AND newer.revision>obligation.revision
              )
              AND (
                obligation.legacy_source_digest IS NULL OR NOT EXISTS (
                  SELECT 1 FROM legacy_obligation_tombstones tombstone
                  WHERE tombstone.thread_id=NEW.thread_id
                    AND tombstone.legacy_reference_digest=obligation.legacy_source_digest
                )
              )
          )
        )
      BEGIN SELECT RAISE(ABORT,'structured obligation applicability is not current execution authority'); END;

    CREATE TRIGGER IF NOT EXISTS thaw_leases_no_delete
      BEFORE DELETE ON thaw_leases
      BEGIN SELECT RAISE(ABORT,'thaw_leases cannot be deleted'); END;
    CREATE TRIGGER IF NOT EXISTS thaw_leases_restrict_update
      BEFORE UPDATE ON thaw_leases
      WHEN OLD.status<>'active' OR NEW.status NOT IN ('expired','released') OR
        NEW.lease_id<>OLD.lease_id OR NEW.authorization_id<>OLD.authorization_id OR
        NEW.thread_id<>OLD.thread_id OR NEW.snapshot_version<>OLD.snapshot_version OR
        NEW.thread_state_hash<>OLD.thread_state_hash OR NEW.acquired_at<>OLD.acquired_at OR
        NEW.expires_at<>OLD.expires_at OR NEW.released_at IS NULL OR NEW.release_reason IS NULL
      BEGIN SELECT RAISE(ABORT,'thaw_leases immutable fields cannot change'); END;
    CREATE TRIGGER IF NOT EXISTS runtime_sessions_no_delete
      BEFORE DELETE ON runtime_sessions
      BEGIN SELECT RAISE(ABORT,'runtime_sessions cannot be deleted'); END;
    CREATE TRIGGER IF NOT EXISTS runtime_sessions_restrict_update
      BEFORE UPDATE ON runtime_sessions
      WHEN OLD.status<>'active' OR NEW.status NOT IN ('completed','aborted') OR
        NEW.session_id<>OLD.session_id OR NEW.lease_id<>OLD.lease_id OR
        NEW.authorization_id<>OLD.authorization_id OR NEW.thread_id<>OLD.thread_id OR
        NEW.request_id<>OLD.request_id OR NEW.snapshot_version<>OLD.snapshot_version OR
        NEW.thread_state_hash<>OLD.thread_state_hash OR NEW.context_json<>OLD.context_json OR
        NEW.context_digest<>OLD.context_digest OR NEW.session_digest<>OLD.session_digest OR
        NEW.started_at<>OLD.started_at OR NEW.completed_at IS NULL
      BEGIN SELECT RAISE(ABORT,'runtime_sessions immutable fields cannot change'); END;
    CREATE TRIGGER IF NOT EXISTS actor_runs_no_update
      BEFORE UPDATE ON actor_runs
      BEGIN SELECT RAISE(ABORT,'actor_runs is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS actor_runs_no_delete
      BEFORE DELETE ON actor_runs
      BEGIN SELECT RAISE(ABORT,'actor_runs is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS goal_guardian_audits_no_update
      BEFORE UPDATE ON goal_guardian_audits
      BEGIN SELECT RAISE(ABORT,'goal_guardian_audits is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS goal_guardian_audits_no_delete
      BEFORE DELETE ON goal_guardian_audits
      BEGIN SELECT RAISE(ABORT,'goal_guardian_audits is append-only'); END;
  `);
}