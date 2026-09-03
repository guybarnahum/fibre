import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function has(name) {
  return args.includes(name);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const environment = option("--env");
const execute = has("--execute");

if (environment !== "staging") {
  fail("Activity reset is intentionally restricted to --env staging");
}

const database = "fibre-activity-log-staging";
const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const migrationPath = resolve(repoRoot, "infra/providers/cloudflare/d1/0001_activity_log.sql");

function wranglerSql(sql) {
  const result = spawnSync(
    "npx",
    ["wrangler@latest", "d1", "execute", database, "--remote", "--command", sql],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`ACTIVITY RESET env=${environment} database=${database}`);
console.log("NOTE this resets telemetry only; it does not reset Cloudflare's daily D1 usage counters.");
console.log("BEFORE");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");

if (!execute) {
  console.log("DRY RUN only. Re-run with --execute to drop and recreate the staging Activity schema.");
  process.exit(0);
}

const migrationSql = readFileSync(migrationPath, "utf8");
console.log(`RESET schema=${migrationPath}`);
wranglerSql(`DROP TABLE IF EXISTS fibre_activity_log;\n${migrationSql}`);

console.log("AFTER");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");
