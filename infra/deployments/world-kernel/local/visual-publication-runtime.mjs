import { createGenesisCanonicalEmbodimentMaterializer } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { createThreadVisualPublicationProcess } from "#services/world-kernel/src/thread-visual-publication-process.mjs";
import { createThreadVisualPublicationReconciler } from "#services/world-kernel/src/thread-visual-publication-reconciler.mjs";

function createDurableThreadSource(identityStore) {
  if (!identityStore || typeof identityStore.listThreadIds !== "function") {
    throw new TypeError("visual publication runtime requires a World identity store");
  }
  return Object.freeze({
    listThreadIds: () => identityStore.listThreadIds(),
  });
}

/**
 * Attaches visual reconciliation to an already-composed World runtime. Durable
 * Thread enumeration makes recovery independent of whether the original birth
 * callback was observed. Scheduling remains owned by InfraDriver.scheduler via
 * the single World reconciliation schedule.
 */
export async function attachWorldVisualPublicationRuntime({
  worldRuntime,
  canonicalRootBoundary,
  presentationBoundary,
  runImmediately = true,
  now = () => new Date().toISOString(),
  onResult = null,
  onError = null,
} = {}) {
  if (!worldRuntime?.store || !worldRuntime?.identityStore || !worldRuntime?.embodimentStore) {
    throw new TypeError("visual publication runtime requires a started World Kernel runtime");
  }
  if (!worldRuntime?.reconciliationProcess || !worldRuntime?.reconciliationRuntime) {
    throw new TypeError("visual publication runtime requires World reconciliation scheduling");
  }
  const canonicalEmbodimentMaterializer = createGenesisCanonicalEmbodimentMaterializer({
    worldStore: worldRuntime.store,
    embodimentStore: worldRuntime.embodimentStore,
  });
  const reconciler = createThreadVisualPublicationReconciler({
    embodimentStore: worldRuntime.embodimentStore,
    canonicalEmbodimentMaterializer,
    canonicalRootBoundary,
    presentationBoundary,
    now,
  });
  const process = createThreadVisualPublicationProcess({
    threadSource: createDurableThreadSource(worldRuntime.identityStore),
    reconciler,
    onResult,
    onError,
  });
  worldRuntime.reconciliationProcess.setVisualPublicationProcess(process);
  if (runImmediately) await worldRuntime.reconciliationRuntime.runNow();

  let stopped = false;
  return Object.freeze({
    process,
    reconciler,
    canonicalEmbodimentMaterializer,
    runOnce: () => process.runOnce(),
    stop() {
      if (stopped) return;
      stopped = true;
      worldRuntime.reconciliationProcess.setVisualPublicationProcess(null);
    },
  });
}
