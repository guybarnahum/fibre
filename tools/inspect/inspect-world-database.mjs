import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import {
  WORLD_STORE_SCHEMA_VERSION,
  openWorldStore,
} from "#services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "#services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "#services/world-kernel/src/freeze-store.mjs";
import {
  openLifecycleHardeningStore,
} from "#services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "#services/world-kernel/src/expression-store.mjs";

const EXPECTED_TABLES = [
  "threads",
  "thread_events",
  "commands",
  "activation_requests",
  "request_appraisals",
  "private_participation_stances",
  "participation_authorizations",
  "thaw_leases",
  "runtime_sessions",
  "actor_runs",
  "goal_guardian_audits",
  "authorization_consumptions",
  "freeze_reports",
  "thread_memories",
  "runtime_abandons",
  "disclosure_strategies",
  "audience_participation_responses",
];

const EXPECTED_TRIGGERS = [
  "thread_events_no_update",
  "thread_events_no_delete",
  "commands_no_update",
  "commands_no_delete",
  "activation_requests_no_update",
  "activation_requests_no_delete",
  "request_appraisals_no_update",
  "request_appraisals_no_delete",
  "private_participation_stances_no_update",
  "private_participation_stances_no_delete",
  "participation_authorizations_no_update",
  "participation_authorizations_no_delete",
  "participation_authorizations_reject_discharged_obligation",
  "thaw_leases_no_delete",
  "thaw_leases_restrict_update",
  "runtime_sessions_no_delete",
  "runtime_sessions_restrict_update",
  "actor_runs_no_update",
  "actor_runs_no_delete",
  "goal_guardian_audits_no_update",
  "goal_guardian_audits_no_delete",
  "authorization_consumptions_no_update",
  "authorization_consumptions_no_delete",
  "freeze_reports_no_update",
  "freeze_reports_no_delete",
  "thread_memories_no_update",
  "thread_memories_no_delete",
  "runtime_abandons_no_update",
  "runtime_abandons_no_delete",
  "disclosure_strategies_no_update",
  "disclosure_strategies_no_delete",
  "audience_participation_responses_no_update",
  "audience_participation_responses_no_delete",
];

const EXPECTED_INDEXES = [
  "idx_thread_events_thread_sequence",
  "idx_activation_requests_thread_time",
  "idx_thaw_leases_one_active_per_thread",
  "idx_runtime_sessions_thread_started",
  "idx_thread_memories_thread_event",
  "idx_runtime_abandons_thread_time",
  "idx_disclosure_strategies_thread_time",
  "idx_audience_responses_thread_time",
];

function emptyVerifiedCounts() {
  return {
    threads: 0,
    privateRequests: 0,
    runtimes: 0,
    freezes: 0,
    abandonments: 0,
    freezeCreatedMemories: 0,
    expressionAuthorizations: 0,
    disclosureStrategies: 0,
    audienceResponses: 0,
    completeExpressionChains: 0,
  };
}

function namesOf(database, type) {
  return new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type=?")
      .all(type)
      .map((row) => row.name),
  );
}

function missing(expected, actual) {
  return expected.filter((name) => !actual.has(name));
}

function countRows(database, table) {
  return Number(database.prepare(`SELECT count(*) AS count FROM ${table}`).get().count);
}

function groupedCounts(database, table, expression) {
  return Object.fromEntries(
    database
      .prepare(`SELECT ${expression} AS value, count(*) AS count FROM ${table} GROUP BY ${expression}`)
      .all()
      .map((row) => [String(row.value), Number(row.count)]),
  );
}

function parseStoredThread(row, errors) {
  try {
    const state = JSON.parse(row.state_json);
    return {
      threadId: row.thread_id,
      name: state.identity?.name ?? row.thread_id,
      version: Number(row.version),
      status: row.status,
      stateHash: row.state_hash,
      lastEventId: row.last_event_id,
      memoryRefCount: Array.isArray(state.memoryRefs) ? state.memoryRefs.length : 0,
      unresolvedIntentionCount: Array.isArray(state.currentState?.unresolvedIntentions)
        ? state.currentState.unresolvedIntentions.length
        : 0,
    };
  } catch (error) {
    errors.push(`Thread ${row.thread_id} state JSON: ${error.message}`);
    return {
      threadId: row.thread_id,
      name: "<invalid stored state>",
      version: Number(row.version),
      status: row.status,
      stateHash: row.state_hash,
      lastEventId: row.last_event_id,
      memoryRefCount: null,
      unresolvedIntentionCount: null,
    };
  }
}

