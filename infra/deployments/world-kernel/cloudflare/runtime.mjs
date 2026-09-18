import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createGenesisPresentationDeliveryService } from "#services/thread-presentation/src/index.mjs";
import { CivilRegistryStore } from "#services/world-kernel/src/civil-registry-store.mjs";
import { openEmbodimentStore } from "#services/world-kernel/src/embodiment-store.mjs";
import { GenesisBirthSexEvidence } from "#services/world-kernel/src/genesis-birth-sex-evidence.mjs";
import { createGenesisBirthPublicationService } from "#services/world-kernel/src/genesis-birth-publication-service.mjs";
import { createGenesisBirthWriteApi } from "#services/world-kernel/src/genesis-birth-write-api.mjs";
import { createGenesisCanonicalEmbodimentMaterializer } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { GenesisPresentationOutboxStore } from "#services/world-kernel/src/genesis-presentation-outbox-store.mjs";
import { GenesisSexMigrationStore } from "#services/world-kernel/src/genesis-sex-migration-store.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { createGenesisThreadInspectionApi } from "#services/world-kernel/src/genesis-thread-inspection-api.mjs";
import { openIdentityStore } from "#services/world-kernel/src/identity-store.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";
import { createThreadGenesisRepairApi } from "#services/world-kernel/src/thread-genesis-repair-api.mjs";
import { createThreadGenesisRepairService } from "#services/world-kernel/src/thread-genesis-repair-service.mjs";
import { createThreadIdentityCommandService } from "#services/world-kernel/src/thread-identity-command-service.mjs";
import { ThreadIdentityUpdateStore } from "#services/world-kernel/src/thread-identity-update-store.mjs";
import { createThreadVisualPublicationProcess } from "#services/world-kernel/src/thread-visual-publication-process.mjs";
import { createThreadVisualPublicationReconciler } from "#services/world-kernel/src/thread-visual-publication-reconciler.mjs";
import { createThreadVisualPublicationRecoveryApi } from "#services/world-kernel/src/thread-visual-publication-recovery-api.mjs";
import { ThreadVisualPublicationWorksetStore } from "#services/world-kernel/src/thread-visual-publication-workset-store.mjs";
import {
  createWorldReconciliationProcess,
  createWorldReconciliationRuntime,
} from "#services/world-kernel/src/world-reconciliation-process.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import {
  createCanonicalVisualRootBoundary,
  createThreadPresentationPublisher,
  createThreadPresentationVisualBoundary,
} from "../service-boundaries.mjs";

const WORLD_SCOPE_ID = "world";
const DEFAULT_RECONCILIATION_MS = 5_000;
const RECONCILIATION_STATE_TABLE = "world_reconciliation_runtime_state";

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

