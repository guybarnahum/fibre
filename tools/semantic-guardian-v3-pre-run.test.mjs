import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { SEMANTIC_GUARDIAN_ACCEPTANCE_SET as SET } from "../experiments/semantic-guardian-v3/acceptance-set.mjs";
import { OPENAI_GUARDIAN_EVALUATION_CONFIGURATION } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import { runSealedSemanticGuardianV3Proof } from "./run-semantic-guardian-v3-proof.mjs";

test("pre-run sampling and operational retry policy match the live adapter defaults", () => {
  assert.deepEqual(SET.samplingConfiguration, {
    temperature: 0,
    topP: 1,
    reasoningEffort: "none",
  });
  assert.deepEqual(SET.operationalRetryPolicy, {
    retryLimitPerTrial: 2,
    retryDelayMs: 2000,
    onlySuccessfulJudgmentsCountTowardK: true,
  });
  assert.deepEqual(OPENAI_GUARDIAN_EVALUATION_CONFIGURATION, {
    temperature: 0,
    topP: 1,
    reasoningEffort: "none",
    operationalRetryLimit: 2,
    operationalRetryDelayMs: 2000,
  });
});

test("missing credential remains a pre-invocation block and seals no evidence artifact", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-blocked-"));
  const artifact = join(directory, "evidence.json");
  const journal = join(directory, "journal.ndjson");
  try {
    const result = await runSealedSemanticGuardianV3Proof({
      environment: {},
      evidenceArtifactPath: artifact,
      evidenceJournalPath: journal,
    });
    assert.equal(result.report.status, "blocked");
    assert.equal(result.report.standingDifferentialGatePassed, false);
    assert.equal(result.evidenceArtifactPath, null);
    assert.equal(existsSync(artifact), false);
    assert.equal(existsSync(journal), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an existing evidence artifact seals the cycle before another provider invocation", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-sealed-"));
  const artifact = join(directory, "evidence.json");
  const journal = join(directory, "journal.ndjson");
  writeFileSync(artifact, "{}\n", "utf8");
  try {
    const result = await runSealedSemanticGuardianV3Proof({
      environment: { OPENAI_API_KEY: "must-not-be-used" },
      evidenceArtifactPath: artifact,
      evidenceJournalPath: journal,
    });
    assert.equal(result.report.status, "blocked");
    assert.match(result.report.reason, /already sealed/i);
    assert.equal(existsSync(journal), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