export function openInspectorSourceDatabase(databasePath) {
  const database = new DatabaseSync(databasePath, {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });
  try {
    database.exec("PRAGMA query_only=ON");
  } catch (error) {
    database.close();
    throw error;
  }
  return database;
}

function inspectSqlite(databasePath, openSourceDatabase = openInspectorSourceDatabase) {
  const database = openSourceDatabase(databasePath);
  try {
    const sourceQueryOnly =
      Number(database.prepare("PRAGMA query_only").get().query_only) === 1;
    const readErrors = [];
    const tableNames = namesOf(database, "table");
    const triggerNames = namesOf(database, "trigger");
    const indexNames = namesOf(database, "index");
    const missingTables = missing(EXPECTED_TABLES, tableNames);
    const missingTriggers = missing(EXPECTED_TRIGGERS, triggerNames);
    const missingIndexes = missing(EXPECTED_INDEXES, indexNames);
    const tableCounts = Object.fromEntries(
      EXPECTED_TABLES.filter((table) => tableNames.has(table)).map((table) => [
        table,
        countRows(database, table),
      ]),
    );
    const threads = tableNames.has("threads")
      ? database
        .prepare(`
          SELECT thread_id,version,status,state_json,state_hash,last_event_id
          FROM threads ORDER BY thread_id
        `)
        .all()
        .map((row) => parseStoredThread(row, readErrors))
      : [];
    const requestRows = tableNames.has("activation_requests")
      ? database
        .prepare("SELECT thread_id,request_id FROM activation_requests ORDER BY thread_id,occurred_at,request_id")
        .all()
      : [];
    const freezeRows = tableNames.has("freeze_reports")
      ? database
        .prepare("SELECT thread_id,session_id FROM freeze_reports ORDER BY thread_id,completed_at,session_id")
        .all()
      : [];
    const abandonmentRows = tableNames.has("runtime_abandons")
      ? database
        .prepare("SELECT thread_id,session_id FROM runtime_abandons ORDER BY thread_id,abandoned_at,session_id")
        .all()
      : [];

    return {
      schemaVersion: Number(database.prepare("PRAGMA user_version").get().user_version),
      expectedSchemaVersion: WORLD_STORE_SCHEMA_VERSION,
      sourceQueryOnly,
      integrityMessages: database
        .prepare("PRAGMA integrity_check")
        .all()
        .map((row) => String(row.integrity_check)),
      foreignKeyViolations: database.prepare("PRAGMA foreign_key_check").all(),
      missingTables,
      missingTriggers,
      missingIndexes,
      readErrors,
      tableCounts,
      threads,
      requestRows,
      freezeRows,
      abandonmentRows,
      eventTypes: tableNames.has("thread_events")
        ? groupedCounts(database, "thread_events", "event_type")
        : {},
      sessionStatuses: tableNames.has("runtime_sessions")
        ? groupedCounts(database, "runtime_sessions", "status")
        : {},
      leaseStatuses: tableNames.has("thaw_leases")
        ? groupedCounts(database, "thaw_leases", "status")
        : {},
      guardianDecisions: tableNames.has("goal_guardian_audits")
        ? groupedCounts(database, "goal_guardian_audits", "json_extract(audit_json,'$.decision')")
        : {},
      disclosureModes: tableNames.has("disclosure_strategies")
        ? groupedCounts(database, "disclosure_strategies", "json_extract(strategy_json,'$.mode')")
        : {},
      communicatedPostures: tableNames.has("disclosure_strategies")
        ? groupedCounts(
          database,
          "disclosure_strategies",
          "json_extract(strategy_json,'$.communicatedPosture')",
        )
        : {},
    };
  } finally {
    database.close();
  }
}

function createVerificationSnapshot(databasePath) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-database-inspector-"));
  const snapshotPath = join(directory, "world.sqlite");
  const source = new DatabaseSync(databasePath, {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });
  try {
    source.prepare("VACUUM INTO ?").run(snapshotPath);
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  } finally {
    source.close();
  }
  return { directory, snapshotPath };
}

