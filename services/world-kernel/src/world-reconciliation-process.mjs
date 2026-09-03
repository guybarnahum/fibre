import { requireInfraCapabilities } from "#infra";

export const WORLD_RECONCILIATION_SCOPE_ID = "world";
const DEFAULT_IDLE_INTERVAL_MS = 3_600_000;

function optionalMethod(name, value, method) {
  if (value === null) return null;
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must be null or expose ${method}()`);
  }
  return value;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("World reconciliation activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
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

function presentationNeedsRetry(presentation) {
  if (!presentation?.enabled) return false;
  if (presentation.ok !== true) return true;
  const result = presentation.result;
  if (!result || typeof result !== "object") return false;
  if (Number.isSafeInteger(result.failed) && result.failed > 0) return true;
  return false;
}

function visualPublicationNeedsRetry(visualPublication) {
  if (!visualPublication?.enabled) return false;
  if (visualPublication.ok !== true) return true;
  const result = visualPublication.result;
  if (!result || typeof result !== "object") return false;
  if (result.complete === false) return true;
  const results = result.results;
  if (!Array.isArray(results)) return false;
  return results.some((entry) => (
    entry?.ok !== true
    || entry?.reconciliation?.complete !== true
  ));
}

export function worldReconciliationNeedsRetry(result) {
  if (!result || typeof result !== "object" || result.skipped === true) return false;
  return presentationNeedsRetry(result.presentation)
    || visualPublicationNeedsRetry(result.visualPublication);
}

export function createWorldReconciliationProcess({
  presentationDelivery = null,
  visualPublicationProcess = null,
  activityRecorder = null,
  onError = null,
} = {}) {
  const delivery = optionalMethod("presentationDelivery", presentationDelivery, "deliverPending");
  let visual = optionalMethod("visualPublicationProcess", visualPublicationProcess, "runOnce");
  const activity = optionalActivityRecorder(activityRecorder);
  if (onError !== null && typeof onError !== "function") {
    throw new TypeError("World reconciliation onError must be a function or null");
  }

  let running = false;

  async function isolated(kind, stage, operation) {
    if (operation === null) return Object.freeze({ enabled: false, ok: true, result: null });
    try {
      const result = await runActivityStage(activity, {
        stage,
        attempt: 1,
      }, operation);
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
      await bestEffortRecord(activity, {
        stage: "world.reconciliation.wake",
        status: "started",
        attempt: 1,
      });
      try {
        const presentation = await isolated(
          "genesis_presentation_delivery",
          "world.reconciliation.presentation_delivery",
          delivery === null ? null : () => delivery.deliverPending(),
        );
        const visualPublication = await isolated(
          "thread_visual_publication",
          "world.reconciliation.visual_publication",
          visual === null ? null : () => visual.runOnce(),
        );
        const result = Object.freeze({
          skipped: false,
          reason: null,
          presentation,
          visualPublication,
        });
        await bestEffortRecord(activity, {
          stage: "world.reconciliation.wake",
          status: presentation.ok && visualPublication.ok ? "succeeded" : "failed",
          attempt: 1,
          ...(presentation.ok && visualPublication.ok ? {} : {
            error: {
              category: "reconciliation",
              code: "WORLD_RECONCILIATION_PARTIAL_FAILURE",
              retryable: true,
            },
          }),
        });
        return result;
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
  idleIntervalMs = DEFAULT_IDLE_INTERVAL_MS,
  now = Date.now,
} = {}) {
  if (!process || typeof process.runOnce !== "function") {
    throw new TypeError("World reconciliation runtime requires process.runOnce()");
  }
  if (typeof scopeId !== "string" || scopeId.trim() === "") {
    throw new TypeError("World reconciliation scopeId is required");
  }
  assertIntervalMs("World reconciliation intervalMs", intervalMs);
  assertIntervalMs("World reconciliation idleIntervalMs", idleIntervalMs);
  if (idleIntervalMs < intervalMs) {
    throw new TypeError("World reconciliation idleIntervalMs must be greater than or equal to intervalMs");
  }
  if (typeof now !== "function") throw new TypeError("World reconciliation now must be a function");
  const infra = requireInfraCapabilities(infraDriver, "scheduler");

  async function scheduleNext(delayMs = intervalMs) {
    const scheduledTimeMs = now() + delayMs;
    return infra.scheduler.schedule(scopeId, scheduledTimeMs);
  }

  async function ensureScheduled() {
    const existing = await infra.scheduler.get(scopeId);
    if (existing !== null) return Object.freeze({ scopeId, scheduledTimeMs: existing, existing: true });
    const scheduled = await scheduleNext();
    return Object.freeze({ ...scheduled, existing: false });
  }

  async function runAndReschedule() {
    let retrySoon = true;
    try {
      const result = await process.runOnce();
      retrySoon = worldReconciliationNeedsRetry(result);
      return result;
    } finally {
      await scheduleNext(retrySoon ? intervalMs : idleIntervalMs);
    }
  }

  return Object.freeze({
    scopeId,
    ensureScheduled,
    requestWake: () => infra.scheduler.schedule(scopeId, now()),
    runNow: runAndReschedule,
    handleWake: runAndReschedule,
    stop: () => infra.scheduler.cancel(scopeId),
  });
}
