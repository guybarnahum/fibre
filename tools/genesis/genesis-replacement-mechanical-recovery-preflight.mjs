#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertOpenAIProjectedSchemaConstraints,
  createOpenAIModelAdapter,
  projectOpenAIStructuredOutputSchema,
} from "../../services/world-kernel/src/model-runtime/openai.mjs";
import { assertUniquePassBEpisodeRefs } from "../../services/world-kernel/src/genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  passBResponseSchemaHash,
} from "../../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const RECOVERY_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-mechanical-recovery-v1.json";
const EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-execution-binding-v1.json";

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function fail(message) { throw new Error(message); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function fileSha256(path) {
  return createHash("sha256").update(readFileSync(absolute(path))).digest("hex");
}

function recursiveFiles(rootPath) {
  const root = absolute(rootPath);
  const files = [];
  const visit = (path) => {
    for (const name of readdirSync(path).sort()) {
      const full = resolve(path, name);
      if (statSync(full).isDirectory()) visit(full);
      else files.push(relative(ROOT, full).replaceAll("\\", "/"));
    }
  };
  visit(root);
  return files;
}

function assertExactLocalEvidence(binding) {
  const source = binding.sourceAttempt;
  if (!existsSync(absolute(source.outputRoot))) fail("replacement failed-attempt output root is absent");
  if (fileSha256(source.attemptStartPath) !== source.attemptStartSha256) fail("replacement attempt-start artifact SHA-256 drift");
  if (fileSha256(source.terminalFailurePath) !== source.terminalFailureSha256) fail("replacement terminal-failure artifact SHA-256 drift");

  const attempt = readJson(source.attemptStartPath);
  if (attempt.attemptStartedAt !== source.attemptStartedAt || attempt.status !== "in_progress") fail("replacement attempt-start witness drift");
  if (attempt.qualityRegenerationAllowed !== false || attempt.gateStatus !== "CLEAR") fail("replacement attempt-start authority drift");

  const failure = readJson(source.terminalFailurePath);
  if (failure.status !== source.requiredTerminalStatus || failure.attemptStartedAt !== source.attemptStartedAt) fail("replacement terminal-failure status/attempt drift");
  if (failure.error?.name !== source.requiredFailure.name || !failure.error?.message?.includes(source.requiredFailure.messageContains)) {
    fail("replacement terminal failure is not the frozen OpenAI uniqueItems schema rejection");
  }
  if (!Array.isArray(failure.completedThreadGenerations) || failure.completedThreadGenerations.length !== source.completedThreadGenerationsRequired) {
    fail("replacement terminal failure completed-Thread count drift");
  }
  if (failure.qualityRegenerationAllowed !== false) fail("replacement failure must continue to forbid quality regeneration");

  const allowedFiles = new Set([
    source.attemptStartPath,
    source.terminalFailurePath,
    ...binding.durableState.journalFiles.map(({ file }) => `${binding.durableState.journalRoot}/${file}`),
  ]);
  const observedFiles = recursiveFiles(source.outputRoot);
  if (observedFiles.length !== allowedFiles.size || observedFiles.some((path) => !allowedFiles.has(path))) {
    fail("replacement failed-attempt output root contains unexpected generation/publication/result material");
  }

  return { attempt, failure, observedFiles };
}

function assertJournalIntegrity(record, file) {
  const { recordDigest, ...core } = record;
  if (recordDigest !== digest(core)) fail(`durable journal record digest mismatch: ${file}`);
  const { requestDigest, ...requestCore } = record.request ?? {};
  if (requestDigest !== digest(requestCore)) fail(`durable journal request digest mismatch: ${file}`);
  if (record.resultDigest !== digest(record.result)) fail(`durable journal result digest mismatch: ${file}`);
}

function verifyDurableResumePoint(binding, failure) {
  const journal = binding.durableState;
  const records = [];
  for (const expected of journal.journalFiles) {
    const path = `${journal.journalRoot}/${expected.file}`;
    if (!existsSync(absolute(path))) fail(`missing durable journal record ${expected.file}`);
    if (fileSha256(path) !== expected.sha256) fail(`durable journal file SHA-256 drift: ${expected.file}`);
    const record = readJson(path);
    assertJournalIntegrity(record, expected.file);
    records.push(record);
  }
  if (records.length !== journal.requiredCommittedInvocationCount) fail("durable journal committed invocation count drift");

  const observedIds = records.map((record) => record.request.clientRequestId).sort();
  const expectedIds = [...journal.requiredCommittedRequestIds].sort();
  if (canonicalJson(observedIds) !== canonicalJson(expectedIds)) fail("durable journal committed request-ID set drift");
  if (records.some((record) => record.request.clientRequestId.includes(":pass-b:"))) fail("Pass-B invocation was durably committed before the mechanical failure");

  const responseIds = failure.modelEvents
    .filter((event) => event?.channel === "provider" && event?.type === "model_response")
    .map((event) => event.clientRequestId)
    .sort();
  const commitIds = failure.modelEvents
    .filter((event) => event?.channel === "durable" && event?.type === "durable_model_commit")
    .map((event) => event.clientRequestId)
    .sort();
  if (canonicalJson(responseIds) !== canonicalJson(expectedIds) || canonicalJson(commitIds) !== canonicalJson(expectedIds)) {
    fail("terminal failure event trail does not show exactly ten successful/durable Pass-A calls");
  }

  const firstPassB = journal.firstUncommittedIntendedRequestId;
  const passBAttempts = failure.modelEvents.filter((event) => event?.type === "model_attempt" && event.clientRequestId === firstPassB);
  const passBFailures = failure.modelEvents.filter((event) => event?.type === "operational_failure" && event.clientRequestId === firstPassB);
  const passBResponses = failure.modelEvents.filter((event) => event?.type === "model_response" && event.clientRequestId === firstPassB);
  const passBCommits = failure.modelEvents.filter((event) => event?.type === "durable_model_commit" && event.clientRequestId === firstPassB);
  if (passBAttempts.length !== 1 || passBFailures.length !== 1 || passBResponses.length !== 0 || passBCommits.length !== 0) {
    fail("first Pass-B call was not an uncommitted provider-configuration rejection");
  }
  const operational = passBFailures[0].failure;
  if (operational?.code !== "MODEL_REQUEST_CONFIGURATION_ERROR" || operational?.httpStatus !== 400 ||
      operational?.providerErrorCode !== binding.sourceAttempt.requiredFailure.providerErrorCode ||
      operational?.providerErrorType !== binding.sourceAttempt.requiredFailure.providerErrorType ||
      !operational?.message?.includes(binding.sourceAttempt.requiredFailure.messageContains)) {
    fail("first Pass-B operational failure classification drift");
  }

  const configurationDigests = [...new Set(records.map((record) => record.request.configurationDigest))];
  if (configurationDigests.length !== 1) fail("durable Pass-A records disagree on adapter configuration digest");
  return Object.freeze({
    committedCount: records.length,
    committedRequestIds: Object.freeze([...expectedIds]),
    configurationDigest: configurationDigests[0],
    firstUncommittedRequestId: firstPassB,
  });
}

function verifySchemaCompatibility(binding, journalState) {
  const correction = binding.schemaCompatibilityCorrection;
  if (passBResponseSchemaHash() !== correction.canonicalPassBSchemaHash) fail("canonical frozen Pass-B response schema hash drift");
  if (GENESIS_PASS_B_RESPONSE_SCHEMA.properties.episodeRefs.uniqueItems !== true) fail("canonical Pass-B uniqueItems requirement was weakened");
  if (GENESIS_PASS_B_RESPONSE_SCHEMA.properties.rememberedContent.maxLength !== 600) fail("canonical Pass-B rememberedContent maxLength drift");
  if (GENESIS_PASS_B_RESPONSE_SCHEMA.properties.uncertainty.maxItems !== 8 ||
      GENESIS_PASS_B_RESPONSE_SCHEMA.properties.uncertainty.items.maxLength !== 120) fail("canonical Pass-B uncertainty bounds drift");

  const projected = projectOpenAIStructuredOutputSchema(GENESIS_PASS_B_RESPONSE_SCHEMA);
  if (Object.hasOwn(projected.properties.episodeRefs, "uniqueItems")) fail("OpenAI provider projection still contains unsupported uniqueItems");
  if (Object.hasOwn(projected.properties.rememberedContent, "maxLength") ||
      Object.hasOwn(projected.properties.uncertainty.items, "maxLength")) fail("OpenAI provider projection still contains unsupported maxLength");
  if (projected.properties.uncertainty.maxItems !== 8) fail("OpenAI provider projection removed supported maxItems");
  if (GENESIS_PASS_B_RESPONSE_SCHEMA.properties.episodeRefs.uniqueItems !== true) fail("provider projection mutated canonical Pass-B schema");

  let duplicateRejected = false;
  try {
    assertOpenAIProjectedSchemaConstraints({
      outcome: "remembered",
      episodeRefs: ["ep_a", "ep_a"],
      rememberedContent: "A bounded remembered event.",
      uncertainty: [],
    }, GENESIS_PASS_B_RESPONSE_SCHEMA);
  } catch (error) {
    duplicateRejected = error?.code === "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR" && error?.providerErrorCode === "uniqueItems";
  }
  if (!duplicateRejected) fail("OpenAI local canonical enforcement does not restore uniqueItems");

  let lengthRejected = false;
  try {
    assertOpenAIProjectedSchemaConstraints({
      outcome: "remembered",
      episodeRefs: ["ep_a"],
      rememberedContent: "x".repeat(601),
      uncertainty: [],
    }, GENESIS_PASS_B_RESPONSE_SCHEMA);
  } catch (error) {
    lengthRejected = error?.code === "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR" && error?.providerErrorCode === "maxLength";
  }
  if (!lengthRejected) fail("OpenAI local canonical enforcement does not restore maxLength");

  let domainDuplicateRejected = false;
  try {
    assertUniquePassBEpisodeRefs(["ep_a", "ep_a"]);
  } catch {
    domainDuplicateRejected = true;
  }
  if (!domainDuplicateRejected) fail("Pass-B domain does not reject duplicate episodeRefs");

  const executionBinding = readJson(EXECUTION_BINDING_PATH);
  const g4 = readJson(executionBinding.authorityBoundary.g4BaseProtocolPath);
  const runtime = g4.commonRuntime;
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "recovery-preflight-never-used" },
    modelId: runtime.modelId,
    timeoutMs: runtime.timeoutMs,
    maxOutputTokens: runtime.maxOutputTokens === "auto" ? null : runtime.maxOutputTokens,
    temperature: runtime.temperature,
    topP: runtime.topP,
    reasoningEffort: runtime.reasoningEffort,
    retryLimit: runtime.operationalRetryLimit,
    retryDelayMs: runtime.operationalRetryDelayMs,
    fetchImpl: async () => { throw new Error("recovery preflight must never call provider transport"); },
  });
  const currentConfigurationDigest = digest(adapter.configuration);
  if (currentConfigurationDigest !== journalState.configurationDigest) {
    fail("OpenAI adapter configuration digest changed; durable Pass-A replay would conflict");
  }

  return Object.freeze({
    canonicalPassBSchemaHash: correction.canonicalPassBSchemaHash,
    projectedKeywords: Object.freeze([...correction.providerProjectedKeywords]),
    supportedMaxItemsRetained: true,
    localCanonicalConstraintEnforcement: true,
    adapterConfigurationDigest: currentConfigurationDigest,
  });
}

