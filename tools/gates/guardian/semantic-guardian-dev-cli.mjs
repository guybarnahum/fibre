import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createModelRuntime } from "#services/world-kernel/src/model-runtime/model-runtime.mjs";
import { SEMANTIC_GUARDIAN_V4_DEVELOPMENT_SET as SET } from "../experiments/semantic-guardian-v4/development-set.mjs";
import {
  blockedV4DevelopmentReport,
  buildSemanticGuardianV4DevelopmentCases,
  runSemanticGuardianV4DevelopmentProof,
} from "./semantic-guardian-v4-dev-proof.mjs";

const REASONING_BLOCK = "dignity_guardian";
const EXPECTED_CASES = buildSemanticGuardianV4DevelopmentCases().length;

function usage() {
  return `Fibre Semantic Guardian development runner\n\nUsage:\n  npm run guardian:dev\n  npm run guardian:dev -- --model gpt-5.6-luna\n  npm run guardian:dev -- --summary --json\n\nOptions:\n  --model <id> Override the YAML-selected model for this non-evidentiary run.\n  --summary    Print a deterministic human-readable development summary.\n  --json       Print the complete non-evidentiary development report.\n  --fail-fast  Stop after the first provider, protocol, cognition, or behavioral failure.\n  --help       Show this help.\n\nProvider is selected by config/models.yaml for the dignity_guardian reasoning block.\n--model overrides only the model id; credentials still come only from environment variables / local .env.\nCLI overrides take precedence over YAML selection for this run only and never modify config/models.yaml.\nThis runner is repeatable, non-evidentiary, and never permits Fibre score movement.\n`;
}

function readModelArg(argv, index) {
  const arg = argv[index];
  if (arg.startsWith("--model=")) {
    const value = arg.slice("--model=".length).trim();
    if (value === "") throw new Error("--model requires a non-empty model id");
    return { value, consumed: 0 };
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--") || value.trim() === "") {
    throw new Error("--model requires a non-empty model id");
  }
  return { value: value.trim(), consumed: 1 };
}

export function parseDevelopmentArgs(argv) {
  const options = { summary: false, json: false, help: false, failFast: false, model: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") options.summary = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--fail-fast") options.failFast = true;
    else if (arg === "--model" || arg.startsWith("--model=")) {
      const parsed = readModelArg(argv, index);
      options.model = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--help" || arg === "-h") options.help = true;
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
    providerFailures: journal.filter((entry) => entry.type === "operational_failure").length,
    lastEvent: journal.at(-1) ?? null,
  };
}

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export function formatDevelopmentInterrupt(snapshot) {
  const responseText = snapshot.responses === 0
    ? "No model responses were received before interruption."
    : `${snapshot.responses} model response${snapshot.responses === 1 ? " was" : "s were"} received before interruption.`;
  const providerText = snapshot.providerFailures === 0
    ? ""
    : ` ${snapshot.providerFailures} provider attempt failure${snapshot.providerFailures === 1 ? " was" : "s were"} recorded before interruption.`;
  return [
    "Interrupted by Ctrl-C.",
    "NON-EVIDENTIARY · development run stopped",
    `${responseText}${providerText}`,
    "Temporary development state cleaned up. Nothing sealed; Fibre score unchanged.",
    "",
  ].join("\n");
}

export function formatDevelopmentProgress(snapshot, selection, elapsedMs) {
  const elapsed = elapsedLabel(elapsedMs);
  const event = snapshot.lastEvent;
  const currentCase = Math.min(snapshot.responses + 1, EXPECTED_CASES);
  if (event?.type === "model_attempt") {
    return `Guardian case ${currentCase}/${EXPECTED_CASES} · attempt ${event.attempt}/${event.maximumAttempts} · waiting for ${selection.provider} · ${elapsed}`;
  }
  if (event?.type === "operational_failure" && event.retrying) {
    return `Guardian case ${currentCase}/${EXPECTED_CASES} · attempt ${event.attempt}/${event.maximumAttempts} failed ${event.failure?.code ?? "provider error"} · retrying · ${elapsed}`;
  }
  const failureText = snapshot.providerFailures === 0
    ? ""
    : ` · ${snapshot.providerFailures} provider attempt failure${snapshot.providerFailures === 1 ? "" : "s"}`;
  return `Guardian ${snapshot.responses}/${EXPECTED_CASES} model responses${failureText} · ${elapsed}`;
}

