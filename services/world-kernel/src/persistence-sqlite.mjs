import { mkdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import {
  WORLD_STORE_SCHEMA_VERSION,
  IntegrityError,
  StorageBusyError,
  assertNonEmpty,
} from "./persistence-common.mjs";

export function normalizeDatabasePath(databasePath) {
  if (databasePath === ":memory:") return databasePath;
  const absolutePath = resolve(databasePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const parent = realpathSync(dirname(absolutePath));
  return resolve(parent, basename(absolutePath));
}

export function safeRollback(database) {
  try {
    database.exec("ROLLBACK");
  } catch {
    // Preserve the original transaction error.
  }
}

export function translateStorageError(error) {
  if (/database is locked|database is busy/i.test(error?.message ?? "")) {
    return new StorageBusyError(error.message);
  }
  return error;
}

export function migrateDatabase(database) {
  const row = database.prepare("PRAGMA user_version").get();
  const currentVersion = Number(row.user_version);
  if (currentVersion !== 0 && currentVersion !== WORLD_STORE_SCHEMA_VERSION) {
    throw new IntegrityError(
      `Unsupported world-store schema version ${currentVersion}; expected ${WORLD_STORE_SCHEMA_VERSION}`,
    );
  }
  if (currentVersion === 0) {
    const existingTables = Number(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('threads','thread_events','commands')",
        )
        .get().count,
    );
    if (existingTables !== 0) {
      throw new IntegrityError(
        "Refusing an unversioned pre-release world-store schema; recreate the local M1 database",
      );
    }
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      thread_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL CHECK (version >= 1),
      status TEXT NOT NULL CHECK (status IN ('frozen','thawing','active','freezing','dormant','retired')),
      state_json TEXT NOT NULL CHECK (json_valid(state_json)),
      state_hash TEXT NOT NULL CHECK (state_hash LIKE 'sha256:%'),
      last_event_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_events (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_type TEXT NOT NULL CHECK (event_type IN ('THREAD_SEEDED','SELF_MODEL_UPDATED')),
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
        (event_type = 'THREAD_SEEDED' AND command_id IS NULL AND command_digest IS NULL)
        OR
        (event_type = 'SELF_MODEL_UPDATED' AND command_id IS NOT NULL AND command_digest IS NOT NULL)
      )
    ) STRICT;

    CREATE TABLE IF NOT EXISTS commands (
      thread_id TEXT NOT NULL,
      command_id TEXT NOT NULL,
      command_digest TEXT NOT NULL,
      expected_version INTEGER NOT NULL CHECK (expected_version >= 1),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (thread_id, command_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (event_id) REFERENCES thread_events(event_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_thread_events_thread_sequence
      ON thread_events(thread_id, sequence);

    CREATE TRIGGER IF NOT EXISTS thread_events_no_update
    BEFORE UPDATE ON thread_events
    BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS thread_events_no_delete
    BEFORE DELETE ON thread_events
    BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS commands_no_update
    BEFORE UPDATE ON commands
    BEGIN SELECT RAISE(ABORT, 'commands is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS commands_no_delete
    BEFORE DELETE ON commands
    BEGIN SELECT RAISE(ABORT, 'commands is append-only'); END;
  `);
  if (currentVersion === 0) {
    database.exec(`PRAGMA user_version = ${WORLD_STORE_SCHEMA_VERSION}`);
  }
}
