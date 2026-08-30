import { attachWorldVisualPublicationRuntime } from "./visual-publication-runtime.mjs";
import { startWorldKernelFromEnvironment } from "./server.mjs";

/**
 * Local deployment composition for Slice-A visual publication.
 *
 * The base World server remains independently reusable. This composition starts
 * it and attaches the restart-safe visual reconciliation process as part of the
 * same lifecycle, wrapping close() so no reconciliation survives World shutdown.
 */
export async function startWorldKernelVisualPublicationFromEnvironment(
  environment = process.env,
  serviceOptions = {},
  visualOptions = {},
) {
  const worldRuntime = await startWorldKernelFromEnvironment(environment, serviceOptions);
  let visualRuntime;
  try {
    visualRuntime = attachWorldVisualPublicationRuntime({
      worldRuntime,
      ...visualOptions,
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
