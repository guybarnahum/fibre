import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openIdentityInspectionStore } from "#services/world-kernel/src/identity-store.mjs";

export function inspectThreadIdentity(databasePath, { threadId = null } = {}) {
  const absolutePath = resolve(databasePath);
  if (!existsSync(absolutePath)) throw new Error(`database does not exist: ${absolutePath}`);
  if (!statSync(absolutePath).isFile()) throw new Error(`database path is not a file: ${absolutePath}`);
  const store = openIdentityInspectionStore(absolutePath);
  try {
    const threadIds = threadId === null ? store.listThreadIds() : [threadId];
    const threads = threadIds.map((id) => ({
      integrity: store.verifyThreadIdentityIntegrity(id),
      passport: store.getPassport(id),
      identity: store.getCurrentIdentityView(id),
      memoryVisualCompanions: store.listMemoryVisualCompanions(id),
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

function registryLabel(integrity) {
  if (integrity.registryVersion !== null) return `v${integrity.registryVersion}`;
  return integrity.admittedRegistryVersions.map((version) => `v${version}`).join("+");
}

export function formatThreadIdentityInspection(report) {
  const lines = [
    `Thread Identity: ${report.ok ? "PASS" : "FAIL"}`,
    `Path: ${report.databasePath}`,
    `Source mode: ${report.sourceReadOnly ? "read-only" : "unknown"}`,
  ];
  for (const item of report.threads) {
    const integrity = item.integrity;
    lines.push(
      `Thread ${integrity.threadId}: claims=${integrity.claimCount}, assertions=${integrity.assertionCount}, memoryVisuals=${integrity.memoryVisualCompanionCount}`,
      `  acceptedCausal=${integrity.acceptedCausalAssertions}, endogenous=${integrity.endogenousEvidenceAssertions}, registry=${registryLabel(integrity)}`,
      `  memoryPhotos=${integrity.memoryPhotoRequirementSatisfied ? "SATISFIED" : "OUTSTANDING"}, missing=${integrity.memoriesMissingPhotoCount}`,
      `  passport=${item.passport.canonicalName ?? "(unnamed)"} (${integrity.passportDigest})`,
    );
    for (const visual of integrity.memoryVisualCompanions) {
      lines.push(
        `  memory ${visual.memoryRef}: ${visual.status}, ${visual.truthStatus}, photo=${visual.photoRequirementSatisfied ? "satisfied" : "outstanding"}, companion=${visual.companionId}@${visual.revision}`,
      );
    }
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
    "Usage: node tools/inspect-thread-identity.mjs <database.sqlite> [--thread <thread-id>] [--json]",
    "",
    "Read-only inspection of Thread Passport, identity-provenance histories, memory visual companions, and outstanding photo obligations.",
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
  const report = inspectThreadIdentity(options.databasePath, { threadId: options.threadId });
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : formatThreadIdentityInspection(report));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
