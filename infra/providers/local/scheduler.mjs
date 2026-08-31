import {
  assertInfraId,
  assertInfraPlainObject,
} from "../../internal.mjs";
import {
  SCHEDULER_VERSION,
  assertScheduledTimeMs,
  assertSchedulerPort,
} from "../../scheduler.mjs";

function normalizeScopes(scopes) {
  assertInfraPlainObject("local scheduler scopes", scopes);
  const normalized = new Map();
  for (const [scopeId, value] of Object.entries(scopes)) {
    assertInfraId("local scheduler scopeId", scopeId);
    assertInfraPlainObject(`local scheduler scope ${scopeId}`, value);
    if (typeof value.onWake !== "function") {
      throw new TypeError(`local scheduler scope ${scopeId}.onWake must be a function`);
    }
    if (value.onError !== undefined && typeof value.onError !== "function") {
      throw new TypeError(`local scheduler scope ${scopeId}.onError must be a function`);
    }
    normalized.set(scopeId, Object.freeze({
      onWake: value.onWake,
      onError: value.onError ?? (() => {}),
    }));
  }
  if (normalized.size === 0) throw new TypeError("local scheduler requires at least one scope");
  return normalized;
}

export function createLocalSchedulerPort({ scopes, now = Date.now } = {}) {
  const normalizedScopes = normalizeScopes(scopes);
  if (typeof now !== "function") throw new TypeError("local scheduler now must be a function");
  const scheduled = new Map();

  function scope(scopeId) {
    assertInfraId("scheduler scopeId", scopeId);
    const value = normalizedScopes.get(scopeId);
    if (value === undefined) throw new Error(`scheduler scope ${scopeId} is not configured`);
    return value;
  }

  const port = {
    schedulerVersion: SCHEDULER_VERSION,
    async get(scopeId) {
      scope(scopeId);
      return scheduled.get(scopeId)?.scheduledTimeMs ?? null;
    },
    async schedule(scopeId, scheduledTimeMs) {
      const config = scope(scopeId);
      assertScheduledTimeMs("scheduler scheduledTimeMs", scheduledTimeMs);
      const prior = scheduled.get(scopeId);
      if (prior !== undefined) clearTimeout(prior.timer);
      const delayMs = Math.max(0, scheduledTimeMs - now());
      const timer = setTimeout(() => {
        scheduled.delete(scopeId);
        Promise.resolve()
          .then(() => config.onWake())
          .catch((error) => config.onError(error));
      }, delayMs);
      timer.unref?.();
      scheduled.set(scopeId, { scheduledTimeMs, timer });
      return Object.freeze({ scopeId, scheduledTimeMs });
    },
    async cancel(scopeId) {
      scope(scopeId);
      const prior = scheduled.get(scopeId);
      if (prior === undefined) return false;
      clearTimeout(prior.timer);
      scheduled.delete(scopeId);
      return true;
    },
  };
  return Object.freeze(assertSchedulerPort(port));
}
