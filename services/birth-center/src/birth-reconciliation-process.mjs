import { requireInfraCapabilities } from "#infra";

export const BIRTH_RECONCILIATION_PROCESS_VERSION = "fibre-birth-reconciliation-process-v1";
const DEFAULT_RETRY_MS = 5_000;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function publisher(value) {
  if (!value || typeof value.publishBirth !== "function") {
    throw new TypeError("Birth reconciliation requires worldPublisher.publishBirth(bundle)");
  }
  return value;
}

export function createBirthReconciliationRuntime({
  infraDriver,
  stateScopeId = "birth",
  provisionalBirthStore,
  worldPublisher,
  retryMs = DEFAULT_RETRY_MS,
  nowMs = Date.now,
  onError = () => {},
} = {}) {
  const scopeId = nonEmpty("Birth reconciliation stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "scheduler");
  if (!provisionalBirthStore || typeof provisionalBirthStore.accept !== "function" || typeof provisionalBirthStore.pending !== "function") {
    throw new TypeError("Birth reconciliation requires a provisional birth store");
  }
  publisher(worldPublisher);
  if (!Number.isSafeInteger(retryMs) || retryMs < 100 || retryMs > 3_600_000) {
    throw new TypeError("Birth reconciliation retryMs must be an integer from 100 through 3600000");
  }
  if (typeof nowMs !== "function") throw new TypeError("Birth reconciliation nowMs must be a function");
  if (typeof onError !== "function") throw new TypeError("Birth reconciliation onError must be a function");
  let running = null;

  async function scheduleAt(scheduledTimeMs) {
    const current = await infra.scheduler.get(scopeId);
    if (current === null || scheduledTimeMs < current) {
      await infra.scheduler.schedule(scopeId, scheduledTimeMs);
    }
  }

  async function requestWake() {
    await scheduleAt(nowMs());
  }

  async function acceptBirth(bundle) {
    const accepted = provisionalBirthStore.accept(bundle);
    if (accepted.status === "pending") await requestWake();
    return accepted;
  }

  async function reconcile() {
    const pending = provisionalBirthStore.pending();
    let published = 0;
    for (const birth of pending) {
      try {
        const result = await worldPublisher.publishBirth(birth.bundle);
        provisionalBirthStore.markPublished(birth.genesisId, result);
        published += 1;
      } catch (error) {
        try { onError(error, birth); } catch {}
        await scheduleAt(nowMs() + retryMs);
        throw error;
      }
    }
    if (provisionalBirthStore.countPending() > 0) {
      await scheduleAt(nowMs() + retryMs);
    } else {
      await infra.scheduler.cancel(scopeId);
    }
    return Object.freeze({ attempted: pending.length, published });
  }

  async function handleWake() {
    if (running !== null) return running;
    await infra.scheduler.cancel(scopeId);
    running = reconcile().finally(() => { running = null; });
    return running;
  }

  async function ensureScheduled() {
    if (provisionalBirthStore.countPending() > 0 && await infra.scheduler.get(scopeId) === null) {
      await requestWake();
    }
  }

  return Object.freeze({
    processVersion: BIRTH_RECONCILIATION_PROCESS_VERSION,
    stateScopeId: scopeId,
    acceptBirth,
    requestWake,
    ensureScheduled,
    handleWake,
  });
}
