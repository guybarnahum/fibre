import { createHash } from "node:crypto";
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
import {
  CAUSAL_CONTEXT_POLICY,
  MEMORY_RESOLUTION_POLICY,
} from "../services/world-kernel/src/causal-context.mjs";
import { EPISODE_EVIDENCE_POLICY } from "../services/world-kernel/src/episode-evidence.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4 as GUARDIAN_FROZEN } from
  "../experiments/semantic-guardian-v4/frozen-boundary-candidate-4.mjs";
import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v1.mjs";
import {
  assertFreshStandingScenario,
  blockedHistoryStandingReport,
  runHistoryStandingProof,
} from "./history-bends-judgment-standing-proof.mjs";

export const HISTORY_STANDING_GATE_ARTIFACT = resolve(
  `artifacts/test-results/${SET.id}.evidence.json`,
);
export const HISTORY_STANDING_GATE_JOURNAL = resolve(
  `artifacts/test-results/${SET.id}.judgments.ndjson`,
);

const FROZEN_SOURCE_PATHS = Object.freeze({
  developmentHarness: "./history-bends-judgment-dev.mjs",
  runtimeDomain: "../services/world-kernel/src/runtime-domain.mjs",
  episodeEvidence: "../services/world-kernel/src/episode-evidence.mjs",
  causalContext: "../services/world-kernel/src/causal-context.mjs",
  guardianCandidate4: "../experiments/semantic-guardian-v4/frozen-boundary-candidate-4.mjs",
});

const RUNTIME_KEYS = Object.freeze([
  "transport",
  "maxOutputTokens",
  "temperature",
  "topP",
  "reasoningEffort",
  "retryLimit",
  "retryDelayMs",
  "structuredOutput",
]);

