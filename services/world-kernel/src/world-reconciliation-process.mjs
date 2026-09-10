import { requireInfraCapabilities } from "#infra";

export const WORLD_RECONCILIATION_SCOPE_ID = "world";
const DEFAULT_MAX_RETRY_MS = 300_000;

function optionalMethod(name, value, method) {
  if (value === null) return null;
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must be null or expose ${method}()`);
  }
  return value;
}

function errorRecord(error) {
  return Object.freeze({
    errorName: error?.constructor?.name ?? "Error",
    message: error?.message ?? String(error),
  });
}

function assertIntervalMs(name, value) {
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError(`${name} must be an integer from 100 through 3600000`);
  }
  return value;
}

function presentationNeedsRetry(entry) {
  if (entry?.enabled !== true) return false;
  if (entry.ok !== true) return true;
  const result = entry.result;
  if (!result || typeof result !== "object") return false;
  if (Number.isSafeInteger(result.failed) && result.failed > 0) return true;
  if (Number.isSafeInteger(result.attempted) && Number.isSafeInteger(result.delivered)) {
    return result.delivered < result.attempted;
  }
  return false;
}

function visualNeedsRetry(entry) {
  if (entry?.enabled !== true) return false;
  if (entry.ok !== true) return true;
  const result = entry.result;
  if (!result || typeof result !== "object") return false;
  if (result.skipped === true) return result.reason === "already_running";
  if (!Array.isArray(result.results)) return false;
  return result.results.some((item) => item?.ok !== true || item?.reconciliation?.complete !== true);
}

export function worldReconciliationNeedsRetry(result) {
  if (!result || typeof result !== "object") return true;
  if (result.skipped === true) return result.reason === "already_running";
  return presentationNeedsRetry(result.presentation) || visualNeedsRetry(result.visualPublication);
}

export function createWorldReconciliationProcess({
  presentationDelivery = null,
  visualPublicationProcess = null,
  onError = null,
} = {}) {
  const delivery = optionalMethod("presentationDelivery", presentationDelivery, "deliverPending");
  let visual = optionalMethod("visualPublicationProcess", visualPublicationProcess, "runOnce");
  if (onError !== null && typeof onError !== "function") {
    throw new TypeError("World reconciliation onError must be a function or null");
  }

  let running = false;

  async function isolated(kind, operation) {
    if (operation === null) return Object.freeze({ enabled: false, ok: true, result: null });
    try {
      const result = await operation();
      return Object.freeze({ enabled: true, ok: true, result });
    } catch (error) {
      const failure = errorRecord(error);
      await onError?.({ kind, ...failure }, error);
      return Object.freeze({ enabled: true, ok: false, result: null, error: failure });
    }
  }

  return Object.freeze({
    get running() { return running; },

    setVisualPublicationProcess(process) {
      visual = optionalMethod("visualPublicationProcess", process, "runOnce");
    },

    async runOnce() {
      if (running) return Object.freeze({ skipped: true, reason: "already_running" });
      running = true;
      try {
        const presentation = await isolated(
          "genesis_presentation_delivery",
          delivery === null ? null : () => delivery.deliverPending(),
        );
        const visualPublication = await isolated(
          "thread_visual_publication",
          visual === null ? null : () => visual.runOnce(),
        );
        return Object.freeze({
          skipped: false,
          reason: null,
          presentation,
          visualPublication,
        });
      } finally {
        running = false;
      }
    },
  });
}

export function createWorldReconciliationRuntime({
  infraDriver,
  process,
  scopeId = WORLD_RECONCILIATION_SCOPE_ID,
  intervalMs = 5_000,
  maxRetryMs = DEFAULT_MAX_RETRY_MS,
  now = Date.now,
} = {}) {
  if (!process || typeof process.runOnce !== "function") {
    throw new TypeError("World reconciliation runtime requires process.runOnce()");
  }
  if (typeof scopeId !== "string" || scopeId.trim() === "") {
    throw new TypeError("World reconciliation scopeId is required");
  }
  assertIntervalMs("World reconciliation intervalMs", intervalMs);
  assertIntervalMs("World reconciliation maxRetryMs", maxRetryMs);
  if (maxRetryMs < intervalMs) throw new TypeError("World reconciliation maxRetryMs must be >= intervalMs");
  if (typeof now !== "function") throw new TypeError("World reconciliation now must be a function");
  const infra = requireInfraCapabilities(infraDriver, "scheduler");
  let retryStreak = 0;

  function retryDelayMs() {
    const exponent = Math.min(retryStreak, 16);
    return Math.min(maxRetryMs, intervalMs * (2 ** exponent));
  }

  async function scheduleAt(scheduledTimeMs) {
    const current = await infra.scheduler.get(scopeId);
    if (current === null || scheduledTimeMs < current) {
      return infra.scheduler.schedule(scopeId, scheduledTimeMs);
    }
    return Object.freeze({ scopeId, scheduledTimeMs: current, existing: true });
  }

  async function scheduleRetry() {
    const delayMs = retryDelayMs();
    retryStreak += 1;
    await infra.scheduler.schedule(scopeId, now() + delayMs);
    return delayMs;
  }

  async function requestWake() {
    retryStreak = 0;
    return scheduleAt(now());
  }

  async function runAndSettle() {
    let result;
    try {
      result = await process.runOnce();
    } catch (error) {
      await scheduleRetry();
      throw error;
    }
    if (worldReconciliationNeedsRetry(result)) {
      const delayMs = await scheduleRetry();
      return Object.freeze({ ...result, reconciliationPending: true, retryDelayMs: delayMs });
    }
    retryStreak = 0;
    await infra.scheduler.cancel(scopeId);
    return Object.freeze({ ...result, reconciliationPending: false, retryDelayMs: null });
  }

  async function ensureScheduled() {
    const existing = await infra.scheduler.get(scopeId);
    return Object.freeze({
      scopeId,
      scheduledTimeMs: existing,
      existing: existing !== null,
      quiescent: existing === null,
    });
  }

  return Object.freeze({
    scopeId,
    ensureScheduled,
    requestWake,
    runNow: runAndSettle,
    handleWake: runAndSettle,
    stop: () => infra.scheduler.cancel(scopeId),
  });
}
