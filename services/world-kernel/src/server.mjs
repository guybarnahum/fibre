import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openWorldStore } from "./persistence.mjs";
import { openRuntimeStore } from "./runtime-store.mjs";
import { openFreezeStore } from "./freeze-store.mjs";
import { openLifecycleHardeningStore } from "./lifecycle-hardening-store.mjs";
import { openExpressionStore } from "./expression-store.mjs";
import { openCausalContextStore } from "./causal-context-store.mjs";
import { openSemanticStateStore } from "./semantic-state-store.mjs";
import { openGuardianCognitionStore } from "./guardian-cognition-store.mjs";
import { openObligationApplicabilityStore } from "./obligation-applicability-store.mjs";
import { guardianModelAdapterFromEnvironment } from "./guardian-model-adapter.mjs";
import { StructuredObligationCausalWorldKernelService } from "./structured-causal-service.mjs";
import {
  assertLoopbackBindHost,
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "./http-server.mjs";
import { createCausalWorldKernelHttpServer } from "./causal-http-server.mjs";

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
  if (Object.hasOwn(serviceOptions, "historicalM1Compatibility")) {
    throw new TypeError("historical M1 compatibility is not available from the canonical world-kernel");
  }
  if (Object.hasOwn(serviceOptions, "applicabilityStore")) {
    throw new TypeError("canonical Structured Obligation applicability storage is world-kernel owned");
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
  let causalContextStore;
  let semanticStateStore;
  let guardianCognitionStore;
  let applicabilityStore;
  try {
    runtimeStore = openRuntimeStore(databasePath);
    freezeStore = openFreezeStore(databasePath);
    lifecycleStore = openLifecycleHardeningStore(databasePath);
    expressionStore = openExpressionStore(databasePath);
    causalContextStore = openCausalContextStore(databasePath);
    semanticStateStore = openSemanticStateStore(databasePath);
    guardianCognitionStore = openGuardianCognitionStore(databasePath);
    applicabilityStore = openObligationApplicabilityStore(databasePath);
  } catch (error) {
    applicabilityStore?.close();
    guardianCognitionStore?.close();
    semanticStateStore?.close();
    causalContextStore?.close();
    expressionStore?.close();
    lifecycleStore?.close();
    freezeStore?.close();
    runtimeStore?.close();
    store.close();
    throw error;
  }

  const guardianModelAdapter = serviceOptions.guardianModelAdapter ??
    guardianModelAdapterFromEnvironment(environment);
  const service = new StructuredObligationCausalWorldKernelService(
    store,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    {
      ...serviceOptions,
      semanticStateStore,
      guardianCognitionStore,
      guardianModelAdapter,
      applicabilityStore,
    },
  );
  const server = createCausalWorldKernelHttpServer({
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
        errorCode: error?.code ?? null,
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
        applicabilityStore.close();
        guardianCognitionStore.close();
        semanticStateStore.close();
        causalContextStore.close();
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
      causalContextStore,
      semanticStateStore,
      guardianCognitionStore,
      applicabilityStore,
      service,
      address,
      databasePath,
      repairEnabled: adminToken !== null,
      privateAccessEnabled: privateToken !== null,
      causalParticipationEnabled: true,
      structuredObligationAuthorityEnabled: true,
      structuredObligationDischargeEnabled: true,
      guardianProvider: guardianModelAdapter.provider ?? "configured_adapter",
      guardianModelId: guardianModelAdapter.modelId ?? "configured_model",
      close,
    };
  } catch (error) {
    applicabilityStore.close();
    guardianCognitionStore.close();
    semanticStateStore.close();
    causalContextStore.close();
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
    causalParticipationEnabled: true,
    structuredObligationAuthorityEnabled: true,
    structuredObligationDischargeEnabled: true,
    runtimeProfileVersion: 1,
    freezeProfileVersion: 2,
    lifecycleClosureProfileVersion: 1,
    expressionProfileVersion: 1,
    causalParticipationProfileVersion: 4,
    guardianProvider: runtime.guardianProvider,
    guardianModelId: runtime.guardianModelId,
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