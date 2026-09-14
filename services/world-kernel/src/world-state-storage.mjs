import {
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";
import { IntegrityError, assertNonEmpty } from "./persistence-common.mjs";

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function threadEventDependentTriggers(database) {
  return database.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type='trigger'
      AND sql IS NOT NULL
      AND instr(lower(sql), 'thread_events') > 0
    ORDER BY name
  `).all();
}

function restoredTriggerSql(sql) {
  return sql.replace(/thread_events_event_upgrade/giu, "thread_events");
}

function withThreadEventTriggersDetached(database, run) {
  const triggers = threadEventDependentTriggers(database);
  for (const trigger of triggers) {
    database.exec(`DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.name)}`);
  }
  try {
    run();
  } finally {
    for (const trigger of triggers) database.exec(restoredTriggerSql(trigger.sql));
  }
}

function tableNames(database) {
  return new Set(database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('threads','thread_events','thread_events_event_upgrade')",
  ).all().map((row) => row.name));
}

function recoverInterruptedEventTable(database) {
  const before = tableNames(database);
  if (!before.has("threads")) return;

  const hasEvents = before.has("thread_events");
  const hasUpgrade = before.has("thread_events_event_upgrade");
  if (hasEvents && !hasUpgrade) return;

  if (!hasEvents && !hasUpgrade) {
    throw new IntegrityError(
      "World event schema is incomplete: thread_events is missing and no recovery table exists",
    );
  }

  withThreadEventTriggersDetached(database, () => {
    if (!hasEvents && hasUpgrade) {
      database.exec("ALTER TABLE thread_events_event_upgrade RENAME TO thread_events");
    } else if (hasEvents && hasUpgrade) {
      const eventCount = Number(database.prepare("SELECT COUNT(*) AS count FROM thread_events").get().count);
      const upgradeCount = Number(database.prepare("SELECT COUNT(*) AS count FROM thread_events_event_upgrade").get().count);
      if (eventCount !== upgradeCount) {
        throw new IntegrityError(
          `World event schema has both event tables with different row counts (${eventCount} != ${upgradeCount})`,
        );
      }
      database.exec("DROP TABLE thread_events_event_upgrade");
    }
  });

  database.exec(`
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
