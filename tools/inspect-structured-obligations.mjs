import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openStructuredObligationInspectionStore } from "../services/world-kernel/src/structured-obligation-inspection-store.mjs";

export function inspectStructuredObligations(databasePath, { threadId = null } = {}) {
  const absolutePath = resolve(databasePath);
  if (!existsSync(absolutePath)) throw new Error(`database does not exist: ${absolutePath}`);
  if (!statSync(absolutePath).isFile()) throw new Error(`database path is not a file: ${absolutePath}`);
  const store = openStructuredObligationInspectionStore(absolutePath);
  try {
    const threadIds = threadId === null ? store.listThreadIds() : [threadId];
    const threads = threadIds.map((id) => ({
      integrity: store.verifyThread(id),
      obligations: store.listObligations(id),
    }));
    return {
      databasePath: absolutePath,
      sourceReadOnly: store.queryOnly(),
      ok: threads.every((item) => item.integrity.ok),
      threads,
    };
  } finally {
    store.close();
  }
}

export function formatStructuredObligationInspection(report) {
  const lines = [
    `Structured Obligations: ${report.ok ? "PASS" : "FAIL"}`,
    `Path: ${report.databasePath}`,
    `Source mode: ${report.sourceReadOnly ? "read-only" : "unknown"}`,
  ];
  for (const item of report.threads) {
    const integrity = item.integrity;
    lines.push(
      `Thread ${integrity.threadId}: obligations=${integrity.obligations}, applicability=${integrity.applicabilityDecisions}, discharges=${integrity.discharges}`,
      `  revisionChains=${integrity.revisionChainsVerified ? "verified" : "failed"}, applicabilityBindings=${integrity.applicabilityBindingsVerified ? "verified" : "failed"}, dischargeChains=${integrity.dischargeCausalChainsVerified ? "verified" : "failed"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function parseArguments(args) {
  let json = false;
  let threadId = null;
  let databasePath = null;
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--json") json = true;
    else if (value === "--thread") {
      threadId = args[index + 1] ?? null;
      if (threadId === null) throw new Error("--thread requires a Thread ID");
      index += 1;
    } else if (value === "--help" || value === "-h") {
      return { help: true, json, threadId, databasePath };
    } else if (value.startsWith("-")) throw new Error(`unknown option: ${value}`);
    else if (databasePath === null) databasePath = value;
    else throw new Error("only one database path may be supplied");
  }
  return { help: false, json, threadId, databasePath };
}

function usage() {
  return [
    "Usage: node tools/inspect-structured-obligations.mjs <database.sqlite> [--thread <thread-id>] [--json]",
    "",
    "Read-only inspection of Structured Obligation revision, applicability, and discharge chains.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help || options.databasePath === null) {
    process.stdout.write(usage());
    process.exitCode = options.help ? 0 : 2;
    return;
  }
  const report = inspectStructuredObligations(options.databasePath, { threadId: options.threadId });
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : formatStructuredObligationInspection(report));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
