#!/usr/bin/env node

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: reconstruct the frozen PR39 cohort entirely from durable model-invocation evidence
// fibre-tool-disposition: retire after PR39; retain summarized replay proof in milestone history

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import { createBirthCenterRuntime } from "#services/birth-center/src/runtime.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { generateGenesisLifeCandidate } from "./genesis-life-candidate.mjs";
import {
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";
import {
  buildPr39ClosureRepairProfile,
  createPr39ClosureCallRecorder,
} from "./genesis-pr39-closure-profile.mjs";
import {
  assertPr39SavedClosureCandidate,
  assertPr39SavedClosureRepairProfile,
} from "./genesis-pr39-closure-resume-integrity.mjs";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function pad(value) { return String(value).padStart(2, "0"); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function same(left, right) { return canonicalJson(left) === canonicalJson(right); }

function assertCompletedClosure({ frozen, claim, completion }) {
  if (claim === null) fail("PR39 replay requires the preserved closure claim");
  if (completion === null) fail("PR39 replay requires the completed frozen cohort");
  const expectedModel = frozen.precommitment.protocol.sampling.generatorModel;
  if (
    claim.closureId !== frozen.finalization.closureId ||
    claim.precommitmentDigest !== frozen.finalizationDigest ||
    claim.modelId !== expectedModel
  ) {
    fail("PR39 replay claim does not match the frozen finalization");
  }
  if (
    completion.status !== "COMPLETED_ONE_PASS_CLOSURE_COHORT" ||
    completion.closureId !== claim.closureId ||
    completion.codeHead !== claim.codeHead ||
    completion.precommitmentDigest !== claim.precommitmentDigest ||
    completion.modelId !== claim.modelId ||
    !Array.isArray(completion.candidateDigests) ||
    completion.candidateDigests.length !== 5
  ) {
    fail("PR39 replay requires the exact completed closure claim");
  }
  return expectedModel;
}

function assertDiagnosticsComplete({ outputRoot, frozen }) {
  const summaryPath = `${outputRoot}/diagnostics-rater-run-v1/summary.json`;
  if (!existsSync(absolute(summaryPath))) fail("PR39 replay follows D1-D5 and requires the frozen diagnostic summary");
  const summary = readJson(summaryPath);
  if (
    summary.status !== "DIAGNOSTICS_COMPLETE" ||
    summary.closureId !== frozen.finalization.closureId ||
    summary.finalizationDigest !== frozen.finalizationDigest ||
    summary.providerCallsMade !== 180
  ) {
    fail("PR39 replay diagnostic prerequisite does not match the completed frozen run");
  }
  return { summary, summaryDigest: digest(summary) };
}

function createReplayOnlyOpenAIAdapter({ modelId, temperature, topP, reasoningEffort, providerAccess }) {
  return createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "pr39-replay-network-disabled" },
    modelId,
    temperature,
    topP,
    reasoningEffort,
    fetchImpl: async () => {
      providerAccess.count += 1;
      throw new Error("PR39 durable replay attempted forbidden provider access");
    },
  });
}

const frozen = loadPr39ClosureFinalization();
const stateRoot = absolute(".fibre/genesis/pr39-closure");
const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
const claim = readPr39ClosureAttempt({ stateRoot });
const completion = readPr39ClosureCompletion({ stateRoot });
const modelId = assertCompletedClosure({ frozen, claim, completion });
const diagnostics = assertDiagnosticsComplete({ outputRoot, frozen });

const providerAccess = { count: 0 };
let replayedCalls = 0;
let committedCalls = 0;
const observer = (event) => {
  if (event.type === "durable_model_replay") replayedCalls += 1;
  if (event.type === "durable_model_commit") committedCalls += 1;
};

const birthCenter = createBirthCenterRuntime({ stateRoot: absolute(`${outputRoot}/runtime`) });
const creativeBase = createReplayOnlyOpenAIAdapter({
  modelId,
  temperature: frozen.plans.sampling.creativeTemperature,
  topP: frozen.plans.sampling.topP,
  reasoningEffort: frozen.plans.sampling.reasoningEffort,
  providerAccess,
});
const repairBase = createReplayOnlyOpenAIAdapter({
  modelId,
  temperature: frozen.plans.sampling.mechanicalRepairTemperature,
  topP: frozen.plans.sampling.topP,
  reasoningEffort: frozen.plans.sampling.reasoningEffort,
  providerAccess,
});
const durableCreative = birthCenter.durableAdapter(creativeBase, { observer });
const durableRepair = birthCenter.durableAdapter(repairBase, { observer });

