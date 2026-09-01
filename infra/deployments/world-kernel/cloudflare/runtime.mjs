import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createGenesisPresentationDeliveryService } from "#services/thread-presentation/src/index.mjs";
import { CivilRegistryStore } from "#services/world-kernel/src/civil-registry-store.mjs";
import { openEmbodimentStore } from "#services/world-kernel/src/embodiment-store.mjs";
import { createGenesisBirthPublicationService } from "#services/world-kernel/src/genesis-birth-publication-service.mjs";
import { createGenesisBirthWriteApi } from "#services/world-kernel/src/genesis-birth-write-api.mjs";
import { createGenesisCanonicalEmbodimentMaterializer } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { GenesisPresentationOutboxStore } from "#services/world-kernel/src/genesis-presentation-outbox-store.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { createGenesisThreadInspectionApi } from "#services/world-kernel/src/genesis-thread-inspection-api.mjs";
import { openIdentityStore } from "#services/world-kernel/src/identity-store.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";
import { createThreadVisualPublicationProcess } from "#services/world-kernel/src/thread-visual-publication-process.mjs";
import { createThreadVisualPublicationReconciler } from "#services/world-kernel/src/thread-visual-publication-reconciler.mjs";
import {
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
} from "#services/world-kernel/src/world-reconciliation-process.mjs";
import {
  createCanonicalVisualRootBoundary,
  createThreadPresentationPublisher,
  createThreadPresentationVisualBoundary,
} from "../service-boundaries.mjs";

const WORLD_SCOPE_ID = "world";
const DEFAULT_RECONCILIATION_MS = 5_000;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function serviceBinding(env, name) {
  const binding = env?.[name];
  if (!binding || typeof binding.fetch !== "function") {
    throw new TypeError(`world-kernel Cloudflare binding ${name} must provide fetch()`);
  }
  return binding;
}

function bindingFetch(binding) {
  return (input, init) => binding.fetch(input instanceof Request ? input : new Request(input, init));
}

function reconciliationIntervalMs(env) {
  const value = Number(env?.FIBRE_WORLD_RECONCILIATION_MS ?? DEFAULT_RECONCILIATION_MS);
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError("FIBRE_WORLD_RECONCILIATION_MS must be an integer from 100 through 3600000");
  }
  return value;
}

function createDurableThreadSource(identityStore) {
  return Object.freeze({ listThreadIds() { return identityStore.listThreadIds(); } });
}

function closeAll(stores) {
  for (const store of stores) {
    try { store?.close?.(); } catch {}
  }
}

