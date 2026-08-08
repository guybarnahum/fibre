import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { SEMANTIC_GUARDIAN_ACCEPTANCE_SET as SET } from "../experiments/semantic-guardian-v3/acceptance-set.mjs";
import { runSemanticGuardianV3Proof } from "./semantic-guardian-v3-proof.mjs";
import { summarizeSemanticGuardianEvidence } from "./semantic-guardian-summary.mjs";

const EXPECTED_LIVE_JUDGMENTS = SET.repeatTrials * 17 + 2;

function usage() {
  return `Fibre Semantic Guardian development runner\n\nUsage:\n  npm run guardian:dev\n  npm run guardian:dev -- --summary\n  npm run guardian:dev -- --json\n  npm run guardian:dev -- --summary --json\n\nOptions:\n  --summary  Print a deterministic human-readable diagnostic summary.\n  --json     Print the complete non-evidentiary development bundle.\n  --help     Show this help.\n\nThis runner is repeatable and non-evidentiary. It never seals an acceptance cycle\nand never permits Fibre score movement. It exercises the same Guardian proof core\nused by guardian:gate.\n`;
}

export function parseDevelopmentArgs(argv) {
  const options = { summary: false, json: false, help: false };
  for (const arg of argv) {
    if (arg === "--summary") options.summary = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!options.summary && !options.json && !options.help) options.summary = true;
  return options;
}

function readJournal(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").trim();
  if (text === "") return [];
  return text.split("\n").flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function progressSnapshot(path) {
  const journal = readJournal(path);
  return {
    responses: journal.filter((entry) => entry.type === "model_response").length,
    failures: journal.filter((entry) => entry.type === "operational_failure").length,
  };
}

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function startProgress(journalPath) {
  if (!process.stderr.isTTY) return { stop() {} };
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startedAt = Date.now();
  let frame = 0;

  process.stderr.write(
    `\nFibre · Semantic Guardian development run\n` +
    `NON-EVIDENTIARY · repeatable · ${SET.frozenModelId} · up to ${EXPECTED_LIVE_JUDGMENTS} judgments\n\n`,
  );

  const render = () => {
    const snapshot = progressSnapshot(journalPath);
    const failureText = snapshot.failures === 0
      ? ""
      : ` · ${snapshot.failures} provider attempt failure${snapshot.failures === 1 ? "" : "s"}`;
    process.stderr.write(
      `\r\u001b[2K${frames[frame % frames.length]} Guardian ${snapshot.responses}/${EXPECTED_LIVE_JUDGMENTS} model responses` +
      `${failureText} · ${elapsedLabel(Date.now() - startedAt)}`,
    );
    frame += 1;
  };

  render();
  const timer = setInterval(render, 250);
  timer.unref();
  return {
    stop(status) {
      clearInterval(timer);
      const snapshot = progressSnapshot(journalPath);
      process.stderr.write(
        `\r\u001b[2K✓ Development run complete · ${snapshot.responses} model responses · ${status} · ${elapsedLabel(Date.now() - startedAt)}\n\n`,
      );
    },
  };
}

export function buildDevelopmentBundle(report, journal, developmentRunId = "development") {
  return {
    version: 1,
    evidenceClass: "development",
    developmentRunId,
    acceptanceSetId: report?.acceptanceSetId ?? SET.id,
    cycleSealed: false,
    scoreMovementPermitted: false,
    report,
    judgments: journal.filter((entry) => entry.type === "model_response"),
    operationalAttempts: journal.filter((entry) => entry.type === "operational_failure"),
    journal,
  };
}

function diagnosticSymbol(severity) {
  if (severity === "fail") return "✗";
  if (severity === "positive") return "✓";
  return "△";
}

export function formatDevelopmentSummary(bundle) {
  const summary = summarizeSemanticGuardianEvidence(bundle);
  const lines = [
    "Fibre · Semantic Guardian development summary",
    "NON-EVIDENTIARY · repeatable",
    `Source matrix: ${summary.acceptanceSetId}`,
    "",
    `Run status: ${summary.status.toUpperCase()}`,
    "Standing gate: NOT EVALUATED",
    "Score movement: NEVER",
    "",
    "Diagnostics",
    "────────────────────────────────────────",
    `Retained model responses: ${summary.counts.retainedModelResponses}`,
    `Provider attempts/failures: ${summary.counts.operationalAttempts}`,
    `Reported failures: ${summary.counts.reportedErrors}`,
    `Invalid model outputs: ${summary.counts.invalidModelOutputs}`,
  ];

  if (summary.primaryFailure !== null) {
    lines.push(
      "",
      "Primary failure",
      "────────────────────────────────────────",
      `${summary.primaryFailure.code ?? "ERROR"}${summary.primaryFailure.occurrences > 1 ? ` · ${summary.primaryFailure.occurrences} occurrences` : ""}`,
      summary.primaryFailure.message,
    );
  }

  if (summary.diagnostics.length > 0) {
    lines.push("", "Findings", "────────────────────────────────────────");
    for (const diagnostic of summary.diagnostics) {
      lines.push(
        `${diagnosticSymbol(diagnostic.severity)} ${diagnostic.title}`,
        `  ${diagnostic.detail}`,
      );
    }
  }

  lines.push(
    "",
    "Disposition",
    "────────────────────────────────────────",
    "Use this run to develop the Guardian. It cannot earn standing-gate credit, move the Fibre score, or replace a frozen held-out acceptance cycle.",
  );
  return `${lines.join("\n")}\n`;
}

export async function runDevelopmentGuardian(environment = process.env) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-guardian-dev-"));
  const journalPath = join(directory, "judgments.ndjson");
  const developmentRunId = `semantic_guardian_dev_${Date.now()}_${process.pid}`;
  const previousJournal = process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
  const previousCycle = process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID;
  process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL = journalPath;
  process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID = developmentRunId;

  const progress = startProgress(journalPath);
  try {
    const report = await runSemanticGuardianV3Proof(environment);
    const bundle = buildDevelopmentBundle(report, readJournal(journalPath), developmentRunId);
    progress.stop(report.status);
    return bundle;
  } finally {
    if (previousJournal === undefined) delete process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
    else process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL = previousJournal;
    if (previousCycle === undefined) delete process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID;
    else process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID = previousCycle;
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseDevelopmentArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const bundle = await runDevelopmentGuardian();
  if (options.summary) process.stdout.write(formatDevelopmentSummary(bundle));
  if (options.json) process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  if (bundle.report?.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Fibre Semantic Guardian development runner failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
