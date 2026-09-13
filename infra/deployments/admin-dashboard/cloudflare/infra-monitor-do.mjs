import { sampleCloudflareResourceHealth } from "../../../providers/cloudflare/resource-health.mjs";

const SAMPLE_KEY = "sample";
const DEFAULT_TTL_MS = 15 * 60_000;

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

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers:{ "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" },
  });
}

function fresh(sample, ttlMs, nowMs) {
  const sampledMs = Date.parse(sample?.observedAt ?? "");
  return Number.isFinite(sampledMs) && nowMs - sampledMs < ttlMs;
}

function fullPayload({ environment, sample, cached, ttlMs, stale = false, error = null }) {
  return Object.freeze({
    contract:"fibre-admin-infra-monitor-v0.2",
    environment,
    cached,
    stale,
    cacheTtlSeconds:ttlMs / 1000,
    sample:sample ?? null,
    error:error ? Object.freeze({ message:error.message }) : null,
  });
}

function publicSummary({ environment, sample, ttlMs, nowMs }) {
  const isStale = !sample || !fresh(sample, ttlMs, nowMs);
  return Object.freeze({
    contract:"fibre-infra-health-summary-v0.1",
    environment,
    observedAt:sample?.observedAt ?? null,
    level:sample?.level ?? "unavailable",
    stale:isStale,
    cacheTtlSeconds:ttlMs / 1000,
  });
}

export class FibreAdminInfraMonitor {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.samplingPromise = null;
  }

  async sample({ environment, force, now = new Date() }) {
    const config = monitorConfig(this.env);
    const prior = await this.state.storage.get(SAMPLE_KEY) ?? null;
    if (!force && fresh(prior, config.ttlMs, now.getTime())) {
      return fullPayload({ environment, sample:prior, cached:true, ttlMs:config.ttlMs });
    }
    if (!this.samplingPromise) {
      this.samplingPromise = sampleCloudflareResourceHealth({
        accountId:config.accountId,
        apiToken:config.apiToken,
        environment,
        d1Resources:config.d1Resources,
        limits:config.limits,
        now,
      }).then(async (sample) => {
        await this.state.storage.put(SAMPLE_KEY, sample);
        return sample;
      }).finally(() => { this.samplingPromise = null; });
    }
    try {
      const sample = await this.samplingPromise;
      return fullPayload({ environment, sample, cached:false, ttlMs:config.ttlMs });
    } catch (error) {
      if (prior) return fullPayload({ environment, sample:prior, cached:true, stale:true, error, ttlMs:config.ttlMs });
      throw error;
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const environment = nonEmpty("environment", url.searchParams.get("environment"));
    const config = monitorConfig(this.env);
    if (request.method === "GET" && url.pathname === "/cached") {
      const sample = await this.state.storage.get(SAMPLE_KEY) ?? null;
      return json(200, publicSummary({ environment, sample, ttlMs:config.ttlMs, nowMs:Date.now() }));
    }
    if (url.pathname === "/sample" && (request.method === "GET" || request.method === "POST")) {
      try { return json(200, await this.sample({ environment, force:request.method === "POST" })); }
      catch (error) { return json(503, { error:"infra_monitor_unavailable", detail:error.message }); }
    }
    return json(404, { error:"not_found" });
  }
}