function verifyDomainRecords(databasePath, raw) {
  const errors = [];
  const verified = emptyVerifiedCounts();
  if (raw.schemaVersion !== WORLD_STORE_SCHEMA_VERSION) {
    errors.push(
      `schema version ${raw.schemaVersion} does not match expected ${WORLD_STORE_SCHEMA_VERSION}`,
    );
    return { ok: false, errors, verified };
  }
  if (raw.missingTables.length > 0) {
    errors.push(`missing tables: ${raw.missingTables.join(", ")}`);
    return { ok: false, errors, verified };
  }

  let worldStore = null;
  let runtimeStore = null;
  let freezeStore = null;
  let lifecycleStore = null;
  let expressionStore = null;
  try {
    worldStore = openWorldStore(databasePath);
    runtimeStore = openRuntimeStore(databasePath);
    freezeStore = openFreezeStore(databasePath);
    lifecycleStore = openLifecycleHardeningStore(databasePath);
    expressionStore = openExpressionStore(databasePath);
  } catch (error) {
    expressionStore?.close();
    lifecycleStore?.close();
    freezeStore?.close();
    runtimeStore?.close();
    worldStore?.close();
    errors.push(`store verification could not start: ${error.message}`);
    return { ok: false, errors, verified };
  }

  const freezeSessions = new Set(
    raw.freezeRows.map((row) => `${row.thread_id}\u0000${row.session_id}`),
  );
  const abandonmentSessions = new Set(
    raw.abandonmentRows.map((row) => `${row.thread_id}\u0000${row.session_id}`),
  );

  try {
    for (const summary of raw.threads) {
      const { threadId } = summary;
      try {
        const thread = worldStore.getThread(threadId);
        worldStore.verifyThreadIntegrity(threadId);
        const memoryIntegrity = lifecycleStore.verifyMemoryProjectionIntegrity(threadId, thread);
        verified.threads += 1;
        verified.freezeCreatedMemories += memoryIntegrity.freezeCreatedMemoryCount;
      } catch (error) {
        errors.push(`Thread ${threadId}: ${error.message}`);
      }

      for (const request of raw.requestRows.filter((row) => row.thread_id === threadId)) {
        try {
          worldStore.verifyPrivateRequestTrace(threadId, request.request_id);
          verified.privateRequests += 1;
        } catch (error) {
          errors.push(`Request ${request.request_id}: ${error.message}`);
        }
      }

      let runtimeSummaries = [];
      try {
        runtimeSummaries = runtimeStore.listRuntimeSummaries(threadId);
      } catch (error) {
        errors.push(`Runtime list for ${threadId}: ${error.message}`);
      }
      for (const runtime of runtimeSummaries) {
        const key = `${threadId}\u0000${runtime.sessionId}`;
        try {
          runtimeStore.getRuntime(threadId, runtime.sessionId);
          verified.runtimes += 1;
        } catch (error) {
          errors.push(`Runtime ${runtime.sessionId}: ${error.message}`);
        }
        if (freezeSessions.has(key)) {
          try {
            freezeStore.getFreeze(threadId, runtime.sessionId);
            verified.freezes += 1;
          } catch (error) {
            errors.push(`Freeze ${runtime.sessionId}: ${error.message}`);
          }
        }
        if (abandonmentSessions.has(key)) {
          try {
            lifecycleStore.verifyRuntimeAbandonment(threadId, runtime.sessionId);
            verified.abandonments += 1;
          } catch (error) {
            errors.push(`Abandonment ${runtime.sessionId}: ${error.message}`);
          }
        }
      }

      let expressionSummaries = [];
      try {
        expressionSummaries = expressionStore.listExpressionSummaries(threadId);
      } catch (error) {
        errors.push(`Expression list for ${threadId}: ${error.message}`);
      }
      for (const expression of expressionSummaries) {
        try {
          expressionStore.getAuthorization(threadId, expression.authorizationId);
          verified.expressionAuthorizations += 1;
          if (expression.strategyId !== null) {
            const chain = expressionStore.getExpressionChain(threadId, expression.requestId);
            expressionStore.verifyExpressionIntegrity(threadId, expression.requestId);
            verified.disclosureStrategies += 1;
            if (chain.response !== null) {
              verified.audienceResponses += 1;
              verified.completeExpressionChains += 1;
            }
          }
        } catch (error) {
          errors.push(`Expression ${expression.requestId}: ${error.message}`);
        }
      }
    }
  } finally {
    expressionStore.close();
    lifecycleStore.close();
    freezeStore.close();
    runtimeStore.close();
    worldStore.close();
  }
  return { ok: errors.length === 0, errors, verified };
}

