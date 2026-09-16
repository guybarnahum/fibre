import { createCloudflareInfraDriver, sampleCloudflareResourceHealth } from "#infra/providers/cloudflare";

const DEFAULT_TTL_MS = 15 * 60_000;
const CAPACITY_CACHE = new WeakMap();
const SERVICES = Object.freeze([
  Object.freeze({ binding:"WORLD_KERNEL", service:"world-kernel" }),
  Object.freeze({ binding:"BIRTH_CENTER", service:"birth-center" }),
  Object.freeze({ binding:"THREAD_PRESENTATION", service:"thread-presentation" }),
  Object.freeze({ binding:"ASSET_GENERATOR", service:"asset-generator" }),
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
      durableObjectRowsReadDaily:numberSetting("durableObjectRowsReadDaily", parsed.limits?.durableObjectRowsReadDaily, 5_000_000),
      durableObjectRowsWrittenDaily:numberSetting("durableObjectRowsWrittenDaily", parsed.limits?.durableObjectRowsWrittenDaily, 100_000),
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

function failedServiceCheck(service, code, detail) {
  return Object.freeze({
    kind:"service",
    resource:service.service,
    service:service.service,
    provider:"unknown",
    level:"critical",
    error:Object.freeze({ code, detail:bounded(detail) }),
  });
}

function checksFromService(service, payload, responseOk) {
  const health = payload?.health;
  const checks = Array.isArray(health?.checks)
    ? health.checks.map((check) => Object.freeze({ ...check, service:service.service }))
    : [];
  if (checks.length > 0 && (responseOk || checks.some((check) => check.level === "critical"))) return checks;
  const error = payload?.error ?? { code:"INFRA_HEALTH_FAILED", detail:`${service.service} infrastructure health failed` };
  return [failedServiceCheck(
    service,
    typeof error?.code === "string" ? error.code : "INFRA_HEALTH_FAILED",
    error?.detail ?? error,
  )];
}

async function probeService(env, service) {
  const binding = env?.[service.binding];
  if (!binding?.fetch) return [failedServiceCheck(service, "SERVICE_BINDING_UNAVAILABLE", `${service.binding} binding is unavailable`)];
  try {
    const response = await binding.fetch(new Request("https://fibre.internal/internal/health/infra", {
      headers:{ Accept:"application/json" },
    }));
    let payload = null;
    try { payload = await response.json(); } catch {}
    return checksFromService(service, payload, response.ok);
  } catch (error) {
    return [failedServiceCheck(service, "INFRA_HEALTH_UNAVAILABLE", error)];
  }
}

async function adminD1Health(env) {
  if (!env?.ACTIVITY_LOG) return [failedServiceCheck({ service:"admin-dashboard" }, "ACTIVITY_LOG_UNAVAILABLE", "ACTIVITY_LOG binding is unavailable")];
  const health = await createCloudflareInfraDriver({ telemetryDatabase:env.ACTIVITY_LOG }).health.check();
  return health.checks.map((check) => Object.freeze({ ...check, service:"admin-dashboard" }));
}

export async function sampleAdminInfraHealth({ env, environment, now = new Date() } = {}) {
  const selectedEnvironment = nonEmpty("environment", environment);
  const serviceChecks = await Promise.all(SERVICES.map((service) => probeService(env, service)));
  const checks = Object.freeze([...serviceChecks.flat(), ...await adminD1Health(env)]);
  return Object.freeze({
    contract:"fibre-infra-health-summary-v0.3",
    environment:selectedEnvironment,
    observedAt:now.toISOString(),
    level:level(checks),
    stale:false,
    checks,
  });
}

function cachedCapacity(env, nowMs, ttlMs) {
  const cached = CAPACITY_CACHE.get(env);
  if (!cached || nowMs - cached.observedAtMs >= ttlMs) return null;
  return cached;
}

async function readCapacity({ env, environment, config, now, fetchImpl, force }) {
  const nowMs = now.getTime();
  const cached = force ? null : cachedCapacity(env, nowMs, config.ttlMs);
  if (cached !== null) return Object.freeze({ capacity:cached.capacity, cached:true, stale:false, error:null });

  const prior = CAPACITY_CACHE.get(env) ?? null;
  try {
    const capacity = await sampleCloudflareResourceHealth({
      accountId:config.accountId,
      apiToken:config.apiToken,
      environment,
      d1Resources:config.d1Resources,
      limits:config.limits,
      now,
      fetchImpl,
    });
    CAPACITY_CACHE.set(env, Object.freeze({ observedAtMs:nowMs, capacity }));
    return Object.freeze({ capacity, cached:false, stale:false, error:null });
  } catch (error) {
    if (prior !== null) return Object.freeze({ capacity:prior.capacity, cached:true, stale:true, error });
    return Object.freeze({ capacity:null, cached:false, stale:true, error });
  }
}

export async function readAdminInfraMonitor({ env, environment, fetchImpl = globalThis.fetch, now = new Date(), force = false } = {}) {
  const config = monitorConfig(env);
  const infra = await sampleAdminInfraHealth({ env, environment, now });
  const capacityResult = await readCapacity({ env, environment, config, now, fetchImpl, force });
  const checks = Object.freeze([...infra.checks, ...(capacityResult.capacity?.checks ?? [])]);
  const sampleLevel = infra.level === "critical"
    ? "critical"
    : capacityResult.capacity === null
      ? "unavailable"
      : level(checks);
  return Object.freeze({
    contract:"fibre-admin-infra-monitor-v0.5",
    environment:nonEmpty("environment", environment),
    cached:capacityResult.cached,
    stale:capacityResult.stale,
    cacheTtlSeconds:config.ttlMs / 1000,
    sample:Object.freeze({
      contract:"fibre-admin-infra-sample-v0.3",
      observedAt:now.toISOString(),
      level:sampleLevel,
      checks,
      infra,
      capacity:capacityResult.capacity,
    }),
    error:capacityResult.error ? Object.freeze({ message:bounded(capacityResult.error) }) : null,
  });
}

export async function readCachedInfraHealth({ env, environment } = {}) {
  const payload = await readAdminInfraMonitor({ env, environment });
  return Object.freeze({
    contract:"fibre-infra-health-summary-v0.5",
    environment:payload.environment,
    observedAt:payload.sample.observedAt,
    level:payload.sample.level,
    stale:payload.stale,
  });
}
