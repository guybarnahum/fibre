import { requireInfraCapabilities } from "#infra";

import {
  createDurableModelAdapter,
  createStateModelInvocationJournal,
} from "./model-runtime/durable-invocation-journal.mjs";
import { createProvisionalBirthStore } from "./provisional-birth-store.mjs";
import { createBirthReconciliationRuntime } from "./birth-reconciliation-process.mjs";

export const BIRTH_CENTER_RUNTIME_VERSION = "fibre-birth-center-runtime-v2";

function assertPublisher(publisher) {
  if (publisher === null) return;
  if (typeof publisher !== "object" || typeof publisher.publishBirth !== "function") {
    throw new TypeError("Birth Center worldPublisher must expose publishBirth(bundle)");
  }
}

export function createBirthCenterRuntime({
  storage,
  worldPublisher = null,
  retryMs = 5_000,
  now = () => new Date().toISOString(),
  nowMs = Date.now,
  onError = () => {},
} = {}) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError("Birth Center storage must be an Infra state binding");
  }
  const { infraDriver, stateScopeId } = storage;
  requireInfraCapabilities(infraDriver, "state", "scheduler");
  if (typeof stateScopeId !== "string" || stateScopeId.trim() === "") {
    throw new TypeError("Birth Center stateScopeId is required");
  }
  assertPublisher(worldPublisher);

  const invocationJournal = createStateModelInvocationJournal(storage, { now });
  let provisionalBirthStore;
  try {
    provisionalBirthStore = createProvisionalBirthStore(storage, { now });
  } catch (error) {
    invocationJournal.close();
    throw error;
  }

  const reconciliationRuntime = worldPublisher === null
    ? null
    : createBirthReconciliationRuntime({
        infraDriver,
        stateScopeId,
        provisionalBirthStore,
        worldPublisher,
        retryMs,
        nowMs,
        onError,
      });
  let closed = false;

  return Object.freeze({
    runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
    infraDriver,
    stateScopeId,
    invocationJournal,
    provisionalBirthStore,
    reconciliationRuntime,
    worldPublicationConfigured: worldPublisher !== null,

    durableAdapter(baseAdapter, { observer = null } = {}) {
      return createDurableModelAdapter({
        baseAdapter,
        journal: invocationJournal,
        observer,
      });
    },

    async submitBirth(bundle) {
      if (reconciliationRuntime === null) {
        throw new Error("Birth Center has no World Kernel publication boundary configured");
      }
      return reconciliationRuntime.acceptBirth(bundle);
    },

    async ensureScheduled() {
      if (reconciliationRuntime !== null) await reconciliationRuntime.ensureScheduled();
    },

    async handleWake() {
      if (reconciliationRuntime === null) return Object.freeze({ attempted: 0, published: 0 });
      return reconciliationRuntime.handleWake();
    },

    status() {
      return Object.freeze({
        runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
        stateScopeId,
        infraCapabilities: [...infraDriver.capabilities],
        worldPublicationConfigured: worldPublisher !== null,
        authoritativeThreadStateOwned: false,
        providerInvocationPersistenceOwned: true,
        provisionalDevelopmentStateOwned: true,
        pendingBirthCount: provisionalBirthStore.countPending(),
      });
    },

    close() {
      if (closed) return;
      closed = true;
      provisionalBirthStore.close();
      invocationJournal.close();
    },
  });
}
