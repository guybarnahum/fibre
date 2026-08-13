import { mkdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import {
  WORLD_STORE_SCHEMA_VERSION,
  IntegrityError,
  StorageBusyError,
} from "./persistence-common.mjs";
import { createRuntimeTables } from "./runtime-schema.mjs";
import { createFreezeTables } from "./freeze-schema.mjs";
import { createExpressionTables } from "./expression-schema.mjs";
import {
  createObligationTables,
  migrateLegacyConsumedObligations,
} from "./obligation-schema.mjs";
import { createStructuredAuthorityWithdrawalTables } from "./structured-authority-withdrawal-schema.mjs";
import {
  backfillLegacyThreadIdentity,
  backfillMemoryVisualCompanions,
  createIdentityTables,
} from "./identity-schema.mjs";
import { repairIdentityAssertionRegistryV2Schema } from "./identity-schema-v2-repair.mjs";
import { createSituatedLifeTables } from "./situated-life-schema.mjs";
import { ensureSituatedLifeDigestColumns } from "./situated-life-integrity.mjs";
import { createEmbodimentTables } from "./embodiment-schema.mjs";
import { createAutobiographicalMemoryTables } from "./autobiographical-memory-schema.mjs";

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

function createBaseSchema(database) {
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
      event_type TEXT NOT NULL CHECK (event_type IN ('THREAD_SEEDED','SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED')),
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
        (event_type IN ('SELF_MODEL_UPDATED','THREAD_FROZEN','COMPELLED_EPISODE_INTERRUPTED') AND command_id IS NOT NULL AND command_digest IS NOT NULL)
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
}

function createPrivateParticipationSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS activation_requests (
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (length(thread_state_hash) = 71 AND substr(thread_state_hash, 1, 7) = 'sha256:' AND substr(thread_state_hash, 8) NOT GLOB '*[^0-9a-f]*'),
      request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 71 AND substr(request_fingerprint, 1, 7) = 'sha256:' AND substr(request_fingerprint, 8) NOT GLOB '*[^0-9a-f]*'),
      request_json TEXT NOT NULL CHECK (json_valid(request_json)),
      record_digest TEXT NOT NULL CHECK (length(record_digest) = 71 AND substr(record_digest, 1, 7) = 'sha256:' AND substr(record_digest, 8) NOT GLOB '*[^0-9a-f]*'),
      occurred_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      PRIMARY KEY (thread_id, request_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS request_appraisals (
      appraisal_id TEXT PRIMARY KEY CHECK (length(appraisal_id) = 68 AND substr(appraisal_id, 1, 4) = 'app_' AND substr(appraisal_id, 5) NOT GLOB '*[^0-9a-f]*'),
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (length(thread_state_hash) = 71 AND substr(thread_state_hash, 1, 7) = 'sha256:' AND substr(thread_state_hash, 8) NOT GLOB '*[^0-9a-f]*'),
      request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 71 AND substr(request_fingerprint, 1, 7) = 'sha256:' AND substr(request_fingerprint, 8) NOT GLOB '*[^0-9a-f]*'),
      policy_id TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      capsule_json TEXT NOT NULL CHECK (json_valid(capsule_json)),
      capsule_digest TEXT NOT NULL CHECK (length(capsule_digest) = 71 AND substr(capsule_digest, 1, 7) = 'sha256:' AND substr(capsule_digest, 8) NOT GLOB '*[^0-9a-f]*'),
      occurred_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      UNIQUE (thread_id, request_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS private_participation_stances (
      stance_id TEXT PRIMARY KEY CHECK (length(stance_id) = 68 AND substr(stance_id, 1, 4) = 'pst_' AND substr(stance_id, 5) NOT GLOB '*[^0-9a-f]*'),
      appraisal_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (length(thread_state_hash) = 71 AND substr(thread_state_hash, 1, 7) = 'sha256:' AND substr(thread_state_hash, 8) NOT GLOB '*[^0-9a-f]*'),
      request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 71 AND substr(request_fingerprint, 1, 7) = 'sha256:' AND substr(request_fingerprint, 8) NOT GLOB '*[^0-9a-f]*'),
      policy_id TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      stance_json TEXT NOT NULL CHECK (json_valid(stance_json)),
      stance_digest TEXT NOT NULL CHECK (length(stance_digest) = 71 AND substr(stance_digest, 1, 7) = 'sha256:' AND substr(stance_digest, 8) NOT GLOB '*[^0-9a-f]*'),
      recorded_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      FOREIGN KEY (appraisal_id) REFERENCES request_appraisals(appraisal_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_activation_requests_thread_time
      ON activation_requests(thread_id, occurred_at, request_id);

    CREATE TRIGGER IF NOT EXISTS activation_requests_no_update
    BEFORE UPDATE ON activation_requests
    BEGIN SELECT RAISE(ABORT, 'activation_requests is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS activation_requests_no_delete
    BEFORE DELETE ON activation_requests
    BEGIN SELECT RAISE(ABORT, 'activation_requests is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS request_appraisals_no_update
    BEFORE UPDATE ON request_appraisals
    BEGIN SELECT RAISE(ABORT, 'request_appraisals is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS request_appraisals_no_delete
    BEFORE DELETE ON request_appraisals
    BEGIN SELECT RAISE(ABORT, 'request_appraisals is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS private_participation_stances_no_update
    BEFORE UPDATE ON private_participation_stances
    BEGIN SELECT RAISE(ABORT, 'private_participation_stances is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS private_participation_stances_no_delete
    BEFORE DELETE ON private_participation_stances
    BEGIN SELECT RAISE(ABORT, 'private_participation_stances is append-only'); END;
  `);
}

function createSchema(database) {
  createBaseSchema(database);
  createPrivateParticipationSchema(database);
  createRuntimeTables(database);
  createFreezeTables(database);
  createExpressionTables(database);
  createObligationTables(database);
  createStructuredAuthorityWithdrawalTables(database);
  createIdentityTables(database);
  createSituatedLifeTables(database);
  createEmbodimentTables(database);
  createAutobiographicalMemoryTables(database);
}

function createAndRepairSchema(database) {
  createSchema(database);
  repairIdentityAssertionRegistryV2Schema(database);
  ensureSituatedLifeDigestColumns(database);
}

function needsEventSchemaUpgrade(database) {
  const row = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='thread_events'",
  ).get();
  return row !== undefined && !row.sql.includes("COMPELLED_EPISODE_INTERRUPTED");
}

function rebuildEventTables(database) {
  database.exec(`
    DROP TRIGGER IF EXISTS thread_events_no_update;
    DROP TRIGGER IF EXISTS thread_events_no_delete;
    DROP TRIGGER IF EXISTS commands_no_update;
    DROP TRIGGER IF EXISTS commands_no_delete;
    DROP INDEX IF EXISTS idx_thread_events_thread_sequence;
    ALTER TABLE commands RENAME TO commands_pre_v4;
    ALTER TABLE thread_events RENAME TO thread_events_pre_v4;
  `);
  createBaseSchema(database);
  database.exec(`
    INSERT INTO thread_events(
      event_id,thread_id,sequence,expected_version,resulting_version,event_type,
      command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
      authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
    )
    SELECT event_id,thread_id,sequence,expected_version,resulting_version,event_type,
      command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
      authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
    FROM thread_events_pre_v4;
    INSERT INTO commands(
      thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at
    )
    SELECT thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at
    FROM commands_pre_v4;
    DROP TABLE commands_pre_v4;
    DROP TABLE thread_events_pre_v4;
  `);
}

export function migrateDatabase(database) {
  const row = database.prepare("PRAGMA user_version").get();
  const currentVersion = Number(row.user_version);
  if (currentVersion < 0 || currentVersion > WORLD_STORE_SCHEMA_VERSION) {
    throw new IntegrityError(
      `Unsupported world-store schema version ${currentVersion}; expected at most ${WORLD_STORE_SCHEMA_VERSION}`,
    );
  }
  if (currentVersion === 0) {
    const existingTables = Number(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('threads','thread_events','commands','activation_requests','request_appraisals','private_participation_stances','participation_authorizations','thaw_leases','runtime_sessions','actor_runs','goal_guardian_audits','authorization_consumptions','freeze_reports','thread_memories','disclosure_strategies','audience_participation_responses','obligation_records','obligation_applicability_decisions','legacy_obligation_tombstones','structured_authority_withdrawal_closures','identity_assertion_records','memory_visual_companion_records','life_relation_records','place_episode_records','embodiment_records','autobiographical_memory_records','autobiographical_memory_lineage_heads')",
        )
        .get().count,
    );
    if (existingTables !== 0) {
      throw new IntegrityError(
        "Refusing an unversioned pre-release world-store schema; recreate the local M1 database",
      );
    }
  }

  if (currentVersion === WORLD_STORE_SCHEMA_VERSION) {
    try {
      database.exec("BEGIN IMMEDIATE");
      createAndRepairSchema(database);
      migrateLegacyConsumedObligations(database);
      database.exec("COMMIT");
    } catch (error) {
      safeRollback(database);
      throw error;
    }
    return;
  }

  const rebuildEvents = currentVersion > 0 && needsEventSchemaUpgrade(database);
  if (rebuildEvents) database.exec("PRAGMA foreign_keys=OFF");
  try {
    database.exec("BEGIN IMMEDIATE");
    if (rebuildEvents) rebuildEventTables(database);
    createAndRepairSchema(database);
    migrateLegacyConsumedObligations(database);
    const identityMigration = backfillLegacyThreadIdentity(database);
    if (identityMigration.droppedPostSeedAdditions !== 0) {
      throw new IntegrityError(
        `identity migration found ${identityMigration.droppedPostSeedAdditions} post-seed legacy projection additions with no trustworthy provenance; migration refused rather than silently dropping or fabricating identity history`,
      );
    }
    backfillMemoryVisualCompanions(database);
    const violations = database.prepare("PRAGMA foreign_key_check").all();
    if (violations.length !== 0) {
      throw new IntegrityError("world-store migration produced foreign-key violations");
    }
    database.exec(`PRAGMA user_version = ${WORLD_STORE_SCHEMA_VERSION}`);
    database.exec("COMMIT");
  } catch (error) {
    safeRollback(database);
    throw error;
  } finally {
    if (rebuildEvents) database.exec("PRAGMA foreign_keys=ON");
  }
}
