import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createBirthCenterWriteApi } from "#services/birth-center/src/birth-write-api.mjs";
import { createGenesisDevelopmentApi } from "#services/birth-center/src/genesis-development-api.mjs";
import { createGenesisDevelopmentService } from "#services/birth-center/src/genesis-development-service.mjs";
import { createBirthCenterRuntime } from "#services/birth-center/src/runtime.mjs";
import { createWorldKernelBirthPublisher } from "../world-kernel-boundary.mjs";

const BIRTH_SCOPE_ID = "birth";
const DEFAULT_RETRY_MS = 5_000;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function serviceBinding(env, name) {
  const binding = env?.[name];
  if (!binding || typeof binding.fetch !== "function") {
    throw new TypeError(`birth-center Cloudflare binding ${name} must provide fetch()`);
  }
  return binding;
}

function bindingFetch(binding) {
  return (input, init) => binding.fetch(input instanceof Request ? input : new Request(input, init));
}

function reconciliationRetryMs(env) {
  const value = Number(env?.FIBRE_BIRTH_RECONCILIATION_MS ?? DEFAULT_RETRY_MS);
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError("FIBRE_BIRTH_RECONCILIATION_MS must be an integer from 100 through 3600000");
  }
  return value;
}

function createDevelopmentComponents({ runtime, privateToken, reasoningAdapters, now, randomIntFn }) {
  if (reasoningAdapters === null || reasoningAdapters === undefined) {
    return Object.freeze({
      creativeAdapter: null,
      repairAdapter: null,
      developmentService: null,
      developmentApi: null,
    });
  }
  const creativeAdapter = reasoningAdapters.creativeAdapter;
  const repairAdapter = reasoningAdapters.repairAdapter ?? creativeAdapter;
  const developmentService = createGenesisDevelopmentService({
    runtime,
    creativeAdapter,
    repairAdapter,
    now,
    randomIntFn,
  });
  const developmentApi = createGenesisDevelopmentApi({
    developmentService,
    privateToken,
    onError(error) {
      console.error(JSON.stringify({
        event: "birth-center-development-failed",
        message: error instanceof Error ? error.message : String(error),
      }));
    },
  });
  return Object.freeze({ creativeAdapter, repairAdapter, developmentService, developmentApi });
}

export function createBirthCenterCloudflareRuntime({
  storage,
  env,
  now = () => new Date().toISOString(),
  nowMs = Date.now,
  randomIntFn,
  reasoningAdapters = null,
} = {}) {
  if (!storage || typeof storage !== "object") {
    throw new TypeError("Cloudflare Birth Center runtime requires Durable Object storage");
  }
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", env?.FIBRE_PRIVATE_TOKEN);
  const worldBinding = serviceBinding(env, "WORLD_KERNEL");
  const infraDriver = createCloudflareInfraDriver({
    stateScopes: { [BIRTH_SCOPE_ID]: storage },
    schedulerScopes: { [BIRTH_SCOPE_ID]: storage },
  });
  const birthStorage = Object.freeze({ infraDriver, stateScopeId: BIRTH_SCOPE_ID });
  const worldPublisher = createWorldKernelBirthPublisher({
    baseUrl: "https://world-kernel.internal",
    privateToken,
    fetchImpl: bindingFetch(worldBinding),
  });
  const runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    retryMs: reconciliationRetryMs(env),
    now,
    nowMs,
    onError(error, birth) {
      console.error(JSON.stringify({
        event: "birth-center-reconciliation-failed",
        genesisId: birth?.genesisId ?? null,
        threadId: birth?.threadId ?? null,
        message: error instanceof Error ? error.message : String(error),
      }));
    },
  });
  const development = createDevelopmentComponents({
    runtime,
    privateToken,
    reasoningAdapters,
    now,
    randomIntFn,
  });
  const birthApi = createBirthCenterWriteApi({ runtime, privateToken });

  return Object.freeze({
    infraDriver,
    birthStorage,
    runtime,
    creativeAdapter: development.creativeAdapter,
    repairAdapter: development.repairAdapter,
    developmentService: development.developmentService,
    developmentApi: development.developmentApi,
    birthApi,
    close() { runtime.close(); },
  });
}