export async function inspectWorldDatabase(
  databasePath,
  { openSourceDatabase = openInspectorSourceDatabase } = {},
) {
  const absolutePath = resolve(databasePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`database does not exist: ${absolutePath}`);
  }
  const stat = statSync(absolutePath);
  if (!stat.isFile()) throw new Error(`database path is not a file: ${absolutePath}`);

  const raw = inspectSqlite(absolutePath, openSourceDatabase);
  const sqliteOk = raw.integrityMessages.length === 1 && raw.integrityMessages[0] === "ok";
  const foreignKeysOk = raw.foreignKeyViolations.length === 0;
  const sourceSchemaOk =
    raw.schemaVersion === WORLD_STORE_SCHEMA_VERSION
    && raw.missingTables.length === 0
    && raw.missingTriggers.length === 0
    && raw.missingIndexes.length === 0;
  let domain = {
    ok: false,
    errors: [],
    verified: emptyVerifiedCounts(),
  };
  let snapshot = null;
  if (sqliteOk && foreignKeysOk && sourceSchemaOk) {
    try {
      snapshot = createVerificationSnapshot(absolutePath);
      domain = verifyDomainRecords(snapshot.snapshotPath, raw);
    } catch (error) {
      domain.errors.push(`verification snapshot failed: ${error.message}`);
    } finally {
      if (snapshot !== null) {
        rmSync(snapshot.directory, { recursive: true, force: true });
      }
    }
  } else if (!sqliteOk || !foreignKeysOk) {
    domain.errors.push(
      "domain verification skipped because SQLite integrity or foreign keys failed",
    );
  } else {
    domain.errors.push(
      "domain verification skipped because source schema enforcement is incomplete",
    );
  }

  const errors = [
    ...(sqliteOk ? [] : raw.integrityMessages.map((message) => `SQLite: ${message}`)),
    ...(foreignKeysOk ? [] : [`foreign-key violations: ${raw.foreignKeyViolations.length}`]),
    ...(raw.sourceQueryOnly ? [] : ["source SQLite connection did not report query_only mode"]),
    ...(raw.schemaVersion === WORLD_STORE_SCHEMA_VERSION
      ? []
      : [`schema version ${raw.schemaVersion} does not match expected ${WORLD_STORE_SCHEMA_VERSION}`]),
    ...(raw.missingTables.length === 0
      ? []
      : [`missing tables: ${raw.missingTables.join(", ")}`]),
    ...(raw.missingTriggers.length === 0
      ? []
      : [`missing triggers: ${raw.missingTriggers.join(", ")}`]),
    ...(raw.missingIndexes.length === 0
      ? []
      : [`missing indexes: ${raw.missingIndexes.join(", ")}`]),
    ...raw.readErrors,
    ...domain.errors,
  ];

  return {
    databasePath: absolutePath,
    fileSizeBytes: stat.size,
    schemaVersion: raw.schemaVersion,
    expectedSchemaVersion: raw.expectedSchemaVersion,
    verification: {
      ok: errors.length === 0,
      sourceReadOnly: raw.sourceQueryOnly,
      sourceSchema: sourceSchemaOk,
      snapshotVerified: domain.ok,
      sqliteIntegrity: sqliteOk,
      foreignKeys: foreignKeysOk,
      domainRecords: domain.ok,
      errors,
      verified: domain.verified,
    },
    summary: {
      threadCount: raw.threads.length,
      threads: raw.threads,
      tableCounts: raw.tableCounts,
      eventTypes: raw.eventTypes,
      sessionStatuses: raw.sessionStatuses,
      leaseStatuses: raw.leaseStatuses,
      guardianDecisions: raw.guardianDecisions,
      disclosureModes: raw.disclosureModes,
      communicatedPostures: raw.communicatedPostures,
      activeSessionCount: raw.sessionStatuses.active ?? 0,
      activeLeaseCount: raw.leaseStatuses.active ?? 0,
    },
  };
}

function formatMap(values) {
  const entries = Object.entries(values);
  return entries.length === 0
    ? "none"
    : entries.map(([name, count]) => `${name}=${count}`).join(", ");
}

function formatNullableCount(value) {
  return value === null ? "unknown" : String(value);
}

