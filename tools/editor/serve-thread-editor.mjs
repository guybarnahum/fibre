import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
} from "./thread-editor-server.mjs";

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_EDITOR_PORT must be an integer from 0 through 65535");
  }
  return port;
}

export async function startThreadEditorFromEnvironment(environment = process.env) {
  const host = environment.FIBRE_EDITOR_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_EDITOR_PORT ?? "4173");
  const worldKernelUrl = environment.FIBRE_WORLD_URL ?? "http://127.0.0.1:8787";
  const privateToken = environment.FIBRE_PRIVATE_TOKEN ?? null;
  const accessToken = environment.FIBRE_EDITOR_ACCESS_TOKEN ?? undefined;
  const server = createThreadEditorServer({
    worldKernelUrl,
    privateToken,
    ...(accessToken === undefined ? {} : { accessToken }),
    onError(error, context) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        event: "thread-editor-request-failed",
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        errorName: error?.constructor?.name ?? "Error",
        message: error?.message ?? "Unknown error",
      })}\n`);
    },
  });
  const address = await listenThreadEditorServer(server, { host, port });
  let closed = false;
  return {
    server,
    address,
    worldKernelUrl,
    accessToken: server.editorAccessToken,
    privateInspection: privateToken !== null,
    async close() {
      if (closed) return;
      closed = true;
      await closeThreadEditorServer(server);
    },
  };
}

async function main() {
  const runtime = await startThreadEditorFromEnvironment();
  const accessUrl = `http://${runtime.address.host}:${runtime.address.port}/#access_token=${encodeURIComponent(runtime.accessToken)}`;
  process.stdout.write(`${JSON.stringify({
    event: "thread-editor-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    worldKernelUrl: runtime.worldKernelUrl,
    mode: "inspection",
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
