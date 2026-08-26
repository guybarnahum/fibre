import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "./model-runtime/durable-invocation-journal.mjs";

export const BIRTH_CENTER_RUNTIME_VERSION = "fibre-birth-center-runtime-v1";

function assertPublisher(publisher) {
  if (publisher === null) return;
  if (typeof publisher !== "object" || typeof publisher.publishBirth !== "function") {
    throw new TypeError("Birth Center worldPublisher must expose publishBirth(bundle)");
  }
}

export function createBirthCenterRuntime({
  stateRoot = ".fibre/birth-center",
  worldPublisher = null,
} = {}) {
  if (typeof stateRoot !== "string" || stateRoot.trim() === "") {
    throw new TypeError("Birth Center stateRoot is required");
  }
  assertPublisher(worldPublisher);

  const absoluteStateRoot = resolve(stateRoot);
  const invocationRoot = resolve(absoluteStateRoot, "model-invocations");
  mkdirSync(invocationRoot, { recursive: true });
  const invocationJournal = createFileModelInvocationJournal(invocationRoot);

  return Object.freeze({
    runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
    stateRoot: absoluteStateRoot,
    invocationRoot,
    invocationJournal,
    worldPublicationConfigured: worldPublisher !== null,

    durableAdapter(baseAdapter, { observer = null } = {}) {
      return createDurableModelAdapter({
        baseAdapter,
        journal: invocationJournal,
        observer,
      });
    },

    async publishBirth(bundle) {
      if (worldPublisher === null) {
        throw new Error("Birth Center has no World Kernel publication boundary configured");
      }
      return worldPublisher.publishBirth(bundle);
    },

    status() {
      return Object.freeze({
        runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
        stateRoot: absoluteStateRoot,
        invocationRoot,
        worldPublicationConfigured: worldPublisher !== null,
        authoritativeThreadStateOwned: false,
        providerInvocationPersistenceOwned: true,
        provisionalDevelopmentStateOwned: true,
      });
    },
  });
}
