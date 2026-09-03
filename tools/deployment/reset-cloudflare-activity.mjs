import { spawnSync } from "node:child_process";

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
console.log("NOTE deleting Activity rows consumes D1 row writes and does not reset Cloudflare daily write quota.");
console.log("BEFORE");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");

if (!execute) {
  console.log("DRY RUN only. Re-run with --execute to delete all staging Activity rows.");
  process.exit(0);
}

console.log("DELETE");
wranglerSql("DELETE FROM fibre_activity_log;");

console.log("AFTER");
wranglerSql("SELECT COUNT(*) AS rows FROM fibre_activity_log;");
