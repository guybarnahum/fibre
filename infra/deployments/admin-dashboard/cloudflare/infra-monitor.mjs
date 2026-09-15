import { sampleCloudflareResourceHealth } from "#infra/providers/cloudflare";

const DEFAULT_TTL_MS = 15 * 60_000;
const STATE_SERVICES = Object.freeze([
  Object.freeze({ binding:"WORLD_KERNEL", service:"world-kernel", resource:"world" }),
  Object.freeze({ binding:"BIRTH_CENTER", service:"birth-center", resource:"birth" }),
]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function numberSetting(name, value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new TypeError(`${name} must be a non-negative number`);
  return parsed;
}

function monitorConfig(env) {
  const raw = nonEmpty("FIBRE_CLOUDFLARE_ANALYTICS_CONFIG", env.FIBRE_CLOUDFLARE_ANALYTICS_CONFIG);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) { throw new TypeError(`FIBRE_CLOUDFLARE_ANALYTICS_CONFIG must be JSON: ${error.message}`); }
  const d1Resources = Array.isArray(parsed.d1Resources) ? parsed.d1Resources.map((resource) => Object.freeze({
    name:nonEmpty("D1 resource name", resource?.name),
    id:nonEmpty("D1 resource id", resource?.id),
    binding:typeof resource?.binding === "string" ? resource.binding : null,
  })) : [];
  if (d1Resources.length === 0) throw new TypeError("FIBRE_CLOUDFLARE_ANALYTICS_CONFIG must include d1Resources");
  return Object.freeze({
    accountId:nonEmpty("Cloudflare account ID", parsed.accountId),
    apiToken:nonEmpty("Cloudflare analytics token", parsed.apiToken),
    ttlMs:numberSetting("ttlSeconds", parsed.ttlSeconds, DEFAULT_TTL_MS / 1000) * 1000,
    limits:Object.freeze({
      d1RowsReadDaily:numberSetting("d1RowsReadDaily", parsed.limits?.d1RowsReadDaily, 500_000),
      d1RowsWrittenDaily:numberSetting("d1RowsWrittenDaily", parsed.limits?.d1RowsWrittenDaily, 10_000),
      workerRequests15m:numberSetting("workerRequests15m", parsed.limits?.workerRequests15m, 25_000),
      workerErrors15m:numberSetting("workerErrors15m", parsed.limits?.workerErrors15m, 100),
    }),
    d1Resources:Object.freeze(d1Resources),
  });
}

function bounded(value) {
  const text = value instanceof Error ? value.message : String(value ?? "Infrastructure probe failed");
  return text.length <= 512 ? text : `${text.slice(0, 511)}…`;
}

function level(checks) {
  if (checks.some((check) => check.level === "critical")) return "critical";
  if (checks.some((check) => check.level === "elevated")) return "elevated";
  return "normal";
}

function stateCheck(service, payload, responseOk) {
  const providerCheck = payload?.health?.checks?.find((check) => check.kind === "state") ?? null;
  if (responseOk && payload?.ok === true && providerCheck?.level !== "critical") {
    return Object.freeze({
      kind:"state",
      resource:service.resource,
      service:service.service,
      provider:payload?.provider ?? providerCheck?.provider ?? "cloudflare",
      level:"normal",
    });
  }
  const error = providerCheck?.error ?? payload?.error ?? { code:"STATE_HEALTH_FAILED", detail:`${service.service} state health failed` };
  return Object.freeze({
    kind:"state",
    resource:service.resource,
    service:service.service,
    provider:payload?.provider ?? providerCheck?.provider ?? "cloudflare",
    level:"critical",
    error:Object.freeze({
      code:typeof error?.code === "string" ? error.code : "STATE_HEALTH_FAILED",
      detail:bounded(error?.detail ?? error),
    }),
  });
}

async function probeStateService(env, service) {
  const binding = env?.[service.binding];
  if (!binding?.fetch) {
    return Object.freeze({
      kind:"state",
      resource:service.resource,
      service:service.service,
      provider:"cloudflare",
      level:"critical",
      error:Object.freeze({ code:"SERVICE_BINDING_UNAVAILABLE", detail:`${service.binding} binding is unavailable` }),
    });
  }
  try {
    const response = await binding.fetch(new Request("https://fibre.internal/internal/health/state", {
      headers:{ Accept:"application/json" },
    }));
    let payload = null;
    try { payload = await response.json(); }
    catch { payload = null; }
    return stateCheck(service, payload, response.ok);
  } catch (error) {
    return Object.freeze({
      kind:"state",
      resource:service.resource,
      service:service.service,
      provider:"cloudflare",
      level:"critical",
      error:Object.freeze({ code:"STATE_HEALTH_UNAVAILABLE", detail:bounded(error) }),
    });
  }
}

export async function sampleAdminStateHealth({ env, environment, now = new Date() } = {}) {
  const selectedEnvironment = nonEmpty("environment", environment);
  const checks = Object.freeze(await Promise.all(STATE_SERVICES.map((service) => probeStateService(env, service))));
  return Object.freeze({
    contract:"fibre-infra-health-summary-v0.2",
    environment:selectedEnvironment,
    observedAt:now.toISOString(),
    level:level(checks),
    stale:false,
    checks,
  });
}

export async function readAdminInfraMonitor({ env, environment, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  const config = monitorConfig(env);
  const state = await sampleAdminStateHealth({ env, environment, now });
  let capacity = null;
  let capacityError = null;
  try {
    capacity = await sampleCloudflareResourceHealth({
      accountId:config.accountId,
      apiToken:config.apiToken,
      environment,
      d1Resources:config.d1Resources,
      limits:config.limits,
      now,
      fetchImpl,
    });
  } catch (error) {
    capacityError = error;
  }
  const checks = Object.freeze([...state.checks, ...(capacity?.checks ?? [])]);
  const sampleLevel = state.level === "critical"
    ? "critical"
    : capacity === null
      ? "unavailable"
      : level(checks);
  return Object.freeze({
    contract:"fibre-admin-infra-monitor-v0.3",
    environment:nonEmpty("environment", environment),
    cached:false,
    stale:false,
    cacheTtlSeconds:config.ttlMs / 1000,
    sample:Object.freeze({
      contract:"fibre-admin-infra-sample-v0.1",
      observedAt:now.toISOString(),
      level:sampleLevel,
      checks,
      state,
      capacity,
    }),
    error:capacityError ? Object.freeze({ message:bounded(capacityError) }) : null,
  });
}

export async function readCachedInfraHealth({ env, environment } = {}) {
  return sampleAdminStateHealth({ env, environment });
}
