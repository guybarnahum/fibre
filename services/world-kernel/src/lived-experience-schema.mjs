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

    CREATE TABLE IF NOT EXISTS lived_shared_encounter_records (
      shared_event_id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      initiator_thread_id TEXT NOT NULL,
      story_json TEXT NOT NULL CHECK (json_valid(story_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (initiator_thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS lived_shared_encounter_participants (
      shared_event_ref TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      PRIMARY KEY (shared_event_ref, thread_id),
      FOREIGN KEY (shared_event_ref) REFERENCES lived_shared_encounter_records(shared_event_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_shared_encounter_experiences (
      experience_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      shared_event_ref TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (thread_id, shared_event_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (shared_event_ref) REFERENCES lived_shared_encounter_records(shared_event_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_shared_encounter_journal_entries (
      journal_entry_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      about_experience_ref TEXT NOT NULL,
      written_at TEXT NOT NULL,
      entry_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (thread_id, about_experience_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (about_experience_ref) REFERENCES thread_shared_encounter_experiences(experience_id)
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
    CREATE INDEX IF NOT EXISTS idx_shared_encounter_time
      ON lived_shared_encounter_records(occurred_at, shared_event_id);
    CREATE INDEX IF NOT EXISTS idx_shared_encounter_participant
      ON lived_shared_encounter_participants(thread_id, shared_event_ref);
    CREATE INDEX IF NOT EXISTS idx_shared_experience_thread_time
      ON thread_shared_encounter_experiences(thread_id, occurred_at, experience_id);
    CREATE INDEX IF NOT EXISTS idx_shared_journal_thread_time
      ON thread_shared_encounter_journal_entries(thread_id, written_at, journal_entry_id);

    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_update
      BEFORE UPDATE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_delete
      BEFORE DELETE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_encounter_records_no_update
      BEFORE UPDATE ON lived_shared_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_shared_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_encounter_records_no_delete
      BEFORE DELETE ON lived_shared_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_shared_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_encounter_participants_no_update
      BEFORE UPDATE ON lived_shared_encounter_participants BEGIN
        SELECT RAISE(ABORT, 'lived_shared_encounter_participants is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_shared_encounter_participants_no_delete
      BEFORE DELETE ON lived_shared_encounter_participants BEGIN
        SELECT RAISE(ABORT, 'lived_shared_encounter_participants is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_shared_encounter_experiences_no_update
      BEFORE UPDATE ON thread_shared_encounter_experiences BEGIN
        SELECT RAISE(ABORT, 'thread_shared_encounter_experiences is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_shared_encounter_experiences_no_delete
      BEFORE DELETE ON thread_shared_encounter_experiences BEGIN
        SELECT RAISE(ABORT, 'thread_shared_encounter_experiences is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_shared_encounter_journal_entries_no_update
      BEFORE UPDATE ON thread_shared_encounter_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_shared_encounter_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_shared_encounter_journal_entries_no_delete
      BEFORE DELETE ON thread_shared_encounter_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_shared_encounter_journal_entries is append-only');
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
