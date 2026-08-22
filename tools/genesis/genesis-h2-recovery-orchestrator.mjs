#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { verifyH2RecoveryPreflight } from "./genesis-h2-recovery.mjs";
import {
  H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH,
  H2_RECOVERY_ORCHESTRATOR_VERSION,
  runAuthorizedH2Recovery as runReviewedH2Recovery,
  verifyH2RecoveryOrchestratorPreflight as verifyReviewedH2RecoveryOrchestratorPreflight,
} from "./genesis-h2-recovery-orchestrator-core.mjs";

// The reviewed recovery implementation is preserved byte-for-byte in the core
// module. This public entry point only reconciles the later terminal recovery
// outcome with inspection and execution closure.
export * from "./genesis-h2-recovery-orchestrator-core.mjs";

export const H2_RECOVERY_TERMINAL_ORCHESTRATOR_STATUS =
  "HOLD_RECOVERY_ORCHESTRATOR_EXECUTION_CLOSED";

const TERMINAL_RECOVERY_STATUS = "HOLD_RECOVERY_RECORD_RETRY_EXHAUSTED";

function terminalPreflight(recovery) {
  const outcome = recovery.terminalOutcome;
  return Object.freeze({
    status: H2_RECOVERY_TERMINAL_ORCHESTRATOR_STATUS,
    orchestratorVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    recoveryVersion: recovery.recoveryVersion,
    providerCallsAuthorized: false,
    furtherExecutionAuthorized: false,
    executionAuthorizationPath: H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH,
    consumedProviderOperation: outcome.execution.firstAndOnlyNewProviderOperationObserved,
    terminalFailure: Object.freeze({
      outerGate: outcome.terminalMechanicalFailure.outerGate,
      causeGate: outcome.terminalMechanicalFailure.causeGate,
      budgetState: Object.freeze({ ...outcome.terminalMechanicalFailure.budgetState }),
      budgetExhaustion: Object.freeze({ ...outcome.terminalMechanicalFailure.budgetExhaustion }),
    }),
    outputRoot: recovery.outputRoot,
    outputRootExists: recovery.outputRootExists,
    scientificStanding: Object.freeze({ ...recovery.scientificStanding }),
    nextAction: outcome.nextMilestoneAction.action,
    requiredGate: outcome.nextMilestoneAction.requiredGate,
  });
}

export function verifyH2RecoveryOrchestratorPreflight() {
  const recovery = verifyH2RecoveryPreflight();
  if (recovery.status === TERMINAL_RECOVERY_STATUS) return terminalPreflight(recovery);
  return verifyReviewedH2RecoveryOrchestratorPreflight();
}

export async function runAuthorizedH2Recovery() {
  const recovery = verifyH2RecoveryPreflight();
  if (recovery.status === TERMINAL_RECOVERY_STATUS) {
    throw new Error(
      "H-v2 recovery execution is closed by terminal recovery outcome; no further provider call is authorized",
    );
  }
  return runReviewedH2Recovery();
}

function printPreflight(result) {
  if (result.status === H2_RECOVERY_TERMINAL_ORCHESTRATOR_STATUS) {
    process.stdout.write("H-V2 RECOVERY ORCHESTRATOR: TERMINAL HOLD — EXECUTION CLOSED\n\n");
    process.stdout.write(`Version: ${result.orchestratorVersion}\n`);
    process.stdout.write(`Consumed provider operation: ${result.consumedProviderOperation}\n`);
    process.stdout.write(`Terminal gate: ${result.terminalFailure.outerGate} <- ${result.terminalFailure.causeGate}\n`);
    process.stdout.write(
      `Budget at stop: versions ${result.terminalFailure.budgetState.generatedVersions}/5; ` +
      `form ${result.terminalFailure.budgetState.formRepairs}/2; ` +
      `record ${result.terminalFailure.budgetState.recordRetries}/2\n`,
    );
    process.stdout.write(
      `Output root: ${result.outputRoot} [${result.outputRootExists ? "present locally; preserve" : "absent; terminal outcome remains authoritative"}]\n`,
    );
    process.stdout.write("Scientific standing: recovery/resilience only.\n");
    process.stdout.write(`Next #39 action: fresh replacement material + ${result.requiredGate}.\n`);
    process.stdout.write("\nPreflight made zero provider calls. No further recovery provider call is authorized.\n");
    return;
  }

  const authorized = result.providerCallsAuthorized === true;
  process.stdout.write(authorized
    ? "H-V2 RECOVERY ORCHESTRATOR: REVIEW AUTHORIZED — PREFLIGHT ZERO CALL\n\n"
    : "H-V2 RECOVERY ORCHESTRATOR: IMPLEMENTED — EXECUTION STILL BLOCKED\n\n");
  process.stdout.write(`Version: ${result.orchestratorVersion}\n`);
  process.stdout.write(`First provider operation: ${result.firstProviderOperation.clientRequestId}\n`);
  process.stdout.write(`Stages: ${result.stageCount}\n`);
  process.stdout.write(`Output root: ${result.outputRoot}\n`);
  process.stdout.write(`Execution authorization: ${result.executionAuthorizationPath}${authorized ? " [present and blob-bound]" : " [absent — execution blocked]"}\n`);
  process.stdout.write("Scientific standing: recovery/resilience only.\n");
  process.stdout.write(authorized
    ? "\nPreflight made zero provider calls. Provider execution is authorized only through the reviewed --execute path.\n"
    : "\nNo provider call was made or authorized.\n");
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--preflight")) {
    printPreflight(verifyH2RecoveryOrchestratorPreflight());
    return;
  }
  if (argv.length === 1 && argv[0] === "--execute") {
    const recovery = verifyH2RecoveryPreflight();
    if (recovery.status === TERMINAL_RECOVERY_STATUS) {
      process.stderr.write(
        "H-V2 RECOVERY ORCHESTRATOR: TERMINAL HOLD — EXECUTION CLOSED\n" +
        "No further recovery provider call is authorized.\n",
      );
      process.exitCode = 1;
      return;
    }
    await runReviewedH2Recovery();
    return;
  }
  throw new Error("usage: genesis-h2-recovery-orchestrator.mjs [--preflight|--execute]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
