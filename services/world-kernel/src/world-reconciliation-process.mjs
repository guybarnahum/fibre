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
  if (result.hasPending === true) return true;
  if (!Array.isArray(result.results)) return false;
  return result.results.some((item) => (
    item?.ok !== true
      ? item?.retryable !== false
      : item?.reconciliation?.complete !== true
  ));
}

function experienceConsolidationNeedsRetry(entry) {
  if (entry?.enabled !== true) return false;
  if (entry.ok !== true) return true;
  const result = entry.result;
  if (!result || typeof result !== "object") return false;
  if (Number.isSafeInteger(result.failed) && result.failed > 0) return true;
  return result.hasPending === true;
}

function environmentNeedsRetry(entry) {
  if(entry?.enabled!==true)return false;
  if(entry.ok!==true)return true;
  // Environmental attention is admitted after this wake's consolidation pass;
  // one more World pass must receive newly queued personal experience.
  return entry.result?.failed>0
    ||entry.result?.hasDue===true
    ||entry.result?.noticed>0;
}

function livedBoundaryNeedsRetry(entry){
  if(entry?.enabled!==true)return false;
  if(entry.ok!==true)return true;
  // An indexed queue with more genuinely due lives is earned work, not an
  // error streak. Normal due deadlines are handled by nextDueAt.
  return entry.result?.failed>0;
}

function contactOutreachNeedsRetry(entry) {
  if (entry?.enabled !== true) return false;
  if (entry.ok !== true) return true;
  const result = entry.result;
  if (!result || typeof result !== "object") return false;
  if (Number.isSafeInteger(result.failed) && result.failed > 0) return true;
  return result.hasPending === true;
}

export function worldReconciliationNeedsRetry(result) {
  if (!result || typeof result !== "object") return true;
  if (result.skipped === true) return result.reason === "already_running";
  return presentationNeedsRetry(result.presentation)
    || visualNeedsRetry(result.visualPublication)
    || experienceConsolidationNeedsRetry(result.experienceConsolidation)
    || contactOutreachNeedsRetry(result.contactOutreach)
    || environmentNeedsRetry(result.environmentEvolution)
    || livedBoundaryNeedsRetry(result.livedBoundary);
}

