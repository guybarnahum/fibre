import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { attachWorldVisualPublicationRuntime } from "./visual-publication-runtime.mjs";
import { startWorldKernelFromEnvironment } from "./server.mjs";
import { createCanonicalVisualRootHttpBoundary } from "./canonical-visual-root-http-boundary.mjs";
import { createThreadPresentationVisualHttpBoundary } from "./thread-presentation-visual-http-boundary.mjs";
import { ThreadDirectoryStore } from "#services/world-kernel/src/thread-directory-store.mjs";
import { createThreadDirectoryService } from "#services/world-kernel/src/thread-directory-service.mjs";
import { attachThreadDirectoryHttpServer } from "#services/world-kernel/src/thread-directory-http-server.mjs";

function defaultVisualPublicationErrorReporter(entry, error) {
  process.stderr.write(`${JSON.stringify({
    event: "world_visual_publication_reconciliation_failed",
    threadId: entry.threadId,
    errorName: entry.errorName,
    message: entry.message,
    stack: error instanceof Error ? error.stack : null,
  })}\n`);
}

function defaultThreadDirectoryErrorReporter(error, context) {
  process.stderr.write(`${JSON.stringify({
    event: "world_thread_directory_failed",
    requestId: context.requestId,
    method: context.method,
    url: context.url,
    errorName: error?.constructor?.name ?? "Error",
    message: error?.message ?? "Unknown error",
  })}\n`);
}

function productionCanonicalRootBoundary(environment) {
  return createCanonicalVisualRootHttpBoundary({
    baseUrl: environment.FIBRE_ASSET_GENERATOR_URL ?? "http://127.0.0.1:8789",
    privateToken: environment.FIBRE_PRIVATE_TOKEN,
  });
}

function productionPresentationBoundary(environment) {
  return createThreadPresentationVisualHttpBoundary({
    baseUrl: environment.FIBRE_THREAD_PRESENTATION_URL ?? "http://127.0.0.1:8788",
    privateToken: environment.FIBRE_PRIVATE_TOKEN,
  });
}

/**
 * Canonical World deployment composition for automatic visual publication.
 *
 * World owns the restart-safe reconciliation lifecycle. Unless a test explicitly
 * injects deployment boundaries, canonical-root generation and admitted
 * Embodiment projection cross authenticated HTTP service boundaries. World does
 * not possess Cloudflare Workflow/R2 bindings and Presentation does not read
 * World storage.
 */
export async function startWorldKernelVisualPublicationFromEnvironment(
  environment = process.env,
  serviceOptions = {},
  visualOptions = {},
) {
  const worldRuntime = await startWorldKernelFromEnvironment(environment, serviceOptions);
  const directoryStore = new ThreadDirectoryStore(worldRuntime.worldStorage);
  const threadDirectory = createThreadDirectoryService({
    worldReader: worldRuntime.store,
    civilRegistry: worldRuntime.civilRegistryStore,
    directoryStore,
  });
  attachThreadDirectoryHttpServer({
    server: worldRuntime.server,
    directory: threadDirectory,
    privateToken: environment.FIBRE_PRIVATE_TOKEN ?? null,
    onError: defaultThreadDirectoryErrorReporter,
  });

  let visualRuntime;
  try {
    const canonicalRootBoundary = visualOptions.canonicalRootBoundary
      ?? productionCanonicalRootBoundary(environment);
    const presentationBoundary = visualOptions.presentationBoundary
      ?? productionPresentationBoundary(environment);
    visualRuntime = await attachWorldVisualPublicationRuntime({
      worldRuntime,
      onError: defaultVisualPublicationErrorReporter,
      ...visualOptions,
      canonicalRootBoundary,
      presentationBoundary,
    });
  } catch (error) {
    directoryStore.close();
    await worldRuntime.close();
    throw error;
  }

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    visualRuntime.stop();
    directoryStore.close();
    await worldRuntime.close();
  };

  return Object.freeze({
    ...worldRuntime,
    visualRuntime,
    threadDirectory,
    visualPublicationEnabled: true,
    threadDirectoryEnabled: true,
    assetGeneratorBaseUrl: environment.FIBRE_ASSET_GENERATOR_URL ?? "http://127.0.0.1:8789",
    close,
  });
}

async function main() {
  const runtime = await startWorldKernelVisualPublicationFromEnvironment();
  process.stdout.write(`${JSON.stringify({
    event: "world-kernel-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    databasePath: runtime.databasePath,
    presentationBaseUrl: runtime.presentationBaseUrl,
    assetGeneratorBaseUrl: runtime.assetGeneratorBaseUrl,
    visualPublicationEnabled: runtime.visualPublicationEnabled,
    threadDirectoryEnabled: runtime.threadDirectoryEnabled,
    privateAccessEnabled: runtime.privateAccessEnabled,
  })}\n`);

  const shutdown = async (signal) => {
    try {
      await runtime.close();
      process.stdout.write(`${JSON.stringify({ event: "world-kernel-stopped", signal })}\n`);
      process.exitCode = 0;
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ event: "world-kernel-stop-failed", signal, message: error.message })}\n`);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ event: "world-kernel-start-failed", errorName: error.constructor?.name ?? "Error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
