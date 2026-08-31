import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createNodeServiceHandler } from "#infra/providers/local/service";
import { createService } from "#infra/service";
import { createBirthCenterWriteApi } from "#services/birth-center/src/birth-write-api.mjs";
import { createGenesisDevelopmentApi } from "#services/birth-center/src/genesis-development-api.mjs";
import { createGenesisDevelopmentService } from "#services/birth-center/src/genesis-development-service.mjs";
import {
  BIRTH_CENTER_RUNTIME_VERSION,
  createBirthCenterRuntime,
} from "#services/birth-center/src/runtime.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createWorldKernelBirthPublisher } from "./world-kernel-birth-publisher.mjs";

const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8"),
);
const DEPLOYMENT = resolveServiceDeployment(LOCAL_MANIFEST, "birth-center");
if (DEPLOYMENT.runtime.provider !== "local-node") {
  throw new TypeError(`birth-center local host requires local-node runtime, got ${DEPLOYMENT.runtime.provider}`);
}

const BIRTH_SCOPE_ID = "birth";
const LOOPBACK_BIND_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function assertLoopbackBindHost(host) {
  if (typeof host !== "string" || !LOOPBACK_BIND_HOSTS.has(host)) {
    throw new TypeError("The Birth Center server may bind only to a loopback host");
  }
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_BIRTH_CENTER_PORT must be an integer from 0 through 65535");
  }
  return port;
}

function retryMs(environment) {
  const value = Number(environment.FIBRE_BIRTH_RECONCILIATION_MS ?? 5_000);
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError("FIBRE_BIRTH_RECONCILIATION_MS must be an integer from 100 through 3600000");
  }
  return value;
}

function worldPublisherFromEnvironment(environment) {
  const privateToken = environment.FIBRE_PRIVATE_TOKEN;
  if (typeof privateToken !== "string" || privateToken === "") return null;
  return createWorldKernelBirthPublisher({
    endpoint: environment.FIBRE_WORLD_KERNEL_URL ?? "http://127.0.0.1:8787",
    privateToken,
  });
}

function reasoningProfile(name) {
  const selected = DEPLOYMENT.integrations?.[name];
  if (!selected || selected.kind !== "ai.reasoning") {
    throw new TypeError(`birth-center local deployment requires ${name} reasoning integration`);
  }
  return selected;
}

function reasoningCredentialsPresent(environment) {
  for (const name of ["creative", "repair"]) {
    const variable = reasoningProfile(name).secrets?.apiKey;
    if (typeof variable !== "string" || variable.trim() === "") {
      throw new TypeError(`birth-center local ${name} reasoning integration must declare secrets.apiKey`);
    }
    const value = environment?.[variable];
    if (typeof value !== "string" || value.trim() === "") return false;
  }
  return true;
}

function reasoningAdaptersFromEnvironment(environment) {
  return Object.freeze({
    creativeAdapter: selectReasoningIntegration(reasoningProfile("creative"), { environment }),
    repairAdapter: selectReasoningIntegration(reasoningProfile("repair"), { environment }),
  });
}

function createDevelopmentComponents({ environment, options, runtime, worldPublisher }) {
  if (worldPublisher === null) {
    return Object.freeze({ reasoningAdapters: null, developmentService: null, developmentApi: null });
  }
  const reasoningAdapters = Object.hasOwn(options, "reasoningAdapters")
    ? options.reasoningAdapters
    : reasoningCredentialsPresent(environment)
      ? reasoningAdaptersFromEnvironment(environment)
      : null;
  if (reasoningAdapters === null) {
    return Object.freeze({ reasoningAdapters: null, developmentService: null, developmentApi: null });
  }
  if (!reasoningAdapters || typeof reasoningAdapters !== "object" || Array.isArray(reasoningAdapters)) {
    throw new TypeError("birth-center local reasoningAdapters must be an object or null");
  }
  const creativeAdapter = reasoningAdapters.creativeAdapter;
  const repairAdapter = reasoningAdapters.repairAdapter ?? creativeAdapter;
  const developmentService = createGenesisDevelopmentService({
    runtime,
    creativeAdapter,
    repairAdapter,
    now: options.now,
    randomIntFn: options.randomIntFn,
  });
  const developmentApi = createGenesisDevelopmentApi({
    developmentService,
    privateToken: environment.FIBRE_PRIVATE_TOKEN,
    onError(error) {
      console.error(JSON.stringify({
        event: "birth-center-development-failed",
        message: error instanceof Error ? error.message : String(error),
      }));
    },
  });
  return Object.freeze({ reasoningAdapters, developmentService, developmentApi });
}