export function createWorldCloudflareRuntime({ storage, env, now = () => new Date().toISOString(), nowMs = Date.now } = {}) {
  if (!storage || typeof storage !== "object") throw new TypeError("Cloudflare World runtime requires Durable Object storage");
  if (typeof now !== "function") throw new TypeError("Cloudflare World runtime now must be a function");
  if (typeof nowMs !== "function") throw new TypeError("Cloudflare World runtime nowMs must be a function");

  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", env?.FIBRE_PRIVATE_TOKEN);
  const presentationBinding = serviceBinding(env, "THREAD_PRESENTATION");
  const assetGeneratorBinding = serviceBinding(env, "ASSET_GENERATOR");
  const presentationFetch = bindingFetch(presentationBinding);
  const assetGeneratorFetch = bindingFetch(assetGeneratorBinding);

  const infraDriver = createCloudflareInfraDriver({
    stateScopes: { [WORLD_SCOPE_ID]: storage },
    schedulerScopes: { [WORLD_SCOPE_ID]: storage },
  });
  const worldStorage = Object.freeze({ infraDriver, stateScopeId: WORLD_SCOPE_ID });
  const worldStore = openWorldStore(worldStorage);
  let identityStore;
  let embodimentStore;
  let genesisStore;
  let symbolicGenomeStore;
  let civilRegistryStore;
  let presentationOutboxStore;

  try {
    identityStore = openIdentityStore(worldStorage);
    embodimentStore = openEmbodimentStore(worldStorage);
    genesisStore = new GenesisStore(worldStorage);
    symbolicGenomeStore = new SymbolicGenomeStore(worldStorage);
    civilRegistryStore = new CivilRegistryStore(worldStorage);
    presentationOutboxStore = new GenesisPresentationOutboxStore(worldStorage);
  } catch (error) {
    closeAll([presentationOutboxStore, civilRegistryStore, symbolicGenomeStore, genesisStore, embodimentStore, identityStore, worldStore]);
    throw error;
  }

  const presentationPublisher = createThreadPresentationPublisher({
    baseUrl: "https://thread-presentation.internal",
    privateToken,
    fetchImpl: presentationFetch,
  });
  const presentationDelivery = createGenesisPresentationDeliveryService({
    worldReader: worldStore,
    civilRegistry: civilRegistryStore,
    outbox: presentationOutboxStore,
    presentationPublisher,
    now,
  });
  const canonicalRootBoundary = createCanonicalVisualRootBoundary({
    baseUrl: "https://asset-generator.internal",
    privateToken,
    fetchImpl: assetGeneratorFetch,
  });
  const presentationBoundary = createThreadPresentationVisualBoundary({
    baseUrl: "https://thread-presentation.internal",
    privateToken,
    fetchImpl: presentationFetch,
  });
  const canonicalEmbodimentMaterializer = createGenesisCanonicalEmbodimentMaterializer({
    worldStore,
    embodimentStore,
  });
  const visualReconciler = createThreadVisualPublicationReconciler({
    embodimentStore,
    canonicalEmbodimentMaterializer,
    canonicalRootBoundary,
    presentationBoundary,
    now,
  });
  const visualPublicationProcess = createThreadVisualPublicationProcess({
    threadSource: createDurableThreadSource(identityStore),
    reconciler: visualReconciler,
  });
  const reconciliationProcess = createWorldReconciliationProcess({
    presentationDelivery,
    visualPublicationProcess,
    onError(entry, error) {
      console.error(JSON.stringify({ event: "world-reconciliation-failed", ...entry, stack: error instanceof Error ? error.stack : null }));
    },
  });
  const reconciliationRuntime = createWorldReconciliationRuntime({
    infraDriver,
    process: reconciliationProcess,
    intervalMs: reconciliationIntervalMs(env),
    now: nowMs,
  });

  const authoritativeBirthPublisher = createGenesisBirthPublicationService({
    authority: genesisStore,
    worldSpecAuthority: genesisStore,
    genomeAuthority: symbolicGenomeStore,
  });
  const birthPublisher = Object.freeze({
    async publishBirth(bundle, options = {}) {
      const result = await authoritativeBirthPublisher.publishBirth(bundle, options);
      await reconciliationRuntime.requestWake();
      return result;
    },
  });
  const birthApi = createGenesisBirthWriteApi({ birthPublisher, privateToken });
  const inspectionApi = createGenesisThreadInspectionApi({
    worldReader: worldStore,
    genesisReader: genesisStore,
    genomeReader: symbolicGenomeStore,
    civilRegistry: civilRegistryStore,
    embodimentReader: embodimentStore,
    privateToken,
  });

  let closed = false;
  return Object.freeze({
    infraDriver,
    worldStorage,
    worldStore,
    identityStore,
    embodimentStore,
    genesisStore,
    symbolicGenomeStore,
    civilRegistryStore,
    presentationOutboxStore,
    presentationDelivery,
    visualPublicationProcess,
    reconciliationProcess,
    reconciliationRuntime,
    birthPublisher,
    birthApi,
    inspectionApi,
    async close({ cancelSchedule = false } = {}) {
      if (closed) return;
      closed = true;
      if (cancelSchedule) await reconciliationRuntime.stop();
      closeAll([presentationOutboxStore, civilRegistryStore, symbolicGenomeStore, genesisStore, embodimentStore, identityStore, worldStore]);
    },
  });
}
