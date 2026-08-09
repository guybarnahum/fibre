import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  formatHistoryDevelopmentSummary,
  parseHistoryDevelopmentArgs,
  runHistoryDevelopment,
} from "./history-bends-judgment-dev.mjs";
import { createProviderProgressHeartbeat } from "./provider-progress.mjs";

function progressPrinter(phase, message) {
  process.stderr.write(`history:dev · ${phase} · ${message}\n`);
}

export function historyDevelopmentUsage() {
  return `Fibre History bends judgment development\n\nUsage:\n  npm run history:dev\n  npm run history:dev -- --model gpt-5.6-luna\n  npm run history:dev -- --summary --json\n\nOptions:\n  --model <id> Override the YAML-selected dignity_guardian model for this non-evidentiary run.\n  --summary    Print the human-readable Development summary.\n  --json       Print the complete Development report.\n  --help       Show this help.\n\nEpisode A uses a deterministic development-only setup judgment so this command isolates history causality rather than re-testing #33.\nThe later with/without-history pair uses unchanged Semantic Guardian v4 and the configured real provider.\nProvider waits emit a shared elapsed-time heartbeat and never alter model or experiment semantics.\nThis command is repeatable, never seals a standing cycle, and never permits Fibre score movement.\n`;
}

export async function runHistoryDevelopmentCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseHistoryDevelopmentArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${historyDevelopmentUsage()}`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(historyDevelopmentUsage());
    return 0;
  }

  const heartbeat = createProviderProgressHeartbeat({ progress: progressPrinter });
  try {
    const report = await runHistoryDevelopment({
      model: options.model,
      progress: heartbeat.report,
    });
    heartbeat.finish();
    if (options.summary) process.stdout.write(formatHistoryDevelopmentSummary(report));
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.passed ? 0 : 1;
  } catch (error) {
    heartbeat.finish("Provider call ended");
    process.stderr.write(
      `history:dev failed before a complete Development result: ${error?.message ?? String(error)}\n`,
    );
    return 1;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) process.exitCode = await runHistoryDevelopmentCli();
