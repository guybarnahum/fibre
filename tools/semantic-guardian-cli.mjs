import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT,
} from "./run-semantic-guardian-v3-proof.mjs";
import {
  formatSemanticGuardianSummary,
  summarizeSemanticGuardianEvidence,
} from "./semantic-guardian-summary.mjs";

function usage() {
  return `Fibre Semantic Guardian

Usage:
  npm run demo:semantic-guardian
  npm run demo:semantic-guardian -- --summary
  npm run demo:semantic-guardian -- --summary-only
  npm run demo:semantic-guardian -- --summary-only --evidence <path>
  npm run demo:semantic-guardian -- --json
  npm run demo:semantic-guardian -- --summary --json

Options:
  --summary       Run the sealed cycle and print a deterministic human summary.
  --summary-only  Read an existing sealed evidence artifact; never invoke a model.
  --evidence      Evidence artifact path for --summary-only.
  --json          Print the machine-readable final report. Default when no output mode is supplied.
  --help          Show this help.
`;
}

function parseArgs(argv) {
  const options = {
    summary: false,
    summaryOnly: false,
    json: false,
    evidencePath: SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT,
    explicitOutputMode: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = true;
      options.explicitOutputMode = true;
    } else if (arg === "--summary-only") {
      options.summaryOnly = true;
      options.summary = true;
      options.explicitOutputMode = true;
    } else if (arg === "--json") {
      options.json = true;
      options.explicitOutputMode = true;
    } else if (arg === "--evidence") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--evidence requires a path");
      }
      options.evidencePath = resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }

  if (!options.explicitOutputMode) options.json = true;
  if (options.summaryOnly && options.json) {
    throw new Error("--summary-only cannot be combined with --json");
  }
  if (!options.summaryOnly && options.evidencePath !== SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT) {
    throw new Error("--evidence is only valid with --summary-only");
  }
  return options;
}

function readEvidence(path) {
  if (!existsSync(path)) {
    const error = new Error(`semantic Guardian evidence artifact not found: ${path}`);
    error.code = "EVIDENCE_ARTIFACT_NOT_FOUND";
    throw error;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function printSummary(bundle) {
  process.stdout.write(formatSemanticGuardianSummary(
    summarizeSemanticGuardianEvidence(bundle),
  ));
}

function runUnderlyingProof() {
  const runner = resolve("tools/run-semantic-guardian-v3-proof.mjs");
  return spawnSync(
    process.execPath,
    ["--disable-warning=ExperimentalWarning", runner],
    {
      encoding: "utf8",
      env: process.env,
      stdio: ["inherit", "pipe", "inherit"],
    },
  );
}

function evidenceBundleFromRun(result) {
  if (existsSync(SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT)) {
    return readEvidence(SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT);
  }
  const text = String(result.stdout ?? "").trim();
  if (text === "") return null;
  const report = JSON.parse(text);
  return {
    version: 1,
    acceptanceSetId: report.acceptanceSetId ?? "unknown",
    cycleSealed: false,
    report,
    judgments: [],
    operationalAttempts: [],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  if (options.summaryOnly) {
    printSummary(readEvidence(options.evidencePath));
    return;
  }

  const result = runUnderlyingProof();

  if (options.summary) {
    const bundle = evidenceBundleFromRun(result);
    if (bundle === null) {
      throw new Error("semantic Guardian run produced neither a report nor an evidence artifact");
    }
    printSummary(bundle);
  }

  if (options.json) {
    process.stdout.write(result.stdout ?? "");
  }

  if (result.error) throw result.error;
  if (typeof result.status === "number") process.exitCode = result.status;
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `Fibre Semantic Guardian CLI error: ${error?.message ?? String(error)}\n`,
  );
  process.exitCode = 2;
}
