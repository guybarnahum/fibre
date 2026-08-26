// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: execute or operationally resume the single frozen PR39 closure cohort
// fibre-tool-disposition: retire after PR39; retain final cohort results in milestone history

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
import { createBirthCenterRuntime } from "#services/birth-center/src/runtime.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { generateGenesisLifeCandidate } from "./genesis-life-candidate.mjs";
import {
  completePr39ClosureAttempt,
  openOrResumePr39ClosureAttempt,
  readPr39ClosureAttempt,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";
import {
  PR39_CLOSURE_ORIGINAL_CLAIM_HEAD,
  assertPr39ClosureRecoveryMatchesExecution,
} from "./genesis-pr39-closure-recovery.mjs";
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
function removeIfPresent(path) {
  try { unlinkSync(path); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temp, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temp, target);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    removeIfPresent(temp);
  }
}
function gitHead() { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: absolute("."), encoding: "utf8" }).trim(); }
function pad(value) { return String(value).padStart(2, "0"); }

function parseArgs(argv) {
  let closure = false;
  let model = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--closure") closure = true;
    else if (arg === "--model") model = argv[++index];
    else fail(`unknown argument ${arg}`);
  }
  if (!closure) fail("the final PR39 cohort requires explicit --closure");
  return { model };
}

function progressLabel(clientRequestId) {
  if (typeof clientRequestId !== "string") return "model call";
  const passA = clientRequestId.match(/:slot-(\d+):pass-a:episode-(\d+)(?::|$)/u);
  if (passA) return `slot ${Number(passA[1])} · Pass A ${Number(passA[2])}/14`;
  const passB = clientRequestId.match(/:slot-(\d+):pass-b:call-(\d+)(?::|$)/u);
  if (passB) return `slot ${Number(passB[1])} · Pass B ${Number(passB[2])}/6`;
  const passCInitial = clientRequestId.match(/:slot-(\d+):pass-c:initial-(\d+)(?::|$)/u);
  if (passCInitial) return `slot ${Number(passCInitial[1])} · Pass C initial ${Number(passCInitial[2])}`;
  const passCReinterpret = clientRequestId.match(/:slot-(\d+):pass-c:reinterpret:/u);
  if (passCReinterpret) return `slot ${Number(passCReinterpret[1])} · Pass C reinterpretation`;
  return clientRequestId;
}

const options = parseArgs(process.argv.slice(2));
const frozen = loadPr39ClosureFinalization();
const expectedModel = frozen.precommitment.protocol.sampling.generatorModel;
const modelId = options.model ?? expectedModel;
if (modelId !== expectedModel) fail(`closure model is frozen to ${expectedModel}`);
const head = gitHead();
const stateRoot = absolute(".fibre/genesis/pr39-closure");
const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
const existingClaim = readPr39ClosureAttempt({ stateRoot });
if (existingClaim === null && head !== PR39_CLOSURE_ORIGINAL_CLAIM_HEAD) {
  fail("PR39 recovery code requires the preserved original closure claim; creating a replacement cohort is forbidden");
}
const recoveryExecution = existingClaim === null
  ? Object.freeze({ mode: "original", amendment: null })
  : assertPr39ClosureRecoveryMatchesExecution({
      stateRoot,
      claim: existingClaim,
      currentCodeHead: head,
      finalizationDigest: frozen.finalizationDigest,
      modelId,
    });
const claimCodeHead = existingClaim?.codeHead ?? head;

const opened = openOrResumePr39ClosureAttempt({
  stateRoot,
  closureId: frozen.finalization.closureId,
  codeHead: claimCodeHead,
  precommitmentDigest: frozen.finalizationDigest,
  modelId,
  claimedAt: new Date().toISOString(),
});

const manifest = {
  version: "pr39-final-closure-run-v1",
  status: "ONE_PASS_CLOSURE_COHORT",
  closureId: frozen.finalization.closureId,
  codeHead: opened.claim.codeHead,
  executionCodeHead: head,
  finalizationDigest: frozen.finalizationDigest,
  modelId,
  claimedAt: opened.claim.claimedAt,
  resumed: opened.resumed,
  recoveryAmendment: recoveryExecution.amendment === null ? null : {
    version: recoveryExecution.amendment.version,
    recoveryCodeHead: recoveryExecution.amendment.recoveryCodeHead,
    authorizedAt: recoveryExecution.amendment.authorizedAt,
    reason: recoveryExecution.amendment.reason,
  },
  publicationAuthorized: false,
  candidateGenerationAuthorized: true,
};
writeJson(`${outputRoot}/run-v1.json`, manifest);

