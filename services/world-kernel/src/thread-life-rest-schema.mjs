// A Thread's autonomous life may rest and wake. History is append-only; the
// compact current table exists only so every due-work query can skip resting
// lives with one primary-key lookup.
export function createThreadLifeRestTables(database){
  database.exec(`
    CREATE TABLE IF NOT EXISTS thread_life_rest_events (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('rest','wake')),
      occurred_at TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 200),
      actor TEXT NOT NULL CHECK (length(actor) BETWEEN 1 AND 120),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_thread_life_rest_events_thread
      ON thread_life_rest_events(thread_id,occurred_at);
    CREATE TRIGGER IF NOT EXISTS thread_life_rest_events_no_update
      BEFORE UPDATE ON thread_life_rest_events
      BEGIN SELECT RAISE(ABORT,'thread_life_rest_events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_life_rest_events_no_delete
      BEFORE DELETE ON thread_life_rest_events
      BEGIN SELECT RAISE(ABORT,'thread_life_rest_events is append-only'); END;

    CREATE TABLE IF NOT EXISTS thread_life_rest (
      thread_id TEXT PRIMARY KEY,
      rest_event_id TEXT NOT NULL,
      rested_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (rest_event_id) REFERENCES thread_life_rest_events(event_id)
    ) STRICT, WITHOUT ROWID;

    -- The current table follows history; it is never written directly.
    CREATE TRIGGER IF NOT EXISTS thread_life_rest_follows_history
      AFTER INSERT ON thread_life_rest_events
      BEGIN
        INSERT INTO thread_life_rest(thread_id,rest_event_id,rested_at)
          SELECT NEW.thread_id,NEW.event_id,NEW.occurred_at WHERE NEW.kind='rest';
        DELETE FROM thread_life_rest
          WHERE NEW.kind='wake' AND thread_id=NEW.thread_id;
      END;
  `);
}

// Due-work readers spell one predicate literally, so their static SQL stays
// visible to the query-plan audit: a primary-key probe per participant,
//   NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest
//     WHERE life_rest.thread_id IN (<thread column>[,<counterpart column>]))
