import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "../services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "../services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "../services/world-kernel/src/expression-store.mjs";
import { M1ExpressionWorldKernelService } from "../services/world-kernel/src/expression-service.mjs";
import { createExpressionWorldKernelHttpServer } from "../services/world-kernel/src/expression-http-server.mjs";
import {
  assertLoopbackBindHost,
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../services/world-kernel/src/http-server.mjs";
import { deterministicActorOutput } from "../services/world-kernel/src/runtime-domain.mjs";

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_WORLD_PORT must be an integer from 0 through 65535");
  }
  return port;
}

function parseLeaseDuration(value) {
  const duration = Number(value ?? "300000");
  if (!Number.isSafeInteger(duration) || duration < 25 || duration > 60 * 60 * 1000) {
    throw new TypeError("FIBRE_DEMO_LEASE_DURATION_MS must be an integer from 25 through 3600000");
  }
  return duration;
}

function actorForMode(mode) {
  if (mode === "normal") return undefined;
  if (mode === "divergent") {
    return (context) => ({
      ...deterministicActorOutput(context),
      objective: `${context.objective} — unauthorized divergence`,
    });
  }
  throw new TypeError("FIBRE_DEMO_ACTOR_MODE must be normal or divergent");
}

export async function startM1DemoWorldKernel(environment = process.env) {
  const databasePath = resolve(environment.FIBRE_WORLD_DATABASE ?? ".fibre/world.sqlite");
  const host = environment.FIBRE_WORLD_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_WORLD_PORT ?? "8787");
  const adminToken = environment.FIBRE_ADMIN_TOKEN ?? null;
  const privateToken = environment.FIBRE_PRIVATE_TOKEN ?? null;
  const actorMode = environment.FIBRE_DEMO_ACTOR_MODE ?? "normal";
  const actor = actorForMode(actorMode);
  const leaseDurationMs = parseLeaseDuration(environment.FIBRE_DEMO_LEASE_DURATION_MS);
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
    {
      leaseDurationMs,
      ...(actor === undefined ? {} : { actor }),
    },
  );
  const server = createExpressionWorldKernelHttpServer({
    service,
    adminToken,
    privateToken,
    onError(error, context) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        event: "m1-demo-world-kernel-request-failed",
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
      actorMode,
      leaseDurationMs,
      historicalM1Harness: true,
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
  const runtime = await startM1DemoWorldKernel();
  process.stdout.write(`${JSON.stringify({
    event: "m1-demo-world-kernel-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    databasePath: runtime.databasePath,
    actorMode: runtime.actorMode,
    leaseDurationMs: runtime.leaseDurationMs,
    repairEnabled: runtime.repairEnabled,
    privateAccessEnabled: runtime.privateAccessEnabled,
    historicalM1Harness: true,
  })}\n`);

  const shutdown = async (signal) => {
    try {
      await runtime.close();
      process.stdout.write(`${JSON.stringify({ event: "m1-demo-world-kernel-stopped", signal })}\n`);
      process.exitCode = 0;
    } catch (error) {
      process.stderr.write(`${JSON.stringify({
        event: "m1-demo-world-kernel-stop-failed",
        signal,
        message: error.message,
      })}\n`);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "m1-demo-world-kernel-start-failed",
      errorName: error.constructor?.name ?? "Error",
      message: error.message,
    })}\n`);
    process.exitCode = 1;
  });
}
