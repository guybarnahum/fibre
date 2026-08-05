import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openWorldStore } from "./persistence.mjs";
import { WorldKernelService } from "./kernel-service.mjs";
import {
  assertLoopbackBindHost,
  closeWorldKernelHttpServer,
  createWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "./http-server.mjs";

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_WORLD_PORT must be an integer from 0 through 65535");
  }
  return port;
}

export async function startWorldKernelFromEnvironment(environment = process.env) {
  const databasePath = resolve(environment.FIBRE_WORLD_DATABASE ?? ".fibre/world.sqlite");
  const host = environment.FIBRE_WORLD_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_WORLD_PORT ?? "8787");
  const adminToken = environment.FIBRE_ADMIN_TOKEN ?? null;
  assertLoopbackBindHost(host);

  const store = openWorldStore(databasePath);
  const service = new WorldKernelService(store);
  const server = createWorldKernelHttpServer({
    service,
    adminToken,
    onError(error, context) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        event: "world-kernel-request-failed",
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        errorName: error?.constructor?.name ?? "Error",
        message: error?.message ?? "Unknown error",
      })}\n`);
    },
  });

  try {
    const address = await listenWorldKernelHttpServer(server, { host, port });
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      try { await closeWorldKernelHttpServer(server); } finally { store.close(); }
    };
    return { server, store, service, address, databasePath, repairEnabled: adminToken !== null, close };
  } catch (error) {
    store.close();
    throw error;
  }
}

async function main() {
  const runtime = await startWorldKernelFromEnvironment();
  process.stdout.write(`${JSON.stringify({
    event: "world-kernel-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    databasePath: runtime.databasePath,
    repairEnabled: runtime.repairEnabled,
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
