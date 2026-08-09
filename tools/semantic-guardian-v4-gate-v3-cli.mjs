import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createModelRuntime } from "../services/world-kernel/src/model-runtime/model-runtime.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_3 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-3.mjs";
import { SEMANTIC_GUARDIAN_V4_STANDING_GATE_V3 as SET } from "../experiments/semantic-guardian-v4/standing-gate-v3.mjs";
import {
  assertSemanticGuardianV4FrozenBoundaryV3,
  blockedV4StandingReportV3,
  buildSemanticGuardianV4StandingCasesV3,
  runSemanticGuardianV4StandingProofV3,
} from "./semantic-guardian-v4-standing-proof-v3.mjs";

export const SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT = resolve(
  `artifacts/test-results/${SET.id}.evidence.json`,
);
export const SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL = resolve(
  `artifacts/test-results/${SET.id}.judgments.ndjson`,
);

const EXPECTED_CASES = buildSemanticGuardianV4StandingCasesV3().length;

function usage() {
  return `Fibre Semantic Guardian v4 standing gate v3\n\nUsage:\n  npm run guardian:gate\n  npm run guardian:gate -- --summary\n  npm run guardian:gate -- --json\n  npm run guardian:gate -- --summary --json\n  npm run guardian:gate -- --summary-only\n  npm run guardian:gate -- --summary-only --evidence <path>\n\nThis is a one-shot sealed standing gate for ${SET.id}. Missing credentials/configuration block without consuming the cycle. Once a real provider attempt starts, the cycle seals pass or fail.\n`;
}

function parseArgs(argv) {
  const options = {
    summary: false,
    json: false,
    summaryOnly: false,
    evidencePath: SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT,
    help: false,
  };
  let explicitOutput = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") { options.summary = true; explicitOutput = true; }
    else if (arg === "--json") { options.json = true; explicitOutput = true; }
    else if (arg === "--summary-only") { options.summaryOnly = true; options.summary = true; explicitOutput = true; }
    else if (arg === "--evidence") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--evidence requires a path");
      options.evidencePath = resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!explicitOutput && !options.help) options.summary = true;
  if (options.summaryOnly && options.json) throw new Error("--summary-only cannot be combined with --json");
  if (!options.summaryOnly && options.evidencePath !== SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT) {
    throw new Error("--evidence is only valid with --summary-only");
  }
  return options;
}

function readJournal(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").trim();
  if (text === "") return [];
  return text.split("\n").map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`standing-gate v3 journal line ${index + 1} is invalid JSON: ${error.message}`); }
  });
}

