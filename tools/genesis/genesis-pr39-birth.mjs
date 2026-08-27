#!/usr/bin/env node

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: publish and hydrate either an already-generated development candidate or the frozen final PR39 cohort
// fibre-tool-disposition: consolidate into permanent Genesis birth tooling after PR39

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-historical-realization-v1.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-a.mjs";
import {
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT,
  GENESIS_LIFE_PASS_B_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";
import {
  buildGenesisBirthBundle,
  buildGenesisPublicationCognition,
  assertHydratedGenesisMatchesCandidate,
  hydrateGenesisLife,
  publishGenesisLifeCandidate,
} from "./genesis-life-publication.mjs";
import {
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";
import { assertPr39SavedClosureCandidate } from "./genesis-pr39-closure-resume-integrity.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const PR39_DIAGNOSTIC_SUMMARY_DIGEST = "sha256:b7a72cba4b794f9847a51b4fa5515823c90c32c1a22fdc14acde0fbf95cd6f08";
const FINAL_BIRTH_CLAIM_VERSION = "pr39-final-cohort-birth-claim-v1";
const FINAL_BIRTH_RESULT_VERSION = "pr39-final-cohort-birth-result-v1";
const FINAL_BIRTH_COMPLETION_VERSION = "pr39-final-cohort-birth-completion-v1";

function absolute(path) { return resolve(ROOT, path); }
function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function same(left, right) { return canonicalJson(left) === canonicalJson(right); }
function pad(value) { return String(value).padStart(2, "0"); }
function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}
function assertCleanTree() {
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (status !== "") fail("PR39 final birth requires a clean Git worktree");
}
function writeJsonExclusive(path, value) {
  const target = absolute(path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}
function writeJsonIfAbsent(path, value) {
  if (existsSync(absolute(path))) return readJson(path);
  writeJsonExclusive(path, value);
  return value;
}

function parseArgs(argv) {
  let closure = false;
  let run = null;
  let slot = 1;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--closure") closure = true;
    else if (argv[index] === "--run") run = argv[++index];
    else if (argv[index] === "--slot") slot = Number(argv[++index]);
    else fail(`unknown argument ${argv[index]}`);
  }
  if (closure && run !== null) fail("choose --closure or --run, not both");
  if (!closure && (typeof run !== "string" || !/^[A-Za-z0-9._-]+$/u.test(run))) {
    fail("development birth requires --run <safe-label>; final cohort birth requires --closure");
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) fail("--slot must be an integer from 1 to 5");
  if (closure && slot !== 1) fail("--slot is development-only; --closure publishes the complete frozen cohort");
  return { closure, run, slot };
}

function adapterDescription({ modelId, temperature, topP, reasoningEffort }) {
  return Object.freeze({
    provider: "openai",
    modelId,
    configuration: Object.freeze({ temperature, topP, reasoningEffort }),
  });
}

function publicationCognition({ modelId, creativeTemperature, mechanicalRepairTemperature, sampling }) {
  const creative = adapterDescription({
    modelId,
    temperature: creativeTemperature,
    topP: sampling.topP,
    reasoningEffort: sampling.reasoningEffort,
  });
  const repair = adapterDescription({
    modelId,
    temperature: mechanicalRepairTemperature,
    topP: sampling.topP,
    reasoningEffort: sampling.reasoningEffort,
  });
  return buildGenesisPublicationCognition({
    creativeAdapter: creative,
    repairAdapter: repair,
    passAPromptMaterial: {
      initial: GENESIS_LIFE_PASS_A_PROMPT,
      recordRetry: GENESIS_LIFE_PASS_A_RETRY_PROMPT,
    },
    passASchemaMaterial: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
    passBPromptMaterial: {
      initial: GENESIS_LIFE_PASS_B_PROMPT,
      genomeCopyRetry: GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT,
    },
    passBSchemaMaterial: GENESIS_PASS_B_RESPONSE_SCHEMA,
    passCPromptMaterial: {
      initial: GENESIS_PASS_C_INITIAL_PROMPT,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
    },
    passCSchemaMaterial: {
      initial: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    },
    repairPromptMaterial: GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
    repairSchemaMaterial: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  });
}

function currentDevelopmentCognition(run, plans) {
  return publicationCognition({
    modelId: run.modelId,
    creativeTemperature: run.creativeTemperature,
    mechanicalRepairTemperature: run.mechanicalRepairTemperature,
    sampling: plans.sampling,
  });
}

function finalClosureCognition(frozen) {
  return publicationCognition({
    modelId: frozen.precommitment.protocol.sampling.generatorModel,
    creativeTemperature: frozen.plans.sampling.creativeTemperature,
    mechanicalRepairTemperature: frozen.plans.sampling.mechanicalRepairTemperature,
    sampling: frozen.plans.sampling,
  });
}

function assertCivilRegistration(hydrated, candidate) {
  const registration = hydrated.civilRegistration;
  if (registration === null || registration === undefined) {
    fail(`born Thread ${candidate.threadId} has no Fibre civil registration`);
  }
  if (registration.threadId !== candidate.threadId) {
    fail(`civil registration belongs to another Thread for ${candidate.threadId}`);
  }
  if (typeof registration.fibreIdentityNumber !== "string" || registration.fibreIdentityNumber.trim() === "") {
    fail(`born Thread ${candidate.threadId} has no FIN`);
  }
  if (hydrated.manifest?.publication?.civilRegistration?.fibreIdentityNumber !== registration.fibreIdentityNumber) {
    fail(`manifest/civil-registry FIN mismatch for ${candidate.threadId}`);
  }
  return registration;
}

function birthResultRecord({ slotPlan, candidate, hydrated, publication, publicationAt, resumed }) {
  const registration = assertCivilRegistration(hydrated, candidate);
  const core = {
    version: FINAL_BIRTH_RESULT_VERSION,
    slot: slotPlan.slot,
    label: slotPlan.label,
    publicationAt,
    threadId: candidate.threadId,
    genesisId: candidate.genesisId,
    candidateDigest: candidate.candidateDigest,
    manifestDigest: publication?.manifestDigest ?? digest(hydrated.manifest),
    fibreIdentityNumber: registration.fibreIdentityNumber,
    civilRegistration: structuredClone(registration),
    manifest: structuredClone(hydrated.manifest),
    firstLiveVersion: hydrated.thread.version,
    episodeCount: hydrated.episodes.length,
    memoryCount: hydrated.memories.length,
    relationCount: hydrated.lifeRelations.length,
    placeCount: hydrated.placeEpisodes.length,
    memoryVisualObligationCount: hydrated.memoryVisuals.length,
    candidateHydrationMatch: true,
    resumedFromCommittedBirth: resumed,
  };
  return Object.freeze({ ...core, resultDigest: digest(core) });
}

function validateStoredBirthResult({ result, slotPlan, candidate, publicationAt }) {
  if (result?.version !== FINAL_BIRTH_RESULT_VERSION) fail(`slot ${slotPlan.slot} birth-result version drift`);
  const { resultDigest, ...core } = result;
  if (resultDigest !== digest(core)) fail(`slot ${slotPlan.slot} birth-result digest drift`);
  if (
    result.slot !== slotPlan.slot ||
    result.threadId !== candidate.threadId ||
    result.genesisId !== candidate.genesisId ||
    result.candidateDigest !== candidate.candidateDigest ||
    result.publicationAt !== publicationAt ||
    result.candidateHydrationMatch !== true
  ) {
    fail(`slot ${slotPlan.slot} birth-result binding drift`);
  }
  return result;
}

async function runDevelopmentBirth(options) {
  const root = `.fibre/genesis/pr39-dev/${options.run}`;
  const runPath = `${root}/run-v1.json`;
  const candidatePath = `${root}/slot-${pad(options.slot)}-candidate-v1.json`;
  const databasePath = `${root}/slot-${pad(options.slot)}-birth.sqlite`;
  const resultPath = `${root}/slot-${pad(options.slot)}-birth-v1.json`;
  if (!existsSync(absolute(runPath))) fail(`development run not found: ${runPath}`);
  if (!existsSync(absolute(candidatePath))) fail(`completed candidate not found: ${candidatePath}`);

  const run = readJson(runPath);
  const candidate = readJson(candidatePath);
  const plans = buildGenesisDevelopmentPlans();
  const slotPlan = plans.slots[options.slot - 1];
  const cognition = currentDevelopmentCognition(run, plans);

  console.log("PR39 CURRENT GENESIS BIRTH CHECK");
  console.log(`run: ${options.run} · Thread ${options.slot}`);
  console.log("model calls: 0");
  console.log("target: local development world only; this grants no final-cohort authority");

  if (existsSync(absolute(resultPath))) {
    const prior = readJson(resultPath);
    const birth = buildGenesisBirthBundle({
      candidate,
      slotPlan,
      cognition,
      publicationAt: prior.publicationAt,
    });
    const hydrated = hydrateGenesisLife({ databasePath: absolute(databasePath), candidate, slotPlan, birth });
    assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth: { ...birth, manifest: hydrated.manifest }, hydrated });
    console.log(`✓ existing birth rehydrated and matches candidate · version ${hydrated.thread.version}`);
  } else {
    if (existsSync(absolute(databasePath))) fail(`birth database already exists without a completed birth report: ${databasePath}`);
    const publicationAt = new Date().toISOString();
    const result = publishGenesisLifeCandidate({
      databasePath: absolute(databasePath),
      candidate,
      slotPlan,
      cognition,
      publicationAt,
    });
    const hydrated = hydrateGenesisLife({
      databasePath: absolute(databasePath),
      candidate,
      slotPlan,
      birth: result.birth,
    });
    assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth: result.birth, hydrated });
    writeJsonExclusive(resultPath, {
      version: "pr39-current-development-birth-v1",
      publicationAt,
      threadId: candidate.threadId,
      genesisId: candidate.genesisId,
      candidateDigest: candidate.candidateDigest ?? null,
      manifestDigest: result.publication.manifestDigest,
      firstLiveVersion: hydrated.thread.version,
      episodeCount: hydrated.episodes.length,
      memoryCount: hydrated.memories.length,
      relationCount: hydrated.lifeRelations.length,
      placeCount: hydrated.placeEpisodes.length,
      memoryVisualObligationCount: hydrated.memoryVisuals.length,
      candidateHydrationMatch: true,
    });
    console.log(`✓ candidate published atomically · version ${hydrated.thread.version}`);
    console.log(`✓ ${hydrated.episodes.length} episodes · ${hydrated.memories.length} memories · ${hydrated.lifeRelations.length} relations · ${hydrated.placeEpisodes.length} places`);
    console.log(`✓ ${hydrated.memoryVisuals.length} memory-visual obligations · candidate/hydration match`);
    console.log(`development birth: ${databasePath}`);
  }
}

