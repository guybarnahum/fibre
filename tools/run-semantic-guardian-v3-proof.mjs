import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { SEMANTIC_GUARDIAN_ACCEPTANCE_SET as SET } from "../experiments/semantic-guardian-v3/acceptance-set.mjs";
import { OPENAI_GUARDIAN_EVALUATION_CONFIGURATION } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import {
  DIGNITY_GUARDIAN_PROMPT_HASH,
  DIGNITY_GUARDIAN_RESPONSE_SCHEMA_HASH,
} from "../services/world-kernel/src/dignity-guardian.mjs";
import {
  blockedSemanticGuardianReport,
  runSemanticGuardianV3Proof,
} from "./semantic-guardian-v3-proof.mjs";

export const SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT = resolve(
  `artifacts/test-results/${SET.id}.evidence.json`,
);
export const SEMANTIC_GUARDIAN_EVIDENCE_JOURNAL = resolve(
  `artifacts/test-results/${SET.id}.judgments.ndjson`,
);

function expectedAdapterConfiguration() {
  return {
    temperature: SET.samplingConfiguration.temperature,
    topP: SET.samplingConfiguration.topP,
    reasoningEffort: SET.samplingConfiguration.reasoningEffort,
    operationalRetryLimit: SET.operationalRetryPolicy.retryLimitPerTrial,
    operationalRetryDelayMs: SET.operationalRetryPolicy.retryDelayMs,
  };
}

function assertFrozenPreRunConfiguration() {
  assert.deepEqual(
    OPENAI_GUARDIAN_EVALUATION_CONFIGURATION,
    expectedAdapterConfiguration(),
    "live adapter configuration must match the predeclared acceptance-cycle sampling and retry policy",
  );
}

function readJournal(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").trim();
  if (text === "") return [];
  return text.split("\n").map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`semantic Guardian evidence journal line ${index + 1} is invalid JSON: ${error.message}`);
    }
  });
}

function writeEvidenceArtifact(path, bundle) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function bundleFor(report, journal, fatalError = null) {
  return {
    version: 1,
    acceptanceSetId: SET.id,
    cycleSealed: true,
    frozenBoundary: {
      policy: structuredClone(SET.frozenPolicy),
      modelId: SET.frozenModelId,
      promptHash: DIGNITY_GUARDIAN_PROMPT_HASH,
      responseSchemaHash: DIGNITY_GUARDIAN_RESPONSE_SCHEMA_HASH,
      samplingConfiguration: structuredClone(SET.samplingConfiguration),
      operationalRetryPolicy: structuredClone(SET.operationalRetryPolicy),
      repeatTrials: SET.repeatTrials,
      stableMinimumAgreement: SET.stableMinimumAgreement,
    },
    report,
    fatalError,
    judgments: journal.filter((entry) => entry.type === "model_response"),
    operationalAttempts: journal.filter((entry) => entry.type === "operational_failure"),
    journal,
  };
}

function sealedBlock(reason) {
  return {
    report: blockedSemanticGuardianReport(reason),
    evidenceArtifactPath: null,
    evidenceBundle: null,
  };
}

export async function runSealedSemanticGuardianV3Proof({
  environment = process.env,
  evidenceArtifactPath = SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT,
  evidenceJournalPath = SEMANTIC_GUARDIAN_EVIDENCE_JOURNAL,
} = {}) {
  assertFrozenPreRunConfiguration();

  if (existsSync(evidenceArtifactPath) || existsSync(evidenceJournalPath)) {
    return sealedBlock(
      `Semantic Guardian acceptance cycle ${SET.id} is already sealed by an existing evidence artifact or journal; create a new frozen cycle rather than rerunning it.`,
    );
  }

  const previousJournalPath = process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
  process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL = evidenceJournalPath;
  try {
    const report = await runSemanticGuardianV3Proof(environment);
    if (report.status === "blocked") {
      rmSync(evidenceJournalPath, { force: true });
      return { report, evidenceArtifactPath: null, evidenceBundle: null };
    }

    const journal = readJournal(evidenceJournalPath);
    const evidenceBundle = bundleFor(report, journal);
    writeEvidenceArtifact(evidenceArtifactPath, evidenceBundle);
    rmSync(evidenceJournalPath, { force: true });
    return { report, evidenceArtifactPath, evidenceBundle };
  } catch (error) {
    const journal = readJournal(evidenceJournalPath);
    if (journal.length > 0 && !existsSync(evidenceArtifactPath)) {
      const fatalError = {
        name: error?.constructor?.name ?? "Error",
        code: error?.code ?? null,
        message: error?.message ?? String(error),
      };
      const failedReport = {
        version: 1,
        acceptanceSetId: SET.id,
        frozenModelId: SET.frozenModelId,
        status: "failed",
        standingDifferentialGatePassed: false,
        scoreMovementPermitted: false,
        reason: "The sealed acceptance cycle terminated after at least one live model response.",
      };
      writeEvidenceArtifact(evidenceArtifactPath, bundleFor(failedReport, journal, fatalError));
      rmSync(evidenceJournalPath, { force: true });
    }
    throw error;
  } finally {
    if (previousJournalPath === undefined) {
      delete process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
    } else {
      process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL = previousJournalPath;
    }
  }
}

async function main() {
  const result = await runSealedSemanticGuardianV3Proof();
  process.stdout.write(`${JSON.stringify({
    ...result.report,
    evidenceArtifactPath: result.evidenceArtifactPath,
  }, null, 2)}\n`);
  if (result.report.status === "failed") process.exitCode = 1;
  if (result.report.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "semantic-guardian-v3-sealed-proof-failed",
      name: error?.constructor?.name ?? "Error",
      code: error?.code ?? null,
      message: error?.message ?? String(error),
      evidenceArtifactPath: existsSync(SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT)
        ? SEMANTIC_GUARDIAN_EVIDENCE_ARTIFACT
        : null,
    })}\n`);
    process.exitCode = 1;
  });
}