export function verifyReplacementMechanicalRecoveryPreflight() {
  const binding = readJson(RECOVERY_BINDING_PATH);
  if (binding.recoveryVersion !== "pr39-replacement-mechanical-recovery-v1" ||
      binding.status !== "frozen_pre_review_zero_call_recovery_boundary") fail("unexpected replacement recovery binding version/status");
  if (binding.recoveryAuthorization.providerCallsAuthorizedByThisFreeze !== false ||
      binding.recoveryAuthorization.recoveryExecutionAuthorized !== false) fail("pre-review recovery binding must authorize zero cognition calls");
  if (existsSync(absolute(binding.recoveryAuthorization.futureClearWitnessPath))) {
    fail("mechanical recovery CLEAR witness already exists; this pre-review verifier refuses to infer authorization");
  }

  const evidence = assertExactLocalEvidence(binding);
  const journal = verifyDurableResumePoint(binding, evidence.failure);
  const schema = verifySchemaCompatibility(binding, journal);

  return Object.freeze({
    status: "CLEAR_RESUME_POINT_REVIEW_REQUIRED",
    recoveryVersion: binding.recoveryVersion,
    attemptStartedAt: binding.sourceAttempt.attemptStartedAt,
    sourceTerminalStatus: binding.sourceAttempt.requiredTerminalStatus,
    durablePassACommits: journal.committedCount,
    durablePassBCommits: 0,
    firstUncommittedRequestId: journal.firstUncommittedRequestId,
    schema,
    originalAttemptConsumed: true,
    recoveryExecutionAuthorized: false,
    providerCallsMadeByPreflight: 0,
    writesMadeByPreflight: 0,
  });
}

