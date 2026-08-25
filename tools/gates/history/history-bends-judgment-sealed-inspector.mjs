import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const HISTORY_STANDING_V4_EVIDENCE = resolve(
  "artifacts/validation/history_bends_judgment_standing_gate_v4.evidence.json",
);

const EXPECTED_GATE = "history_bends_judgment_standing_gate_v4";
const EXPECTED_CANDIDATE = "history_bends_judgment_candidate_4";

export function readSealedHistoryStandingEvidence(path = HISTORY_STANDING_V4_EVIDENCE) {
  if (!existsSync(path)) {
    throw new Error(`sealed history standing evidence not found: ${path}`);
  }
  const bundle = JSON.parse(readFileSync(path, "utf8"));
  if (bundle.cycleSealed !== true) {
    throw new Error("history standing evidence is not sealed");
  }
  if (bundle.acceptanceSetId !== EXPECTED_GATE) {
    throw new Error(
      `expected ${EXPECTED_GATE}, got ${bundle.acceptanceSetId ?? "missing acceptanceSetId"}`,
    );
  }
  if (bundle.frozenCandidateId !== EXPECTED_CANDIDATE) {
    throw new Error(
      `expected ${EXPECTED_CANDIDATE}, got ${bundle.frozenCandidateId ?? "missing frozenCandidateId"}`,
    );
  }
  if (bundle.report?.acceptanceSetId !== EXPECTED_GATE) {
    throw new Error("sealed report acceptanceSetId does not match the v4 gate");
  }
  if (bundle.report?.frozenCandidateId !== EXPECTED_CANDIDATE) {
    throw new Error("sealed report frozenCandidateId does not match Candidate 4");
  }
  return bundle;
}

function compact(value, max = 220) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function memoryFactors(output, memoryId) {
  const ref = `memory:${memoryId}`;
  return Object.entries(output?.factors ?? {})
    .filter(([, factor]) => factor?.evidenceRefs?.includes(ref))
    .map(([name]) => name);
}

export function formatSealedHistoryStandingSummary(bundle) {
  const report = bundle.report;
  const memoryId = report?.counterfactual?.causalMemoryId ?? report?.episode?.memory?.memoryId;
  const factors = memoryFactors(report?.withHistory, memoryId);
  const operationalAttempts = bundle.operationalAttempts ?? [];
  const lines = [
    "Fibre · History bends judgment standing gate v4",
    `SEALED · ${bundle.acceptanceSetId}`,
    `Candidate: ${bundle.frozenCandidateId}`,
    `Model: ${report.modelProvider}/${report.modelId}`,
    "READ-ONLY · committed evidence · no provider execution path",
    "",
    `RESULT: ${String(report.status).toUpperCase()}`,
    `Standing gate: ${report.standingGatePassed ? "PASSED" : "NOT PASSED"}`,
    `Score movement: ${report.scoreMovementPermitted ? "PERMITTED" : "NO"}`,
    "",
    "Episode / restart",
    "────────────────────────────────────────",
    `Memory: ${memoryId}`,
    `Database close/reopen: ${report.restart?.survived ? "PASSED" : "FAILED"}`,
    `Freeze integrity: ${report.restart?.freezeIntegrityPassed ? "PASSED" : "FAILED"}`,
    `Memory survived unchanged: ${report.restart?.memory?.memoryId === report.episode?.memory?.memoryId ? "PASSED" : "FAILED"}`,
    "",
    "Later identical request",
    "────────────────────────────────────────",
    `Request fingerprint: ${report.counterfactual?.requestFingerprint ?? "n/a"}`,
    `With history:    ${report.withHistory?.proposedAction}/${report.withHistory?.participationFit}`,
    `Without history: ${report.withoutHistory?.proposedAction}/${report.withoutHistory?.participationFit}`,
    `Load-bearing memory factors: ${factors.join(", ") || "NONE"}`,
    `Same Thread state: ${report.counterfactual?.sameThreadState ? "YES" : "NO"}`,
    `Semantic state held constant: ${report.counterfactual?.semanticStateHeldConstant ? "YES" : "NO"}`,
    `Canonical resolved memories: ${report.counterfactual?.canonicalResolvedMemoryIds?.join(", ") || "none"}`,
    `Counterfactual resolved memories: ${report.counterfactual?.counterfactualResolvedMemoryIds?.join(", ") || "none"}`,
    `Counterfactual unresolved witness: ${report.counterfactual?.counterfactualUnresolvedMemoryIds?.join(", ") || "none"}`,
    "",
    "Judgment rationale",
    "────────────────────────────────────────",
    `With: ${compact(report.withHistory?.rationale)}`,
    `Without: ${compact(report.withoutHistory?.rationale)}`,
    "",
    "Provider record",
    "────────────────────────────────────────",
    `Successful model responses: ${(bundle.judgments ?? []).length}`,
    `Operational attempts: ${operationalAttempts.length}`,
    `Retrying operational failures: ${operationalAttempts.filter((entry) => entry.retrying).length}`,
    `Normalizations: ${(report.withHistory?.normalizations ?? []).length + (report.withoutHistory?.normalizations ?? []).length}`,
    "",
    "Disposition",
    "────────────────────────────────────────",
    "This command only inspects the committed authoritative evidence. It cannot run or rerun a provider-backed standing cycle.",
  ];
  return `${lines.join("\n")}\n`;
}

export function parseSealedHistoryInspectorArgs(argv) {
  const options = {
    summary: false,
    json: false,
    evidencePath: HISTORY_STANDING_V4_EVIDENCE,
    help: false,
  };
  let explicitOutput = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = true;
      explicitOutput = true;
    } else if (arg === "--json") {
      options.json = true;
      explicitOutput = true;
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
  if (!explicitOutput && !options.help) options.summary = true;
  return options;
}

function usage() {
  return `Fibre History bends judgment · sealed v4 evidence inspector\n\nUsage:\n  npm run history:gate\n  npm run history:gate -- --summary\n  npm run history:gate -- --json\n\nOptions:\n  --summary          Print the human-readable sealed result.\n  --json             Print the committed evidence bundle.\n  --evidence <path>  Inspect another copy of the same sealed v4 bundle.\n  --help             Show this help.\n\nThis inspector has no provider/model runtime dependency and cannot execute a standing gate.\n`;
}

async function main() {
  let options;
  try {
    options = parseSealedHistoryInspectorArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  try {
    const bundle = readSealedHistoryStandingEvidence(options.evidencePath);
    if (options.summary) process.stdout.write(formatSealedHistoryStandingSummary(bundle));
    if (options.json) process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`history:gate inspection failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
