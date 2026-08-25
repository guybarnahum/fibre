import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { startM1DemoWorldKernel } from "#tools/replays/m1/m1-demo-world-kernel.mjs";

export { startM1DemoWorldKernel };

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