export function formatWorldDatabaseSummary(report) {
  const status = report.verification.ok ? "PASS" : "FAIL";
  const lines = [
    `Fibre world database: ${status}`,
    `Path: ${report.databasePath}`,
    `Source mode: ${report.verification.sourceReadOnly ? "read-only" : "unknown"}`,
    `Schema: ${report.schemaVersion} (expected ${report.expectedSchemaVersion})`,
    `Schema enforcement: ${report.verification.sourceSchema ? "complete" : "incomplete"}`,
    `SQLite integrity: ${report.verification.sqliteIntegrity ? "ok" : "failed"}`,
    `Foreign keys: ${report.verification.foreignKeys ? "ok" : "failed"}`,
    `Threads: ${report.summary.threadCount}`,
  ];
  for (const thread of report.summary.threads) {
    lines.push(
      `  ${thread.name} (${thread.threadId}) v${thread.version} ${thread.status}`,
      `    hash=${thread.stateHash}`,
      `    memories=${formatNullableCount(thread.memoryRefCount)} including seeded, unresolvedIntentions=${formatNullableCount(thread.unresolvedIntentionCount)}`,
    );
  }
  lines.push(
    `Events: ${formatMap(report.summary.eventTypes)}`,
    `Sessions: ${formatMap(report.summary.sessionStatuses)}`,
    `Leases: ${formatMap(report.summary.leaseStatuses)}`,
    `Guardian: ${formatMap(report.summary.guardianDecisions)}`,
    `Disclosure modes: ${formatMap(report.summary.disclosureModes)}`,
    `Communicated postures: ${formatMap(report.summary.communicatedPostures)}`,
    `Freezes: ${report.summary.tableCounts.freeze_reports ?? 0}`,
    `Accepted memories: ${report.summary.tableCounts.thread_memories ?? 0}`,
    `Authorization consumptions: ${report.summary.tableCounts.authorization_consumptions ?? 0}`,
    `Abandonments: ${report.summary.tableCounts.runtime_abandons ?? 0}`,
    `Disclosure strategies: ${report.summary.tableCounts.disclosure_strategies ?? 0}`,
    `Audience responses: ${report.summary.tableCounts.audience_participation_responses ?? 0}`,
    `Active runtime rows: sessions=${report.summary.activeSessionCount}, leases=${report.summary.activeLeaseCount}`,
    `Verified: threads=${report.verification.verified.threads}, requests=${report.verification.verified.privateRequests}, runtimes=${report.verification.verified.runtimes}, freezes=${report.verification.verified.freezes}, abandonments=${report.verification.verified.abandonments}, generatedMemories=${report.verification.verified.freezeCreatedMemories}, expressionAuthorizations=${report.verification.verified.expressionAuthorizations}, disclosureStrategies=${report.verification.verified.disclosureStrategies}, audienceResponses=${report.verification.verified.audienceResponses}, completeExpressionChains=${report.verification.verified.completeExpressionChains}`,
  );
  if (report.verification.errors.length > 0) {
    lines.push("Errors:");
    for (const error of report.verification.errors) lines.push(`  - ${error}`);
  }
  return `${lines.join("\n")}\n`;
}

export function parseInspectorArguments(arguments_) {
  let json = false;
  let databasePath = null;
  for (const argument of arguments_) {
    if (argument === "--json") {
      json = true;
    } else if (argument === "--help" || argument === "-h") {
      return { help: true, json, databasePath };
    } else if (argument.startsWith("-")) {
      throw new Error(`unknown option: ${argument}`);
    } else if (databasePath === null) {
      databasePath = argument;
    } else {
      throw new Error("only one database path may be supplied");
    }
  }
  return { help: false, json, databasePath };
}

function usage() {
  return [
    "Usage: npm run inspect:db -- <database.sqlite>",
    "JSON: npm run --silent inspect:db -- <database.sqlite> --json",
    "",
    "Reads the source without mutation, verifies its schema enforcement objects,",
    "then validates a temporary snapshot through the Fibre domain stores.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseInspectorArguments(process.argv.slice(2));
  if (options.help || options.databasePath === null) {
    process.stdout.write(usage());
    process.exitCode = options.help ? 0 : 2;
    return;
  }
  const report = await inspectWorldDatabase(options.databasePath);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : formatWorldDatabaseSummary(report),
  );
  if (!report.verification.ok) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
