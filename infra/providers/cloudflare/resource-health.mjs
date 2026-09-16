const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

export const RESOURCE_HEALTH_DEFAULT_LIMITS = Object.freeze({
  d1RowsReadDaily: 500_000,
  d1RowsWrittenDaily: 10_000,
  durableObjectRowsReadDaily: 5_000_000,
  durableObjectRowsWrittenDaily: 100_000,
  workerRequests15m: 25_000,
  workerErrors15m: 100,
});

const QUERY = `
query FibreInfraWatch($accountTag: string!, $date: Date!, $dayStart: string!, $start: string!, $end: string!) {
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
      durableObjectsInvocationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $dayStart, datetime_leq: $end }) {
        sum { requests errors }
        dimensions { namespaceId scriptName }
      }
      durableObjectsPeriodicGroups(limit: 10000, filter: { datetime_geq: $dayStart, datetime_leq: $end }) {
        sum { rowsRead rowsWritten }
        dimensions { namespaceId }
      }
    }
  }
}`;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function finiteLimit(name, value, fallback) {
  const candidate = value == null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(candidate) || candidate < 0) throw new TypeError(`${name} must be a non-negative number`);
  return candidate;
}

export function normalizeResourceHealthLimits(input = {}) {
  return Object.freeze({
    d1RowsReadDaily: finiteLimit("d1RowsReadDaily", input.d1RowsReadDaily, RESOURCE_HEALTH_DEFAULT_LIMITS.d1RowsReadDaily),
    d1RowsWrittenDaily: finiteLimit("d1RowsWrittenDaily", input.d1RowsWrittenDaily, RESOURCE_HEALTH_DEFAULT_LIMITS.d1RowsWrittenDaily),
    durableObjectRowsReadDaily: finiteLimit("durableObjectRowsReadDaily", input.durableObjectRowsReadDaily, RESOURCE_HEALTH_DEFAULT_LIMITS.durableObjectRowsReadDaily),
    durableObjectRowsWrittenDaily: finiteLimit("durableObjectRowsWrittenDaily", input.durableObjectRowsWrittenDaily, RESOURCE_HEALTH_DEFAULT_LIMITS.durableObjectRowsWrittenDaily),
    workerRequests15m: finiteLimit("workerRequests15m", input.workerRequests15m, RESOURCE_HEALTH_DEFAULT_LIMITS.workerRequests15m),
    workerErrors15m: finiteLimit("workerErrors15m", input.workerErrors15m, RESOURCE_HEALTH_DEFAULT_LIMITS.workerErrors15m),
  });
}

function isEnvironmentScript(scriptName, environment) {
  if (typeof scriptName !== "string" || !scriptName.startsWith("fibre-")) return false;
  return environment === "production" ? !scriptName.endsWith("-staging") : scriptName.endsWith(`-${environment}`);
}

function aggregateWorkers(groups, environment) {
  const byScript = new Map();
  for (const group of groups) {
    const scriptName = group?.dimensions?.scriptName;
    if (!isEnvironmentScript(scriptName, environment)) continue;
    const current = byScript.get(scriptName) ?? { scriptName, requests:0, errors:0, subrequests:0, cpuTimeP99:0 };
    current.requests += Number(group?.sum?.requests ?? 0);
    current.errors += Number(group?.sum?.errors ?? 0);
    current.subrequests += Number(group?.sum?.subrequests ?? 0);
    current.cpuTimeP99 = Math.max(current.cpuTimeP99, Number(group?.quantiles?.cpuTimeP99 ?? 0));
    byScript.set(scriptName, current);
  }
  return Object.freeze([...byScript.values()].sort((left, right) => right.requests - left.requests).map(Object.freeze));
}

function d1Usage(groups, resources) {
  const byId = new Map(groups.map((group) => [group?.dimensions?.databaseId, group]));
  return Object.freeze((resources ?? []).map((database) => {
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
  }));
}

function durableObjectUsage(invocationGroups, periodicGroups) {
  const scriptsByNamespace = new Map();
  for (const group of invocationGroups) {
    const namespaceId = group?.dimensions?.namespaceId;
    const scriptName = group?.dimensions?.scriptName;
    if (typeof namespaceId !== "string" || typeof scriptName !== "string") continue;
    let scripts = scriptsByNamespace.get(namespaceId);
    if (!scripts) {
      scripts = new Set();
      scriptsByNamespace.set(namespaceId, scripts);
    }
    scripts.add(scriptName);
  }

  const usageByNamespace = new Map();
  for (const group of periodicGroups) {
    const namespaceId = group?.dimensions?.namespaceId;
    if (typeof namespaceId !== "string") continue;
    const current = usageByNamespace.get(namespaceId) ?? { namespaceId, rowsRead:0, rowsWritten:0 };
    current.rowsRead += Number(group?.sum?.rowsRead ?? 0);
    current.rowsWritten += Number(group?.sum?.rowsWritten ?? 0);
    usageByNamespace.set(namespaceId, current);
  }

  const namespaceIds = new Set([...scriptsByNamespace.keys(), ...usageByNamespace.keys()]);
  return Object.freeze([...namespaceIds].map((namespaceId) => {
    const usage = usageByNamespace.get(namespaceId) ?? { rowsRead:0, rowsWritten:0 };
    const scripts = scriptsByNamespace.get(namespaceId) ?? new Set();
    return Object.freeze({
      namespaceId,
      scriptNames:Object.freeze([...scripts].sort()),
      rowsRead:usage.rowsRead,
      rowsWritten:usage.rowsWritten,
    });
  }).sort((left, right) => right.rowsRead - left.rowsRead));
}

