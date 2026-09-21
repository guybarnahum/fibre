export function createLivedExperienceTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS lived_encounter_records (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      visitor_utterance TEXT NOT NULL,
      response_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS lived_shared_meeting_records (
      shared_event_id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      initiator_thread_id TEXT NOT NULL,
      responder_thread_id TEXT NOT NULL,
      initiator_situation_id TEXT NOT NULL,
      responder_situation_id TEXT NOT NULL,
      opening_text TEXT NOT NULL,
      response_text TEXT NOT NULL,
      followup_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (initiator_thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (responder_thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS lived_encounter_shared_refs (
      event_id TEXT PRIMARY KEY,
      shared_event_ref TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES lived_encounter_records(event_id),
      FOREIGN KEY (shared_event_ref) REFERENCES lived_shared_meeting_records(shared_event_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_journal_entries (
      journal_entry_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      about_event_ref TEXT NOT NULL,
      written_at TEXT NOT NULL,
      entry_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (about_event_ref) REFERENCES lived_encounter_records(event_id),
      UNIQUE (thread_id, about_event_ref)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_lived_encounter_thread_time
      ON lived_encounter_records(thread_id, occurred_at, event_id);
    CREATE INDEX IF NOT EXISTS idx_thread_journal_thread_time
      ON thread_journal_entries(thread_id, written_at, journal_entry_id);
    CREATE INDEX IF NOT EXISTS idx_shared_meeting_time
      ON lived_shared_meeting_records(occurred_at, shared_event_id);

    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_update
      BEFORE UPDATE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_delete
      BEFORE DELETE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_meeting_records_no_update
      BEFORE UPDATE ON lived_shared_meeting_records BEGIN
        SELECT RAISE(ABORT, 'lived_shared_meeting_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_meeting_records_no_delete
      BEFORE DELETE ON lived_shared_meeting_records BEGIN
        SELECT RAISE(ABORT, 'lived_shared_meeting_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_encounter_shared_refs_no_update
      BEFORE UPDATE ON lived_encounter_shared_refs BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_shared_refs is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_encounter_shared_refs_no_delete
      BEFORE DELETE ON lived_encounter_shared_refs BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_shared_refs is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_journal_entries_no_update
      BEFORE UPDATE ON thread_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_journal_entries_no_delete
      BEFORE DELETE ON thread_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_journal_entries is append-only');
      END;
  `);
}
