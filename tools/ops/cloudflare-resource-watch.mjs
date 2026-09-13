import { fileURLToPath } from "node:url";

import {
  normalizeCloudflareEnvironment,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

function numberEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a non-negative number`);
  return value;
}

export function parseResourceWatchArgs(argv) {
  let environment = "staging";
  let json = false;
  let isolate = true;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") environment = argv[++index] ?? null;
    else if (arg === "--json") json = true;
    else if (arg === "--no-isolate") isolate = false;
    else throw new TypeError(`unsupported argument ${arg}`);
  }
  return Object.freeze({ environment: normalizeCloudflareEnvironment(environment), json, isolate });
}

function thresholds() {
  return Object.freeze({
    d1RowsReadDaily: numberEnv("FIBRE_INFRA_D1_ROWS_READ_DAILY_WARN", 500_000),
    d1RowsWrittenDaily: numberEnv("FIBRE_INFRA_D1_ROWS_WRITTEN_DAILY_WARN", 10_000),
    workerRequests15m: numberEnv("FIBRE_INFRA_WORKER_REQUESTS_15M_WARN", 25_000),
    workerErrors15m: numberEnv("FIBRE_INFRA_WORKER_ERRORS_15M_WARN", 100),
  });
}

const QUERY = `
query FibreInfraWatch($accountTag: string!, $date: Date!, $start: string!, $end: string!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      d1AnalyticsAdaptiveGroups(limit: 1000, filter: { date_geq: $date, date_leq: $date }) {
        sum { readQueries writeQueries rowsRead rowsWritten }
        dimensions { date databaseId }
      }
      workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $start, datetime_leq: $end }) {
        sum { requests errors subrequests }
        quantiles { cpuTimeP99 }
        dimensions { scriptName status }
      }
    }
  }
}`;

async function analytics({ accountId, apiToken, now = new Date(), fetchImpl = globalThis.fetch }) {
  if (typeof accountId !== "string" || accountId === "") throw new TypeError("CLOUDFLARE_ACCOUNT_ID is required");
  if (typeof apiToken !== "string" || apiToken === "") throw new TypeError("Cloudflare analytics token is required");
  const end = now.toISOString();
  const start = new Date(now.getTime() - 15 * 60_000).toISOString();
  const date = end.slice(0, 10);
  const response = await fetchImpl(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { accountTag: accountId, date, start, end } }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const detail = payload.errors?.map((error) => error.message).join("; ") ?? `HTTP ${response.status}`;
    throw new Error(`Cloudflare analytics query failed: ${detail}`);
  }
  const account = payload?.data?.viewer?.accounts?.[0];
  if (!account) throw new Error("Cloudflare analytics query returned no account data");
  return Object.freeze({ date, start, end, d1: account.d1AnalyticsAdaptiveGroups ?? [], workers: account.workersInvocationsAdaptive ?? [] });
}

function aggregateWorkers(groups, environment) {
  const suffix = environment === "production" ? "" : `-${environment}`;
  const byScript = new Map();
  for (const group of groups) {
    const scriptName = group?.dimensions?.scriptName;
    if (typeof scriptName !== "string" || !scriptName.startsWith("fibre-")) continue;
    if (suffix && !scriptName.endsWith(suffix)) continue;
    const current = byScript.get(scriptName) ?? { scriptName, requests:0, errors:0, subrequests:0, cpuTimeP99:0 };
    current.requests += Number(group?.sum?.requests ?? 0);
    current.errors += Number(group?.sum?.errors ?? 0);
    current.subrequests += Number(group?.sum?.subrequests ?? 0);
    current.cpuTimeP99 = Math.max(current.cpuTimeP99, Number(group?.quantiles?.cpuTimeP99 ?? 0));
    byScript.set(scriptName, current);
  }
  return [...byScript.values()].sort((left, right) => right.requests - left.requests);
}

function d1Usage(groups, resources) {
  const byId = new Map(groups.map((group) => [group?.dimensions?.databaseId, group]));
  return (resources ?? []).map((database) => {
    const group = byId.get(database.id) ?? {};
    return Object.freeze({
      name: database.name,
      id: database.id,
      binding: database.binding,
      readQueries: Number(group?.sum?.readQueries ?? 0),
      writeQueries: Number(group?.sum?.writeQueries ?? 0),
      rowsRead: Number(group?.sum?.rowsRead ?? 0),
      rowsWritten: Number(group?.sum?.rowsWritten ?? 0),
    });
  });
}

function detect({ d1, workers, limits }) {
  const alerts = [];
  for (const database of d1) {
    if (database.rowsRead >= limits.d1RowsReadDaily) alerts.push({ kind:"d1_rows_read", resource:database.name, value:database.rowsRead, limit:limits.d1RowsReadDaily });
    if (database.rowsWritten >= limits.d1RowsWrittenDaily) alerts.push({ kind:"d1_rows_written", resource:database.name, value:database.rowsWritten, limit:limits.d1RowsWrittenDaily });
  }
  for (const worker of workers) {
    if (worker.requests >= limits.workerRequests15m) alerts.push({ kind:"worker_requests_15m", resource:worker.scriptName, value:worker.requests, limit:limits.workerRequests15m });
    if (worker.errors >= limits.workerErrors15m) alerts.push({ kind:"worker_errors_15m", resource:worker.scriptName, value:worker.errors, limit:limits.workerErrors15m });
  }
  return alerts;
}

async function insights(databaseName, sortBy, { cwd, runner = runWrangler } = {}) {
  try {
    const { stdout } = await runner([
      "d1", "insights", databaseName,
      "--sort-type=sum", `--sort-by=${sortBy}`, "--sort-direction=DESC",
      "--limit=5", "--timePeriod=1d", "--json",
    ], { cwd });
    return JSON.parse(stdout);
  } catch (error) {
    return Object.freeze({ unavailable: true, detail: error.message });
  }
}

async function isolateD1(alerts, d1, options) {
  const names = new Set(alerts.filter((alert) => alert.kind.startsWith("d1_")).map((alert) => alert.resource));
  const result = {};
  for (const database of d1) {
    if (!names.has(database.name)) continue;
    result[database.name] = Object.freeze({
      topReads: await insights(database.name, "reads", options),
      topWrites: await insights(database.name, "writes", options),
    });
  }
  return Object.freeze(result);
}

async function notifyWebhook(payload, fetchImpl = globalThis.fetch) {
  const url = process.env.FIBRE_INFRA_ALERT_WEBHOOK_URL;
  if (!url) return null;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`infra alert webhook returned HTTP ${response.status}`);
  return Object.freeze({ sent: true });
}

export async function watchCloudflareResources({
  repoRoot,
  environment,
  isolate = true,
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN,
  now = new Date(),
  fetchImpl = globalThis.fetch,
  runner = runWrangler,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const state = await readCloudflareOperatorState({ repoRoot, environment: env });
  const raw = await analytics({ accountId, apiToken, now, fetchImpl });
  const limits = thresholds();
  const d1 = d1Usage(raw.d1, state.resources?.d1 ?? []);
  const workers = aggregateWorkers(raw.workers, env);
  const alerts = detect({ d1, workers, limits });
  const isolation = isolate && alerts.length > 0 ? await isolateD1(alerts, d1, { cwd:repoRoot, runner }) : {};
  const result = Object.freeze({
    contract: "fibre-cloudflare-resource-watch-v0.1",
    environment: env,
    observedAt: now.toISOString(),
    window: { workersStart:raw.start, workersEnd:raw.end, d1Date:raw.date },
    limits,
    d1,
    workers,
    alerts,
    isolation,
  });
  if (alerts.length > 0) await notifyWebhook(result, fetchImpl);
  return result;
}

function render(result) {
  const lines = [`INFRA ${result.environment} ${result.observedAt}`];
  for (const database of result.d1) lines.push(`D1 ${database.name} read=${database.rowsRead} write=${database.rowsWritten} queries=${database.readQueries + database.writeQueries}`);
  for (const worker of result.workers) lines.push(`WORKER ${worker.scriptName} requests15m=${worker.requests} errors=${worker.errors} cpuP99=${worker.cpuTimeP99}`);
  if (result.alerts.length === 0) lines.push("OK no resource-burn thresholds crossed");
  else {
    for (const alert of result.alerts) lines.push(`ALERT ${alert.kind} ${alert.resource} ${alert.value} >= ${alert.limit}`);
    for (const [database, detail] of Object.entries(result.isolation)) {
      lines.push(`ISOLATE ${database}`);
      lines.push(`  reads ${JSON.stringify(detail.topReads)}`);
      lines.push(`  writes ${JSON.stringify(detail.topWrites)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main(argv) {
  const parsed = parseResourceWatchArgs(argv);
  const result = await watchCloudflareResources({
    repoRoot: repoRootFrom(import.meta.url),
    environment: parsed.environment,
    isolate: parsed.isolate,
  });
  process.stdout.write(parsed.json ? `${JSON.stringify(result, null, 2)}\n` : render(result));
  if (result.alerts.length > 0) process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main(process.argv.slice(2));
}