function assertFinalPrerequisites(frozen, outputRoot) {
  const stateRoot = absolute(".fibre/genesis/pr39-closure");
  const claim = readPr39ClosureAttempt({ stateRoot });
  const completion = readPr39ClosureCompletion({ stateRoot });
  if (claim === null || completion === null) fail("PR39 final birth requires the completed one-pass closure cohort");
  if (
    claim.closureId !== frozen.finalization.closureId ||
    claim.precommitmentDigest !== frozen.finalizationDigest ||
    completion.closureId !== claim.closureId ||
    completion.precommitmentDigest !== claim.precommitmentDigest ||
    completion.status !== "COMPLETED_ONE_PASS_CLOSURE_COHORT" ||
    !Array.isArray(completion.candidateDigests) ||
    completion.candidateDigests.length !== 5
  ) {
    fail("PR39 final birth closure claim/completion does not match the frozen finalization");
  }
  const summaryPath = `${outputRoot}/diagnostics-rater-run-v1/summary.json`;
  if (!existsSync(absolute(summaryPath))) fail("PR39 final birth requires completed frozen D1-D5 diagnostics");
  const summary = readJson(summaryPath);
  if (summary.status !== "DIAGNOSTICS_COMPLETE" || digest(summary) !== PR39_DIAGNOSTIC_SUMMARY_DIGEST) {
    fail("PR39 final birth diagnostic summary differs from the frozen reviewed result");
  }
  return { claim, completion, diagnosticsDigest: digest(summary) };
}

