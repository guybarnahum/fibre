import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createNodeServiceHandler } from "#infra/providers/local/service";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { createService } from "#infra/service";
import { createGenesisPresentationDeliveryService } from "#services/thread-presentation/src/index.mjs";
import { CivilRegistryStore } from "#services/world-kernel/src/civil-registry-store.mjs";
import { GenesisPresentationOutboxStore } from "#services/world-kernel/src/genesis-presentation-outbox-store.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "#services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "#services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "#services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "#services/world-kernel/src/expression-store.mjs";
import { openCausalContextStore } from "#services/world-kernel/src/causal-context-store.mjs";
import { openSemanticStateStore } from "#services/world-kernel/src/semantic-state-store.mjs";
import { openGuardianCognitionStore } from "#services/world-kernel/src/guardian-cognition-store.mjs";
import { openIdentityStore } from "#services/world-kernel/src/identity-store.mjs";
import { openAutobiographicalMemoryStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { openSituatedLifeStore } from "#services/world-kernel/src/situated-life-store.mjs";
import { openEmbodimentStore } from "#services/world-kernel/src/embodiment-store.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";
import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { createGenesisBirthPublicationService } from "#services/world-kernel/src/genesis-birth-publication-service.mjs";
import { attachGenesisBirthPublicationHttpServer } from "#services/world-kernel/src/genesis-birth-http-server.mjs";
import { openObligationApplicabilityStore } from "#services/world-kernel/src/obligation-applicability-store.mjs";
import { openStructuredAuthorityWithdrawalStore } from "#services/world-kernel/src/structured-authority-withdrawal-store.mjs";
import { openStructuredObligationInspectionStore } from "#services/world-kernel/src/structured-obligation-inspection-store.mjs";
import { StructuredObligationCausalWorldKernelService } from "#services/world-kernel/src/structured-causal-service.mjs";
import {
  assertLoopbackBindHost,
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "#services/world-kernel/src/http-server.mjs";
import { createStructuredObligationInspectionHttpServer } from "#services/world-kernel/src/structured-obligation-inspection-http-server.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createThreadPresentationPublisher } from "./thread-presentation-publisher.mjs";

const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8"),
);
const DEPLOYMENT = resolveServiceDeployment(LOCAL_MANIFEST, "world-kernel");
if (DEPLOYMENT.runtime.provider !== "local-node") {
  throw new TypeError(`world-kernel local host requires local-node runtime, got ${DEPLOYMENT.runtime.provider}`);
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_WORLD_PORT must be an integer from 0 through 65535");
  }
  return port;
}

function parseRetryMs(value) {
  const retryMs = Number(value);
  if (!Number.isSafeInteger(retryMs) || retryMs < 100 || retryMs > 60_000) {
    throw new TypeError("FIBRE_PRESENTATION_RETRY_MS must be an integer from 100 through 60000");
  }
  return retryMs;
}

