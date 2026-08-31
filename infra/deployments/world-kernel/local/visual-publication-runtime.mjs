import { DatabaseSync } from "node:sqlite";

import { createGenesisCanonicalEmbodimentMaterializer } from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { createThreadVisualPublicationProcess, startThreadVisualPublicationProcess } from "#services/world-kernel/src/thread-visual-publication-process.mjs";
import { createThreadVisualPublicationReconciler } from "#services/world-kernel/src/thread-visual-publication-reconciler.mjs";
import { normalizeDatabasePath } from "#services/world-kernel/src/persistence.mjs";

function createDurableThreadSource(databasePath) {
  const normalizedPath = normalizeDatabasePath(databasePath);
  return Object.freeze({
    listThreadIds() {
      const database = new DatabaseSync(normalizedPath, {
        readOnly: true,
        enableForeignKeyConstraints: true,
      });
      try {
        database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
        return database.prepare("SELECT thread_id FROM threads ORDER BY thread_id").all()
          .map((row) => row.thread_id);
      } finally {
        database.close();
      }
    },
  });
}

function throwExplicitReconciliationFailure(result) {
  const failure = result.results.find((entry) => entry.ok === false);
  if (failure) {
    const error = new Error(`${failure.errorName}: ${failure.message}`);
    error.name = failure.errorName;
    throw error;
  }
  return result;
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
  if (!worldRuntime?.store || !worldRuntime?.embodimentStore || typeof worldRuntime.databasePath !== "string") {
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
    threadSource: createDurableThreadSource(worldRuntime.databasePath),
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
    async runOnce() {
      return throwExplicitReconciliationFailure(await process.runOnce());
    },
    stop: () => scheduler.stop(),
  });
}