let committed = 0;
let replayed = 0;
const heartbeatTimers = new Map();
const clearHeartbeat = (clientRequestId) => {
  const timer = heartbeatTimers.get(clientRequestId);
  if (timer !== undefined) clearInterval(timer);
  heartbeatTimers.delete(clientRequestId);
};
const observer = (event) => {
  const id = event.clientRequestId;
  const label = progressLabel(id);
  if (event.type === "model_attempt" && event.attempt === 1 && typeof id === "string") {
    clearHeartbeat(id);
    console.log(`  ${label}: provider request`);
    heartbeatTimers.set(id, setInterval(() => console.log(`  ${label}: waiting for model response...`), 15_000));
  }
  if (event.type === "model_response") {
    clearHeartbeat(id);
    const recovered = event.outputRecovery?.recoveries?.length ?? 0;
    console.log(`  ${label}: response${recovered > 0 ? ` · mechanical recovery ${recovered}` : ""}`);
  }
  if (event.type === "operational_failure" && event.retrying !== true) clearHeartbeat(id);
  if (event.type === "durable_model_commit") {
    committed += 1;
    console.log(`  ${label}: committed`);
  }
  if (event.type === "durable_model_replay") {
    replayed += 1;
    console.log(`  ${label}: replayed`);
  }
};
const birthCenter = createBirthCenterRuntime({ stateRoot: absolute(`${outputRoot}/runtime`) });
const creativeBase = createOpenAIModelAdapter({
  environment: process.env,
  modelId,
  observer,
  temperature: frozen.plans.sampling.creativeTemperature,
  topP: frozen.plans.sampling.topP,
  reasoningEffort: frozen.plans.sampling.reasoningEffort,
});
const repairBase = createOpenAIModelAdapter({
  environment: process.env,
  modelId,
  observer,
  temperature: frozen.plans.sampling.mechanicalRepairTemperature,
  topP: frozen.plans.sampling.topP,
  reasoningEffort: frozen.plans.sampling.reasoningEffort,
});
const durableCreative = birthCenter.durableAdapter(creativeBase, { observer });
const durableRepair = birthCenter.durableAdapter(repairBase, { observer });

console.log("PR39 FINAL CLOSURE COHORT");
console.log(`closure: ${frozen.finalization.closureId}`);
console.log(`claim code: ${opened.claim.codeHead}`);
console.log(`execution code: ${head}`);
console.log(`finalization: ${frozen.finalizationDigest}`);
console.log(`attempt: ${recoveryExecution.mode === "recovery" ? "authorized operational recovery of existing claim" : opened.resumed ? "operational resume of existing claim" : "new one-pass claim"}`);
if (recoveryExecution.amendment !== null) {
  console.log(`recovery: ${recoveryExecution.amendment.reason} · authorized ${recoveryExecution.amendment.authorizedAt}`);
}
console.log("publication: disabled until candidate diagnostics/replay stage");

const candidateDigests = [];
for (const slotPlan of frozen.plans.slots) {
  const candidatePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-candidate-v1.json`;
  const profilePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-repair-profile-v1.json`;
  if (existsSync(absolute(candidatePath))) {
    const candidate = assertPr39SavedClosureCandidate({
      candidate: readJson(candidatePath),
      slotPlan,
      claim: opened.claim,
    });
    if (!existsSync(absolute(profilePath))) fail(`saved closure candidate ${slotPlan.slot} lacks its repair profile`);
    assertPr39SavedClosureRepairProfile({
      profile: readJson(profilePath),
      candidate,
      slotPlan,
    });
    candidateDigests.push(candidate.candidateDigest);
    console.log(`slot ${slotPlan.slot} ${slotPlan.label}: reusing completed candidate ${candidate.candidateDigest}`);
    continue;
  }

  const recorder = createPr39ClosureCallRecorder();
  const adapter = recorder.wrap(durableCreative);
  const repairAdapter = recorder.wrap(durableRepair);
  let candidate = null;
  try {
    console.log(`slot ${slotPlan.slot} ${slotPlan.label}: generating frozen life`);
    candidate = await generateGenesisLifeCandidate({
      slotPlan,
      adapter,
      repairAdapter,
      attemptStartedAt: opened.claim.claimedAt,
    });
  } catch (error) {
    const profile = buildPr39ClosureRepairProfile({
      slotPlan,
      error,
      recordedCalls: recorder.snapshot(),
    });
    writeJson(profilePath, profile);
    throw error;
  }
  const profile = buildPr39ClosureRepairProfile({
    slotPlan,
    candidate,
    recordedCalls: recorder.snapshot(),
  });
  // The candidate file is the completed-slot marker. Write its matching repair
  // profile first so an interruption cannot leave an apparently complete slot
  // without the accounting needed to resume it safely.
  writeJson(profilePath, profile);
  writeJson(candidatePath, candidate);
  candidateDigests.push(candidate.candidateDigest);
  console.log(`slot ${slotPlan.slot}: admitted ${candidate.candidateDigest} · A versions ${profile.totals.generatedVersions} · repairs ${profile.totals.formRepairs} · retries ${profile.totals.recordRetries}`);
}

for (const timer of heartbeatTimers.values()) clearInterval(timer);
heartbeatTimers.clear();
const completion = completePr39ClosureAttempt({
  stateRoot,
  claim: opened.claim,
  candidateDigests,
  completedAt: new Date().toISOString(),
});
console.log(`\nclosure generation complete: ${completion.candidateDigests.length} candidates`);
console.log(`model calls this process: ${committed} new · ${replayed} replayed`);
console.log(`output: ${outputRoot}`);
console.log("No Thread was published. The one-pass cohort is now immutable input to D1-D5, replay, birth and closing review.");