function createPresentationReader(presentationFetch) {
  return Object.freeze({
    async getSnapshot(threadId) {
      const response = await presentationFetch(
        `https://thread-presentation.internal/api/threads/${encodeURIComponent(threadId)}/snapshot`,
        { headers:{ Accept:"application/json" } },
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Thread Presentation inspection failed with HTTP ${response.status}`);
      const payload = await response.json();
      return payload?.snapshot ?? null;
    },
  });
}

function reconciliationIntervalMs(env) {
  const value = Number(env?.FIBRE_WORLD_RECONCILIATION_MS ?? DEFAULT_RECONCILIATION_MS);
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError("FIBRE_WORLD_RECONCILIATION_MS must be an integer from 100 through 3600000");
  }
  return value;
}

function createDurableRetryState(storage) {
  storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS ${RECONCILIATION_STATE_TABLE} (
      scope_id TEXT PRIMARY KEY,
      retry_streak INTEGER NOT NULL CHECK (retry_streak >= 0)
    )
  `);
  return Object.freeze({
    async get() {
      const rows = storage.sql.exec(
        `SELECT retry_streak FROM ${RECONCILIATION_STATE_TABLE} WHERE scope_id=?`,
        WORLD_SCOPE_ID,
      ).toArray();
      return rows.length === 0 ? 0 : Number(rows[0].retry_streak);
    },
    async set(value) {
      storage.sql.exec(
        `INSERT INTO ${RECONCILIATION_STATE_TABLE}(scope_id,retry_streak) VALUES(?,?)
         ON CONFLICT(scope_id) DO UPDATE SET retry_streak=excluded.retry_streak`,
        WORLD_SCOPE_ID,
        value,
      );
    },
  });
}

function closeAll(stores) {
  for (const store of stores) {
    try { store?.close?.(); } catch {}
  }
}

async function recordIdentityProjectionFailure(activityRecorder, { threadId, operationId, error }) {
  if (activityRecorder === null) return;
  try {
    await activityRecorder.record({
      threadId,
      operationId,
      stage:"thread.identity.presentation_projection",
      status:"failed",
      attempt:1,
      message:error instanceof Error ? error.message : String(error),
      error:{
        category:"reconciliation",
        code:typeof error?.code === "string" ? error.code : "THREAD_PRESENTATION_IDENTITY_PROJECTION_FAILED",
        retryable:error?.retryable !== false,
      },
    });
  } catch {}
}

export function repairReconciliationDisposition(result) {
  if (result?.after?.health === "healthy") return "retire";
  const visualAction = Array.isArray(result?.actions)
    ? result.actions.find((entry) => entry?.action === "reconcile_visual_publication") ?? null
    : null;
  if (visualAction !== null && visualAction.result?.complete !== true) return "retry_visual";
  return "none";
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
  const activityRecorder = createCloudflareActivityRecorder({ env, service: "world-kernel" });

  const infraDriver = createCloudflareInfraDriver({
    stateScopes: { [WORLD_SCOPE_ID]: storage },
    schedulerScopes: { [WORLD_SCOPE_ID]: storage },
  });
  const worldStorage = Object.freeze({ infraDriver, stateScopeId: WORLD_SCOPE_ID });
  const worldStore = openWorldStore(worldStorage);
  const retryState = createDurableRetryState(storage);
  let identityStore;
  let embodimentStore;
  let genesisStore;
  let symbolicGenomeStore;
  let civilRegistryStore;
  let presentationOutboxStore;
  let visualPublicationWorkset;
  let genesisBirthSexEvidence;
  let genesisSexMigrationStore;
  let threadIdentityUpdateStore;

  try {
    identityStore = openIdentityStore(worldStorage);
    embodimentStore = openEmbodimentStore(worldStorage);
    genesisStore = new GenesisStore(worldStorage);
    symbolicGenomeStore = new SymbolicGenomeStore(worldStorage);
    civilRegistryStore = new CivilRegistryStore(worldStorage);
    presentationOutboxStore = new GenesisPresentationOutboxStore(worldStorage);
    visualPublicationWorkset = new ThreadVisualPublicationWorksetStore(worldStorage);
    genesisBirthSexEvidence = new GenesisBirthSexEvidence(worldStorage);
    genesisSexMigrationStore = new GenesisSexMigrationStore(worldStorage);
    threadIdentityUpdateStore = new ThreadIdentityUpdateStore(worldStorage);
  } catch (error) {
    closeAll([threadIdentityUpdateStore, genesisSexMigrationStore, genesisBirthSexEvidence, visualPublicationWorkset, presentationOutboxStore, civilRegistryStore, symbolicGenomeStore, genesisStore, embodimentStore, identityStore, worldStore]);
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
    activityRecorder,
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
    activityRecorder,
    now,
  });
  const visualRecoveryApi = createThreadVisualPublicationRecoveryApi({
    reconciler: visualReconciler,
    privateToken,
  });
  const presentationReader = createPresentationReader(presentationFetch);
  const repairService = createThreadGenesisRepairService({
    worldReader:worldStore,
    civilRegistry:civilRegistryStore,
    embodimentReader:embodimentStore,
    presentationReader,
    presentationDelivery,
    visualReconciler,
    genesisSexEvidence:genesisBirthSexEvidence,
    genesisSexMigrator:genesisSexMigrationStore,
    identityUpdater:threadIdentityUpdateStore,
    activityRecorder,
  });
  const identityService = createThreadIdentityCommandService({
    worldReader:worldStore,
    genesisSexEvidence:genesisBirthSexEvidence,
    identityUpdater:threadIdentityUpdateStore,
    activityRecorder,
  });
  const visualPublicationProcess = createThreadVisualPublicationProcess({
    workset: visualPublicationWorkset,
    reconciler: visualReconciler,
    async onError(entry, error) {
      console.error(JSON.stringify({
        event: "thread-visual-publication-failed",
        threadId: entry.threadId,
        code: entry.code,
        retryable: entry.retryable,
        errorName: entry.errorName,
        message: entry.message,
        stack: error instanceof Error ? error.stack : null,
      }));
      if (activityRecorder === null) return;
      try {
        await activityRecorder.record({
          threadId: entry.threadId,
          stage: "world.visual_publication.reconcile",
          status: "failed",
          attempt: 1,
          message: String(entry.message).slice(0, 512),
          error: {
            category: "reconciliation",
            code: entry.code,
            retryable: entry.retryable,
          },
        });
      } catch {}
    },
  });
  const reconciliationProcess = createWorldReconciliationProcess({
    presentationDelivery,
    visualPublicationProcess,
    activityRecorder,
    onError(entry, error) {
      console.error(JSON.stringify({ event: "world-reconciliation-failed", ...entry, stack: error instanceof Error ? error.stack ?? null : null }));
    },
  });
  const reconciliationRuntime = createWorldReconciliationRuntime({
    infraDriver,
    process: reconciliationProcess,
    intervalMs: reconciliationIntervalMs(env),
    now: nowMs,
    retryState,
  });
  const repairApi = createThreadGenesisRepairApi({
    repairService,
    identityService,
    privateToken,
    reconciliationWorkset:visualPublicationWorkset,
    async onRepair({ threadId, result }) {
      const disposition = repairReconciliationDisposition(result);
      if (disposition === "retire") {
        if (visualPublicationWorkset.get(threadId)?.state === "pending") {
          visualPublicationWorkset.complete(threadId, { updatedAt:now() });
        }
        return;
      }
      if (disposition === "retry_visual") {
        visualPublicationWorkset.requeue(threadId, { updatedAt:now() });
        if (visualPublicationWorkset.get(threadId)?.state === "pending") {
          await reconciliationRuntime.requestWake();
        }
      }
    },
    async onRecover() {
      await reconciliationRuntime.requestWake();
    },
    async onIdentityUpdate({ threadId, result }) {
      if (result.changed !== true) return Object.freeze({ state:"current", changed:false });
      try {
        const projected = await presentationDelivery.reconcileThreadPresentationIdentity(threadId);
        return Object.freeze({
          state:"current",
          changed:projected.reconciled === true,
          presentation:projected.presentation ?? null,
        });
      } catch (error) {
        await recordIdentityProjectionFailure(activityRecorder, {
          threadId,
          operationId:result.operationKey,
          error,
        });
        return Object.freeze({
          state:"pending",
          changed:false,
          error:Object.freeze({
            code:typeof error?.code === "string" ? error.code : "THREAD_PRESENTATION_IDENTITY_PROJECTION_FAILED",
            detail:error instanceof Error ? error.message : String(error),
          }),
        });
      }
    },
  });

  const authoritativeBirthPublisher = createGenesisBirthPublicationService({
    authority: genesisStore,
    worldSpecAuthority: genesisStore,
    genomeAuthority: symbolicGenomeStore,
    activityRecorder,
  });
  const birthPublisher = Object.freeze({
    async publishBirth(bundle, options = {}) {
      const result = await authoritativeBirthPublisher.publishBirth(bundle, options);
      const threadId = result?.thread?.threadId ?? bundle?.manifest?.threadId ?? null;
      if (threadId !== null) visualPublicationWorkset.enqueue(threadId, { updatedAt:now() });
      const wake = await reconciliationRuntime.requestWake();
      console.log(JSON.stringify({
        event: "world-reconciliation-wake-requested",
        threadId,
        scheduledTimeMs: wake.scheduledTimeMs,
        reusedExistingAlarm: wake.existing === true,
      }));
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
    activityRecorder,
    worldStore,
    identityStore,
    embodimentStore,
    genesisStore,
    symbolicGenomeStore,
    civilRegistryStore,
    presentationOutboxStore,
    visualPublicationWorkset,
    genesisBirthSexEvidence,
    genesisSexMigrationStore,
    threadIdentityUpdateStore,
    presentationDelivery,
    visualPublicationProcess,
    visualReconciler,
    visualRecoveryApi,
    repairService,
    identityService,
    repairApi,
    reconciliationProcess,
    reconciliationRuntime,
    birthPublisher,
    birthApi,
    inspectionApi,
    async close({ cancelSchedule = false } = {}) {
      if (closed) return;
      closed = true;
      if (cancelSchedule) await reconciliationRuntime.stop();
      closeAll([threadIdentityUpdateStore, genesisSexMigrationStore, genesisBirthSexEvidence, visualPublicationWorkset, presentationOutboxStore, civilRegistryStore, genesisStore, symbolicGenomeStore, embodimentStore, identityStore, worldStore]);
    },
  });
}
