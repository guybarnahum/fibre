import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { startThreadEditorDirectoryFromEnvironment } from "./serve-thread-editor-directory.mjs";

export const startThreadEditorFromEnvironment = startThreadEditorDirectoryFromEnvironment;

async function main() {
  const runtime = await startThreadEditorFromEnvironment();
  const accessUrl = `http://${runtime.address.host}:${runtime.address.port}/#access_token=${encodeURIComponent(runtime.accessToken)}`;
  process.stdout.write(`${JSON.stringify({
    event: "thread-editor-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    worldKernelUrl: runtime.worldKernelUrl,
    presentationBaseUrl: runtime.presentationBaseUrl,
    mode: "inspection+directory",
    privateInspection: runtime.privateInspection,
    accessUrl,
  })}\n`);
  const shutdown = async (signal) => {
    try {
      await runtime.close();
      process.stdout.write(`${JSON.stringify({ event: "thread-editor-stopped", signal })}\n`);
      process.exitCode = 0;
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ event: "thread-editor-stop-failed", signal, message: error.message })}\n`);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

if (
  process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(realpathSync(resolve(process.argv[1]))).href
) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ event: "thread-editor-start-failed", errorName: error.constructor?.name ?? "Error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