function gitBlobSha(relativePath) {
  const bytes = readFileSync(new URL(relativePath, import.meta.url));
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

export function historyStandingPreflightFailures({ sourceBlobSha = gitBlobSha } = {}) {
  const failures = [];
  const compare = (label, actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${label} drifted from frozen candidate 1`);
    }
  };

  compare("Guardian candidate id", FROZEN.guardian.candidateId, GUARDIAN_FROZEN.id);
  compare("Guardian policy", DIGNITY_GUARDIAN_V4_POLICY, FROZEN.guardian.policy);
  compare("Guardian prompt schema", DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION, FROZEN.guardian.promptSchemaVersion);
  compare("Guardian prompt hash", DIGNITY_GUARDIAN_V4_PROMPT_HASH, FROZEN.guardian.promptHash);
  compare("Guardian response schema", DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION, FROZEN.guardian.responseSchemaVersion);
  compare(
    "Guardian response schema generator hash",
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
    FROZEN.guardian.responseSchemaGeneratorHash,
  );
  compare("Episode evidence policy", EPISODE_EVIDENCE_POLICY, FROZEN.episodeMemory.episodeEvidencePolicy);
  compare("Causal selection policy", CAUSAL_CONTEXT_POLICY, FROZEN.retrieval.selectionPolicy);
  compare("Memory resolution policy", MEMORY_RESOLUTION_POLICY, FROZEN.retrieval.memoryResolutionPolicy);

  for (const [key, relativePath] of Object.entries(FROZEN_SOURCE_PATHS)) {
    const actual = sourceBlobSha(relativePath, key);
    const expected = FROZEN.sourceBlobs[key];
    if (actual !== expected) {
      failures.push(`frozen source ${key} expected ${expected}, got ${actual}`);
    }
  }
  return failures;
}

function runtimeBoundaryFailures(selection, adapter) {
  const failures = [];
  if (selection.provider !== FROZEN.modelRuntime.provider) {
    failures.push(`provider expected ${FROZEN.modelRuntime.provider}, got ${selection.provider}`);
  }
  if (selection.modelId !== FROZEN.modelRuntime.modelId) {
    failures.push(`model expected ${FROZEN.modelRuntime.modelId}, got ${selection.modelId}`);
  }
  const configuration = adapter.configuration ?? {};
  for (const key of RUNTIME_KEYS) {
    if (configuration[key] !== FROZEN.modelRuntime[key]) {
      failures.push(`runtime ${key} expected ${FROZEN.modelRuntime[key]}, got ${configuration[key]}`);
    }
  }
  return failures;
}

function usage() {
  return `Fibre History bends judgment standing gate v1\n\nUsage:\n  npm run history:gate\n  npm run history:gate -- --summary\n  npm run history:gate -- --json\n  npm run history:gate -- --summary --json\n  npm run history:gate -- --summary-only\n  npm run history:gate -- --summary-only --evidence <path>\n\nThis is the one-shot held-out standing gate for ${SET.id} against ${FROZEN.id}.\nMissing credentials, frozen-source drift, runtime mismatch, or deterministic setup failure block without consuming the cycle.\nThe first real provider attempt seals the cycle pass or fail. A later execution request is rejected without provider access and without changing the authoritative evidence.\n`;
}

function parseArgs(argv) {
  const options = {
    summary: false,
    json: false,
    summaryOnly: false,
    evidencePath: HISTORY_STANDING_GATE_ARTIFACT,
    help: false,
  };
  let explicitOutput = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") { options.summary = true; explicitOutput = true; }
    else if (arg === "--json") { options.json = true; explicitOutput = true; }
    else if (arg === "--summary-only") {
      options.summaryOnly = true;
      options.summary = true;
      explicitOutput = true;
    } else if (arg === "--evidence") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--evidence requires a path");
      options.evidencePath = resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!explicitOutput && !options.help) options.summary = true;
  if (options.summaryOnly && options.json) throw new Error("--summary-only cannot be combined with --json");
  if (!options.summaryOnly && options.evidencePath !== HISTORY_STANDING_GATE_ARTIFACT) {
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
    catch (error) {
      throw new Error(`history standing journal line ${index + 1} is invalid JSON: ${error.message}`);
    }
  });
}

function readBundle(path) {
  if (!existsSync(path)) throw new Error(`history standing evidence artifact not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeBundle(path, bundle) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function bundleFor(report, journal, preflight, fatalError = null) {
  return {
    version: 1,
    evidenceClass: "standing_gate",
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    cycleSealed: true,
    frozenBoundary: structuredClone(FROZEN),
    heldOutScenario: structuredClone(SET),
    preflight,
    report,
    fatalError,
    judgments: journal.filter((entry) => entry.type === "model_response"),
    operationalAttempts: journal.filter((entry) => entry.type === "operational_failure"),
    journal,
  };
}

function rejectedRerun({ evidenceBundle = null, evidenceArtifactPath = null, rejectionReason }) {
  return {
    executionStatus: "rejected",
    rejectionReason,
    report: evidenceBundle?.report ?? null,
    evidenceArtifactPath,
    evidenceBundle,
  };
}

function compactText(value, maxLength = 180) {
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

export function formatHistoryStandingSummary(bundle) {
  const report = bundle.report;
  const lines = [
    "Fibre · History bends judgment standing gate v1",
    `SEALED · ${bundle.acceptanceSetId}`,
    `Candidate: ${bundle.frozenCandidateId}`,
    `Model: ${report.modelProvider ?? FROZEN.modelRuntime.provider}/${report.modelId ?? FROZEN.modelRuntime.modelId}`,
    "",
    `RESULT: ${String(report.status).toUpperCase()}`,
    `Standing gate: ${report.standingGatePassed ? "PASSED" : "NOT PASSED"}`,
    `Score movement: ${report.scoreMovementPermitted ? "PERMITTED" : "NO"}`,
    "",
    "Episode / restart",
    "────────────────────────────────────────",
    `Episode persisted: ${report.episode ? "PASSED" : "FAILED"}`,
    `Database close/reopen: ${report.restart?.survived ? "PASSED" : "FAILED"}`,
    `Freeze integrity: ${report.restart?.freezeIntegrityPassed ? "PASSED" : "FAILED"}`,
    `Memory survived unchanged: ${report.restart?.memory?.memoryId === report.episode?.memory?.memoryId ? "PASSED" : "FAILED"}`,
    "",
    "Later identical request",
    "────────────────────────────────────────",
    `Request fingerprint: ${report.counterfactual?.requestFingerprint ?? "n/a"}`,
    `With history:    ${report.withHistory ? `${report.withHistory.proposedAction}/${report.withHistory.participationFit}` : "not completed"}`,
    `Without history: ${report.withoutHistory ? `${report.withoutHistory.proposedAction}/${report.withoutHistory.participationFit}` : "not completed"}`,
    `Same Thread state: ${report.counterfactual?.sameThreadState ? "YES" : "NO"}`,
    `Semantic state held constant: ${report.counterfactual?.semanticStateHeldConstant ? "YES" : "NO"}`,
    `Canonical resolved memories: ${report.counterfactual?.canonicalResolvedMemoryIds?.join(", ") || "none"}`,
    `Counterfactual resolved memories: ${report.counterfactual?.counterfactualResolvedMemoryIds?.join(", ") || "none"}`,
    `Counterfactual unresolved witness: ${report.counterfactual?.counterfactualUnresolvedMemoryIds?.join(", ") || "none"}`,
    "",
    "Failures",
    "────────────────────────────────────────",
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

  if (report.withHistory?.rationale || report.withoutHistory?.rationale) {
    lines.push("", "Judgment rationale", "────────────────────────────────────────");
    if (report.withHistory?.rationale) lines.push(`With: ${compactText(report.withHistory.rationale)}`);
    if (report.withoutHistory?.rationale) lines.push(`Without: ${compactText(report.withoutHistory.rationale)}`);
  }

  lines.push(
    "",
    "Disposition",
    "────────────────────────────────────────",
    report.standingGatePassed
      ? "Frozen history candidate 1 passed its fresh held-out standing gate. The sealed artifact may support Development 0 -> 1."
      : "Frozen history candidate 1 did not pass this sealed standing gate. Do not tune or rerun this cycle; preserve the artifact and reassess the Development claim from the evidence.",
  );
  return `${lines.join("\n")}\n`;
}

export function formatHistoryStandingRejected(result) {
  const report = result.evidenceBundle?.report ?? result.report ?? null;
  const lines = [
    "Fibre · History bends judgment standing gate v1",
    `SEALED · ${SET.id}`,
    `Candidate: ${FROZEN.id}`,
    "",
    "REQUEST: REJECTED",
    `Reason: ${result.rejectionReason}`,
    "No provider call was made. The sealed evidence was not changed.",
  ];
  if (report !== null) {
    lines.push(
      "",
      `Authoritative sealed result: ${String(report.status).toUpperCase()}`,
      `Standing gate: ${report.standingGatePassed ? "PASSED" : "NOT PASSED"}`,
      `Score movement: ${report.scoreMovementPermitted ? "PERMITTED" : "NO"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function runSealedHistoryStandingGate({
  environment = process.env,
  artifactPath = HISTORY_STANDING_GATE_ARTIFACT,
  journalPath = HISTORY_STANDING_GATE_JOURNAL,
} = {}) {
  // Authoritative sealed evidence is checked before live source drift so future
  // Fibre development cannot invalidate or accidentally rerun a historical gate.
  if (existsSync(artifactPath)) {
    const evidenceBundle = readBundle(artifactPath);
    return rejectedRerun({
      evidenceBundle,
      evidenceArtifactPath: artifactPath,
      rejectionReason:
        `Standing gate ${SET.id} is already sealed. Rerun requests are rejected; inspect the existing evidence instead.`,
    });
  }
  if (existsSync(journalPath)) {
    return rejectedRerun({
      rejectionReason:
        `Standing gate ${SET.id} already has a sealed/in-progress provider journal. Rerun requests are rejected; preserve and inspect that cycle.`,
    });
  }

  assertFreshStandingScenario();
  const preflightFailures = historyStandingPreflightFailures();
  if (preflightFailures.length > 0) {
    return {
      report: blockedHistoryStandingReport(
        `Frozen candidate preflight failed: ${preflightFailures.join("; ")}`,
      ),
      evidenceArtifactPath: null,
      evidenceBundle: null,
    };
  }

  mkdirSync(dirname(journalPath), { recursive: true });
  const observer = (event) => appendFileSync(journalPath, `${JSON.stringify(event)}\n`, "utf8");

  let adapter;
  let selection;
  try {
    const runtime = createModelRuntime({ environment, observer });
    selection = runtime.selectionForBlock(FROZEN.guardian.reasoningBlock);
    adapter = runtime.forBlock(FROZEN.guardian.reasoningBlock);
    const mismatches = runtimeBoundaryFailures(selection, adapter);
    if (mismatches.length > 0) {
      rmSync(journalPath, { force: true });
      return {
        report: blockedHistoryStandingReport(
          `Frozen runtime boundary mismatch: ${mismatches.join("; ")}`,
        ),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }
  } catch (error) {
    rmSync(journalPath, { force: true });
    if (error?.code === "MODEL_UNAVAILABLE") {
      return {
        report: blockedHistoryStandingReport(error.message),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }
    throw error;
  }

  const preflight = {
    candidateId: FROZEN.id,
    sourceIdentityPassed: true,
    runtimeBoundaryPassed: true,
    scenarioFreshnessPassed: true,
    checkedBeforeProviderCall: true,
  };

  try {
    const report = await runHistoryStandingProof({
      modelAdapter: adapter,
      selection,
      progress: (phase, message) => process.stderr.write(`history:gate · ${phase} · ${message}\n`),
    });
    const journal = readJournal(journalPath);
    const providerAttempted = journal.some((entry) => entry.type === "model_attempt");
    if (!providerAttempted) {
      rmSync(journalPath, { force: true });
      return {
        report: blockedHistoryStandingReport(
          "Standing proof completed without a real provider attempt; the cycle was not consumed.",
        ),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }
    const bundle = bundleFor(report, journal, preflight);
    writeBundle(artifactPath, bundle);
    rmSync(journalPath, { force: true });
    return { report, evidenceArtifactPath: artifactPath, evidenceBundle: bundle };
  } catch (error) {
    const journal = readJournal(journalPath);
    const providerAttempted = journal.some((entry) => entry.type === "model_attempt");
    if (!providerAttempted) {
      rmSync(journalPath, { force: true });
      return {
        report: blockedHistoryStandingReport(error?.message ?? String(error)),
        evidenceArtifactPath: null,
        evidenceBundle: null,
      };
    }

    const fatalError = {
      name: error?.constructor?.name ?? "Error",
      code: error?.code ?? null,
      message: error?.message ?? String(error),
    };
    const failedReport = {
      ...blockedHistoryStandingReport("The sealed standing gate terminated after a real provider attempt."),
      status: "failed",
      modelProvider: selection?.provider ?? FROZEN.modelRuntime.provider,
      modelId: selection?.modelId ?? FROZEN.modelRuntime.modelId,
      casesAttempted: journal.filter((entry) => entry.type === "model_response").length,
    };
    const bundle = bundleFor(failedReport, journal, preflight, fatalError);
    if (!existsSync(artifactPath)) writeBundle(artifactPath, bundle);
    rmSync(journalPath, { force: true });
    throw error;
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  if (options.summaryOnly) {
    process.stdout.write(formatHistoryStandingSummary(readBundle(options.evidencePath)));
    return;
  }

  const result = await runSealedHistoryStandingGate();
  if (result.executionStatus === "rejected") {
    if (options.summary) process.stdout.write(formatHistoryStandingRejected(result));
    if (options.json) {
      process.stdout.write(`${JSON.stringify({
        executionStatus: result.executionStatus,
        rejectionReason: result.rejectionReason,
        evidenceArtifactPath: result.evidenceArtifactPath,
        authoritativeReport: result.report,
      }, null, 2)}\n`);
    }
    return;
  }

  const bundle = result.evidenceBundle ?? {
    version: 1,
    evidenceClass: "standing_gate",
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    cycleSealed: false,
    frozenBoundary: structuredClone(FROZEN),
    heldOutScenario: structuredClone(SET),
    report: result.report,
    judgments: [],
    operationalAttempts: [],
    journal: [],
  };
  if (options.summary) process.stdout.write(formatHistoryStandingSummary(bundle));
  if (options.json) {
    process.stdout.write(`${JSON.stringify({
      ...result.report,
      evidenceArtifactPath: result.evidenceArtifactPath,
    }, null, 2)}\n`);
  }
  if (result.report.status === "failed") process.exitCode = 1;
  if (result.report.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`History standing gate v1 failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
