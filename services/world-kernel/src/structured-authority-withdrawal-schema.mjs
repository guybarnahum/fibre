export function createStructuredAuthorityWithdrawalTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS structured_authority_withdrawal_closures (
      closure_id TEXT PRIMARY KEY CHECK (length(closure_id)=68 AND substr(closure_id,1,4)='obw_' AND substr(closure_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL CHECK (length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:'),
      thread_id TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      request_id TEXT NOT NULL,
      authorization_id TEXT NOT NULL UNIQUE,
      authorization_digest TEXT NOT NULL CHECK (length(authorization_digest)=71 AND substr(authorization_digest,1,7)='sha256:'),
      applicability_id TEXT NOT NULL UNIQUE,
      applicability_decision_digest TEXT NOT NULL CHECK (length(applicability_decision_digest)=71 AND substr(applicability_decision_digest,1,7)='sha256:'),
      obligation_id TEXT NOT NULL,
      authorized_obligation_revision INTEGER NOT NULL CHECK (authorized_obligation_revision>=1),
      authorized_obligation_digest TEXT NOT NULL CHECK (length(authorized_obligation_digest)=71 AND substr(authorized_obligation_digest,1,7)='sha256:'),
      current_obligation_revision INTEGER NOT NULL CHECK (current_obligation_revision>=1),
      current_obligation_digest TEXT NOT NULL CHECK (length(current_obligation_digest)=71 AND substr(current_obligation_digest,1,7)='sha256:'),
      current_obligation_status TEXT NOT NULL CHECK (current_obligation_status IN ('active','satisfied','expired','revoked','discharged')),
      actor_run_id TEXT NOT NULL UNIQUE,
      actor_output_digest TEXT NOT NULL CHECK (length(actor_output_digest)=71 AND substr(actor_output_digest,1,7)='sha256:'),
      guardian_audit_id TEXT NOT NULL UNIQUE,
      guardian_audit_digest TEXT NOT NULL CHECK (length(guardian_audit_digest)=71 AND substr(guardian_audit_digest,1,7)='sha256:'),
      withdrawal_cause TEXT NOT NULL CHECK (withdrawal_cause IN ('superseded','status_changed','expired','legacy_tombstoned')),
      reason_code TEXT NOT NULL CHECK (reason_code='governing_authority_withdrawn'),
      closure_json TEXT NOT NULL CHECK (json_valid(closure_json)),
      closure_digest TEXT NOT NULL CHECK (length(closure_digest)=71 AND substr(closure_digest,1,7)='sha256:'),
      closed_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (applicability_id) REFERENCES obligation_applicability_decisions(applicability_id),
      FOREIGN KEY (obligation_id, authorized_obligation_revision) REFERENCES obligation_records(obligation_id,revision),
      FOREIGN KEY (obligation_id, current_obligation_revision) REFERENCES obligation_records(obligation_id,revision),
      FOREIGN KEY (actor_run_id) REFERENCES actor_runs(actor_run_id),
      FOREIGN KEY (guardian_audit_id) REFERENCES goal_guardian_audits(audit_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_structured_authority_withdrawal_thread
      ON structured_authority_withdrawal_closures(thread_id,closed_at,closure_id);

    CREATE TRIGGER IF NOT EXISTS structured_authority_withdrawal_no_update
      BEFORE UPDATE ON structured_authority_withdrawal_closures
      BEGIN SELECT RAISE(ABORT,'structured_authority_withdrawal_closures is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS structured_authority_withdrawal_no_delete
      BEFORE DELETE ON structured_authority_withdrawal_closures
      BEGIN SELECT RAISE(ABORT,'structured_authority_withdrawal_closures is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS structured_authority_withdrawal_evidence_guard
      BEFORE INSERT ON structured_authority_withdrawal_closures
      WHEN NOT EXISTS (
        SELECT 1
        FROM runtime_sessions runtime
        JOIN thaw_leases lease ON lease.lease_id=runtime.lease_id
        JOIN participation_authorizations authorization ON authorization.authorization_id=runtime.authorization_id
        JOIN obligation_applicability_decisions applicability ON applicability.applicability_id=NEW.applicability_id
        JOIN obligation_records authorized_obligation
          ON authorized_obligation.obligation_id=NEW.obligation_id
         AND authorized_obligation.revision=NEW.authorized_obligation_revision
        JOIN obligation_records current_obligation
          ON current_obligation.obligation_id=NEW.obligation_id
         AND current_obligation.revision=NEW.current_obligation_revision
        JOIN actor_runs actor ON actor.actor_run_id=NEW.actor_run_id
        JOIN goal_guardian_audits guardian ON guardian.audit_id=NEW.guardian_audit_id
        WHERE runtime.session_id=NEW.session_id
          AND runtime.thread_id=NEW.thread_id
          AND runtime.request_id=NEW.request_id
          AND runtime.status='active'
          AND lease.status='active'
          AND NEW.closed_at>=lease.acquired_at
          AND NEW.closed_at<lease.expires_at
          AND authorization.authorization_id=NEW.authorization_id
          AND authorization.authorization_digest=NEW.authorization_digest
          AND json_extract(authorization.authorization_json,'$.participationBasis')='obligation_override'
          AND json_extract(authorization.authorization_json,'$.applicability.applicabilityId')=NEW.applicability_id
          AND json_extract(authorization.authorization_json,'$.applicability.decisionDigest')=NEW.applicability_decision_digest
          AND json_extract(authorization.authorization_json,'$.applicability.obligationId')=NEW.obligation_id
          AND json_extract(authorization.authorization_json,'$.applicability.obligationRevision')=NEW.authorized_obligation_revision
          AND json_extract(authorization.authorization_json,'$.applicability.obligationDigest')=NEW.authorized_obligation_digest
          AND applicability.result='applies'
          AND applicability.thread_id=NEW.thread_id
          AND applicability.request_id=NEW.request_id
          AND applicability.obligation_id=NEW.obligation_id
          AND applicability.obligation_revision=NEW.authorized_obligation_revision
          AND applicability.obligation_digest=NEW.authorized_obligation_digest
          AND applicability.decision_digest=NEW.applicability_decision_digest
          AND authorized_obligation.thread_id=NEW.thread_id
          AND authorized_obligation.obligation_digest=NEW.authorized_obligation_digest
          AND current_obligation.thread_id=NEW.thread_id
          AND current_obligation.obligation_digest=NEW.current_obligation_digest
          AND current_obligation.status=NEW.current_obligation_status
          AND current_obligation.recorded_at<=NEW.closed_at
          AND NOT EXISTS (
            SELECT 1 FROM obligation_records newer
            WHERE newer.obligation_id=NEW.obligation_id
              AND newer.revision>NEW.current_obligation_revision
          )
          AND actor.session_id=NEW.session_id
          AND actor.thread_id=NEW.thread_id
          AND actor.output_digest=NEW.actor_output_digest
          AND guardian.session_id=NEW.session_id
          AND guardian.thread_id=NEW.thread_id
          AND guardian.actor_run_id=NEW.actor_run_id
          AND guardian.audit_digest=NEW.guardian_audit_digest
          AND json_extract(guardian.audit_json,'$.decision')='pass'
          AND NOT EXISTS (
            SELECT 1 FROM authorization_consumptions consumption
            WHERE consumption.authorization_id=NEW.authorization_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM freeze_reports freeze WHERE freeze.session_id=NEW.session_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM structured_obligation_discharges discharge
            WHERE discharge.session_id=NEW.session_id
          )
          AND (
            current_obligation.revision<>NEW.authorized_obligation_revision
            OR current_obligation.status<>'active'
            OR (current_obligation.expires_at IS NOT NULL AND NEW.closed_at>=current_obligation.expires_at)
            OR (current_obligation.legacy_source_digest IS NOT NULL AND EXISTS (
              SELECT 1 FROM legacy_obligation_tombstones tombstone
              WHERE tombstone.thread_id=NEW.thread_id
                AND tombstone.legacy_reference_digest=current_obligation.legacy_source_digest
            ))
          )
      )
      BEGIN SELECT RAISE(ABORT,'structured authority withdrawal evidence is not causally bound'); END;
  `);
}
