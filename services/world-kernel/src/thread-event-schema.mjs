// Shared event-table definition for creation, portable rebuild and recovery.
export function createThreadEventsTable(database,name="thread_events"){
  database.exec(`
    CREATE TABLE IF NOT EXISTS "${name}" (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_type TEXT NOT NULL CHECK (event_type IN ('THREAD_SEEDED','THREAD_LIFE_EPISODE_RECORDED','SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED','AUTOBIOGRAPHICAL_MEMORY_RECORDED','GENESIS_SEX_MIGRATED','THREAD_IDENTITY_UPDATED','THREAD_PHYSICAL_GENOME_MIGRATED')),
      command_id TEXT,
      command_digest TEXT,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      actor_json TEXT NOT NULL CHECK (json_valid(actor_json)),
      occurred_at TEXT NOT NULL,
      state_hash TEXT NOT NULL CHECK (state_hash LIKE 'sha256:%'),
      authorization_id TEXT,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      payload_schema_version INTEGER NOT NULL CHECK (payload_schema_version >= 1),
      provenance_json TEXT NOT NULL CHECK (json_valid(provenance_json)),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      UNIQUE (thread_id, sequence),
      CHECK (
        (event_type IN ('THREAD_SEEDED','THREAD_LIFE_EPISODE_RECORDED','GENESIS_SEX_MIGRATED','THREAD_IDENTITY_UPDATED','THREAD_PHYSICAL_GENOME_MIGRATED') AND command_id IS NULL AND command_digest IS NULL)
        OR
        (event_type IN ('SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED','AUTOBIOGRAPHICAL_MEMORY_RECORDED') AND command_id IS NOT NULL AND command_digest IS NOT NULL)
      )
    ) STRICT;
  `);
}

export function installThreadEventGuards(database){
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_thread_events_thread_sequence
      ON thread_events(thread_id, sequence);
    CREATE TRIGGER IF NOT EXISTS thread_events_no_update
      BEFORE UPDATE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_events_no_delete
      BEFORE DELETE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
  `);
}
