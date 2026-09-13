import { sampleCloudflareResourceHealth } from "#infra/providers/cloudflare/resource-health";

const CACHE_CONTRACT = "fibre-admin-infra-monitor-cache-v0.1";
const DEFAULT_TTL_MS = 15 * 60_000;
const LEASE_MS = 60_000;

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
  return Object.freeze({
    accountId:nonEmpty("FIBRE_CLOUDFLARE_ACCOUNT_ID", env.FIBRE_CLOUDFLARE_ACCOUNT_ID),
    apiToken:nonEmpty("FIBRE_CLOUDFLARE_ANALYTICS_TOKEN", env.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN),
    ttlMs:numberSetting("FIBRE_INFRA_SAMPLE_TTL_SECONDS", env.FIBRE_INFRA_SAMPLE_TTL_SECONDS, DEFAULT_TTL_MS / 1000) * 1000,
    limits:Object.freeze({
      d1RowsReadDaily:numberSetting("FIBRE_INFRA_D1_ROWS_READ_DAILY_WARN", env.FIBRE_INFRA_D1_ROWS_READ_DAILY_WARN, 500_000),
      d1RowsWrittenDaily:numberSetting("FIBRE_INFRA_D1_ROWS_WRITTEN_DAILY_WARN", env.FIBRE_INFRA_D1_ROWS_WRITTEN_DAILY_WARN, 10_000),
      workerRequests15m:numberSetting("FIBRE_INFRA_WORKER_REQUESTS_15M_WARN", env.FIBRE_INFRA_WORKER_REQUESTS_15M_WARN, 25_000),
      workerErrors15m:numberSetting("FIBRE_INFRA_WORKER_ERRORS_15M_WARN", env.FIBRE_INFRA_WORKER_ERRORS_15M_WARN, 100),
    }),
    d1Resources:Object.freeze([
      Object.freeze({ name:nonEmpty("FIBRE_ACTIVITY_LOG_DATABASE_NAME", env.FIBRE_ACTIVITY_LOG_DATABASE_NAME), id:nonEmpty("FIBRE_ACTIVITY_LOG_DATABASE_ID", env.FIBRE_ACTIVITY_LOG_DATABASE_ID), binding:"ACTIVITY_LOG" }),
      ...(env.FIBRE_PRESENTATION_CATALOG_DATABASE_ID && env.FIBRE_PRESENTATION_CATALOG_DATABASE_NAME ? [Object.freeze({ name:env.FIBRE_PRESENTATION_CATALOG_DATABASE_NAME, id:env.FIBRE_PRESENTATION_CATALOG_DATABASE_ID, binding:"PRESENTATION_CATALOG" })] : []),
    ]),
  });
}

async function cachedRow(env, environment) {
  const result = await env.ACTIVITY_LOG.prepare(
    "SELECT sampled_at, sample_json, sampling_started_at FROM fibre_admin_infra_monitor WHERE environment = ? LIMIT 1",
  ).bind(environment).all();
  return Array.isArray(result?.results) ? result.results[0] ?? null : null;
}

function parsedSample(row) {
  if (typeof row?.sample_json !== "string" || row.sample_json === "") return null;
  try { return JSON.parse(row.sample_json); } catch { return null; }
}

function isFresh(row, ttlMs, nowMs) {
  const sampledMs = Date.parse(row?.sampled_at ?? "");
  return Number.isFinite(sampledMs) && nowMs - sampledMs < ttlMs;
}

async function acquireLease(env, environment, now) {
  const leaseCutoff = new Date(now.getTime() - LEASE_MS).toISOString();
  await env.ACTIVITY_LOG.prepare(
    "INSERT OR IGNORE INTO fibre_admin_infra_monitor (environment, sampled_at, sample_json, sampling_started_at) VALUES (?, NULL, NULL, NULL)",
  ).bind(environment).run();
  const result = await env.ACTIVITY_LOG.prepare(
    "UPDATE fibre_admin_infra_monitor SET sampling_started_at = ? WHERE environment = ? AND (sampling_started_at IS NULL OR sampling_started_at < ?)",
  ).bind(now.toISOString(), environment, leaseCutoff).run();
  return Number(result?.meta?.changes ?? 0) === 1;
}

async function releaseLease(env, environment) {
  await env.ACTIVITY_LOG.prepare(
    "UPDATE fibre_admin_infra_monitor SET sampling_started_at = NULL WHERE environment = ?",
  ).bind(environment).run();
}

async function storeSample(env, environment, sample) {
  await env.ACTIVITY_LOG.prepare(
    "UPDATE fibre_admin_infra_monitor SET sampled_at = ?, sample_json = ?, sampling_started_at = NULL WHERE environment = ?",
  ).bind(sample.observedAt, JSON.stringify(sample), environment).run();
}

function responsePayload({ environment, sample, cached, refreshing = false, stale = false, error = null, ttlMs }) {
  return Object.freeze({
    contract:"fibre-admin-infra-monitor-v0.1",
    environment,
    cached,
    refreshing,
    stale,
    cacheTtlSeconds:ttlMs / 1000,
    sample,
    error:error ? Object.freeze({ message:error.message }) : null,
  });
}

export async function readAdminInfraMonitor({ env, environment, force = false, now = new Date(), fetchImpl = globalThis.fetch } = {}) {
  if (!env.ACTIVITY_LOG?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  const config = monitorConfig(env);
  const nowMs = now.getTime();
  const row = await cachedRow(env, environment);
  const sample = parsedSample(row);
  if (!force && sample && isFresh(row, config.ttlMs, nowMs)) {
    return responsePayload({ environment, sample, cached:true, ttlMs:config.ttlMs });
  }

  const lease = await acquireLease(env, environment, now);
  if (!lease) {
    return responsePayload({ environment, sample, cached:true, refreshing:true, stale:true, ttlMs:config.ttlMs });
  }

  try {
    const fresh = await sampleCloudflareResourceHealth({
      accountId:config.accountId,
      apiToken:config.apiToken,
      environment,
      d1Resources:config.d1Resources,
      limits:config.limits,
      now,
      fetchImpl,
    });
    await storeSample(env, environment, fresh);
    return responsePayload({ environment, sample:fresh, cached:false, ttlMs:config.ttlMs });
  } catch (error) {
    await releaseLease(env, environment);
    if (sample) return responsePayload({ environment, sample, cached:true, stale:true, error, ttlMs:config.ttlMs });
    throw error;
  }
}

export const ADMIN_INFRA_MONITOR_CACHE_CONTRACT = CACHE_CONTRACT;