export async function startBirthCenterFromEnvironment(
  environment = process.env,
  options = {},
) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("birth-center deployment options must be an object");
  }
  const host = environment.FIBRE_BIRTH_CENTER_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_BIRTH_CENTER_PORT ?? "8790");
  const statePath = resolve(environment.FIBRE_BIRTH_CENTER_STATE ?? ".fibre/birth-center/birth.sqlite");
  assertLoopbackBindHost(host);

  const worldPublisher = Object.hasOwn(options, "worldPublisher")
    ? options.worldPublisher
    : worldPublisherFromEnvironment(environment);
  let runtime = null;
  const infraDriver = createLocalInfraDriver({
    stateScopes: { [BIRTH_SCOPE_ID]: statePath },
    schedulerScopes: {
      [BIRTH_SCOPE_ID]: {
        onWake() { return runtime?.handleWake(); },
        onError(error) {
          console.error(JSON.stringify({
            event: "birth-center-reconciliation-failed",
            message: error instanceof Error ? error.message : String(error),
          }));
        },
      },
    },
  });
  const birthStorage = Object.freeze({ infraDriver, stateScopeId: BIRTH_SCOPE_ID });
  runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    retryMs: retryMs(environment),
    now: options.now,
    nowMs: options.nowMs,
  });
  await runtime.ensureScheduled();

  const development = createDevelopmentComponents({
    environment,
    options,
    runtime,
    worldPublisher,
  });
  const status = () => ({
    service: "fibre-birth-center",
    ...runtime.status(),
    genesisDevelopmentConfigured: development.developmentApi !== null,
  });
  const routes = [
    { method: "GET", path: "/health", handler: status },
    { method: "GET", path: "/v1/status", handler: status },
  ];
  if (worldPublisher !== null) {
    const birthApi = createBirthCenterWriteApi({
      runtime,
      privateToken: environment.FIBRE_PRIVATE_TOKEN,
    });
    routes.push({
      method: "POST",
      path: "/internal/births",
      handler: ({ request }) => birthApi.fetch(request),
    });
    if (development.developmentApi !== null) {
      routes.push({
        method: "POST",
        path: "/internal/births/develop",
        handler: ({ request }) => development.developmentApi.fetch(request),
      });
    }
  }
  const service = createService({
    serviceName: "birth-center",
    health: () => ({
      runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
      ...runtime.status(),
      genesisDevelopmentConfigured: development.developmentApi !== null,
    }),
    routes,
  });
  const server = createServer(createNodeServiceHandler({ service }));

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Birth Center did not bind a TCP address");
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await infraDriver.scheduler.cancel(BIRTH_SCOPE_ID);
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
    runtime.close();
  };

  return Object.freeze({
    runtime,
    infraDriver,
    birthStorage,
    developmentService: development.developmentService,
    developmentApi: development.developmentApi,
    service,
    server,
    address: Object.freeze({ host: address.address, port: address.port }),
    close,
  });
}

async function main() {
  const service = await startBirthCenterFromEnvironment();
  process.stdout.write(`${JSON.stringify({
    event: "birth-center-listening",
    runtimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
    host: service.address.host,
    port: service.address.port,
    stateScopeId: service.runtime.stateScopeId,
    infraCapabilities: service.runtime.infraDriver.capabilities,
    worldPublicationConfigured: service.runtime.worldPublicationConfigured,
    genesisDevelopmentConfigured: service.developmentApi !== null,
    authoritativeThreadStateOwned: false,
  })}\n`);

  const shutdown = async (signal) => {
    try {
      await service.close();
      process.stdout.write(`${JSON.stringify({ event: "birth-center-stopped", signal })}\n`);
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ event: "birth-center-stop-failed", signal, message: error.message })}\n`);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "birth-center-start-failed",
      errorName: error?.constructor?.name ?? "Error",
      message: error?.message ?? String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