function attachOperationalService(server, kernelService, { repairEnabled }) {
  const handlers = server.listeners("request");
  if (handlers.length !== 1) throw new Error("world-kernel HTTP server must expose exactly one request handler before service composition");
  const [domainHandler] = handlers;
  const service = createService({
    serviceName: "world-kernel",
    health: () => {
      const current = kernelService.health();
      const { ok: _ok, service: _service, ...details } = current;
      return { ...details, repairEnabled };
    },
  });
  const operationalHandler = createNodeServiceHandler({ service });
  server.removeAllListeners("request");
  server.on("request", (request, response) => {
    if (request.method === "GET" && request.url === "/healthz") {
      return operationalHandler(request, response);
    }
    return domainHandler(request, response);
  });
  return service;
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
  if (Object.hasOwn(serviceOptions, "inspectionStore")) {
    throw new TypeError("canonical Structured Obligation inspection is world-kernel owned");
  }
  if (Object.hasOwn(serviceOptions, "authorityWithdrawalStore")) {
    throw new TypeError("canonical Structured Obligation authority-withdrawal storage is world-kernel owned");
  }
  if (Object.hasOwn(serviceOptions, "identityContextSourceStores")) {
    throw new TypeError("canonical identity-context source authorities are world-kernel owned");
  }
  const databasePath = resolve(environment.FIBRE_WORLD_DATABASE ?? ".fibre/world.sqlite");
  const host = environment.FIBRE_WORLD_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_WORLD_PORT ?? "8787");
  const adminToken = environment.FIBRE_ADMIN_TOKEN ?? null;
  const privateToken = environment.FIBRE_PRIVATE_TOKEN ?? null;
  const presentationBaseUrl = environment.FIBRE_THREAD_PRESENTATION_URL ?? "http://127.0.0.1:8788";
  const presentationRetryMs = parseRetryMs(environment.FIBRE_PRESENTATION_RETRY_MS ?? "5000");
  assertLoopbackBindHost(host);

  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const worldStorage = Object.freeze({ infraDriver, stateScopeId: "world" });
  const store = openWorldStore(worldStorage);
  let runtimeStore;
  let freezeStore;
  let lifecycleStore;
  let expressionStore;
  let causalContextStore;
  let semanticStateStore;
  let guardianCognitionStore;
  let identityStore;
  let autobiographicalMemoryStore;
  let situatedLifeStore;
  let embodimentStore;
  let symbolicGenomeStore;
  let genesisStore;
  let civilRegistryStore;
  let presentationOutboxStore;
  let applicabilityStore;
  let authorityWithdrawalStore;
  let inspectionStore;
  try {
    runtimeStore = openRuntimeStore(worldStorage);
    freezeStore = openFreezeStore(worldStorage);
    lifecycleStore = openLifecycleHardeningStore(worldStorage);
    expressionStore = openExpressionStore(worldStorage);
    causalContextStore = openCausalContextStore(worldStorage);
    semanticStateStore = openSemanticStateStore(worldStorage);
    guardianCognitionStore = openGuardianCognitionStore(worldStorage);
    identityStore = openIdentityStore(worldStorage);
    autobiographicalMemoryStore = openAutobiographicalMemoryStore(worldStorage);
    situatedLifeStore = openSituatedLifeStore(worldStorage);
    embodimentStore = openEmbodimentStore(worldStorage);
    symbolicGenomeStore = new SymbolicGenomeStore(worldStorage);
    genesisStore = new GenesisStore(worldStorage);
    civilRegistryStore = new CivilRegistryStore(worldStorage);
    presentationOutboxStore = new GenesisPresentationOutboxStore(worldStorage);
    applicabilityStore = openObligationApplicabilityStore(worldStorage);
    authorityWithdrawalStore = openStructuredAuthorityWithdrawalStore(worldStorage);
    inspectionStore = openStructuredObligationInspectionStore(worldStorage);
  } catch (error) {
    inspectionStore?.close();
    authorityWithdrawalStore?.close();
    applicabilityStore?.close();
    presentationOutboxStore?.close();
    civilRegistryStore?.close();
    genesisStore?.close();
    symbolicGenomeStore?.close();
    embodimentStore?.close();
    situatedLifeStore?.close();
    autobiographicalMemoryStore?.close();
    identityStore?.close();
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

  const guardianModelAdapter = serviceOptions.guardianModelAdapter
    ?? selectReasoningIntegration(DEPLOYMENT.integrations.dignityGuardian, { environment });
  const identityContextSourceStores = {
    worldStore: store,
    identityStore,
    memoryStore: autobiographicalMemoryStore,
    situatedLifeStore,
    embodimentStore,
    symbolicGenomeStore,
    semanticStateStore,
  };
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
      identityContextSourceStores,
      applicabilityStore,
      authorityWithdrawalStore,
    },
  );
  const authoritativeBirthPublisher = createGenesisBirthPublicationService({ authority: genesisStore });
  const presentationDelivery = privateToken === null ? null : createGenesisPresentationDeliveryService({
    worldReader: store,
    civilRegistry: civilRegistryStore,
    outbox: presentationOutboxStore,
    presentationPublisher: createThreadPresentationPublisher({
      baseUrl: presentationBaseUrl,
      privateToken,
    }),
  });

  function reportPresentationDelivery(result) {
    if (result?.delivered === true) return;
    process.stderr.write(`${JSON.stringify({
      level: "warn",
      event: "genesis-presentation-delivery-pending",
      genesisId: result?.genesisId ?? null,
      threadId: result?.threadId ?? null,
      attemptCount: result?.attemptCount ?? null,
      error: result?.error ?? null,
    })}\n`);
  }

  async function deliverGenesisPresentation(genesisId) {
    if (presentationDelivery === null) return null;
    try {
      const result = await presentationDelivery.deliverGenesis(genesisId);
      reportPresentationDelivery(result);
      return result;
    } catch (error) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        event: "genesis-presentation-delivery-failed",
        genesisId,
        errorName: error?.constructor?.name ?? "Error",
        message: error?.message ?? String(error),
      })}\n`);
      return null;
    }
  }

  let presentationSweepRunning = false;
  async function deliverPendingPresentations() {
    if (presentationDelivery === null || presentationSweepRunning) return null;
    presentationSweepRunning = true;
    try {
      const result = await presentationDelivery.deliverPending();
      for (const item of result.results) reportPresentationDelivery(item);
      return result;
    } catch (error) {
      process.stderr.write(`${JSON.stringify({
        level: "error",
        event: "genesis-presentation-retry-sweep-failed",
        errorName: error?.constructor?.name ?? "Error",
        message: error?.message ?? String(error),
      })}\n`);
      return null;
    } finally {
      presentationSweepRunning = false;
    }
  }

  const birthPublisher = Object.freeze({
    async publishBirth(bundle) {
      const result = await authoritativeBirthPublisher.publishBirth(bundle);
      const genesisId = result?.manifest?.genesisId ?? bundle?.manifest?.genesisId;
      if (presentationDelivery !== null && typeof genesisId === "string") {
        void deliverGenesisPresentation(genesisId);
      }
      return result;
    },
  });
  const onRequestError = (error, context) => {
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
  };
  const server = createStructuredObligationInspectionHttpServer({
    service,
    inspectionStore,
    adminToken,
    privateToken,
    onError: onRequestError,
  });
  attachGenesisBirthPublicationHttpServer({
    server,
    birthPublisher,
    privateToken,
    onError: onRequestError,
  });
  const operationalService = attachOperationalService(server, service, {
    repairEnabled: adminToken !== null,
  });

  try {
    const address = await listenWorldKernelHttpServer(server, { host, port });
    let presentationRetryTimer = null;
    if (presentationDelivery !== null) {
      void deliverPendingPresentations();
      presentationRetryTimer = setInterval(() => void deliverPendingPresentations(), presentationRetryMs);
      presentationRetryTimer.unref?.();
    }
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      if (presentationRetryTimer !== null) clearInterval(presentationRetryTimer);
      try {
        await closeWorldKernelHttpServer(server);
      } finally {
        inspectionStore.close();
        authorityWithdrawalStore.close();
        applicabilityStore.close();
        presentationOutboxStore.close();
        civilRegistryStore.close();
        genesisStore.close();
        symbolicGenomeStore.close();
        embodimentStore.close();
        situatedLifeStore.close();
        autobiographicalMemoryStore.close();
        identityStore.close();
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
      operationalService,
      infraDriver,
      worldStorage,
      store,
      runtimeStore,
      freezeStore,
      lifecycleStore,
      expressionStore,
      causalContextStore,
      semanticStateStore,
      guardianCognitionStore,
      identityStore,
      autobiographicalMemoryStore,
      situatedLifeStore,
      embodimentStore,
      symbolicGenomeStore,
      genesisStore,
      civilRegistryStore,
      presentationOutboxStore,
      presentationDelivery,
      birthPublisher,
      applicabilityStore,
      authorityWithdrawalStore,
      inspectionStore,
      service,
      address,
      databasePath,
      presentationBaseUrl,
      presentationRetryMs,
      repairEnabled: adminToken !== null,
      privateAccessEnabled: privateToken !== null,
      genesisBirthPublicationEnabled: true,
      genesisPresentationDeliveryEnabled: presentationDelivery !== null,
      causalParticipationEnabled: true,
      identityContextConsumptionEnabled: true,
      structuredObligationAuthorityEnabled: true,
      structuredObligationDischargeEnabled: true,
      structuredAuthorityWithdrawalClosureEnabled: true,
      structuredObligationInspectionEnabled: true,
      guardianProvider: guardianModelAdapter.provider ?? "configured_adapter",
      guardianModelId: guardianModelAdapter.modelId ?? "configured_model",
      close,
    };
  } catch (error) {
    inspectionStore.close();
    authorityWithdrawalStore.close();
    applicabilityStore.close();
    presentationOutboxStore.close();
    civilRegistryStore.close();
    genesisStore.close();
    symbolicGenomeStore.close();
    embodimentStore.close();
    situatedLifeStore.close();
    autobiographicalMemoryStore.close();
    identityStore.close();
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
    presentationBaseUrl: runtime.presentationBaseUrl,
    presentationRetryMs: runtime.presentationRetryMs,
    repairEnabled: runtime.repairEnabled,
    privateAccessEnabled: runtime.privateAccessEnabled,
    genesisBirthPublicationEnabled: runtime.genesisBirthPublicationEnabled,
    genesisPresentationDeliveryEnabled: runtime.genesisPresentationDeliveryEnabled,
    causalParticipationEnabled: true,
    identityContextConsumptionEnabled: true,
    structuredObligationAuthorityEnabled: true,
    structuredObligationDischargeEnabled: true,
    structuredAuthorityWithdrawalClosureEnabled: true,
    structuredObligationInspectionEnabled: true,
    runtimeProfileVersion: 1,
    freezeProfileVersion: 2,
    lifecycleClosureProfileVersion: 1,
    expressionProfileVersion: 1,
    causalParticipationProfileVersion: 4,
    structuredObligationInspectionProfileVersion: 1,
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