function readBundle(path) {
  if (!existsSync(path)) throw new Error(`standing-gate v3 evidence artifact not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function progressSnapshot(path) {
  const journal = readJournal(path);
  return {
    responses: journal.filter((entry) => entry.type === "model_response").length,
    failures: journal.filter((entry) => entry.type === "operational_failure").length,
  };
}

function startProgress(path) {
  if (!process.stderr.isTTY) return { stop() {} };
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const startedAt = Date.now();
  let frame = 0;
  process.stderr.write(
    `\nFibre · Semantic Guardian v4 standing gate v3\n` +
    `SEALED · ${SET.id} · ${FROZEN.provider}/${FROZEN.modelId} · ${EXPECTED_CASES} cases\n\n`,
  );
  const render = () => {
    const snapshot = progressSnapshot(path);
    const failureText = snapshot.failures === 0 ? "" : ` · ${snapshot.failures} provider failure${snapshot.failures === 1 ? "" : "s"}`;
    process.stderr.write(
      `\r\u001b[2K${frames[frame % frames.length]} Guardian ${snapshot.responses}/${EXPECTED_CASES} model responses${failureText} · ${elapsedLabel(Date.now() - startedAt)}`,
    );
    frame += 1;
  };
  render();
  const timer = setInterval(render, 250);
  timer.unref();
  return {
    stop(status, finalSnapshot = null) {
      clearInterval(timer);
      const snapshot = finalSnapshot ?? progressSnapshot(path);
      const symbol = status === "passed" ? "✓" : status === "blocked" ? "○" : "×";
      process.stderr.write(
        `\r\u001b[2K${symbol} Standing gate v3 · ${snapshot.responses}/${EXPECTED_CASES} model responses · ${status} · ${elapsedLabel(Date.now() - startedAt)}\n\n`,
      );
    },
  };
}

function runtimeBoundaryFailures(selection, adapter) {
  const failures = [];
  if (selection.provider !== FROZEN.provider) failures.push(`provider expected ${FROZEN.provider}, got ${selection.provider}`);
  if (selection.modelId !== FROZEN.modelId) failures.push(`model expected ${FROZEN.modelId}, got ${selection.modelId}`);
  const configuration = adapter.configuration ?? {};
  for (const [key, expected] of Object.entries(FROZEN.runtimeConfiguration)) {
    if (configuration[key] !== expected) failures.push(`runtime ${key} expected ${expected}, got ${configuration[key]}`);
  }
  return failures;
}

function writeBundle(path, bundle) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

function bundleFor(report, journal, fatalError = null) {
  return {
    version: 4,
    evidenceClass: "standing_gate",
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    cycleSealed: true,
    frozenBoundary: structuredClone(FROZEN),
    report,
    fatalError,
    judgments: journal.filter((entry) => entry.type === "model_response"),
    operationalAttempts: journal.filter((entry) => entry.type === "operational_failure"),
    journal,
  };
}

function compactText(value, maxLength = 150) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
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

export function formatStandingGateV3Summary(bundle) {
  const report = bundle.report;
  const passedCases = Array.isArray(report.cases)
    ? report.cases.filter((item) => item.status === "passed").length
    : 0;
  const lines = [
    "Fibre · Semantic Guardian v4 standing gate v3",
    `SEALED · ${bundle.acceptanceSetId}`,
    `Candidate: ${bundle.frozenCandidateId}`,
    `Model: ${report.modelProvider ?? FROZEN.provider}/${report.modelId ?? FROZEN.modelId}`,
    "",
    `RESULT: ${String(report.status).toUpperCase()}`,
    `Standing gate: ${report.standingDifferentialGatePassed ? "PASSED" : "NOT PASSED"}`,
    `Score movement: ${report.scoreMovementPermitted ? "PERMITTED" : "NO"}`,
    "",
    "Run",
    "────────────────────────────────────────",
    `Cases passed: ${passedCases}/${report.casesPlanned ?? EXPECTED_CASES}`,
    `Cases attempted: ${report.casesAttempted ?? 0}/${report.casesPlanned ?? EXPECTED_CASES}`,
    `Provider failures: ${report.providerFailures?.length ?? 0}`,
    `Protocol validation failures: ${report.protocolValidationFailures?.length ?? 0}`,
    `Cognition failures: ${report.cognitionFailures?.length ?? 0}`,
    `Behavioral failures: ${report.behavioralGateFailures?.length ?? 0}`,
    `Differential failures: ${report.differentialGateFailures?.length ?? 0}`,
  ];
  lines.push(...failureLines("Provider failures", report.providerFailures));
  lines.push(...failureLines("Protocol validation failures", report.protocolValidationFailures));
  lines.push(...failureLines("Cognition failures", report.cognitionFailures));
  lines.push(...failureLines("Behavioral findings", report.behavioralGateFailures));
  lines.push(...failureLines("Differential findings", report.differentialGateFailures));

  if (Array.isArray(report.cases) && report.cases.length > 0) {
    lines.push("", "Case outcomes", "────────────────────────────────────────");
    for (const item of report.cases) {
      if (item.output === undefined) continue;
      const marker = item.status === "passed" ? "✓" : "✗";
      lines.push(
        `${marker} ${item.caseId}`,
        `  action=${item.output.proposedAction} · fit=${item.output.participationFit}`,
        `  why: ${compactText(item.output.rationale, 190)}`,
      );
    }
  }

  lines.push(
    "",
    "Disposition",
    "────────────────────────────────────────",
    report.standingDifferentialGatePassed
      ? "Frozen candidate 3 passed its fresh held-out standing gate, including the direct semantic-state counterfactual. This sealed artifact may support Semantic Guardian standing credit."
      : "Frozen candidate 3 did not pass this sealed standing gate. Do not tune or rerun this cycle; any further candidate requires another frozen boundary and another fresh held-out gate.",
  );
  return `${lines.join("\n")}\n`;
}

export async function runSealedSemanticGuardianV4GateV3({ environment = process.env } = {}) {
  assertSemanticGuardianV4FrozenBoundaryV3();
  if (existsSync(SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT) || existsSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL)) {
    return {
      report: blockedV4StandingReportV3(
        `Standing gate ${SET.id} is already sealed by an existing evidence artifact or journal. Never rerun a sealed cycle.`,
      ),
      evidenceArtifactPath: existsSync(SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT) ? SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT : null,
      evidenceBundle: null,
    };
  }

  mkdirSync(dirname(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL), { recursive: true });
  const observer = (event) => appendFileSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, `${JSON.stringify(event)}\n`, "utf8");
  let adapter;
  try {
    const runtime = createModelRuntime({ environment, observer });
    const selection = runtime.selectionForBlock(FROZEN.reasoningBlock);
    adapter = runtime.forBlock(FROZEN.reasoningBlock);
    const mismatches = runtimeBoundaryFailures(selection, adapter);
    if (mismatches.length > 0) {
      rmSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, { force: true });
      return {
        report: blockedV4StandingReportV3(`Frozen runtime boundary mismatch: ${mismatches.join("; ")}`),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }
  } catch (error) {
    rmSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, { force: true });
    if (error?.code === "MODEL_UNAVAILABLE") {
      return { report: blockedV4StandingReportV3(error.message), evidenceArtifactPath: null, evidenceBundle: null };
    }
    throw error;
  }

  const progress = startProgress(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL);
  try {
    const report = await runSemanticGuardianV4StandingProofV3({ modelAdapter: adapter });
    const journal = readJournal(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL);
    const finalSnapshot = {
      responses: journal.filter((entry) => entry.type === "model_response").length,
      failures: journal.filter((entry) => entry.type === "operational_failure").length,
    };
    const bundle = bundleFor(report, journal);
    writeBundle(SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT, bundle);
    progress.stop(report.status, finalSnapshot);
    rmSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, { force: true });
    return { report, evidenceArtifactPath: SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT, evidenceBundle: bundle };
  } catch (error) {
    const journal = readJournal(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL);
    const providerAttempted = journal.some((entry) => entry.type === "model_attempt");
    if (!providerAttempted) {
      progress.stop("blocked", progressSnapshot(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL));
      rmSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, { force: true });
      return {
        report: blockedV4StandingReportV3(error?.message ?? String(error)),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }
    const finalSnapshot = {
      responses: journal.filter((entry) => entry.type === "model_response").length,
      failures: journal.filter((entry) => entry.type === "operational_failure").length,
    };
    const fatalError = {
      name: error?.constructor?.name ?? "Error",
      code: error?.code ?? null,
      message: error?.message ?? String(error),
    };
    const failedReport = {
      ...blockedV4StandingReportV3("The sealed standing gate terminated after a real provider attempt."),
      status: "failed",
      casesAttempted: finalSnapshot.responses,
      casesPlanned: EXPECTED_CASES,
    };
    const bundle = bundleFor(failedReport, journal, fatalError);
    if (!existsSync(SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT)) writeBundle(SEMANTIC_GUARDIAN_V4_GATE_V3_ARTIFACT, bundle);
    progress.stop("failed", finalSnapshot);
    rmSync(SEMANTIC_GUARDIAN_V4_GATE_V3_JOURNAL, { force: true });
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }
  if (options.summaryOnly) { process.stdout.write(formatStandingGateV3Summary(readBundle(options.evidencePath))); return; }

  const result = await runSealedSemanticGuardianV4GateV3();
  const bundle = result.evidenceBundle ?? {
    version: 4,
    evidenceClass: "standing_gate",
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    cycleSealed: false,
    frozenBoundary: structuredClone(FROZEN),
    report: result.report,
    judgments: [],
    operationalAttempts: [],
    journal: [],
  };
  if (options.summary) process.stdout.write(formatStandingGateV3Summary(bundle));
  if (options.json) process.stdout.write(`${JSON.stringify({ ...result.report, evidenceArtifactPath: result.evidenceArtifactPath }, null, 2)}\n`);
  if (result.report.status === "failed") process.exitCode = 1;
  if (result.report.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Semantic Guardian v4 standing gate v3 failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
