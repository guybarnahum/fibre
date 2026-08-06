import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { deterministicActorOutput } from "../services/world-kernel/src/runtime-domain.mjs";
import { startWorldKernelFromEnvironment } from "../services/world-kernel/src/server.mjs";

// Demonstration-only entrypoint: the normal world-kernel command does not read
// FIBRE_DEMO_* values or accept these service-option overrides.
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
  const actorMode = environment.FIBRE_DEMO_ACTOR_MODE ?? "normal";
  const actor = actorForMode(actorMode);
  const leaseDurationMs = parseLeaseDuration(environment.FIBRE_DEMO_LEASE_DURATION_MS);
  const runtime = await startWorldKernelFromEnvironment(environment, {
    leaseDurationMs,
    ...(actor === undefined ? {} : { actor }),
  });
  return { ...runtime, actorMode, leaseDurationMs };
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
