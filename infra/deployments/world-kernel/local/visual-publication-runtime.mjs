import { createGenesisCanonicalEmbodimentMaterializer } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { createThreadVisualPublicationProcess, startThreadVisualPublicationProcess } from "#services/world-kernel/src/thread-visual-publication-process.mjs";
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
 * Attaches Slice-A visual reconciliation to an already-composed local World
 * runtime. Durable Thread enumeration makes startup/restart recovery independent
 * of whether the original birth callback was observed by this process.
 */
export function attachWorldVisualPublicationRuntime({
  worldRuntime,
  canonicalRootBoundary,
  presentationBoundary,
  intervalMs = 5_000,
  runImmediately = true,
  now = () => new Date().toISOString(),
  onResult = null,
  onError = null,
} = {}) {
  if (!worldRuntime?.store || !worldRuntime?.identityStore || !worldRuntime?.embodimentStore) {
    throw new TypeError("visual publication runtime requires a started World Kernel runtime");
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
  const scheduler = startThreadVisualPublicationProcess({
    process,
    intervalMs,
    runImmediately,
  });

  return Object.freeze({
    process,
    reconciler,
    canonicalEmbodimentMaterializer,
    runOnce: () => process.runOnce(),
    stop: () => scheduler.stop(),
  });
}