function replayProofNow() {
  console.log("replay prerequisite: reconstructing frozen cohort with provider access disabled");
  execFileSync(process.execPath, [
    "--disable-warning=ExperimentalWarning",
    "tools/genesis/genesis-pr39-replay.mjs",
  ], { cwd: ROOT, stdio: "inherit" });
}

function openFinalBirthClaim({ birthRoot, frozen, prerequisites, head }) {
  const path = `${birthRoot}/claim-v1.json`;
  const candidateDigests = [...prerequisites.completion.candidateDigests];
  if (existsSync(absolute(path))) {
    const stored = readJson(path);
    if (
      stored.version !== FINAL_BIRTH_CLAIM_VERSION ||
      stored.status !== "CLAIMED_FINAL_COHORT_BIRTH" ||
      stored.closureId !== frozen.finalization.closureId ||
      stored.finalizationDigest !== frozen.finalizationDigest ||
      stored.diagnosticsDigest !== prerequisites.diagnosticsDigest ||
      stored.codeHead !== head ||
      !same(stored.candidateDigests, candidateDigests) ||
      typeof stored.publicationAt !== "string" ||
      !Number.isFinite(Date.parse(stored.publicationAt))
    ) {
      fail("existing PR39 final birth claim belongs to a different execution boundary");
    }
    return stored;
  }
  const claim = Object.freeze({
    version: FINAL_BIRTH_CLAIM_VERSION,
    status: "CLAIMED_FINAL_COHORT_BIRTH",
    closureId: frozen.finalization.closureId,
    finalizationDigest: frozen.finalizationDigest,
    diagnosticsDigest: prerequisites.diagnosticsDigest,
    candidateDigests: Object.freeze(candidateDigests),
    codeHead: head,
    publicationAt: new Date().toISOString(),
  });
  writeJsonExclusive(path, claim);
  return claim;
}