function print(result) {
  process.stdout.write(`PR39 REPLACEMENT MECHANICAL RECOVERY PREFLIGHT: ${result.status}\n\n`);
  process.stdout.write(`Original one-shot attempt: TERMINAL HOLD PRESERVED\n`);
  process.stdout.write(`Attempt started: ${result.attemptStartedAt}\n`);
  process.stdout.write(`Durable Pass-A commits preserved: ${result.durablePassACommits}\n`);
  process.stdout.write(`Durable Pass-B commits: ${result.durablePassBCommits}\n`);
  process.stdout.write(`Exact first uncommitted cognition request: ${result.firstUncommittedRequestId}\n`);
  process.stdout.write(`Canonical Pass-B schema: ${result.schema.canonicalPassBSchemaHash} [unchanged]\n`);
  process.stdout.write(`OpenAI provider projection: ${result.schema.projectedKeywords.join(", ")} only; canonical constraints re-enforced locally\n`);
  process.stdout.write(`Durable adapter configuration digest: ${result.schema.adapterConfigurationDigest} [compatible with preserved Pass-A records]\n`);
  process.stdout.write("Same-attempt recovery: REVIEW REQUIRED\n");
  process.stdout.write("Recovery cognition: NOT AUTHORIZED\n\n");
  process.stdout.write("Preflight made zero provider calls and wrote no recovery/life artifacts.\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--preflight")) {
    throw new Error("usage: genesis-replacement-mechanical-recovery-preflight.mjs [--preflight]");
  }
  print(verifyReplacementMechanicalRecoveryPreflight());
}
