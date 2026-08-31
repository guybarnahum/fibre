import {
  assertInfraId,
  assertInfraPlainObject,
} from "../../internal.mjs";
import {
  SCHEDULER_VERSION,
  assertScheduledTimeMs,
  assertSchedulerPort,
} from "../../scheduler.mjs";

function assertAlarmStorage(storage, scopeId) {
  if (!storage || typeof storage !== "object") {
    throw new TypeError(`Cloudflare scheduler scope ${scopeId} requires Durable Object storage`);
  }
  for (const method of ["getAlarm", "setAlarm", "deleteAlarm"]) {
    if (typeof storage[method] !== "function") {
      throw new TypeError(`Cloudflare scheduler scope ${scopeId} storage must provide ${method}()`);
    }
  }
  return storage;
}

function normalizeScopes(scopes) {
  assertInfraPlainObject("Cloudflare scheduler scopes", scopes);
  const normalized = new Map();
  for (const [scopeId, storage] of Object.entries(scopes)) {
    assertInfraId("Cloudflare scheduler scopeId", scopeId);
    normalized.set(scopeId, assertAlarmStorage(storage, scopeId));
  }
  if (normalized.size === 0) throw new TypeError("Cloudflare scheduler requires at least one scope");
  return normalized;
}

export function createCloudflareSchedulerPort({ scopes } = {}) {
  const normalizedScopes = normalizeScopes(scopes);

  function storageFor(scopeId) {
    assertInfraId("scheduler scopeId", scopeId);
    const storage = normalizedScopes.get(scopeId);
    if (storage === undefined) throw new Error(`scheduler scope ${scopeId} is not configured`);
    return storage;
  }

  const port = {
    schedulerVersion: SCHEDULER_VERSION,
    async get(scopeId) {
      const value = await storageFor(scopeId).getAlarm();
      if (value === null) return null;
      return assertScheduledTimeMs("Cloudflare scheduler alarm", value);
    },
    async schedule(scopeId, scheduledTimeMs) {
      assertScheduledTimeMs("scheduler scheduledTimeMs", scheduledTimeMs);
      await storageFor(scopeId).setAlarm(scheduledTimeMs);
      return Object.freeze({ scopeId, scheduledTimeMs });
    },
    async cancel(scopeId) {
      const storage = storageFor(scopeId);
      const existed = await storage.getAlarm() !== null;
      await storage.deleteAlarm();
      return existed;
    },
  };
  return Object.freeze(assertSchedulerPort(port));
}