export function createWorldReconciliationProcess({
  presentationDelivery = null,
  visualPublicationProcess = null,
  experienceConsolidationProcess = null,
  contactOutreachProcess = null,
  environmentEvolutionProcess = null,
  livedBoundaryProcess = null,
  onError = null,
} = {}) {
  const delivery = optionalMethod("presentationDelivery", presentationDelivery, "deliverPending");
  let visual = optionalMethod("visualPublicationProcess", visualPublicationProcess, "runOnce");
  let consolidation = optionalMethod(
    "experienceConsolidationProcess",
    experienceConsolidationProcess,
    "runOnce",
  );
  let contactOutreach = optionalMethod(
    "contactOutreachProcess",
    contactOutreachProcess,
    "runOnce",
  );
  let environmentEvolution=optionalMethod(
    "environmentEvolutionProcess",environmentEvolutionProcess,"runOnce",
  );
  let livedBoundary=optionalMethod("livedBoundaryProcess",livedBoundaryProcess,"runOnce");
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

    setExperienceConsolidationProcess(process) {
      consolidation = optionalMethod("experienceConsolidationProcess", process, "runOnce");
    },

    setContactOutreachProcess(process) {
      contactOutreach = optionalMethod("contactOutreachProcess", process, "runOnce");
    },

    setEnvironmentEvolutionProcess(process){
      environmentEvolution=optionalMethod("environmentEvolutionProcess",process,"runOnce");
    },

    setLivedBoundaryProcess(process){
      livedBoundary=optionalMethod("livedBoundaryProcess",process,"runOnce");
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
        const experienceConsolidation = await isolated(
          "experience_consolidation",
          consolidation === null ? null : () => consolidation.runOnce(),
        );
        const contactOutreachResult = await isolated(
          "thread_contact_outreach",
          contactOutreach === null ? null : () => contactOutreach.runOnce(),
        );
        const livedBoundaryResult=await isolated(
          "lived_boundary_advance",
          livedBoundary===null?null:()=>livedBoundary.runOnce(),
        );
        const environmentResult=await isolated(
          "world_environment_evolution",
          environmentEvolution===null?null:()=>environmentEvolution.runOnce(),
        );
        // Partial per-opportunity failures stay retryable and report through
        // the same injected boundary as other reconciliation failures.
        for(const failure of environmentResult.result?.results??[]){
          if(failure.outcome!=="failed")continue;
          const detail=errorRecord(new Error(failure.message));
          await onError?.({
            kind:"world_environment_opportunity",
            ...detail,
          },new Error(failure.message));
        }
        return Object.freeze({
          skipped: false,
          reason: null,
          presentation,
          visualPublication,
          experienceConsolidation,
          contactOutreach:contactOutreachResult,
          environmentEvolution:environmentResult,
          livedBoundary:livedBoundaryResult,
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
  retryState = null,
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
  if (retryState !== null && (
    typeof retryState?.get !== "function" || typeof retryState?.set !== "function"
  )) {
    throw new TypeError("World reconciliation retryState must be null or expose get() and set()");
  }
  const infra = requireInfraCapabilities(infraDriver, "scheduler");
  let memoryRetryStreak = 0;

  async function retryStreak() {
    const value = retryState === null ? memoryRetryStreak : await retryState.get();
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError("World reconciliation retry streak must be a non-negative integer");
    }
    return value;
  }

  async function setRetryStreak(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError("World reconciliation retry streak must be a non-negative integer");
    }
    if (retryState === null) memoryRetryStreak = value;
    else await retryState.set(value);
  }

  function retryDelayMs(streak) {
    const exponent = Math.min(streak, 16);
    return Math.min(maxRetryMs, intervalMs * (2 ** exponent));
  }

  async function scheduleAt(scheduledTimeMs) {
    const current = await infra.scheduler.get(scopeId);
    const currentIsStale = current !== null && current <= now();
    if (current === null || currentIsStale || scheduledTimeMs < current) {
      return infra.scheduler.schedule(scopeId, scheduledTimeMs);
    }
    return Object.freeze({ scopeId, scheduledTimeMs: current, existing: true });
  }

  async function scheduleRetry() {
    const streak = await retryStreak();
    const delayMs = retryDelayMs(streak);
    await setRetryStreak(streak + 1);
    await infra.scheduler.schedule(scopeId, now() + delayMs);
    return delayMs;
  }

  async function requestWake() {
    await setRetryStreak(0);
    return scheduleAt(now());
  }

  async function requestWakeAfter(delayMs) {
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 3_600_000) {
      throw new TypeError("World reconciliation delayMs must be an integer from 0 through 3600000");
    }
    await setRetryStreak(0);
    const current=await infra.scheduler.get(scopeId);
    if(current!==null&&current<=now()){
      return infra.scheduler.schedule(scopeId,now());
    }
    return scheduleAt(now() + delayMs);
  }

  async function runAndSettle() {
    // A separate LivedNow request can earn new World work while this pass
    // awaits cognition. Never cancel an alarm scheduled after this pass began.
    const alarmBefore=await infra.scheduler.get(scopeId);
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
    await setRetryStreak(0);
    const dueAt=[
      result.environmentEvolution?.result?.nextDueAt,
      result.livedBoundary?.result?.nextDueAt,
    ].filter(Boolean).sort()[0]??null;
    if(dueAt!==null){
      const timestamp=Date.parse(dueAt);
      if(!Number.isFinite(timestamp))throw new TypeError("World environment next due time is invalid");
      await scheduleAt(Math.max(now(),timestamp));
    }else{
      const alarmAfter=await infra.scheduler.get(scopeId);
      if(alarmAfter!==null&&alarmAfter!==alarmBefore){
        return Object.freeze({
          ...result,reconciliationPending:true,retryDelayMs:null,
          nextWakeAt:new Date(alarmAfter).toISOString(),
        });
      }
      await infra.scheduler.cancel(scopeId);
    }
    return Object.freeze({
      ...result,reconciliationPending:dueAt!==null,retryDelayMs:null,
      nextWakeAt:dueAt,
    });
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
    requestWakeAfter,
    requestWakeAt:async(scheduledTimeMs)=>{
      if(!Number.isSafeInteger(scheduledTimeMs)||scheduledTimeMs<0)
        throw new TypeError("World reconciliation scheduledTimeMs is invalid");
      const existing=await infra.scheduler.get(scopeId);
      if(existing!==null&&existing<=now()){
        return infra.scheduler.schedule(scopeId,now());
      }
      return scheduleAt(scheduledTimeMs);
    },
    runNow: runAndSettle,
    handleWake: runAndSettle,
    stop: async () => {
      await setRetryStreak(0);
      return infra.scheduler.cancel(scopeId);
    },
  });
}
