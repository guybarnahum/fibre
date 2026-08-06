import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openWorldStore } from "./persistence.mjs";
import { openRuntimeStore } from "./runtime-store.mjs";
import { openFreezeStore } from "./freeze-store.mjs";
import { openLifecycleHardeningStore } from "./lifecycle-hardening-store.mjs";
import { openExpressionStore } from "./expression-store.mjs";
import { M1ExpressionWorldKernelService } from "./expression-service.mjs";
import {
  assertLoopbackBindHost,
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "./http-server.mjs";
import { createExpressionWorldKernelHttpServer } from "./expression-http-server.mjs";

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_WORLD_PORT must be an integer from 0 through 65535");
  }
  return port;
}

export async function startWorldKernelFromEnvironment(
  environment = process.env,
  serviceOptions = {},
) {
  if (serviceOptions === null || typeof serviceOptions !== "object" || Array.isArray(serviceOptions)) {
    throw new TypeError("world-kernel serviceOptions must be an object");
  }
  const databasePath = resolve(environment.FIBRE_WORLD_DATABASE ?? ".fibre/world.sqlite");
  const host = environment.FIBRE_WORLD_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_WORLD_PORT ?? "8787");
  const adminToken = environment.FIBRE_ADMIN_TOKEN ?? null;
  const privateToken = environment.FIBRE_PRIVATE_TOKEN ?? null;
  assertLoopbackBindHost(host);

  const store = openWorldStore(databasePath);
  let runtimeStore;
  let freezeStore;
  let lifecycleStore;
  let expressionStore;
  try {
    runtimeStore = openRuntimeStore(databasePath);
    freezeStore = openFreezeStore(databasePath);
    lifecycleStore = openLifecycleHardeningStore(databasePath);
    expressionStore = openExpressionStore(databasePath);
  } catch (error) {
    expressionStore?.close();
    lifecycleStore?.close();
    freezeStore?.close();
    runtimeStore?.close();
    store.close();
    throw error;
  }
  const service = new M1ExpressionWorldKernelService(
    store,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    serviceOptions,
  );
  const server = createExpressionWorldKernelHttpServer({
    service,
    adminToken,
    privateToken,
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
      try {
        await closeWorldKernelHttpServer(server);
      } finally {
        expressionStore.close();
        lifecycleStore.close();
        freezeStore.close();
        runtimeStore.close();
        store.close();
      }
    };
    return {
      server,
      store,
      runtimeStore,
      freezeStore,
      lifecycleStore,
      expressionStore,
      service,
      address,
      databasePath,
      repairEnabled: adminToken !== null,
      privateAccessEnabled: privateToken !== null,
      close,
    };
  } catch (error) {
    expressionStore.close();
    lifecycleStore.close();
    freezeStore.close();
    runtimeStore.close();
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
    privateAccessEnabled: runtime.privateAccessEnabled,
    runtimeProfileVersion: 1,
    freezeProfileVersion: 1,
    lifecycleClosureProfileVersion: 1,
    expressionProfileVersion: 1,
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