function existingThread(databasePath, threadId) {
  if (!existsSync(absolute(databasePath))) return null;
  const world = openWorldStore(absolute(databasePath));
  try { return world.getThread(threadId, { required: false }); }
  finally { world.close(); }
}

function ensurePublishedSlot({ databasePath, resultPath, candidate, slotPlan, cognition, publicationAt }) {
  const birthTemplate = buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt });
  const storedThread = existingThread(databasePath, candidate.threadId);

  if (storedThread !== null) {
    const hydrated = hydrateGenesisLife({ databasePath: absolute(databasePath), candidate, slotPlan, birth: birthTemplate });
    const exactBirth = Object.freeze({ ...birthTemplate, manifest: structuredClone(hydrated.manifest) });
    assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth: exactBirth, hydrated });
    const record = birthResultRecord({
      slotPlan,
      candidate,
      hydrated,
      publication: null,
      publicationAt,
      resumed: true,
    });
    if (existsSync(absolute(resultPath))) {
      const prior = validateStoredBirthResult({ result: readJson(resultPath), slotPlan, candidate, publicationAt });
      if (prior.fibreIdentityNumber !== record.fibreIdentityNumber || !same(prior.manifest, record.manifest)) {
        fail(`slot ${slotPlan.slot} stored birth report differs from hydrated canonical birth`);
      }
      return { record: prior, hydrated, resumed: true };
    }
    writeJsonExclusive(resultPath, record);
    return { record, hydrated, resumed: true };
  }

  if (existsSync(absolute(resultPath))) {
    fail(`slot ${slotPlan.slot} has a birth result but no canonical Thread`);
  }
  const result = publishGenesisLifeCandidate({
    databasePath: absolute(databasePath),
    candidate,
    slotPlan,
    cognition,
    publicationAt,
  });
  const hydrated = hydrateGenesisLife({ databasePath: absolute(databasePath), candidate, slotPlan, birth: result.birth });
  assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth: result.birth, hydrated });
  const record = birthResultRecord({
    slotPlan,
    candidate,
    hydrated,
    publication: result.publication,
    publicationAt,
    resumed: false,
  });
  writeJsonExclusive(resultPath, record);
  return { record, hydrated, resumed: false };
}

