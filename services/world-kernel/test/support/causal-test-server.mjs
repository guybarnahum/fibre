import { startWorldKernelFromEnvironment } from "../../src/server.mjs";
import { createScriptedGuardianModelAdapter } from "./scripted-guardian-model-adapter.mjs";

const guardianModelAdapter = createScriptedGuardianModelAdapter();
const runtime = await startWorldKernelFromEnvironment(process.env, { guardianModelAdapter });

process.stdout.write(`${JSON.stringify({
  event: "world-kernel-listening",
  host: runtime.address.host,
  port: runtime.address.port,
  databasePath: runtime.databasePath,
  causalParticipationEnabled: true,
  structuredObligationAuthorityEnabled: runtime.structuredObligationAuthorityEnabled,
  structuredObligationDischargeEnabled: runtime.structuredObligationDischargeEnabled,
  causalParticipationProfileVersion: 4,
  freezeProfileVersion: 2,
  guardianProvider: guardianModelAdapter.provider,
  guardianModelId: guardianModelAdapter.modelId,
})}\n`);

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  try {
    await runtime.close();
    process.stdout.write(`${JSON.stringify({ event: "world-kernel-stopped", signal })}\n`);
    process.exitCode = 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ event: "world-kernel-stop-failed", signal, message: error.message })}\n`);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));