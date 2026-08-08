import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { SEMANTIC_GUARDIAN_V4_DEVELOPMENT_SET as SET } from "../experiments/semantic-guardian-v4/development-set.mjs";
import {
  buildSemanticGuardianV4DevelopmentCases,
  runSemanticGuardianV4DevelopmentProof,
} from "./semantic-guardian-v4-dev-proof.mjs";

const EXPECTED_CASES = buildSemanticGuardianV4DevelopmentCases().length;

function usage() {
  return `Fibre Semantic Guardian development runner\n\nUsage:\n  npm run guardian:dev\n  npm run guardian:dev -- --summary\n  npm run guardian:dev -- --model <model-id>\n  npm run guardian:dev -- --model <model-id> --reasoning <none|low|medium|high>\n  npm run guardian:dev -- --summary --json\n\nOptions:\n  --summary       Print a deterministic human-readable development summary.\n  --json          Print the complete non-evidentiary development report.\n  --model         Override the development model only; never changes a frozen gate.\n  --reasoning     Override development reasoning effort: none, low, medium, or high.\n  --fail-fast     Stop after the first provider, protocol, cognition, or behavioral failure.\n  --help          Show this help.\n\nThis runner is repeatable and non-evidentiary. It exercises Guardian v4's\ndevelopment contract and a disjoint development matrix. It never seals an\nacceptance cycle and never permits Fibre score movement.\n`;
}

export function parseDevelopmentArgs(argv) {
  const options = {
    summary: false,
    json: false,
    help: false,
    modelId: SET.defaultModelId,
    reasoningEffort: SET.defaultReasoningEffort,
    failFast: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") options.summary = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--fail-fast") options.failFast = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--model") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--model requires a model ID");
      options.modelId = value;
      index += 1;
    } else if (arg === "--reasoning") {
      const value = argv[index + 1];
      if (!["none", "low", "medium", "high"].includes(value)) {
        throw new Error("--reasoning must be one of none, low, medium, high");
      }
      options.reasoningEffort = value;
      index += 1;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
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
    providerFailures: journal.filter((entry) => entry.type === "operational_failure").length,
  };
}

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function startProgress(journalPath, options) {
  if (!process.stderr.isTTY) return { stop() {} };
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startedAt = Date.now();
  let frame = 0;

  process.stderr.write(
    `\nFibre · Semantic Guardian v4 development\n` +
    `NON-EVIDENTIARY · ${SET.id} · ${options.modelId} · reasoning=${options.reasoningEffort} · ${EXPECTED_CASES} cases\n\n`,
  );

  const render = () => {
    const snapshot = progressSnapshot(journalPath);
    const failureText = snapshot.providerFailures === 0
      ? ""
      : ` · ${snapshot.providerFailures} provider attempt failure${snapshot.providerFailures === 1 ? "" : "s"}`;
    process.stderr.write(
      `\r\u001b[2K${frames[frame % frames.length]} Guardian ${snapshot.responses}/${EXPECTED_CASES} model responses` +
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
      const symbol = status === "passed" ? "✓" : status === "blocked" ? "○" : "×";
      process.stderr.write(
        `\r\u001b[2K${symbol} Development run · ${snapshot.responses}/${EXPECTED_CASES} model responses · ${status} · ${elapsedLabel(Date.now() - startedAt)}\n\n`,
      );
    },
  };
}

export function buildDevelopmentBundle(report, journal, developmentRunId = "development") {
  return {
    version: 2,
    evidenceClass: "development",
    developmentRunId,
    developmentSetId: report?.developmentSetId ?? SET.id,
    cycleSealed: false,
    standingDifferentialGatePassed: false,
    scoreMovementPermitted: false,
    report,
    judgments: journal.filter((entry) => entry.type === "model_response"),
    operationalAttempts: journal.filter((entry) => entry.type === "operational_failure"),
    journal,
  };
}

function failureLines(title, failures) {
  if (!Array.isArray(failures) || failures.length === 0) return [];
  return [
    "",
    title,
    "────────────────────────────────────────",
    ...failures.flatMap((failure) => [
      `✗ ${failure.caseId ?? "unknown"}${failure.code ? ` · ${failure.code}` : ""}`,
      `  ${failure.message}`,
    ]),
  ];
}

export function formatDevelopmentSummary(bundle) {
  const report = bundle.report;
  const passedCases = report.cases.filter((item) => item.status === "passed").length;
  const lines = [
    "Fibre · Semantic Guardian v4 development summary",
    "NON-EVIDENTIARY · repeatable",
    `Development set: ${report.developmentSetId}`,
    `Model: ${report.modelId} · reasoning=${report.reasoningEffort}`,
    "",
    `RESULT: ${report.status.toUpperCase()}`,
    "Standing gate: NOT EVALUATED",
    "Score movement: NEVER",
    "",
    "Run",
    "────────────────────────────────────────",
    `Cases passed: ${passedCases}/${report.casesPlanned}`,
    `Cases attempted: ${report.casesAttempted}/${report.casesPlanned}`,
    `Provider failures: ${report.providerFailures.length}`,
    `Protocol validation failures: ${report.protocolValidationFailures.length}`,
    `Cognition failures: ${report.cognitionFailures.length}`,
    `Behavioral failures: ${report.behavioralGateFailures.length}`,
  ];

  lines.push(...failureLines("Provider failures", report.providerFailures));
  lines.push(...failureLines("Protocol validation failures", report.protocolValidationFailures));
  lines.push(...failureLines("Cognition failures", report.cognitionFailures));
  lines.push(...failureLines("Behavioral findings", report.behavioralGateFailures));

  const interesting = report.cases.filter((item) => item.output !== undefined);
  if (interesting.length > 0) {
    lines.push("", "Case outcomes", "────────────────────────────────────────");
    for (const item of interesting) {
      const marker = item.status === "passed" ? "✓" : "✗";
      lines.push(
        `${marker} ${item.caseId}`,
        `  action=${item.output.proposedAction} · fit=${item.output.participationFit}`,
      );
    }
  }

  lines.push(
    "",
    "Disposition",
    "────────────────────────────────────────",
    report.status === "passed"
      ? "The v4 development matrix passed. This is development evidence only; freeze the contract and author a new held-out gate before claiming standing credit."
      : "Use these failures to improve Guardian v4. Do not move the Fibre score and do not reinterpret this development run as a standing gate.",
  );
  return `${lines.join("\n")}\n`;
}

export async function runDevelopmentGuardian(environment = process.env, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-guardian-v4-dev-"));
  const journalPath = join(directory, "judgments.ndjson");
  const developmentRunId = `semantic_guardian_v4_dev_${Date.now()}_${process.pid}`;
  const previousJournal = process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
  const previousCycle = process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID;
  process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL = journalPath;
  process.env.FIBRE_GUARDIAN_EVIDENCE_CYCLE_ID = developmentRunId;

  const progress = startProgress(journalPath, options);
  try {
    const report = await runSemanticGuardianV4DevelopmentProof(environment, options);
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
  const bundle = await runDevelopmentGuardian(process.env, options);
  if (options.summary) process.stdout.write(formatDevelopmentSummary(bundle));
  if (options.json) process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  if (bundle.report?.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Fibre Semantic Guardian v4 development runner failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
