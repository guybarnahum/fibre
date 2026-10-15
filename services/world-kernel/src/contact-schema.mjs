export function createContactTables(database){
  const needsPendingWork=database.prepare(`
    SELECT 1 FROM sqlite_master WHERE type='table'
      AND name='thread_contact_pending_work'
  `).get()===undefined;
  database.exec(`
    CREATE TABLE IF NOT EXISTS person_contact_capabilities (
      capability_id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%')
    ) STRICT;

    CREATE TABLE IF NOT EXISTS person_contact_capability_revocations (
      capability_id TEXT PRIMARY KEY,
      revoked_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (capability_id) REFERENCES person_contact_capabilities(capability_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_contact_attempts (
      contact_attempt_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      consolidation_id TEXT NOT NULL UNIQUE,
      started_at TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (consolidation_id) REFERENCES thread_experience_consolidations(consolidation_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_contact_attempt_stages (
      contact_attempt_id TEXT NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN ('decision','expression','complete')),
      recorded_at TEXT NOT NULL,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (contact_attempt_id,stage),
      FOREIGN KEY (contact_attempt_id) REFERENCES thread_contact_attempts(contact_attempt_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_contact_messages (
      message_id TEXT PRIMARY KEY,
      contact_attempt_id TEXT NOT NULL UNIQUE,
      sender_thread_id TEXT NOT NULL,
      recipient_party_id TEXT NOT NULL,
      recipient_kind TEXT NOT NULL CHECK (recipient_kind IN ('thread','person')),
      sent_at TEXT NOT NULL,
      message_text TEXT NOT NULL,
      source_consolidation_id TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (contact_attempt_id) REFERENCES thread_contact_attempts(contact_attempt_id),
      FOREIGN KEY (sender_thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (source_consolidation_id) REFERENCES thread_experience_consolidations(consolidation_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_contact_receptions (
      message_id TEXT PRIMARY KEY,
      recipient_thread_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      situation_id TEXT,
      perceived_at TEXT,
      sender_name TEXT,
      completed_at TEXT,
      blocked_reason TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (message_id) REFERENCES thread_contact_messages(message_id),
      FOREIGN KEY (recipient_thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_thread_contact_receptions_due
      ON thread_contact_receptions(due_at)
      WHERE completed_at IS NULL AND blocked_reason IS NULL;

    CREATE INDEX IF NOT EXISTS idx_person_contact_capabilities_party
      ON person_contact_capabilities(party_id,registered_at,capability_id);
    CREATE INDEX IF NOT EXISTS idx_thread_contact_attempts_thread
      ON thread_contact_attempts(thread_id,started_at,contact_attempt_id);
    CREATE INDEX IF NOT EXISTS idx_thread_contact_messages_recipient
      ON thread_contact_messages(recipient_party_id,sent_at,message_id);
    CREATE INDEX IF NOT EXISTS idx_thread_contact_messages_sender
      ON thread_contact_messages(sender_thread_id,sent_at,message_id);

    -- Mutable contact frontier, derived from immutable decisions and attempts.
    CREATE TABLE IF NOT EXISTS thread_contact_pending_work (
      kind TEXT NOT NULL CHECK (kind IN ('afterthought','attempt')),
      reference TEXT NOT NULL,
      due_at TEXT NOT NULL,
      PRIMARY KEY(kind,reference)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_thread_contact_pending_due
      ON thread_contact_pending_work(kind,due_at,reference);

    CREATE TRIGGER IF NOT EXISTS thread_contact_pending_afterthought
      AFTER INSERT ON thread_experience_consolidation_stages
      WHEN NEW.stage='complete' BEGIN
        INSERT INTO thread_contact_pending_work(kind,reference,due_at)
        SELECT 'afterthought',NEW.consolidation_id,NEW.recorded_at
        FROM thread_experience_consolidation_stages decision
        WHERE decision.consolidation_id=NEW.consolidation_id
          AND decision.stage='decision'
          AND json_array_length(decision.payload_json,'$.afterthoughts')>0
          AND NOT EXISTS (
            SELECT 1 FROM thread_contact_attempts a
            WHERE a.consolidation_id=NEW.consolidation_id
          );
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_pending_claimed
      AFTER INSERT ON thread_contact_attempts BEGIN
        DELETE FROM thread_contact_pending_work
        WHERE kind='afterthought' AND reference=NEW.consolidation_id;
        INSERT INTO thread_contact_pending_work(kind,reference,due_at)
        VALUES ('attempt',NEW.contact_attempt_id,NEW.started_at);
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_pending_completed
      AFTER INSERT ON thread_contact_attempt_stages
      WHEN NEW.stage='complete' BEGIN
        DELETE FROM thread_contact_pending_work
        WHERE kind='attempt' AND reference=NEW.contact_attempt_id;
      END;

    CREATE TRIGGER IF NOT EXISTS person_contact_capabilities_no_update
      BEFORE UPDATE ON person_contact_capabilities BEGIN
        SELECT RAISE(ABORT,'person_contact_capabilities is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS person_contact_capabilities_no_delete
      BEFORE DELETE ON person_contact_capabilities BEGIN
        SELECT RAISE(ABORT,'person_contact_capabilities is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS person_contact_capability_revocations_no_update
      BEFORE UPDATE ON person_contact_capability_revocations BEGIN
        SELECT RAISE(ABORT,'person_contact_capability_revocations is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS person_contact_capability_revocations_no_delete
      BEFORE DELETE ON person_contact_capability_revocations BEGIN
        SELECT RAISE(ABORT,'person_contact_capability_revocations is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_attempts_no_update
      BEFORE UPDATE ON thread_contact_attempts BEGIN
        SELECT RAISE(ABORT,'thread_contact_attempts is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_attempts_no_delete
      BEFORE DELETE ON thread_contact_attempts BEGIN
        SELECT RAISE(ABORT,'thread_contact_attempts is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_attempt_stages_no_update
      BEFORE UPDATE ON thread_contact_attempt_stages BEGIN
        SELECT RAISE(ABORT,'thread_contact_attempt_stages is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_attempt_stages_no_delete
      BEFORE DELETE ON thread_contact_attempt_stages BEGIN
        SELECT RAISE(ABORT,'thread_contact_attempt_stages is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_messages_no_update
      BEFORE UPDATE ON thread_contact_messages BEGIN
        SELECT RAISE(ABORT,'thread_contact_messages is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_contact_messages_no_delete
      BEFORE DELETE ON thread_contact_messages BEGIN
        SELECT RAISE(ABORT,'thread_contact_messages is append-only');
      END;
  `);
  if(needsPendingWork){
    // Migration only: reconcile existing unfinished work once, at deployment.
    database.exec(`
      INSERT INTO thread_contact_pending_work(kind,reference,due_at)
      SELECT 'afterthought',c.consolidation_id,complete.recorded_at
      FROM thread_experience_consolidations c
      JOIN thread_experience_consolidation_stages decision
        ON decision.consolidation_id=c.consolidation_id
        AND decision.stage='decision'
      JOIN thread_experience_consolidation_stages complete
        ON complete.consolidation_id=c.consolidation_id
        AND complete.stage='complete'
      LEFT JOIN thread_contact_attempts a
        ON a.consolidation_id=c.consolidation_id
      WHERE a.contact_attempt_id IS NULL
        AND json_array_length(decision.payload_json,'$.afterthoughts')>0;

      INSERT INTO thread_contact_pending_work(kind,reference,due_at)
      SELECT 'attempt',a.contact_attempt_id,a.started_at
      FROM thread_contact_attempts a
      LEFT JOIN thread_contact_attempt_stages complete
        ON complete.contact_attempt_id=a.contact_attempt_id
        AND complete.stage='complete'
      WHERE complete.contact_attempt_id IS NULL;
    `);
  }
}
