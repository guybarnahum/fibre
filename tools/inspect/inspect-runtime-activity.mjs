import { fileURLToPath } from "node:url";

import {
  normalizeCloudflareEnvironment,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";
import { normalizeActivityRecord } from "../../infra/telemetry.mjs";

export const ACTIVITY_INSPECTION_VERSION = "fibre-runtime-activity-inspection-v0.1";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function inspectId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a Fibre identifier`);
  }
  return value;
}

export function parseActivityInspectArgs(argv) {
  let environment = "staging";
  let selector = null;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") environment = argv[++index] ?? null;
    else if (arg === "--request") selector = { kind: "requestId", value: argv[++index] ?? null };
    else if (arg === "--genesis") selector = { kind: "genesisId", value: argv[++index] ?? null };
    else if (arg === "--thread") selector = { kind: "threadId", value: argv[++index] ?? null };
    else if (arg === "--failures") selector = { kind: "failures", value: true };
    else if (arg === "--json") json = true;
    else throw new TypeError(`unsupported argument ${arg}`);
  }
  const env = normalizeCloudflareEnvironment(environment);
  if (selector === null) throw new TypeError("one of --request, --genesis, --thread, or --failures is required");
  if (selector.kind !== "failures") inspectId(selector.kind, selector.value);
  return Object.freeze({ environment: env, selector: Object.freeze(selector), json });
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildActivitySql({ selector, environment }) {
  normalizeCloudflareEnvironment(environment);
  if (!selector || typeof selector !== "object") throw new TypeError("activity selector is required");
  const clauses = [`environment = ${sqlString(environment)}`];
  if (selector.kind === "failures") {
    clauses.push("status IN ('failed', 'retrying')");
  } else {
    const column = {
      requestId: "request_id",
      genesisId: "genesis_id",
      threadId: "thread_id",
    }[selector.kind];
    if (!column) throw new TypeError(`unsupported activity selector ${String(selector.kind)}`);
    clauses.push(`${column} = ${sqlString(inspectId(selector.kind, selector.value))}`);
  }
  return `SELECT record_json FROM fibre_activity_log WHERE ${clauses.join(" AND ")} ORDER BY occurred_at ASC, recorded_at ASC, rowid ASC`;
}

function resultRows(parsed) {
  const containers = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const container of containers) {
    const candidates = container?.results ?? container?.result?.results ?? container?.result ?? [];
    if (Array.isArray(candidates)) rows.push(...candidates);
  }
  return rows;
}

export function parseWranglerActivityRows(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Wrangler D1 activity query returned invalid JSON: ${error.message}`);
  }
  return Object.freeze(resultRows(parsed).map((row) => {
    if (typeof row?.record_json !== "string") throw new Error("Wrangler D1 activity row lacks record_json");
    return normalizeActivityRecord(JSON.parse(row.record_json));
  }));
}

export function createWranglerActivityReader({ runner = runWrangler, cwd = process.cwd() } = {}) {
  return Object.freeze({
    async query({ databaseName, selector, environment }) {
      const sql = buildActivitySql({ selector, environment });
      const { stdout } = await runner([
        "d1", "execute", databaseName, "--remote", "--command", sql, "--json",
      ], { cwd });
      return parseWranglerActivityRows(stdout);
    },
  });
}

function activityDatabaseName(state) {
  const matches = (state?.resources?.d1 ?? []).filter((database) => database.binding === "ACTIVITY_LOG");
  if (matches.length !== 1 || typeof matches[0]?.name !== "string" || matches[0].name === "") {
    throw new Error("Cloudflare operator state must contain exactly one ACTIVITY_LOG D1 database");
  }
  return matches[0].name;
}

function identities(records) {
  const one = (key) => {
    const values = [...new Set(records.map((record) => record[key]).filter(Boolean))];
    return values.length === 1 ? values[0] : null;
  };
  return Object.freeze({ requestId: one("requestId"), genesisId: one("genesisId"), threadId: one("threadId") });
}

function clock(timestamp) {
  return timestamp.slice(11, 19);
}

function displayService(value) {
  return value.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}

export function summarizeActivityChain(records) {
  const failures = records.filter((record) => record.status === "failed");
  const retrying = records.filter((record) => record.status === "retrying");
  if (records.length === 0) return "no matching activity";
  if (failures.length === 0) return "completed without recorded failures";
  const finalFailure = failures.at(-1);
  const recovered = records.some((record) => (
    record.stage === finalFailure.stage
    && record.status === "succeeded"
    && record.occurredAt >= finalFailure.occurredAt
  ));
  if (recovered) return `completed; ${finalFailure.stage} recovered after ${retrying.length || failures.length} retry event(s)`;
  return `incomplete or failed; last failure ${finalFailure.service} ${finalFailure.stage}`;
}

export function renderActivityChain(records) {
  const ids = identities(records);
  const lines = [];
  if (ids.requestId) lines.push(`REQUEST ${ids.requestId}`);
  if (ids.genesisId) lines.push(`GENESIS ${ids.genesisId}`);
  if (ids.threadId) lines.push(`THREAD ${ids.threadId}`);
  if (lines.length > 0) lines.push("");
  for (const record of records) {
    const details = [
      clock(record.occurredAt),
      displayService(record.service),
      record.stage,
      record.status,
      `attempt=${record.attempt}`,
    ];
    if (record.error) details.push(`error=${record.error.category}/${record.error.code}`, `retryable=${record.error.retryable}`);
    lines.push(details.join(" "));
  }
  if (records.length > 0) lines.push("");
  lines.push(`FINAL: ${summarizeActivityChain(records)}`);
  return `${lines.join("\n")}\n`;
}

export async function inspectRuntimeActivity({
  repoRoot,
  environment,
  selector,
  reader,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!reader || typeof reader.query !== "function") throw new TypeError("activity reader is required");
  const state = await readCloudflareOperatorState({ repoRoot, environment: env });
  const databaseName = activityDatabaseName(state);
  const records = await reader.query({ databaseName, selector, environment: env });
  return Object.freeze({
    contract: ACTIVITY_INSPECTION_VERSION,
    environment: env,
    databaseName,
    query: structuredClone(selector),
    records,
    summary: summarizeActivityChain(records),
  });
}

async function main(argv) {
  const parsed = parseActivityInspectArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  const reader = createWranglerActivityReader({ cwd: repoRoot });
  const result = await inspectRuntimeActivity({ repoRoot, environment: parsed.environment, selector: parsed.selector, reader });
  if (parsed.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderActivityChain(result.records));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main(process.argv.slice(2));
}
