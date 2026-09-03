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
const databases = Object.freeze({
  staging: "fibre-activity-log-staging",
  production: "fibre-activity-log",
});

if (!(environment in databases)) {
  fail("--env <staging|production> is required");
}

const database = databases[environment];
const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const migrationPath = resolve(repoRoot, "infra/providers/cloudflare/d1/0001_activity_log.sql");

function quotaExhausted(output) {
  return output.includes("code: 7500")
    || output.includes("exceeded D1's free tier daily row write limit");
}

function wranglerSql(sql, { write = false } = {}) {
  const result = spawnSync(
    "npx",
    ["wrangler@latest", "d1", "execute", database, "--remote", "--command", sql],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);

  if (result.status !== 0) {
    const combined = `${stdout}\n${stderr}`;
    if (write && quotaExhausted(combined)) {
      console.error(
        "ACTIVITY RESET BLOCKED: Cloudflare D1 daily write quota is exhausted. "
        + "The Activity schema was not reset. Retry after the quota resets at 00:00 UTC. "
        + "Resetting Activity does not reset the quota itself.",
      );
      process.exit(2);
    }
    if (stderr) process.stderr.write(stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`ACTIVITY RESET env=${environment} database=${database}`);
console.log("NOTE this resets telemetry only; it does not reset Cloudflare's daily D1 usage counters.");
console.log("BEFORE");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");

if (!execute) {
  console.log(`DRY RUN only. Re-run with --env ${environment} --execute to drop and recreate this Activity schema.`);
  process.exit(0);
}

const migrationSql = readFileSync(migrationPath, "utf8");
console.log(`RESET schema=${migrationPath}`);
wranglerSql(`DROP TABLE IF EXISTS fibre_activity_log;\n${migrationSql}`, { write: true });

console.log("AFTER");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");