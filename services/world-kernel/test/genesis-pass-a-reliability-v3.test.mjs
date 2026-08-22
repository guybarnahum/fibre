import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_PASS_A_POLICY } from "../src/genesis-pass-a-domain.mjs";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "../src/genesis-pass-a-reliability-v3.mjs";
import {
  GENESIS_RICH_PASS_A_PROMPT,
  richPassAGenerationDecision,
  richPassAPromptForPolicy,
  richPassAPromptHash,
  richPassARecordRetryPromptHash,
} from "../src/genesis-rich-pass-a-runner.mjs";

function decision({ generatedVersions, formRepairs, recordRetries, nextKind }) {
  return richPassAGenerationDecision({
    generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
    generatedVersions,
    formRepairs,
    recordRetries,
    nextKind,
  });
}

test("G4-v3 freezes independent 2/2 repair budgets with hard total 5", () => {
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.version, GENESIS_PASS_A_RELIABILITY_V3_VERSION);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxFormRepairsPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxRecordRetriesPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxTotalGeneratedVersionsPerRecord, 5);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.authoritativeObservableActionMaxUtf8Bytes, 1200);
  assert.equal(GENESIS_PASS_A_POLICY.maxObservableActionBytes, 1200);
});

test("G4-v3 allows the full alternating form/referential ladder and stops at version 5", () => {
  assert.equal(decision({ generatedVersions: 1, formRepairs: 0, recordRetries: 0, nextKind: "form_repair" }).allowed, true);
  assert.equal(decision({ generatedVersions: 2, formRepairs: 1, recordRetries: 0, nextKind: "record_retry" }).allowed, true);
  assert.equal(decision({ generatedVersions: 3, formRepairs: 1, recordRetries: 1, nextKind: "form_repair" }).allowed, true);
  assert.equal(decision({ generatedVersions: 4, formRepairs: 2, recordRetries: 1, nextKind: "record_retry" }).allowed, true);

  const exhausted = decision({ generatedVersions: 5, formRepairs: 2, recordRetries: 2, nextKind: "record_retry" });
  assert.equal(exhausted.allowed, false);
  assert.equal(exhausted.reason, "total_generated_version_budget_exhausted");
});

test("G4-v3 form budget exhaustion does not consume the independent record-retry budget", () => {
  const formExhausted = decision({ generatedVersions: 3, formRepairs: 2, recordRetries: 0, nextKind: "form_repair" });
  assert.equal(formExhausted.allowed, false);
  assert.equal(formExhausted.reason, "form_repair_budget_exhausted");

  const retryStillAllowed = decision({ generatedVersions: 3, formRepairs: 2, recordRetries: 0, nextKind: "record_retry" });
  assert.equal(retryStillAllowed.allowed, true);
});

test("G4-v3 record-retry exhaustion does not consume the independent form budget", () => {
  const retryExhausted = decision({ generatedVersions: 3, formRepairs: 0, recordRetries: 2, nextKind: "record_retry" });
  assert.equal(retryExhausted.allowed, false);
  assert.equal(retryExhausted.reason, "record_retry_budget_exhausted");

  const formStillAllowed = decision({ generatedVersions: 3, formRepairs: 0, recordRetries: 2, nextKind: "form_repair" });
  assert.equal(formStillAllowed.allowed, true);
});

test("legacy rich Pass-A keeps the historical shared three-version cap by default", () => {
  assert.equal(richPassAGenerationDecision({ generatedVersions: 2, formRepairs: 2, recordRetries: 0, nextKind: "record_retry" }).allowed, true);
  const exhausted = richPassAGenerationDecision({ generatedVersions: 3, formRepairs: 1, recordRetries: 1, nextKind: "form_repair" });
  assert.equal(exhausted.allowed, false);
  assert.equal(exhausted.reason, "total_generated_version_budget_exhausted");
});

test("G4-v3 form target is prompt guidance only and legacy prompt remains byte-stable", () => {
  const legacy = richPassAPromptForPolicy();
  const v3 = richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3 });
  const v3Retry = richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3, retry: true });

  assert.equal(legacy, GENESIS_RICH_PASS_A_PROMPT);
  assert.equal(richPassAPromptHash(), "sha256:96d79b51f390c67a2706e73985531fceca3c3418115912001ce2dce38332263e");
  assert.equal(richPassARecordRetryPromptHash(), "sha256:8709f11bfe97affd857ebc525d796cd3d5e578bffcd20d7e98bfd21ad924b8f8");
  assert.match(v3, /target observableAction at no more than 800 UTF-8 bytes and no more than 100 words/);
  assert.match(v3, /unchanged authoritative admission ceiling remains 1200 UTF-8 bytes/);
  assert.match(v3Retry, /target observableAction at no more than 800 UTF-8 bytes and no more than 100 words/);
  assert.equal(GENESIS_PASS_A_POLICY.maxObservableActionBytes, 1200);
});
