export function createContactTables(database){
  database.exec(`
    CREATE TABLE IF NOT EXISTS person_contact_capabilities (
      capability_id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL UNIQUE,
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

    CREATE INDEX IF NOT EXISTS idx_thread_contact_attempts_thread
      ON thread_contact_attempts(thread_id,started_at,contact_attempt_id);
    CREATE INDEX IF NOT EXISTS idx_thread_contact_messages_recipient
      ON thread_contact_messages(recipient_party_id,sent_at,message_id);
    CREATE INDEX IF NOT EXISTS idx_thread_contact_messages_sender
      ON thread_contact_messages(sender_thread_id,sent_at,message_id);

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
}
