#!/usr/bin/env node

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: independently prove the born PR39 cohort hydrates exactly from canonical World state
// fibre-tool-disposition: retire after PR39; retain summarized hydration proof in milestone history

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";
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
import { openAutobiographicalMemoryInspectionStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { genesisRecordDigest } from "#services/world-kernel/src/genesis-domain.mjs";
import { applyEventToThread } from "#services/world-kernel/src/persistence-domain.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { canonicalJson, sha256, threadStateHash } from "#services/world-kernel/src/persistence-common.mjs";
import { openSituatedLifeInspectionStore } from "#services/world-kernel/src/situated-life-store.mjs";
import {
  assertHydratedGenesisMatchesCandidate,
  buildGenesisBirthBundle,
  buildGenesisPublicationCognition,
  hydrateGenesisLife,
} from "./genesis-life-publication.mjs";
import {
  readPr39ClosureAttempt,
  readPr39ClosureCompletion,
} from "./genesis-pr39-closure-authority.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";
import { assertPr39SavedClosureCandidate } from "./genesis-pr39-closure-resume-integrity.mjs";

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function same(left, right) { return canonicalJson(left) === canonicalJson(right); }
function pad(value) { return String(value).padStart(2, "0"); }

function adapterDescription({ modelId, temperature, topP, reasoningEffort }) {
  return Object.freeze({
    provider: "openai",
    modelId,
    configuration: Object.freeze({ temperature, topP, reasoningEffort }),
  });
}

function finalClosureCognition(frozen) {
  const modelId = frozen.precommitment.protocol.sampling.generatorModel;
  const creative = adapterDescription({
    modelId,
    temperature: frozen.plans.sampling.creativeTemperature,
    topP: frozen.plans.sampling.topP,
    reasoningEffort: frozen.plans.sampling.reasoningEffort,
  });
  const repair = adapterDescription({
    modelId,
    temperature: frozen.plans.sampling.mechanicalRepairTemperature,
    topP: frozen.plans.sampling.topP,
    reasoningEffort: frozen.plans.sampling.reasoningEffort,
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

function assertSelfDigest(record, field, label) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) fail(`${label} is required`);
  const expected = record[field];
  if (typeof expected !== "string") fail(`${label} lacks ${field}`);
  const core = structuredClone(record);
  delete core[field];
  if (digest(core) !== expected) fail(`${label} ${field} mismatch`);
  return expected;
}

function replayCanonicalThread(databasePath, threadId) {
  const world = openWorldStore(databasePath);
  try {
    const events = world.listEvents(threadId);
    if (events.length === 0) fail(`born Thread ${threadId} has no canonical event history`);
    let replayed = null;
    for (const [index, event] of events.entries()) {
      if (event.sequence !== index + 1) fail(`Thread ${threadId} event sequence has a gap`);
      replayed = applyEventToThread(replayed, event);
      if (threadStateHash(replayed) !== event.stateHash) {
        fail(`Thread ${threadId} event ${event.eventId} fails canonical state-hash replay`);
      }
    }
    const projected = world.getThread(threadId);
    if (!same(replayed, projected)) fail(`Thread ${threadId} projection differs from full canonical event replay`);
    return { thread: projected, eventCount: events.length };
  } finally {
    world.close();
  }
}

function assertAllMemoryRevisions(databasePath, birth) {
  const expectedById = new Map();
  for (const record of birth.memories) {
    const records = expectedById.get(record.memoryId) ?? [];
    records.push(record);
    expectedById.set(record.memoryId, records);
  }
  const store = openAutobiographicalMemoryInspectionStore(databasePath);
  try {
    let revisionCount = 0;
    for (const [memoryId, expected] of expectedById.entries()) {
      const history = store.memoryHistory(birth.manifest.threadId, memoryId);
      if (!same(history, expected)) fail(`memory ${memoryId} revision history differs from admitted birth lineage`);
      revisionCount += history.length;
    }
    return { memoryCount: expectedById.size, revisionCount };
  } finally {
    store.close();
  }
}

function assertAllSituatedHistories(databasePath, hydrated, birth) {
  const expectedRelations = [
    ...hydrated.expectedSituated.lifeRelations,
    ...birth.lifeRelations,
  ];
  const expectedPlaces = hydrated.expectedSituated.placeEpisodes;
  const store = openSituatedLifeInspectionStore(databasePath);
  try {
    for (const relation of expectedRelations) {
      const history = store.lifeRelationHistory(birth.manifest.threadId, relation.relationId);
      if (!same(history, [relation])) fail(`life relation ${relation.relationId} lineage differs from admitted birth`);
    }
    for (const place of expectedPlaces) {
      const history = store.placeEpisodeHistory(birth.manifest.threadId, place.episodeId);
      if (!same(history, [place])) fail(`place episode ${place.episodeId} lineage differs from admitted birth`);
    }
    return { relationCount: expectedRelations.length, placeCount: expectedPlaces.length };
  } finally {
    store.close();
  }
}

const frozen = loadPr39ClosureFinalization();
const outputRoot = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}`;
const birthRoot = `${outputRoot}/birth`;
const databaseRelativePath = `${birthRoot}/world.sqlite`;
const completionPath = `${birthRoot}/completion-v1.json`;
const claimPath = `${birthRoot}/claim-v1.json`;
const recoveryPath = `${birthRoot}/recovery-v1.json`;

if (!existsSync(absolute(databaseRelativePath))) fail("PR39 hydration proof requires the born canonical World database");
if (!existsSync(absolute(completionPath))) fail("PR39 hydration proof requires completed final-cohort birth");
if (!existsSync(absolute(claimPath))) fail("PR39 hydration proof requires the preserved final-birth claim");

const closureStateRoot = absolute(".fibre/genesis/pr39-closure");
const closureClaim = readPr39ClosureAttempt({ stateRoot: closureStateRoot });
const closureCompletion = readPr39ClosureCompletion({ stateRoot: closureStateRoot });
if (closureClaim === null || closureCompletion === null) fail("PR39 hydration proof requires completed closure generation authority");

const birthClaim = readJson(claimPath);
const birthCompletion = readJson(completionPath);
const birthCompletionDigest = assertSelfDigest(birthCompletion, "completionDigest", "birth completion");
const recovery = existsSync(absolute(recoveryPath)) ? readJson(recoveryPath) : null;
if (recovery !== null) {
  assertSelfDigest(recovery, "recoveryDigest", "birth recovery witness");
  if (
    recovery.originalBirthCodeHead !== birthClaim.codeHead ||
    recovery.publicationAt !== birthClaim.publicationAt ||
    !same(recovery.candidateDigests, birthClaim.candidateDigests)
  ) {
    fail("birth recovery witness differs from the preserved birth claim");
  }
}
if (
  birthCompletion.status !== "FINAL_COHORT_BORN" ||
  birthCompletion.closureId !== frozen.finalization.closureId ||
  birthCompletion.finalizationDigest !== frozen.finalizationDigest ||
  birthCompletion.claimCodeHead !== birthClaim.codeHead ||
  birthCompletion.publicationAt !== birthClaim.publicationAt ||
  birthCompletion.databasePath !== databaseRelativePath ||
  birthCompletion.recoveryDigest !== (recovery?.recoveryDigest ?? null) ||
  !same(birthCompletion.candidateDigests, closureCompletion.candidateDigests)
) {
  fail("born cohort completion does not match frozen closure/birth authority");
}

const cognition = finalClosureCognition(frozen);
const databasePath = absolute(databaseRelativePath);
const resultDigests = [];
const threadIds = [];
const fins = [];
let totalEvents = 0;
let totalMemoryRevisions = 0;
let totalRelations = 0;
let totalPlaces = 0;
let totalVisuals = 0;

console.log("PR39 DEEP HYDRATION PROOF");
console.log(`Closure: ${frozen.finalization.closureId}`);
console.log(`Finalization: ${frozen.finalizationDigest}`);
console.log(`Birth completion: ${birthCompletionDigest}`);
console.log(`Canonical World: ${databaseRelativePath}`);
console.log("Mode: read-only canonical hydration · model/provider calls 0");

for (const slotPlan of frozen.plans.slots) {
  const candidatePath = `${outputRoot}/slot-${pad(slotPlan.slot)}-candidate-v1.json`;
  const resultPath = `${birthRoot}/slot-${pad(slotPlan.slot)}-birth-v1.json`;
  if (!existsSync(absolute(candidatePath))) fail(`slot ${slotPlan.slot} frozen candidate is missing`);
  if (!existsSync(absolute(resultPath))) fail(`slot ${slotPlan.slot} birth result is missing`);

  const candidate = assertPr39SavedClosureCandidate({
    candidate: readJson(candidatePath),
    slotPlan,
    claim: closureClaim,
  });
  if (candidate.candidateDigest !== closureCompletion.candidateDigests[slotPlan.slot - 1]) {
    fail(`slot ${slotPlan.slot} candidate differs from immutable closure completion`);
  }

  const birthResult = readJson(resultPath);
  const resultDigest = assertSelfDigest(birthResult, "resultDigest", `slot ${slotPlan.slot} birth result`);
  if (
    birthResult.slot !== slotPlan.slot ||
    birthResult.threadId !== candidate.threadId ||
    birthResult.genesisId !== candidate.genesisId ||
    birthResult.candidateDigest !== candidate.candidateDigest ||
    birthResult.publicationAt !== birthClaim.publicationAt ||
    genesisRecordDigest("manifest", birthResult.manifest) !== birthResult.manifestDigest
  ) {
    fail(`slot ${slotPlan.slot} birth-result authority differs from frozen candidate/manifest`);
  }

  const birthTemplate = buildGenesisBirthBundle({
    candidate,
    slotPlan,
    cognition,
    publicationAt: birthClaim.publicationAt,
  });
  const birth = Object.freeze({ ...birthTemplate, manifest: structuredClone(birthResult.manifest) });
  const hydrated = hydrateGenesisLife({ databasePath, candidate, slotPlan, birth });
  assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth, hydrated });

  const replay = replayCanonicalThread(databasePath, candidate.threadId);
  if (!same(replay.thread, hydrated.thread)) fail(`slot ${slotPlan.slot} hydrated Thread differs from canonical event replay`);

  const memories = assertAllMemoryRevisions(databasePath, birth);
  const situated = assertAllSituatedHistories(databasePath, hydrated, birth);
  const fin = hydrated.civilRegistration?.fibreIdentityNumber;
  if (fin !== birthResult.fibreIdentityNumber) fail(`slot ${slotPlan.slot} FIN differs from birth result`);
  if (hydrated.memoryVisuals.length !== memories.memoryCount) {
    fail(`slot ${slotPlan.slot} does not have one visual obligation per autobiographical memory`);
  }

  resultDigests.push(resultDigest);
  threadIds.push(candidate.threadId);
  fins.push(fin);
  totalEvents += replay.eventCount;
  totalMemoryRevisions += memories.revisionCount;
  totalRelations += situated.relationCount;
  totalPlaces += situated.placeCount;
  totalVisuals += hydrated.memoryVisuals.length;

  console.log(
    `slot ${slotPlan.slot} ${slotPlan.label}: EXACT` +
    ` · FIN ${fin}` +
    ` · ${replay.eventCount} canonical events` +
    ` · ${memories.memoryCount} memories/${memories.revisionCount} revisions` +
    ` · ${situated.relationCount} relations` +
    ` · ${situated.placeCount} places` +
    ` · ${hydrated.memoryVisuals.length} visual obligations`,
  );
}

if (!same(resultDigests, birthCompletion.birthResultDigests)) fail("birth-result digest sequence differs from cohort completion");
if (!same(threadIds, birthCompletion.threadIds)) fail("Thread identity sequence differs from cohort completion");
if (!same(fins, birthCompletion.fibreIdentityNumbers)) fail("FIN sequence differs from cohort completion");
if (new Set(threadIds).size !== 5) fail("born cohort does not contain five unique Thread IDs");
if (new Set(fins).size !== 5) fail("born cohort does not contain five unique FINs");

console.log("\nPR39 DEEP HYDRATION: EXACT");
console.log("Frozen candidates matched: 5/5");
console.log("Canonical Thread event replays matched: 5/5");
console.log("Full autobiographical-memory revision lineages matched: 5/5 Threads");
console.log("Situated people/lineage and place histories matched: 5/5 Threads");
console.log("Genome, manifest, FIN/civil registration and visual obligations matched: 5/5 Threads");
console.log(`Canonical events verified: ${totalEvents}`);
console.log(`Memory revisions verified: ${totalMemoryRevisions}`);
console.log(`Life relations verified: ${totalRelations}`);
console.log(`Place histories verified: ${totalPlaces}`);
console.log(`Memory-visual obligations verified: ${totalVisuals}`);
console.log("Provider calls: 0");
console.log("The born cohort hydrates exactly from canonical World state and the frozen admitted lives.");