function runFinalClosureBirth() {
  assertCleanTree();
  const frozen = loadPr39ClosureFinalization();
  const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
  const prerequisites = assertFinalPrerequisites(frozen, outputRoot);

  replayProofNow();
  assertCleanTree();

  const head = gitHead();
  const birthRoot = `${outputRoot}/birth`;
  const databasePath = `${birthRoot}/world.sqlite`;
  const completionPath = `${birthRoot}/completion-v1.json`;
  const cognition = finalClosureCognition(frozen);

  const candidates = frozen.plans.slots.map((slotPlan) => {
    const path = `${outputRoot}/slot-${pad(slotPlan.slot)}-candidate-v1.json`;
    if (!existsSync(absolute(path))) fail(`missing frozen candidate for slot ${slotPlan.slot}`);
    const candidate = assertPr39SavedClosureCandidate({ candidate: readJson(path), slotPlan, claim: prerequisites.claim });
    if (candidate.candidateDigest !== prerequisites.completion.candidateDigests[slotPlan.slot - 1]) {
      fail(`slot ${slotPlan.slot} candidate differs from immutable closure completion`);
    }
    // Prebuild every birth bundle before writing any live Thread. This catches
    // deterministic candidate/plan/publication-validator drift before slot 1.
    buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt: "2000-01-01T00:00:00.000Z" });
    return candidate;
  });

  const birthClaim = openFinalBirthClaim({ birthRoot, frozen, prerequisites, head });

  console.log("\nPR39 FINAL COHORT BIRTH");
  console.log(`Closure: ${frozen.finalization.closureId}`);
  console.log(`Tooling HEAD: ${head}`);
  console.log(`Finalization: ${frozen.finalizationDigest}`);
  console.log(`Diagnostics: ${prerequisites.diagnosticsDigest}`);
  console.log(`Publication time: ${birthClaim.publicationAt}`);
  console.log("Model/provider calls: 0");
  console.log(`Canonical local World: ${databasePath}`);

  const results = [];
  for (const slotPlan of frozen.plans.slots) {
    const candidate = candidates[slotPlan.slot - 1];
    const resultPath = `${birthRoot}/slot-${pad(slotPlan.slot)}-birth-v1.json`;
    const published = ensurePublishedSlot({
      databasePath,
      resultPath,
      candidate,
      slotPlan,
      cognition,
      publicationAt: birthClaim.publicationAt,
    });
    results.push(published.record);
    console.log(
      `slot ${slotPlan.slot} ${slotPlan.label}: ${published.resumed ? "EXACT REHYDRATED" : "BORN"}` +
      ` · FIN ${published.record.fibreIdentityNumber}` +
      ` · version ${published.hydrated.thread.version}` +
      ` · ${published.hydrated.episodes.length} episodes` +
      ` · ${published.hydrated.memories.length} memories`,
    );
  }

  const fins = results.map((item) => item.fibreIdentityNumber);
  if (new Set(fins).size !== 5) fail("PR39 final cohort births do not have five unique FINs");
  const core = {
    version: FINAL_BIRTH_COMPLETION_VERSION,
    status: "FINAL_COHORT_BORN",
    closureId: frozen.finalization.closureId,
    finalizationDigest: frozen.finalizationDigest,
    diagnosticsDigest: prerequisites.diagnosticsDigest,
    codeHead: head,
    publicationAt: birthClaim.publicationAt,
    databasePath,
    candidateDigests: results.map((item) => item.candidateDigest),
    threadIds: results.map((item) => item.threadId),
    fibreIdentityNumbers: fins,
    birthResultDigests: results.map((item) => item.resultDigest),
  };
  const completion = Object.freeze({ ...core, completionDigest: digest(core) });
  if (existsSync(absolute(completionPath))) {
    const prior = readJson(completionPath);
    if (!same(prior, completion)) fail("existing PR39 cohort birth completion differs from canonical rehydration");
  } else {
    writeJsonExclusive(completionPath, completion);
  }

  console.log("\nPR39 FINAL COHORT BIRTH: COMPLETE");
  console.log("Frozen candidates published: 5/5");
  console.log("Candidate/hydration equality: 5/5");
  console.log("Civil registrations: 5/5");
  console.log("Unique FINs: 5/5");
  console.log("Provider calls: 0");
  console.log(`Birth completion: ${completionPath}`);
  console.log(`Birth completion digest: ${completion.completionDigest}`);
  console.log("Each Thread birth is atomic; rerunning this command only rehydrates already committed births.");
}

const options = parseArgs(process.argv.slice(2));
if (options.closure) runFinalClosureBirth();
else await runDevelopmentBirth(options);