function durableObjectTotals(durableObjects) {
  return Object.freeze(durableObjects.reduce((totals, item) => {
    totals.rowsRead += item.rowsRead;
    totals.rowsWritten += item.rowsWritten;
    return totals;
  }, { rowsRead:0, rowsWritten:0 }));
}

function level(value, limit) {
  if (limit <= 0) return value > 0 ? "critical" : "normal";
  if (value >= limit) return "critical";
  if (value >= limit * 0.5) return "elevated";
  return "normal";
}

function checksFor({ d1, durableObjectTotal, workers, limits }) {
  const checks = [];
  for (const database of d1) {
    checks.push(Object.freeze({ kind:"d1_rows_read", resource:database.name, value:database.rowsRead, limit:limits.d1RowsReadDaily, level:level(database.rowsRead, limits.d1RowsReadDaily) }));
    checks.push(Object.freeze({ kind:"d1_rows_written", resource:database.name, value:database.rowsWritten, limit:limits.d1RowsWrittenDaily, level:level(database.rowsWritten, limits.d1RowsWrittenDaily) }));
  }
  checks.push(Object.freeze({
    kind:"durable_object_rows_read",
    resource:"durable-objects-account",
    scope:"account",
    value:durableObjectTotal.rowsRead,
    limit:limits.durableObjectRowsReadDaily,
    level:level(durableObjectTotal.rowsRead, limits.durableObjectRowsReadDaily),
  }));
  checks.push(Object.freeze({
    kind:"durable_object_rows_written",
    resource:"durable-objects-account",
    scope:"account",
    value:durableObjectTotal.rowsWritten,
    limit:limits.durableObjectRowsWrittenDaily,
    level:level(durableObjectTotal.rowsWritten, limits.durableObjectRowsWrittenDaily),
  }));
  for (const worker of workers) {
    checks.push(Object.freeze({ kind:"worker_requests_15m", resource:worker.scriptName, value:worker.requests, limit:limits.workerRequests15m, level:level(worker.requests, limits.workerRequests15m) }));
    checks.push(Object.freeze({ kind:"worker_errors_15m", resource:worker.scriptName, value:worker.errors, limit:limits.workerErrors15m, level:level(worker.errors, limits.workerErrors15m) }));
  }
  return Object.freeze(checks);
}

function overallLevel(checks) {
  if (checks.some((check) => check.level === "critical")) return "critical";
  if (checks.some((check) => check.level === "elevated")) return "elevated";
  return "normal";
}

export async function sampleCloudflareResourceHealth({
  accountId,
  apiToken,
  environment,
  d1Resources = [],
  limits: rawLimits = {},
  now = new Date(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const accountTag = nonEmpty("Cloudflare account ID", accountId);
  const token = nonEmpty("Cloudflare analytics token", apiToken);
  const env = nonEmpty("environment", environment);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const end = now.toISOString();
  const start = new Date(now.getTime() - 15 * 60_000).toISOString();
  const date = end.slice(0, 10);
  const dayStart = `${date}T00:00:00.000Z`;
  const response = await fetchImpl(GRAPHQL_URL, {
    method:"POST",
    headers:{ Authorization:`Bearer ${token}`, Accept:"application/json", "Content-Type":"application/json" },
    body:JSON.stringify({ query:QUERY, variables:{ accountTag, date, dayStart, start, end } }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const detail = payload.errors?.map((error) => error.message).join("; ") ?? `HTTP ${response.status}`;
    throw new Error(`Cloudflare analytics query failed: ${detail}`);
  }
  const account = payload?.data?.viewer?.accounts?.[0];
  if (!account) throw new Error("Cloudflare analytics query returned no account data");
  const limits = normalizeResourceHealthLimits(rawLimits);
  const d1 = d1Usage(account.d1AnalyticsAdaptiveGroups ?? [], d1Resources);
  const workers = aggregateWorkers(account.workersInvocationsAdaptive ?? [], env);
  const durableObjects = durableObjectUsage(
    account.durableObjectsInvocationsAdaptiveGroups ?? [],
    account.durableObjectsPeriodicGroups ?? [],
  );
  const durableObjectTotal = durableObjectTotals(durableObjects);
  const checks = checksFor({ d1, durableObjectTotal, workers, limits });
  return Object.freeze({
    contract:"fibre-cloudflare-resource-health-v0.2",
    environment:env,
    observedAt:end,
    window:Object.freeze({ workersStart:start, workersEnd:end, dailyStart:dayStart, dailyEnd:end, d1Date:date }),
    level:overallLevel(checks),
    limits,
    d1,
    durableObjects,
    durableObjectTotal,
    workers,
    checks,
  });
}
