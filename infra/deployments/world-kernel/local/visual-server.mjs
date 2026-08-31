import { attachWorldVisualPublicationRuntime } from "./visual-publication-runtime.mjs";
import { startWorldKernelFromEnvironment } from "./server.mjs";
import { createThreadPresentationVisualHttpBoundary } from "./thread-presentation-visual-http-boundary.mjs";

function defaultVisualPublicationErrorReporter(entry, error) {
  process.stderr.write(`${JSON.stringify({
    event: "world_visual_publication_reconciliation_failed",
    threadId: entry.threadId,
    errorName: entry.errorName,
    message: entry.message,
    stack: error instanceof Error ? error.stack : null,
  })}\n`);
}

function productionPresentationBoundary(environment) {
  return createThreadPresentationVisualHttpBoundary({
    baseUrl: environment.FIBRE_THREAD_PRESENTATION_URL ?? "http://127.0.0.1:8788",
    privateToken: environment.FIBRE_PRIVATE_TOKEN,
  });
}

/**
 * World deployment composition for automatic visual publication.
 *
 * World owns the restart-safe reconciliation lifecycle. Unless a test/deployment
 * explicitly injects a Presentation boundary, admitted Embodiments cross the
 * production service boundary over authenticated HTTP; Presentation owns its
 * snapshot projection and derived-media demand state.
 */
export async function startWorldKernelVisualPublicationFromEnvironment(
  environment = process.env,
  serviceOptions = {},
  visualOptions = {},
) {
  const worldRuntime = await startWorldKernelFromEnvironment(environment, serviceOptions);
  let visualRuntime;
  try {
    const presentationBoundary = visualOptions.presentationBoundary
      ?? productionPresentationBoundary(environment);
    visualRuntime = attachWorldVisualPublicationRuntime({
      worldRuntime,
      onError: defaultVisualPublicationErrorReporter,
      ...visualOptions,
      presentationBoundary,
    });
  } catch (error) {
    await worldRuntime.close();
    throw error;
  }

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    visualRuntime.stop();
    await worldRuntime.close();
  };

  return Object.freeze({
    ...worldRuntime,
    visualRuntime,
    visualPublicationEnabled: true,
    close,
  });
}
