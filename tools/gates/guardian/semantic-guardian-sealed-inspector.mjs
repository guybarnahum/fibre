import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SEMANTIC_GUARDIAN_V4_EVIDENCE = resolve(
  "artifacts/validation/semantic_guardian_v4_standing_gate_v4.evidence.json",
);

const EXPECTED_GATE = "semantic_guardian_v4_standing_gate_v4";
const EXPECTED_CANDIDATE = "semantic_guardian_v4_candidate_4";

export function readSealedSemanticGuardianEvidence(path = SEMANTIC_GUARDIAN_V4_EVIDENCE) {
  if (!existsSync(path)) {
    throw new Error(`sealed Semantic Guardian evidence not found: ${path}`);
  }
  const bundle = JSON.parse(readFileSync(path, "utf8"));
  if (bundle.cycleSealed !== true) throw new Error("Semantic Guardian evidence is not sealed");
  if (bundle.acceptanceSetId !== EXPECTED_GATE) {
    throw new Error(`expected ${EXPECTED_GATE}, got ${bundle.acceptanceSetId ?? "missing acceptanceSetId"}`);
  }
  if (bundle.frozenCandidateId !== EXPECTED_CANDIDATE) {
    throw new Error(`expected ${EXPECTED_CANDIDATE}, got ${bundle.frozenCandidateId ?? "missing frozenCandidateId"}`);
  }
  if (bundle.report?.acceptanceSetId !== EXPECTED_GATE) {
    throw new Error("sealed report acceptanceSetId does not match standing v4");
  }
  if (bundle.report?.frozenCandidateId !== EXPECTED_CANDIDATE) {
    throw new Error("sealed report frozenCandidateId does not match Candidate 4");
  }
  return bundle;
}

export function formatSealedSemanticGuardianSummary(bundle) {
  const report = bundle.report;
  const passed = (report.cases ?? []).filter((entry) => entry.status === "passed").length;
  const lines = [
    "Fibre · Semantic Guardian standing gate v4",
    `SEALED · ${bundle.acceptanceSetId}`,
    `Candidate: ${bundle.frozenCandidateId}`,
    `Model: ${report.modelProvider}/${report.modelId}`,
    "READ-ONLY · committed evidence · no provider execution path",
    "",
    `RESULT: ${String(report.status).toUpperCase()}`,
    `Cases passed: ${passed}/${report.casesPlanned}`,
    `Cases attempted: ${report.casesAttempted}/${report.casesPlanned}`,
    `Provider failures: ${report.providerFailures?.length ?? 0}`,
    `Protocol validation failures: ${report.protocolValidationFailures?.length ?? 0}`,
    `Cognition failures: ${report.cognitionFailures?.length ?? 0}`,
    `Behavioral failures: ${report.behavioralGateFailures?.length ?? 0}`,
    `Differential failures: ${report.differentialGateFailures?.length ?? 0}`,
    "",
    `Prompt hash: ${report.promptHash}`,
    `Response schema generator hash: ${report.responseSchemaGeneratorHash}`,
    "",
    "Disposition",
    "────────────────────────────────────────",
    "This command only inspects the committed authoritative evidence. It cannot run or rerun a provider-backed standing cycle.",
  ];
  return `${lines.join("\n")}\n`;
}

export function parseSemanticGuardianInspectorArgs(argv) {
  const options = {
    summary: false,
    json: false,
    evidencePath: SEMANTIC_GUARDIAN_V4_EVIDENCE,
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
      if (value === undefined || value.startsWith("--")) throw new Error("--evidence requires a path");
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
  return `Fibre Semantic Guardian · sealed v4 evidence inspector\n\nUsage:\n  npm run guardian:gate\n  npm run guardian:gate -- --summary\n  npm run guardian:gate -- --json\n\nOptions:\n  --summary          Print the human-readable sealed result.\n  --json             Print the committed evidence bundle.\n  --evidence <path>  Inspect another copy of the same sealed v4 bundle.\n  --help             Show this help.\n\nThis inspector has no provider/model runtime dependency and cannot execute a standing gate.\n`;
}

async function main() {
  let options;
  try {
    options = parseSemanticGuardianInspectorArgs(process.argv.slice(2));
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
    const bundle = readSealedSemanticGuardianEvidence(options.evidencePath);
    if (options.summary) process.stdout.write(formatSealedSemanticGuardianSummary(bundle));
    if (options.json) process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`guardian:gate inspection failed: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
