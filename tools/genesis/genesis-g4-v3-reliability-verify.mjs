#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  richPassAPromptForPolicy,
  richPassAPromptHash,
  richPassARecordRetryPromptHash,
  richPassAV3PromptHash,
  richPassAV3RecordRetryPromptHash,
} from "../../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json";
const readJson = (path) => JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
const fail = (message) => { throw new Error(message); };

export function verifyG4V3ReliabilityImplementation() {
  const protocol = readJson(PROTOCOL_PATH);
  const amendment = protocol.mechanicalAmendment;
  const budgets = amendment.budgets;
  const target = amendment.initialDraftFormTarget;
  const policy = GENESIS_PASS_A_RELIABILITY_POLICY_V3;

  if (protocol.protocolVersion !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) fail("G4-v3 protocol/policy version mismatch");
  if (amendment.authoritativeObservableActionMaxUtf8Bytes !== 1200 || policy.authoritativeObservableActionMaxUtf8Bytes !== 1200) fail("G4-v3 authoritative Pass-A byte ceiling drift");
  if (amendment.authoritativeObservableActionAdmissionChanged !== false) fail("G4-v3 must not change Pass-A admission semantics");
  if (target.targetUtf8Bytes !== policy.initialDraftTargetUtf8Bytes || target.targetWords !== policy.initialDraftTargetWords || target.targetIsAdmissionGate !== false) fail("G4-v3 initial form target drift");
  if (budgets.maxFormRepairsPerRecord !== policy.maxFormRepairsPerRecord) fail("G4-v3 form-repair budget drift");
  if (budgets.maxRecordRetriesPerRecord !== policy.maxRecordRetriesPerRecord) fail("G4-v3 record-retry budget drift");
  if (budgets.maxTotalGeneratedVersionsPerRecord !== policy.maxTotalGeneratedVersionsPerRecord) fail("G4-v3 total generated-version budget drift");
  if (budgets.formAndRecordBudgetsIndependent !== true || budgets.recordRetryResetsFormRepairBudget !== false || budgets.formRepairResetsRecordRetryBudget !== false) fail("G4-v3 budget independence drift");

  const v3Prompt = richPassAPromptForPolicy({ generationPolicy: policy });
  const v3RetryPrompt = richPassAPromptForPolicy({ generationPolicy: policy, retry: true });
  if (!v3Prompt.includes("target observableAction at no more than 800 UTF-8 bytes and no more than 100 words")) fail("G4-v3 initial prompt target missing");
  if (!v3RetryPrompt.includes("target observableAction at no more than 800 UTF-8 bytes and no more than 100 words")) fail("G4-v3 record-retry prompt target missing");
  if (!v3Prompt.includes("unchanged authoritative admission ceiling remains 1200 UTF-8 bytes")) fail("G4-v3 prompt obscures authoritative 1200-byte gate");

  const legacyPromptHash = richPassAPromptHash();
  const legacyRetryPromptHash = richPassARecordRetryPromptHash();
  if (legacyPromptHash !== "sha256:96d79b51f390c67a2706e73985531fceca3c3418115912001ce2dce38332263e") fail("legacy Pass-A prompt drift");
  if (legacyRetryPromptHash !== "sha256:8709f11bfe97affd857ebc525d796cd3d5e578bffcd20d7e98bfd21ad924b8f8") fail("legacy Pass-A record-retry prompt drift");

  return Object.freeze({
    status: "CLEAR",
    protocolPath: PROTOCOL_PATH,
    policyVersion: policy.version,
    budgets: Object.freeze({
      initialGeneratedVersions: 1,
      maxFormRepairsPerRecord: policy.maxFormRepairsPerRecord,
      maxRecordRetriesPerRecord: policy.maxRecordRetriesPerRecord,
      maxTotalGeneratedVersionsPerRecord: policy.maxTotalGeneratedVersionsPerRecord,
    }),
    authoritativeObservableActionMaxUtf8Bytes: policy.authoritativeObservableActionMaxUtf8Bytes,
    initialDraftTarget: Object.freeze({ utf8Bytes: policy.initialDraftTargetUtf8Bytes, words: policy.initialDraftTargetWords }),
    legacyPromptHash,
    legacyRetryPromptHash,
    v3PromptHash: richPassAV3PromptHash(),
    v3RetryPromptHash: richPassAV3RecordRetryPromptHash(),
    providerCalls: 0,
  });
}

function main() {
  const result = verifyG4V3ReliabilityImplementation();
  process.stdout.write("G4-V3 RELIABILITY IMPLEMENTATION VERIFY: CLEAR\n\n");
  process.stdout.write(`Policy: ${result.policyVersion}\n`);
  process.stdout.write(`Budgets: initial=${result.budgets.initialGeneratedVersions} form=${result.budgets.maxFormRepairsPerRecord} record=${result.budgets.maxRecordRetriesPerRecord} total=${result.budgets.maxTotalGeneratedVersionsPerRecord}\n`);
  process.stdout.write(`Admission ceiling: ${result.authoritativeObservableActionMaxUtf8Bytes} UTF-8 bytes\n`);
  process.stdout.write(`Initial/retry target: ${result.initialDraftTarget.utf8Bytes} UTF-8 bytes / ${result.initialDraftTarget.words} words\n`);
  process.stdout.write(`Legacy Pass-A prompt: ${result.legacyPromptHash}\n`);
  process.stdout.write(`Legacy record-retry prompt: ${result.legacyRetryPromptHash}\n`);
  process.stdout.write(`G4-v3 Pass-A prompt: ${result.v3PromptHash}\n`);
  process.stdout.write(`G4-v3 record-retry prompt: ${result.v3RetryPromptHash}\n`);
  process.stdout.write("\nNo provider call was made.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