const journalFiles = readdirSync(birthCenter.invocationRoot)
  .filter((name) => /^invocation-[0-9a-f]{64}\.json$/u.test(name));

console.log("PR39 DURABLE REPLAY PROOF");
console.log(`Closure: ${frozen.finalization.closureId}`);
console.log(`Finalization: ${frozen.finalizationDigest}`);
console.log(`Diagnostics: ${diagnostics.summaryDigest}`);
console.log(`Model identity: openai/${modelId}`);
console.log("Provider network access: structurally disabled");

const replayedCandidateDigests = [];
for (const slotPlan of frozen.plans.slots) {
  const candidatePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-candidate-v1.json`;
  const profilePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-repair-profile-v1.json`;
  if (!existsSync(absolute(candidatePath))) fail(`PR39 replay missing frozen candidate for slot ${slotPlan.slot}`);
  if (!existsSync(absolute(profilePath))) fail(`PR39 replay missing repair profile for slot ${slotPlan.slot}`);

  const savedCandidate = assertPr39SavedClosureCandidate({
    candidate: readJson(candidatePath),
    slotPlan,
    claim,
  });
  const savedProfile = assertPr39SavedClosureRepairProfile({
    profile: readJson(profilePath),
    candidate: savedCandidate,
    slotPlan,
  });
  if (completion.candidateDigests[slotPlan.slot - 1] !== savedCandidate.candidateDigest) {
    fail(`PR39 replay slot ${slotPlan.slot} candidate differs from immutable closure completion`);
  }

  const before = replayedCalls;
  const recorder = createPr39ClosureCallRecorder();
  const replayedCandidate = await generateGenesisLifeCandidate({
    slotPlan,
    adapter: recorder.wrap(durableCreative),
    repairAdapter: recorder.wrap(durableRepair),
    attemptStartedAt: claim.claimedAt,
  });
  const replayedProfile = buildPr39ClosureRepairProfile({
    slotPlan,
    candidate: replayedCandidate,
    recordedCalls: recorder.snapshot(),
  });

  if (!same(replayedCandidate, savedCandidate)) {
    fail(`PR39 replay slot ${slotPlan.slot} reconstructed candidate bytes differ from the frozen candidate`);
  }
  if (!same(replayedProfile, savedProfile)) {
    fail(`PR39 replay slot ${slotPlan.slot} reconstructed repair accounting differs from the frozen profile`);
  }
  const slotReplayCount = replayedCalls - before;
  if (slotReplayCount <= 0) fail(`PR39 replay slot ${slotPlan.slot} consumed no durable model evidence`);
  replayedCandidateDigests.push(replayedCandidate.candidateDigest);
  console.log(`slot ${slotPlan.slot} ${slotPlan.label}: EXACT · ${slotReplayCount} durable calls · ${replayedCandidate.candidateDigest}`);
}

if (!same(replayedCandidateDigests, completion.candidateDigests)) {
  fail("PR39 replay candidate digest sequence differs from closure completion");
}
if (providerAccess.count !== 0) fail(`PR39 replay attempted ${providerAccess.count} forbidden provider access(es)`);
if (committedCalls !== 0) fail(`PR39 replay unexpectedly committed ${committedCalls} model invocation(s)`);
if (replayedCalls !== journalFiles.length) {
  fail(`PR39 replay consumed ${replayedCalls} durable calls but journal contains ${journalFiles.length} records`);
}

console.log("\nPR39 DURABLE REPLAY: EXACT");
console.log("Candidates reconstructed: 5/5");
console.log("Repair profiles reconstructed: 5/5");
console.log(`Durable model calls replayed: ${replayedCalls}/${journalFiles.length}`);
console.log("New durable model commits: 0");
console.log("Provider network accesses: 0");
console.log("The frozen cohort is restartable from its durable invocation history without model/provider access.");
