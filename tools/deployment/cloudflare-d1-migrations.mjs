import { basename, resolve } from "node:path";

export const D1_MIGRATIONS_BY_BINDING = Object.freeze({
  PRESENTATION_CATALOG:Object.freeze([
    "infra/providers/cloudflare/d1/0001_fibre_catalog.sql",
  ]),
  ACTIVITY_LOG:Object.freeze([
    "infra/providers/cloudflare/d1/0001_activity_log.sql",
    "infra/providers/cloudflare/d1/0002_admin_entitlements.sql",
    "infra/providers/cloudflare/d1/0003_activity_thread_heads.sql",
  ]),
});

const LEDGER_TABLE = "fibre_schema_migrations";
const LEDGER_CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
    binding TEXT NOT NULL,
    migration_id TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    PRIMARY KEY (binding, migration_id)
  );
`;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function migrationsFor(binding) {
  const migrations = D1_MIGRATIONS_BY_BINDING[binding];
  if (!migrations?.length) throw new TypeError(`no D1 migrations registered for binding ${binding}`);
  return migrations;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseWranglerJson(stdout) {
  if (typeof stdout !== "string" || stdout.trim() === "") return [];
  let parsed;
  try { parsed = JSON.parse(stdout); }
  catch { return []; }
  const rows = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.results)) rows.push(...value.results);
    for (const nested of Object.values(value)) visit(nested);
  };
  visit(parsed);
  return rows;
}

async function d1Command(runner, name, sql, { cwd }) {
  return runner(["d1", "execute", name, "--remote", "--command", sql, "--json"], { cwd });
}

async function appliedMigrations(runner, name, binding, { cwd }) {
  try {
    const result = await d1Command(
      runner,
      name,
      `SELECT migration_id FROM ${LEDGER_TABLE} WHERE binding=${sqlLiteral(binding)} ORDER BY migration_id`,
      { cwd },
    );
    return new Set(parseWranglerJson(result.stdout).map((row) => row?.migration_id).filter(Boolean));
  } catch (error) {
    if (/no such table:\s*fibre_schema_migrations/iu.test(
      [error?.message, error?.stdout, error?.stderr].filter(Boolean).join("\n"),
    )) return new Set();
    throw error;
  }
}

export function d1BindingsFromConfig(config) {
  return Object.freeze((config?.d1_databases ?? []).map((database) => Object.freeze({
    binding:nonEmpty("D1 binding", database.binding),
    name:nonEmpty("D1 database name", database.database_name),
  })));
}

export async function ensureCloudflareD1Migrations({
  repoRoot,
  databases,
  runner,
  dryRun = false,
  print = console.log,
} = {}) {
  if (typeof runner !== "function") throw new TypeError("D1 migration runner is required");
  const root = resolve(nonEmpty("repoRoot", repoRoot));
  const results = [];

  for (const database of databases ?? []) {
    const binding = nonEmpty("D1 binding", database.binding);
    const name = nonEmpty("D1 database name", database.name);
    const migrations = migrationsFor(binding);
    print(`D1 CHECK  ${binding} -> ${name}`);

    const applied = await appliedMigrations(runner, name, binding, { cwd:root });
    if (!dryRun) await d1Command(runner, name, LEDGER_CREATE_SQL, { cwd:root });

    const appliedNow = [];
    for (const migration of migrations) {
      const migrationId = basename(migration);
      if (applied.has(migrationId)) {
        print(`D1 OK     ${binding} ${migrationId}`);
        continue;
      }
      if (dryRun) {
        print(`D1 PENDING ${binding} ${migrationId}`);
        continue;
      }

      print(`D1 APPLY  ${binding} ${migrationId}`);
      await runner(["d1", "execute", name, "--remote", "--file", resolve(root, migration)], { cwd:root });
      await d1Command(
        runner,
        name,
        `INSERT OR IGNORE INTO ${LEDGER_TABLE}(binding,migration_id,applied_at) VALUES (${sqlLiteral(binding)},${sqlLiteral(migrationId)},datetime('now'))`,
        { cwd:root },
      );
      print(`D1 APPLIED ${binding} ${migrationId}`);
      appliedNow.push(migrationId);
    }

    print(`D1 READY  ${binding} -> ${name} migrations=${migrations.length}`);
    results.push(Object.freeze({
      binding,
      name,
      migrations:Object.freeze(migrations.map((migration) => basename(migration))),
      appliedNow:Object.freeze(appliedNow),
    }));
  }

  return Object.freeze(results);
}