function startProgress(journalPath, selection) {
  if (!process.stderr.isTTY) return { stop() {} };
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startedAt = Date.now();
  let frame = 0;
  let stopped = false;

  process.stderr.write(
    `\nFibre · Semantic Guardian v4 development\n` +
    `NON-EVIDENTIARY · ${SET.id} · ${selection.provider}/${selection.modelId} · ${EXPECTED_CASES} cases\n\n`,
  );

  const render = () => {
    const snapshot = progressSnapshot(journalPath);
    process.stderr.write(
      `\r\u001b[2K${frames[frame % frames.length]} ${formatDevelopmentProgress(snapshot, selection, Date.now() - startedAt)}`,
    );
    frame += 1;
  };

  render();
  const timer = setInterval(render, 250);
  timer.unref();
  return {
    stop(status) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      const snapshot = progressSnapshot(journalPath);
      const symbol = status === "passed" ? "✓" : status === "blocked" ? "○" : status === "interrupted" ? "!" : "×";
      const statusLabel = status === "interrupted" ? "INTERRUPTED" : status;
      process.stderr.write(
        `\r\u001b[2K${symbol} Development run · ${snapshot.responses}/${EXPECTED_CASES} model responses · ${statusLabel} · ${elapsedLabel(Date.now() - startedAt)}\n\n`,
      );
    },
  };
}

export function buildDevelopmentBundle(report, journal, developmentRunId = "development") {
  return {
    version: 4,
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

function compactText(value, maxLength = 140) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function decisionBasisLines(output) {
  const basis = output?.decisionBasis;
  if (basis === null || typeof basis !== "object") return [];
  const lines = [
    `  model=${basis.modelDecision ?? "unknown"}`,
    `  why: ${compactText(basis.rationale, 180)}`,
  ];
  if (Array.isArray(basis.normalizations) && basis.normalizations.length > 0) {
    lines.push(`  normalized: ${basis.normalizations.join(", ")}`);
  }
  const factors = Array.isArray(basis.factors)
    ? basis.factors.filter((factor) => factor.effect !== "neutral").slice(0, 4)
    : [];
  for (const factor of factors) {
    const evidence = Array.isArray(factor.evidence) ? factor.evidence.slice(0, 2) : [];
    if (evidence.length === 0) {
      lines.push(`  ${factor.factor}=${factor.effect}`);
      continue;
    }
    const evidenceText = evidence
      .map((item) => `${item.ref} “${compactText(item.text, 95)}”`)
      .join("; ");
    lines.push(`  ${factor.factor}=${factor.effect} ← ${evidenceText}`);
  }
  return lines;
}

export function formatDevelopmentSummary(bundle) {
  const report = bundle.report;
  const passedCases = report.cases.filter((item) => item.status === "passed").length;
  const lines = [
    "Fibre · Semantic Guardian v4 development summary",
    "NON-EVIDENTIARY · repeatable",
    `Development set: ${report.developmentSetId}`,
    `Model: ${report.modelProvider ?? "unknown"}/${report.modelId}`,
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
    lines.push("", "Case outcomes and decision basis", "────────────────────────────────────────");
    for (const item of interesting) {
      const marker = item.status === "passed" ? "✓" : "✗";
      lines.push(
        `${marker} ${item.caseId}`,
        `  action=${item.output.proposedAction} · fit=${item.output.participationFit}`,
        ...decisionBasisLines(item.output),
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
  const journalPath = join(directory, "model-events.ndjson");
  const developmentRunId = `semantic_guardian_v4_dev_${Date.now()}_${process.pid}`;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    rmSync(directory, { recursive: true, force: true });
  };
  const observer = (event) => appendFileSync(journalPath, `${JSON.stringify(event)}\n`, "utf8");

  const modelOverrides = options.model === null || options.model === undefined
    ? null
    : { [REASONING_BLOCK]: options.model };
  const runtime = options.modelRuntime ?? createModelRuntime({ environment, observer, modelOverrides });
  const selection = runtime.selectionForBlock(REASONING_BLOCK);
  const progress = startProgress(journalPath, selection);
  let interruptHandled = false;
  const onSigint = () => {
    if (interruptHandled) return;
    interruptHandled = true;
    const snapshot = progressSnapshot(journalPath);
    progress.stop("interrupted");
    cleanup();
    process.stderr.write(formatDevelopmentInterrupt(snapshot));
    process.exit(130);
  };
  process.once("SIGINT", onSigint);

  try {
    let report;
    try {
      const modelAdapter = options.modelAdapter ?? runtime.forBlock(REASONING_BLOCK);
      report = await runSemanticGuardianV4DevelopmentProof(environment, {
        failFast: options.failFast ?? false,
        modelAdapter,
        modelId: modelAdapter.modelId,
        reasoningEffort: modelAdapter.configuration?.reasoningEffort ?? "provider_default",
        cases: options.cases ?? null,
      });
    } catch (error) {
      if (error?.code !== "MODEL_UNAVAILABLE") throw error;
      report = blockedV4DevelopmentReport(error.message, {
        modelId: selection.modelId,
        reasoningEffort: "provider_default",
      });
    }
    report = { ...report, modelProvider: selection.provider };
    const bundle = buildDevelopmentBundle(report, readJournal(journalPath), developmentRunId);
    progress.stop(report.status);
    return bundle;
  } finally {
    process.removeListener("SIGINT", onSigint);
    cleanup();
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
