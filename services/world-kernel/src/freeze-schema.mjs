export function createFreezeTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS authorization_consumptions (
      authorization_id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL CHECK (length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:' AND substr(operation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      session_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      event_id TEXT NOT NULL UNIQUE,
      consumed_at TEXT NOT NULL,
      obligation_refs_json TEXT NOT NULL CHECK (json_valid(obligation_refs_json)),
      consumption_digest TEXT NOT NULL CHECK (length(consumption_digest)=71 AND substr(consumption_digest,1,7)='sha256:' AND substr(consumption_digest,8) NOT GLOB '*[^0-9a-f]*'),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (event_id) REFERENCES thread_events(event_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS freeze_reports (
      report_id TEXT PRIMARY KEY CHECK (length(report_id)=68 AND substr(report_id,1,4)='frz_' AND substr(report_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL CHECK (length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:' AND substr(operation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      session_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      authorization_id TEXT NOT NULL UNIQUE,
      actor_run_id TEXT NOT NULL UNIQUE,
      audit_id TEXT NOT NULL UNIQUE,
      event_id TEXT NOT NULL UNIQUE,
      report_json TEXT NOT NULL CHECK (json_valid(report_json)),
      report_digest TEXT NOT NULL CHECK (length(report_digest)=71 AND substr(report_digest,1,7)='sha256:' AND substr(report_digest,8) NOT GLOB '*[^0-9a-f]*'),
      completed_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (actor_run_id) REFERENCES actor_runs(actor_run_id),
      FOREIGN KEY (audit_id) REFERENCES goal_guardian_audits(audit_id),
      FOREIGN KEY (event_id) REFERENCES thread_events(event_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_memories (
      memory_id TEXT PRIMARY KEY CHECK (length(memory_id)=68 AND substr(memory_id,1,4)='mem_' AND substr(memory_id,5) NOT GLOB '*[^0-9a-f]*'),
      thread_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
      created_at TEXT NOT NULL,
      memory_digest TEXT NOT NULL CHECK (length(memory_digest)=71 AND substr(memory_digest,1,7)='sha256:' AND substr(memory_digest,8) NOT GLOB '*[^0-9a-f]*'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (event_id) REFERENCES thread_events(event_id),
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS runtime_abandons (
      abandonment_id TEXT PRIMARY KEY CHECK (length(abandonment_id)=68 AND substr(abandonment_id,1,4)='abd_' AND substr(abandonment_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      operation_digest TEXT NOT NULL CHECK (length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:' AND substr(operation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      session_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      authorization_id TEXT NOT NULL UNIQUE,
      audit_id TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL CHECK (reason='guardian_rejected'),
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (length(record_digest)=71 AND substr(record_digest,1,7)='sha256:' AND substr(record_digest,8) NOT GLOB '*[^0-9a-f]*'),
      abandoned_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (audit_id) REFERENCES goal_guardian_audits(audit_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_thread_memories_thread_event
      ON thread_memories(thread_id,event_id,memory_id);
    CREATE INDEX IF NOT EXISTS idx_runtime_abandons_thread_time
      ON runtime_abandons(thread_id,abandoned_at,abandonment_id);

    CREATE TRIGGER IF NOT EXISTS participation_authorizations_reject_discharged_obligation
      BEFORE INSERT ON participation_authorizations
      WHEN EXISTS (
        SELECT 1
        FROM json_each(NEW.authorization_json,'$.obligationReferences') requested
        JOIN authorization_consumptions consumed ON consumed.thread_id=NEW.thread_id
        JOIN json_each(consumed.obligation_refs_json) spent ON spent.value=requested.value
      )
      BEGIN SELECT RAISE(ABORT,'authorization obligation was already discharged'); END;

    CREATE TRIGGER IF NOT EXISTS authorization_consumptions_no_update
      BEFORE UPDATE ON authorization_consumptions
      BEGIN SELECT RAISE(ABORT,'authorization_consumptions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS authorization_consumptions_no_delete
      BEFORE DELETE ON authorization_consumptions
      BEGIN SELECT RAISE(ABORT,'authorization_consumptions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS freeze_reports_no_update
      BEFORE UPDATE ON freeze_reports
      BEGIN SELECT RAISE(ABORT,'freeze_reports is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS freeze_reports_no_delete
      BEFORE DELETE ON freeze_reports
      BEGIN SELECT RAISE(ABORT,'freeze_reports is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_memories_no_update
      BEFORE UPDATE ON thread_memories
      BEGIN SELECT RAISE(ABORT,'thread_memories is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_memories_no_delete
      BEFORE DELETE ON thread_memories
      BEGIN SELECT RAISE(ABORT,'thread_memories is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS runtime_abandons_no_update
      BEFORE UPDATE ON runtime_abandons
      BEGIN SELECT RAISE(ABORT,'runtime_abandons is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS runtime_abandons_no_delete
      BEFORE DELETE ON runtime_abandons
      BEGIN SELECT RAISE(ABORT,'runtime_abandons is append-only'); END;
  `);
}