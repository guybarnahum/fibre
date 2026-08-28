import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BIRTH_CENTER_RUNTIME_VERSION,
  createBirthCenterRuntime,
} from "./runtime.mjs";

const LOOPBACK_BIND_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function assertLoopbackBindHost(host) {
  if (typeof host !== "string" || !LOOPBACK_BIND_HOSTS.has(host)) {
    throw new TypeError("The M1 world-kernel server may bind only to a loopback host");
  }
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_BIRTH_CENTER_PORT must be an integer from 0 through 65535");
  }
  return port;
}

function writeJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(value)}\n`);
}

export async function startBirthCenterFromEnvironment(
  environment = process.env,
  { worldPublisher = null } = {},
) {
  const host = environment.FIBRE_BIRTH_CENTER_HOST ?? "127.0.0.1";
  const port = parsePort(environment.FIBRE_BIRTH_CENTER_PORT ?? "8790");
  const stateRoot = resolve(environment.FIBRE_BIRTH_CENTER_STATE ?? ".fibre/birth-center");
  assertLoopbackBindHost(host);

  const runtime = createBirthCenterRuntime({ stateRoot, worldPublisher });
  const server = createServer((request, response) => {
    if (request.method === "GET" && (request.url === "/health" || request.url === "/v1/status")) {
      writeJson(response, 200, {
        service: "fibre-birth-center",
        ...runtime.status(),
      });
      return;
    }
    writeJson(response, 404, { error: "not_found" });
  });

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
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  };

  return Object.freeze({
    runtime,
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
    stateRoot: service.runtime.stateRoot,
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
