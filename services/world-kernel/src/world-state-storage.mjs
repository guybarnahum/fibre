import {
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";
import { IntegrityError, assertNonEmpty } from "./persistence-common.mjs";

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function recoverInterruptedEventTable(database) {
  const rows = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('threads','thread_events','thread_events_event_upgrade')",
  ).all();
  const names = new Set(rows.map((row) => row.name));
  if (!names.has("threads") || names.has("thread_events")) return;

  if (!names.has("thread_events_event_upgrade")) {
    throw new IntegrityError(
      "World event schema is incomplete: thread_events is missing and no recovery table exists",
    );
  }

  const triggers = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND sql LIKE '%thread_events%'",
  ).all();
  for (const trigger of triggers) {
    database.exec(`DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.name)}`);
  }

  database.exec(`
    ALTER TABLE thread_events_event_upgrade RENAME TO thread_events;
    CREATE INDEX IF NOT EXISTS idx_thread_events_thread_sequence ON thread_events(thread_id, sequence);
    CREATE TRIGGER IF NOT EXISTS thread_events_no_update
      BEFORE UPDATE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_events_no_delete
      BEFORE DELETE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
  `);
}

export function openWorldStateDatabase(storage, {
  readOnly = false,
  storeName = "World state store",
} = {}) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError(`${storeName} storage must be an Infra state binding`);
  }

  const { infraDriver, stateScopeId } = storage;
  assertNonEmpty("stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(
    infra.state,
    stateScopeId,
    FIBRE_WORLD_STATE_REQUIREMENTS,
  );
  const database = infra.state.open(stateScopeId, { readOnly });
  if (!readOnly) recoverInterruptedEventTable(database);
  return database;
}
