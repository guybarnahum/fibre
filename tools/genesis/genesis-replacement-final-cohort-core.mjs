#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createBirthCenterRuntime } from "../services/birth-center/src/runtime.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  sampleEventStructuresV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { generateRichPassAEpisode } from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  GENESIS_PASS_A_RELIABILITY_V3_VERSION,
} from "../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import { generateAdmittedPassBMemory } from "../services/world-kernel/src/genesis-pass-b-admission.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "../services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { projectPassCInputForCognition } from "../services/world-kernel/src/genesis-pass-c-cognition.mjs";
import {
  buildScheduledReinterpretationPassCInput,
  scheduleReinterpretationOpportunities,
} from "../services/world-kernel/src/genesis-pass-c-reinterpretation.mjs";
import { sharedIntellectualSourceRefs } from "../services/world-kernel/src/genesis-intellectual-encounter.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMemoryId,
  normalizeAutobiographicalMemory,
} from "../services/world-kernel/src/autobiographical-memory-domain.mjs";
import { genesisLifeEpisodeEventId } from "../services/world-kernel/src/genesis-life-episode.mjs";
import {
  normalizeGenesisManifest,
  normalizeGenesisWorldSpec,
} from "../services/world-kernel/src/genesis-domain.mjs";
import { GenesisStore } from "../services/world-kernel/src/genesis-store.mjs";
import { lifeRelationId, normalizeLifeRelation } from "../services/world-kernel/src/situated-life-domain.mjs";
import { normalizeSeedSnapshot, validateThreadSnapshot } from "../services/world-kernel/src/persistence-domain.mjs";
import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { SymbolicGenomeStore } from "../services/world-kernel/src/symbolic-genome-store.mjs";
import { symbolicGenomeDigest } from "../services/world-kernel/src/symbolic-genome-domain.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { buildHPassBInput, buildNeutralHThreadSeed } from "./genesis-h-final-cohort.mjs";
import { createProviderProgressHeartbeat } from "./provider-progress.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const REPLACEMENT_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-execution-binding-v1.json";
const EXPECTED_G2_PROTOCOL_DIGEST = "sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91";
const RESULT_VERSION = "pr39-replacement-final-cohort-v1";
const ATTEMPT_START_FILE = "replacement-attempt-start-v1.json";

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value, width = 2) { return String(value).padStart(width, "0"); }
function fail(message) { throw new Error(message); }
function nowIso() { return new Date().toISOString(); }

function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function changedReviewedExecutionPaths(reviewedHead, gateWitnessPath) {
  const paths = [
    "services/world-kernel/src",
    "services/birth-center/src",
    "tools/genesis/genesis-replacement-final-cohort.mjs",
    "artifacts/validation/m2-pr39/replacement-v1/protocol",
  ];
  const output = execFileSync("git", ["diff", "--name-only", reviewedHead, "HEAD", "--", ...paths], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== gateWitnessPath);
}

function modelRuntimeOptions(g4) {
  const runtime = g4.commonRuntime;
  if (runtime.provider !== "openai") fail("replacement frozen runtime provider is not openai");
  if (runtime.maxOutputTokens !== "auto") fail("replacement runner supports only frozen automatic max-output-token policy");
  return {
    modelId: runtime.modelId,
    timeoutMs: runtime.timeoutMs,
    maxOutputTokens: null,
    temperature: runtime.temperature,
    topP: runtime.topP,
    reasoningEffort: runtime.reasoningEffort,
    retryLimit: runtime.operationalRetryLimit,
    retryDelayMs: runtime.operationalRetryDelayMs,
  };
}

function verifyWorldBinding(binding) {
  const world = normalizeGenesisWorldSpec(readJson(binding.worldSpecPath));
  if (world.worldSpecId !== binding.worldSpecId) fail(`replacement slot ${binding.slot} WorldSpec ID drift`);
  if (digest(world) !== binding.worldSpecDigest) fail(`replacement slot ${binding.slot} WorldSpec digest drift`);
  const genome = readJson(binding.genomePath);
  const computedGenomeDigest = symbolicGenomeDigest({
    header: genome.header,
    loci: genome.loci,
    mutations: genome.mutations ?? [],
  });
  if (genome.header.genomeId !== binding.genomeId || computedGenomeDigest !== binding.genomeDigest || genome.genomeDigest !== binding.genomeDigest) {
    fail(`replacement slot ${binding.slot} symbolic genome binding drift`);
  }
  if (genome.header.owner?.ownerId !== binding.threadId || genome.header.genesisId !== binding.genesisId) {
    fail(`replacement slot ${binding.slot} symbolic genome owner/genesis drift`);
  }
  return { world, genome };
}

function verifySyntheticParents(g2, binding, genome) {
  if (binding.originMode !== "synthetic_lineage") return [];
  const lineage = g2.syntheticLineages.find((item) => item.slot === binding.slot);
  if (!lineage) fail(`replacement slot ${binding.slot} lacks frozen synthetic-lineage manifest`);
  if (canonicalJson(lineage.parentGenomeIds) !== canonicalJson(genome.header.sourceEligibility.sourceGenomeRefs)) {
    fail(`replacement slot ${binding.slot} parent genome IDs drift`);
  }
  return lineage.parentGenomePaths.map((path, index) => {
    const parent = readJson(path);
    const parentDigest = symbolicGenomeDigest({ header: parent.header, loci: parent.loci, mutations: parent.mutations ?? [] });
    if (parent.genomeDigest !== parentDigest || parentDigest !== lineage.parentGenomeDigests[index]) {
      fail(`replacement slot ${binding.slot} parent genome ${index + 1} digest drift`);
    }
    return parent;
  });
}

function effectiveG3(g3, inheritedProduction) {
  return {
    production: {
      ...structuredClone(inheritedProduction),
      assignment: {
        ...structuredClone(inheritedProduction.assignment),
        version: g3.replacementAssignment.version,
        seed: g3.replacementAssignment.seed,
      },
    },
    analysis: {
      inheritedProductionProtocol: {
        directModes: [...g3.inheritedAuthority.directModes],
        historyEpisodeHorizons: [...g3.inheritedAuthority.historyEpisodeHorizons],
      },
    },
  };
}

function effectiveG4(g4Base, g4Binding, reliabilityWitness) {
  const effective = structuredClone(g4Base);
  effective.initialRosters = structuredClone(g4Binding.initialRosters);
  effective.eventStructurePool.seedDomain = g4Binding.replacementSeedNamespaces.eventStructureOfferSeedDomain;
  effective.manifestCognitionTemplate.passA.promptHash = reliabilityWitness.promptHashes.g4v3PassA;
  effective.manifestCognitionTemplate.policyVersion = `${g4Base.manifestCognitionTemplate.policyVersion}+${GENESIS_PASS_A_RELIABILITY_V3_VERSION}`;
  return effective;
}

function assertReplacementReliabilityPolicy(binding, g4Binding, amendment) {
  const expected = g4Binding.passAReliabilityPolicy;
  if (binding.generationPolicy.version !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) fail("replacement execution binding does not select G4-v3");
  if (expected.version !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) fail("replacement G4 binding does not select G4-v3");
  if (GENESIS_PASS_A_RELIABILITY_POLICY_V3.version !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) fail("runtime G4-v3 policy version drift");
  const frozen = amendment.mechanicalAmendment.budgets;
  const runtime = GENESIS_PASS_A_RELIABILITY_POLICY_V3;
  const checks = [
    [runtime.maxFormRepairsPerRecord, expected.maxFormRepairsPerRecord, frozen.maxFormRepairsPerRecord, 2, "form repairs"],
    [runtime.maxRecordRetriesPerRecord, expected.maxRecordRetriesPerRecord, frozen.maxRecordRetriesPerRecord, 2, "record retries"],
    [runtime.maxTotalGeneratedVersionsPerRecord, expected.maxTotalGeneratedVersionsPerRecord, frozen.maxTotalGeneratedVersionsPerRecord, 5, "total versions"],
  ];
  for (const [a, b, c, d, name] of checks) if (a !== b || b !== c || c !== d) fail(`replacement G4-v3 ${name} drift`);
  if (binding.generationPolicy.legacySharedThreeVersionDefaultAllowed !== false || g4Binding.passAReliabilityPolicy.legacyDefaultAllowedForReplacement !== false) {
    fail("replacement execution accidentally permits legacy shared-three Pass-A policy");
  }
}

function validateTreatmentInstance(g2, g3) {
  const slots = g3.replacementAssignment.slots;
  if (slots.length !== 5 || g3.replacementAssignment.eligiblePassBCallCount !== 30) fail("replacement G3 size drift");
  const expectedModes = ["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"];
  const expectedHorizons = [4, 5, 6, 7, 8, 10];
  for (const worldBinding of g2.worldBindings) {
    const slot = slots.find((item) => item.slot === worldBinding.slot);
    if (!slot || slot.threadId !== worldBinding.threadId || slot.calls.length !== 6) fail(`replacement G3 slot ${worldBinding.slot} binding drift`);
    if (canonicalJson(slot.calls.map((item) => item.formationMode)) !== canonicalJson(expectedModes)) fail(`replacement G3 slot ${slot.slot} mode drift`);
    if (canonicalJson(slot.calls.map((item) => item.horizon)) !== canonicalJson(expectedHorizons)) fail(`replacement G3 slot ${slot.slot} horizon drift`);
  }
}

function validateG56Closure(g2Result, closure) {
  if (g2Result.verdict !== "CLEAR" || g2Result.detectablePairCount !== 5 || g2Result.everyGenomeCoveredByDetectablePair !== true) fail("replacement G2 result no longer supports five-edge reconciliation");
  const d3 = closure.effectiveReplacementD3;
  if (d3.measuredCoreEdges.length !== 5 || d3.measuredLowNonblockingEdges.length !== 0) fail("replacement D3 core closure drift");
  if (d3.clearRequirement.eachOrdinalMinimumCorrectCoreEdges !== 4 || d3.clearRequirement.atLeastOneOrdinalCorrectCoreEdges !== 5) fail("replacement D3 threshold drift");
  for (const key of ["unanalyzableMeasuredCoreEdge", "erroredMeasuredCoreEdge", "nullMeasuredCoreEdge", "tiedMeasuredCoreEdge"]) {
    if (d3[key] !== "not_correct") fail(`replacement D3 ${key} closure drift`);
  }
  if (closure.effectiveReplacementClearRule.explicitlyNotAllowedAsMandatoryDisclosureOnly.length < 4) fail("replacement G6 old carve-out not fully retired");
}

function readGateWitness(binding) {
  const path = binding.authorityBoundary.gateG2ClearWitnessPath;
  if (!existsSync(absolute(path))) return null;
  return readJson(path);
}

export function verifyReplacementFinalCohortPreflight({ requireGateClear = false, enforceReviewedSource = true } = {}) {
  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  if (binding.contractVersion !== "pr39-replacement-final-cohort-execution-binding-v1" || binding.status !== "frozen_pre_gate_g2_clear_pre_final_life") {
    fail("unexpected replacement execution binding version/status");
  }
  if (binding.runner.path !== "tools/genesis/genesis-replacement-final-cohort.mjs" || binding.runner.bindingPathHardcoded !== true || binding.runner.bindingEnvOverrideAllowed !== false) {
    fail("replacement runner binding-path pin drift");
  }
  if (binding.oneShot.wholeCandidateAttemptCap !== 1 || binding.oneShot.qualityDrivenRegeneration !== false) fail("replacement one-shot discipline drift");

  const g2 = readJson(binding.authorityBoundary.g2ProtocolPath);
  if (digest(g2) !== EXPECTED_G2_PROTOCOL_DIGEST || binding.authorityBoundary.g2ProtocolDigest !== EXPECTED_G2_PROTOCOL_DIGEST) fail("replacement G2 protocol drift");
  const g2Result = readJson(binding.authorityBoundary.g2ResultPath);
  if (g2Result.protocolDigest !== EXPECTED_G2_PROTOCOL_DIGEST || g2Result.verdict !== "CLEAR") fail("replacement G2 result drift");
  const g2Disclosure = readJson(binding.authorityBoundary.g2DisclosureAmendmentPath);
  if (g2Disclosure.authoringTemplateDisclosure.comparabilityToOriginalG2 !== "not_directly_comparable" || canonicalJson(g2Disclosure.assignmentDisclosure.fixedPointSlots) !== canonicalJson([2,4,5])) fail("replacement G2 disclosure closure drift");

  const g3 = readJson(binding.authorityBoundary.g3TreatmentInstancePath);
  validateTreatmentInstance(g2, g3);
  const inheritedG3 = readJson(g3.inheritedAuthority.productionProtocolPath);
  const g4Binding = readJson(binding.authorityBoundary.g4CognitionExecutionBindingPath);
  const g4Base = readJson(binding.authorityBoundary.g4BaseProtocolPath);
  const g4Entry = readJson(binding.authorityBoundary.g4EntryAmendmentPath);
  const g4Reliability = readJson(binding.authorityBoundary.g4PassAReliabilityAmendmentPath);
  const reliabilityWitness = readJson("artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json");
  assertReplacementReliabilityPolicy(binding, g4Binding, g4Reliability);
  if (eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2) !== g4Binding.inheritedAuthority.eventStructurePoolDigest) fail("replacement EventStructurePool digest drift");
  if (g4Binding.initialRosters.length !== 5) fail("replacement G4 roster count drift");

  const rosterBySlot = new Map(g4Binding.initialRosters.map((item) => [item.slot, item]));
  const slots = g2.worldBindings.map((worldBinding) => {
    const { genome } = verifyWorldBinding(worldBinding);
    const parents = verifySyntheticParents(g2, worldBinding, genome);
    const roster = rosterBySlot.get(worldBinding.slot);
    if (!roster || roster.threadId !== worldBinding.threadId || roster.worldSpecId !== worldBinding.worldSpecId) fail(`replacement slot ${worldBinding.slot} G4 roster drift`);
    return {
      slot: worldBinding.slot,
      threadId: worldBinding.threadId,
      genesisId: worldBinding.genesisId,
      originMode: worldBinding.originMode,
      worldSpecId: worldBinding.worldSpecId,
      genomeId: worldBinding.genomeId,
      parentGenomeCount: parents.length,
      rosterSize: roster.participants.length,
      passAEpisodes: g4Base.historicalPlan.episodesPerThread,
      passBHorizons: [...g3.inheritedAuthority.historyEpisodeHorizons],
      passBModes: [...g3.inheritedAuthority.directModes],
    };
  });

  const closure = readJson(binding.authorityBoundary.replacementG56ClosureAmendmentPath);
  validateG56Closure(g2Result, closure);
  const passBClosure = readJson("artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-pass-b-genome-copy-closure-amendment-v1.json");
  if (passBClosure.status !== "not_applied_preserved_review_note") fail("replacement Pass-B N2 standing drift");
  if (canonicalJson(passBClosure.frozenAuthority.scannedFields) !== canonicalJson(["rememberedContent"])) fail("historical G4-v2 Pass-B scanned-field authority drift");
  if (passBClosure.consideredChange.appliedToReplacement !== false || passBClosure.currentReplacementStanding.uncertaintyGenomeCopyGapDisclosed !== true) {
    fail("replacement Pass-B N2 retraction/disclosure drift");
  }

  const effective = {
    g3: effectiveG3(g3, inheritedG3),
    g4: effectiveG4(g4Base, g4Binding, reliabilityWitness),
    g4Entry,
  };

  const gate = readGateWitness(binding);
  let executionAuthorized = false;
  let gateStatus = "MISSING_GATE_G2_CLEAR_WITNESS";
  let reviewedSourceChanges = [];
  if (gate !== null) {
    gateStatus = gate.status;
    if (gate.status !== "CLEAR" || gate.authorization?.replacementFinalLifeGenerationAuthorized !== true) {
      if (requireGateClear) fail("Gate-G(2) does not authorize replacement final-life generation");
    } else {
      if (gate.verifiedBoundary?.executionBindingDigest !== digest(binding)) fail("Gate-G(2) execution binding digest drift");
      if (typeof gate.reviewedHead !== "string" || gate.reviewedHead.length < 7) fail("Gate-G(2) reviewedHead missing");
      reviewedSourceChanges = enforceReviewedSource ? changedReviewedExecutionPaths(gate.reviewedHead, binding.authorityBoundary.gateG2ClearWitnessPath) : [];
      if (reviewedSourceChanges.length !== 0) fail(`replacement execution source changed after Gate-G(2): ${reviewedSourceChanges.join(", ")}`);
      executionAuthorized = true;
    }
  } else if (requireGateClear) {
    fail("Gate-G(2) CLEAR witness is absent; replacement final-life cognition is not authorized");
  }

  const rootExists = existsSync(absolute(binding.oneShot.outputRoot));
  const resultExists = existsSync(absolute(binding.oneShot.resultPath));
  const failureExists = existsSync(absolute(binding.oneShot.failurePath));
  const attemptStartPath = `${binding.oneShot.outputRoot}/${ATTEMPT_START_FILE}`;
  const attemptStartExists = existsSync(absolute(attemptStartPath));
  const resumableInProgress = rootExists && attemptStartExists && !resultExists && !failureExists;

  return Object.freeze({
    status: executionAuthorized ? "CLEAR_TO_EXECUTE_REPLACEMENT" : "CLEAR_PACKET_GATE_G2_HOLD",
    executionAuthorized,
    gateStatus,
    currentHead: currentHead(),
    executionBindingDigest: digest(binding),
    g2ProtocolDigest: digest(g2),
    g2ResultDigest: digest(g2Result),
    generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
    generationPolicy: structuredClone(GENESIS_PASS_A_RELIABILITY_POLICY_V3),
    runtime: structuredClone(g4Base.commonRuntime),
    eventStructurePoolDigest: g4Binding.inheritedAuthority.eventStructurePoolDigest,
    eventStructureSeedDomain: g4Binding.replacementSeedNamespaces.eventStructureOfferSeedDomain,
    clientRequestDomain: g4Binding.replacementSeedNamespaces.modelClientRequestDomain,
    oneShot: structuredClone(binding.oneShot),
    outputState: { rootExists, resultExists, failureExists, attemptStartExists, resumableInProgress },
    durability: structuredClone(binding.durability),
    reviewedSourceChanges,
    slots,
    effective,
  });
}

function uniqueIntroductions(episodes) {
  const byId = new Map();
  for (const episode of episodes) for (const participant of episode.introducedParticipants) if (!byId.has(participant.provisionalPersonId)) byId.set(participant.provisionalPersonId, participant);
  return [...byId.values()].map((item) => structuredClone(item));
}

function eventMapForLife({ threadId, genesisId, episodes }) {
  return new Map(episodes.map((episode, index) => [episode.episodeId, {
    ordinal: index + 1,
    episode,
    eventId: genesisLifeEpisodeEventId({ threadId, genesisId, episode }),
  }]));
}

function memoryIdentityFromPassB({ threadId, callOrdinal, passBOutput, eventMap }) {
  const cited = passBOutput.episodeRefs.map((ref) => {
    const item = eventMap.get(ref);
    if (!item) fail(`Pass-B cited unknown admitted episode ${ref}`);
    return item;
  }).sort((a, b) => a.ordinal - b.ordinal);
  if (cited.length === 0) fail("remembered Pass-B output has no cited episode");
  const origin = cited[0];
  const slot = `pass_b_call_${pad(callOrdinal)}`;
  return {
    memoryRef: autobiographicalMemoryId({ threadId, originReference: origin.eventId, slot }),
    slot,
    origin,
    cited,
    eventRefs: cited.map((item) => item.eventId),
  };
}

function buildInitialPassCInput({ memory, asOf, ageAtFormation, chronologyIndex }) {
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: memory.memoryRef,
      episodeRefs: [...memory.eventRefs],
      rememberedContent: memory.rememberedContent,
      uncertainty: [...memory.uncertainty],
    },
    formation: { asOf, ageAtFormation, chronologyIndex },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

function relationFactsForMemoryTrigger({ threadId, memory, triggerEpisode }) {
  const target = memory.origin.episode;
  const targetPeople = new Set(target.participantRefs.filter((ref) => ref !== threadId));
  return {
    targetStructureRef: target.structureRef,
    triggerStructureRef: triggerEpisode.structureRef,
    targetStructureFamilyRef: null,
    triggerStructureFamilyRef: null,
    sharedPersonRefs: triggerEpisode.participantRefs.filter((ref) => ref !== threadId && targetPeople.has(ref)).sort(),
    sharedRelationshipRefs: [],
    sharedIntellectualSourceRefs: sharedIntellectualSourceRefs(target, triggerEpisode),
  };
}

function buildReinterpretationCandidates({ threadId, memories, episodes }) {
  const candidates = [];
  for (const memory of memories) {
    if (memory.currentMeaning === null) continue;
    for (const triggerEpisode of episodes) {
      if (Date.parse(triggerEpisode.occurredAt) <= Date.parse(memory.initialMeaningFormedAt)) continue;
      candidates.push({
        threadId,
        memoryRef: memory.memoryRef,
        priorMeaningFormedAt: memory.initialMeaningFormedAt,
        trigger: { episodeRef: triggerEpisode.episodeId, occurredAt: triggerEpisode.occurredAt, observableAction: triggerEpisode.observableAction },
        relationFacts: relationFactsForMemoryTrigger({ threadId, memory, triggerEpisode }),
      });
    }
  }
  return candidates;
}

function currentPriorMeaning(memory) {
  return { summary: memory.currentMeaning.summary, parts: structuredClone(memory.currentMeaning.parts) };
}

async function runPassCInitial({ adapter, input, clientRequestId }) {
  const cognition = projectPassCInputForCognition(input);
  const result = await adapter.invoke({ systemPrompt: GENESIS_PASS_C_INITIAL_PROMPT, input: cognition, responseSchema: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA, clientRequestId });
  return { input, cognitionInput: cognition, output: normalizeInitialPassCModelOutput(result.output, input), provenance: result.provenance };
}

async function runPassCReinterpretation({ adapter, input, clientRequestId }) {
  const cognition = projectPassCInputForCognition(input);
  const result = await adapter.invoke({ systemPrompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT, input: cognition, responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA, clientRequestId });
  return { input, cognitionInput: cognition, output: normalizeReinterpretationPassCModelOutput(result.output, input), provenance: result.provenance };
}

async function generateThread({ slotPlan, g2, g3Production, g3Analysis, g4, adapter, attemptStartedAt, eventStructureSeedDomain, clientRequestDomain }) {
  const binding = g2.worldBindings.find((item) => item.slot === slotPlan.slot);
  const roster = g4.initialRosters.find((item) => item.slot === slotPlan.slot);
  const worldSpec = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const parents = verifySyntheticParents(g2, binding, genome);
  const subject = { provisionalThreadId: binding.threadId, bornAt: g4.historicalPlan.entry.bornAt };
  const lineageWitness = binding.originMode === "synthetic_lineage" ? syntheticLineageWitnessFromRecombinedGenome(genome) : null;
  const episodes = [];
  const passA = [];
  const repairWitnesses = [];

  for (const window of g4.historicalPlan.windows) {
    const seed = `${eventStructureSeedDomain}:slot:${pad(binding.slot)}:structures:${window.windowId}`;
    const offeredEntries = sampleEventStructuresV2(GENESIS_EVENT_STRUCTURE_POOL_V2, window, { seed, count: g4.eventStructurePool.structuresPerWindow });
    const input = buildRichLifePassAInput({
      originMode: binding.originMode,
      syntheticLineageWitness: lineageWitness,
      worldSpec,
      subject,
      developmentalWindow: { windowId: window.windowId, startAt: window.startAt, endAt: window.endAt, minAge: window.minAge, maxAge: window.maxAge },
      chronologyEndsAt: window.endAt,
      initialRoster: roster.participants,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants: uniqueIntroductions(episodes),
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
      offeredEntries,
    });
    const evidence = await generateRichPassAEpisode({
      adapter,
      input,
      generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
      clientRequestId: `${clientRequestDomain}:slot-${pad(binding.slot)}:pass-a:episode-${pad(window.ordinal)}`,
      selectedOpportunity: null,
      onRecordRepair: (witness) => repairWitnesses.push({ kind: "pass_a_form_repair", episodeOrdinal: window.ordinal, recordedAt: nowIso(), ...structuredClone(witness) }),
      onRecordRetry: (witness) => repairWitnesses.push({ kind: "pass_a_record_retry", episodeOrdinal: window.ordinal, recordedAt: nowIso(), ...structuredClone(witness) }),
    });
    episodes.push(evidence.episode);
    passA.push({
      ordinal: window.ordinal,
      developmentalWindow: structuredClone(window),
      offerSeed: seed,
      offeredStructureIds: offeredEntries.map((item) => item.structure.structureId),
      generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
      inputDigest: evidence.inputDigest,
      episode: structuredClone(evidence.episode),
      episodeDigest: evidence.episodeDigest,
      calls: structuredClone(evidence.calls),
      repairs: structuredClone(evidence.repairs),
      recordRetries: structuredClone(evidence.recordRetries),
    });
  }

  const eventMap = eventMapForLife({ threadId: binding.threadId, genesisId: binding.genesisId, episodes });
  const priorRememberedMemories = [];
  const memories = [];
  const passB = [];
  const passCInitial = [];
  const directModes = g3Analysis.inheritedProductionProtocol.directModes;
  const horizons = g3Analysis.inheritedProductionProtocol.historyEpisodeHorizons;

  for (let index = 0; index < horizons.length; index += 1) {
    const callOrdinal = index + 1;
    const horizon = horizons[index];
    const formationMode = directModes[index];
    const input = buildHPassBInput({ threadId: binding.threadId, bornAt: subject.bornAt, worldSpec, episodes, horizon, callOrdinal, formationMode, priorRememberedMemories, genome, g3v1: g3Production, g4v1: g4 });
    const result = await generateAdmittedPassBMemory({ adapter, input, clientRequestId: `${clientRequestDomain}:slot-${pad(binding.slot)}:pass-b:call-${pad(callOrdinal)}` });
    const output = result.output;
    passB.push({ callOrdinal, horizon, formationMode, assignment: structuredClone(input.assignment), input: structuredClone(input), output: structuredClone(output), calls: structuredClone(result.calls) });
    if (output.outcome !== "remembered") continue;

    const identity = memoryIdentityFromPassB({ threadId: binding.threadId, callOrdinal, passBOutput: output, eventMap });
    const memory = {
      ...identity,
      callOrdinal,
      horizon,
      formationMode,
      passBEpisodeRefs: [...output.episodeRefs],
      rememberedContent: output.rememberedContent,
      uncertainty: [...output.uncertainty],
      initialMeaningFormedAt: input.rememberingAt,
      ageAtInitialMeaning: input.ageAtRemembering,
      currentMeaning: null,
    };
    const passCInput = buildInitialPassCInput({ memory, asOf: input.rememberingAt, ageAtFormation: input.ageAtRemembering, chronologyIndex: horizon });
    const c = await runPassCInitial({ adapter, input: passCInput, clientRequestId: `${clientRequestDomain}:slot-${pad(binding.slot)}:pass-c:initial-${pad(callOrdinal)}` });
    passCInitial.push({ callOrdinal, memoryRef: memory.memoryRef, ...structuredClone(c) });
    if (c.output.outcome === "durable_meaning") {
      memory.currentMeaning = { summary: c.output.summary, parts: structuredClone(c.output.parts), formedAt: input.rememberingAt, ageAtFormation: input.ageAtRemembering, chronologyIndex: horizon };
    }
    memories.push(memory);
    priorRememberedMemories.push({ memoryRef: memory.memoryRef, passBEpisodeRefs: memory.passBEpisodeRefs, rememberedContent: memory.rememberedContent, uncertainty: memory.uncertainty, formationMode });
  }

  const reinterpretationCandidates = buildReinterpretationCandidates({ threadId: binding.threadId, memories, episodes });
  const reinterpretationSchedule = scheduleReinterpretationOpportunities(reinterpretationCandidates);
  const reinterpretationRuns = [];
  const byMemory = new Map(memories.map((memory) => [memory.memoryRef, memory]));
  for (const scheduled of reinterpretationSchedule.filter((item) => item.run)) {
    const memory = byMemory.get(scheduled.memoryRef);
    if (!memory?.currentMeaning) fail(`scheduled reinterpretation ${scheduled.opportunityId} lacks current durable meaning`);
    const triggerItem = eventMap.get(scheduled.trigger.episodeRef);
    if (!triggerItem) fail(`scheduled reinterpretation ${scheduled.opportunityId} trigger is not an admitted life episode`);
    const input = buildScheduledReinterpretationPassCInput({
      scheduledOpportunity: scheduled,
      targetMemory: { memoryRef: memory.memoryRef, episodeRefs: [...memory.eventRefs], rememberedContent: memory.rememberedContent, uncertainty: [...memory.uncertainty] },
      priorMeaning: currentPriorMeaning(memory),
      formation: { asOf: scheduled.trigger.occurredAt, ageAtFormation: triggerItem.episode.ageAtEvent, chronologyIndex: triggerItem.ordinal },
    });
    const result = await runPassCReinterpretation({ adapter, input, clientRequestId: `${clientRequestDomain}:slot-${pad(binding.slot)}:pass-c:reinterpret:${scheduled.opportunityId}` });
    reinterpretationRuns.push({ opportunityId: scheduled.opportunityId, memoryRef: memory.memoryRef, ...structuredClone(result) });
    if (result.output.outcome === "revised") {
      memory.currentMeaning = { summary: result.output.summary, parts: structuredClone(result.output.parts), formedAt: scheduled.trigger.occurredAt, ageAtFormation: triggerItem.episode.ageAtEvent, chronologyIndex: triggerItem.ordinal };
      memory.pendingRevisions ??= [];
      memory.pendingRevisions.push({ asOf: scheduled.trigger.occurredAt, output: structuredClone(result.output), supportingEvidenceRefs: [triggerItem.eventId] });
    }
  }

  return {
    evidenceVersion: RESULT_VERSION,
    generatedAt: nowIso(),
    attemptStartedAt,
    slot: binding.slot,
    binding: structuredClone(binding),
    subject,
    worldSpec,
    genome,
    parentGenomes: parents,
    roster: structuredClone(roster),
    passA,
    episodes,
    repairWitnesses,
    passB,
    passCInitial,
    memories,
    reinterpretationSchedule: structuredClone(reinterpretationSchedule),
    reinterpretationRuns,
  };
}

function buildMemoryRevision({ threadId, publicationAt, memory, revision, asOf, meaningOutput, supportingEvidenceRefs = [] }) {
  const durable = meaningOutput.outcome === "durable_meaning" || meaningOutput.outcome === "revised";
  return normalizeAutobiographicalMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId: memory.memoryRef,
    revision,
    threadId,
    subject: { originEventRef: memory.origin.eventId, slot: memory.slot },
    subjectPeriod: { startAt: memory.cited[0].episode.occurredAt, endAt: memory.cited[memory.cited.length - 1].episode.occurredAt },
    eventRefs: [...memory.eventRefs],
    rememberedContent: memory.rememberedContent,
    rememberedMeaning: durable ? meaningOutput.summary : null,
    meaningOutcome: durable ? "durable_meaning" : "no_durable_meaning",
    meaningParts: durable ? structuredClone(meaningOutput.parts) : [],
    asOf,
    confidence: 0.5,
    uncertainty: [...memory.uncertainty],
    salience: 0.5,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: { kind: "fibre_genesis_authored", entityId: "fibre.genesis", policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY } },
    supportingEvidenceRefs: [...supportingEvidenceRefs],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: publicationAt,
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  });
}

function materializeMemoryRecords(threadGeneration, publicationAt) {
  const records = [];
  const initialByMemory = new Map(threadGeneration.passCInitial.map((item) => [item.memoryRef, item.output]));
  for (const memory of threadGeneration.memories) {
    const initial = initialByMemory.get(memory.memoryRef);
    if (!initial) fail(`missing initial Pass-C output for memory ${memory.memoryRef}`);
    records.push(buildMemoryRevision({ threadId: threadGeneration.binding.threadId, publicationAt, memory, revision: 1, asOf: memory.initialMeaningFormedAt, meaningOutput: initial }));
    let revision = 1;
    for (const pending of memory.pendingRevisions ?? []) {
      revision += 1;
      records.push(buildMemoryRevision({ threadId: threadGeneration.binding.threadId, publicationAt, memory, revision, asOf: pending.asOf, meaningOutput: pending.output, supportingEvidenceRefs: pending.supportingEvidenceRefs }));
    }
  }
  return records;
}

function buildSyntheticLineageRelations({ thread, genome, publicationAt, bornAt }) {
  if (genome.header.originKind !== "recombined") return [];
  const seed = normalizeSeedSnapshot(thread);
  return genome.header.sourceEligibility.sourceOwners.map((owner) => normalizeLifeRelation({
    relationId: lifeRelationId({ threadId: thread.threadId, relatedPartyId: owner.ownerId, relationKind: "biological_parent", geneticContributionRole: "parent_genome_source" }),
    revision: 1,
    threadId: thread.threadId,
    relatedParty: { partyId: owner.ownerId, kind: "synthetic_ancestor", displayName: owner.ownerId },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: [seed.provenance.lastEventId],
    validFrom: bornAt,
    validTo: null,
    visibility: "private",
    status: "current",
    provenance: "genesis_created",
    recordedAt: publicationAt,
  }));
}

function buildManifest({ threadGeneration, thread, memoryRecords, publicationAt, g4, g4Entry }) {
  const binding = threadGeneration.binding;
  const genome = threadGeneration.genome;
  const parentRefs = binding.originMode === "synthetic_lineage" ? genome.header.sourceEligibility.sourceOwners.map((owner) => owner.ownerId) : [];
  return normalizeGenesisManifest({
    genesisId: binding.genesisId,
    threadId: binding.threadId,
    originMode: binding.originMode,
    entry: {
      stage: g4Entry.manifestEntryAmendment.stage,
      ageAtEntry: g4Entry.manifestEntryAmendment.ageAtEntry,
      chronologyEndsAt: g4Entry.manifestEntryAmendment.chronologyEndsAt,
      justification: g4Entry.manifestEntryAmendment.justification,
      policyRef: g4Entry.manifestEntryAmendment.policyRef,
    },
    worldSpecRef: binding.worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs: parentRefs,
    genomeRef: binding.genomeId,
    cognition: structuredClone(g4.manifestCognitionTemplate),
    publication: { status: "published", publishedAt: publicationAt, resultingThreadVersion: thread.version + threadGeneration.episodes.length + memoryRecords.length },
    createdAt: thread.provenance.createdAt,
  });
}

function persistGenomeBundle(store, bundle) {
  return store.recordGenome({ header: bundle.header, loci: bundle.loci, mutations: bundle.mutations ?? [], genomeDigest: bundle.genomeDigest });
}

function persistRepairWitnesses(genesisStore, generation, publicationAt) {
  let ordinal = 0;
  for (const witness of generation.repairWitnesses) {
    ordinal += 1;
    genesisStore.recordGenerationAttempt({
      attemptId: `gatt_${sha256(canonicalJson({ genesisId: generation.binding.genesisId, ordinal, witness: witness.kind, episodeOrdinal: witness.episodeOrdinal })).slice(0, 48)}`,
      genesisId: generation.binding.genesisId,
      provisionalThreadId: generation.binding.threadId,
      candidateAttemptNumber: 1,
      scope: "record_repair",
      recordKind: "pass_a_life_episode",
      failedPass: "A",
      failedGate: witness.failedGate,
      recordRepairOrdinal: ordinal,
      rejectedContentDigest: witness.rejectedContentDigest,
      rejectedContent: witness.rejectedContent ?? null,
      inputDigest: witness.inputDigest,
      outputDigest: witness.outputDigest,
      recordedAt: witness.recordedAt ?? publicationAt,
    });
  }
  for (const passB of generation.passB) {
    if (passB.calls.length <= 1) continue;
    const rejected = passB.calls[0];
    ordinal += 1;
    genesisStore.recordGenerationAttempt({
      attemptId: `gatt_${sha256(canonicalJson({ genesisId: generation.binding.genesisId, ordinal, kind: "pass_b_genome_copy_retry", callOrdinal: passB.callOrdinal })).slice(0, 48)}`,
      genesisId: generation.binding.genesisId,
      provisionalThreadId: generation.binding.threadId,
      candidateAttemptNumber: 1,
      scope: "record_repair",
      recordKind: "pass_b_memory_formation",
      failedPass: "B",
      failedGate: "pass_b_genome_verbatim_ngram",
      recordRepairOrdinal: ordinal,
      rejectedContentDigest: rejected.outputDigest,
      rejectedContent: null,
      inputDigest: rejected.inputDigest,
      outputDigest: rejected.outputDigest,
      recordedAt: publicationAt,
    });
  }
}

function publishCohort({ generations, g4, g4Entry, executionBinding, databasePath, attemptStartedAt }) {
  const publicationAt = nowIso();
  const genesisStore = new GenesisStore(absolute(databasePath));
  const genomeStore = new SymbolicGenomeStore(absolute(databasePath));
  const publications = [];
  try {
    for (const generation of generations) {
      genesisStore.recordWorldSpec(generation.worldSpec);
      for (const parent of generation.parentGenomes) persistGenomeBundle(genomeStore, parent);
      persistGenomeBundle(genomeStore, generation.genome);
      persistRepairWitnesses(genesisStore, generation, publicationAt);
    }
    for (const generation of generations) {
      const thread = buildNeutralHThreadSeed({ threadId: generation.binding.threadId, createdAt: attemptStartedAt, binding: executionBinding });
      const memories = materializeMemoryRecords(generation, publicationAt);
      const manifest = buildManifest({ threadGeneration: generation, thread, memoryRecords: memories, publicationAt, g4, g4Entry });
      const lifeRelations = buildSyntheticLineageRelations({ thread, genome: generation.genome, publicationAt, bornAt: generation.subject.bornAt });
      const result = genesisStore.publishBirth({ manifest, thread, episodes: generation.episodes, memories, lifeRelations, originFixture: null });
      publications.push({
        slot: generation.slot,
        threadId: generation.binding.threadId,
        genesisId: generation.binding.genesisId,
        publicationAt,
        firstLiveVersion: result.thread.version,
        manifest: result.manifest,
        manifestDigest: result.manifestDigest,
        publishedThread: result.thread,
        memoryRecordCount: memories.length,
        memoryRefs: [...new Set(memories.map((item) => item.memoryId))],
        lifeRelations,
      });
    }
  } finally {
    genomeStore.close();
    genesisStore.close();
  }
  const world = openWorldStore(absolute(databasePath));
  try { for (const publication of publications) world.verifyThreadIntegrity(publication.threadId); }
  finally { world.close(); }
  return { publicationAt, publications };
}

function progressPrinter(phase, message) { process.stderr.write(`genesis:replacement · ${phase} · ${message}\n`); }

function createProgressAdapter(base, heartbeat) {
  return Object.freeze({
    provider: base.provider,
    modelId: base.modelId,
    configuration: base.configuration,
    async invoke(args) {
      heartbeat.report(args.clientRequestId, `Calling ${base.provider}/${base.modelId}`);
      try { return await base.invoke(args); }
      finally { heartbeat.finish(); }
    },
  });
}

function generationPath(root, slot) {
  return `${root}/thread-slot-${pad(slot)}-generation-v1.json`;
}

function loadAttemptState(binding) {
  const startPath = `${binding.oneShot.outputRoot}/${ATTEMPT_START_FILE}`;
  if (!existsSync(absolute(binding.oneShot.outputRoot))) return { mode: "new", startPath, attempt: null };
  if (existsSync(absolute(binding.oneShot.resultPath)) || existsSync(absolute(binding.oneShot.failurePath))) {
    fail("replacement attempt already has terminal result/failure; one-shot execution refuses rerun");
  }
  if (!existsSync(absolute(startPath))) fail("replacement output root exists without attempt-start witness; execution refuses ambiguous reuse");
  return { mode: "resume", startPath, attempt: readJson(startPath) };
}

function safeWriteFailure(path, value, originalError) {
  try {
    writeJson(path, value);
  } catch (writeError) {
    originalError.failureArtifactWriteError = writeError?.message ?? String(writeError);
    process.stderr.write(`replacement failure artifact could not be written without replacing the original error: ${originalError.failureArtifactWriteError}\n`);
  }
}

export async function runReplacementFinalCohort() {
  const preflight = verifyReplacementFinalCohortPreflight({ requireGateClear: true });
  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  const attemptState = loadAttemptState(binding);
  const g2 = readJson(binding.authorityBoundary.g2ProtocolPath);
  const g3 = readJson(binding.authorityBoundary.g3TreatmentInstancePath);
  const inheritedG3 = readJson(g3.inheritedAuthority.productionProtocolPath);
  const g4Binding = readJson(binding.authorityBoundary.g4CognitionExecutionBindingPath);
  const g4Base = readJson(binding.authorityBoundary.g4BaseProtocolPath);
  const g4Entry = readJson(binding.authorityBoundary.g4EntryAmendmentPath);
  const reliabilityWitness = readJson("artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json");
  const g3Effective = effectiveG3(g3, inheritedG3);
  const g4 = effectiveG4(g4Base, g4Binding, reliabilityWitness);
  const modelEvents = [];
  const heartbeat = createProviderProgressHeartbeat({ progress: progressPrinter });
  const baseAdapter = createOpenAIModelAdapter({ ...modelRuntimeOptions(g4Base), observer: (event) => modelEvents.push({ channel: "provider", ...structuredClone(event) }) });

  let attemptStartedAt;
  if (attemptState.mode === "new") {
    attemptStartedAt = nowIso();
    mkdirSync(absolute(binding.oneShot.outputRoot), { recursive: false });
    writeJson(attemptState.startPath, {
      evidenceVersion: RESULT_VERSION,
      status: "in_progress",
      attemptStartedAt,
      executionBindingDigest: preflight.executionBindingDigest,
      generationPolicyVersion: preflight.generationPolicyVersion,
      gateStatus: preflight.gateStatus,
      processRestartResumeAllowed: true,
      qualityRegenerationAllowed: false,
    });
  } else {
    attemptStartedAt = attemptState.attempt.attemptStartedAt;
    if (attemptState.attempt.executionBindingDigest !== preflight.executionBindingDigest || attemptState.attempt.generationPolicyVersion !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) {
      fail("replacement in-progress attempt witness drift; refuse resume");
    }
    progressPrinter("resume", `Continuing same one-shot attempt from ${attemptStartedAt}`);
  }

  const birthCenter = createBirthCenterRuntime({ stateRoot: binding.oneShot.birthCenterStateRoot });
  const durableAdapter = birthCenter.durableAdapter(baseAdapter, { observer: (event) => modelEvents.push({ channel: "durable", ...structuredClone(event) }) });
  const adapter = createProgressAdapter(durableAdapter, heartbeat);
  const generations = [];

  try {
    for (const slotPlan of preflight.slots) {
      const path = generationPath(binding.oneShot.outputRoot, slotPlan.slot);
      if (existsSync(absolute(path))) {
        const preserved = readJson(path);
        if (preserved.slot !== slotPlan.slot || preserved.binding.threadId !== slotPlan.threadId || preserved.attemptStartedAt !== attemptStartedAt || preserved.evidenceVersion !== RESULT_VERSION) {
          fail(`replacement preserved generation slot ${slotPlan.slot} drift; refuse resume`);
        }
        generations.push(preserved);
        progressPrinter(`slot ${slotPlan.slot}/5`, "Reusing preserved completed generation from the same one-shot attempt");
        continue;
      }
      progressPrinter(`slot ${slotPlan.slot}/5`, `Generating ${slotPlan.threadId}`);
      const generation = await generateThread({
        slotPlan,
        g2,
        g3Production: g3Effective.production,
        g3Analysis: g3Effective.analysis,
        g4,
        adapter,
        attemptStartedAt,
        eventStructureSeedDomain: preflight.eventStructureSeedDomain,
        clientRequestDomain: preflight.clientRequestDomain,
      });
      generations.push(generation);
      writeJson(path, structuredClone(generation));
      progressPrinter(`slot ${slotPlan.slot}/5`, `Generation complete · ${generation.episodes.length} episodes · ${generation.passB.length} Pass-B calls`);
    }

    const published = publishCohort({ generations, g4, g4Entry, executionBinding: binding, databasePath: binding.oneShot.databasePath, attemptStartedAt });
    for (const publication of published.publications) writeJson(`${binding.oneShot.outputRoot}/thread-slot-${pad(publication.slot)}-publication-v1.json`, publication);
    writeJson(binding.oneShot.modelEventsPath, { evidenceVersion: RESULT_VERSION, modelEvents });
    const result = {
      evidenceVersion: RESULT_VERSION,
      status: "FIRST_INTEGRITY_VALID_FIVE_THREAD_REPLACEMENT_COHORT_FROZEN",
      attemptStartedAt,
      completedAt: nowIso(),
      publicationAt: published.publicationAt,
      preflight,
      modelEventsPath: binding.oneShot.modelEventsPath,
      modelEventsDigest: digest(readJson(binding.oneShot.modelEventsPath)),
      threads: published.publications.map((publication) => {
        const genPath = generationPath(binding.oneShot.outputRoot, publication.slot);
        const publicationPath = `${binding.oneShot.outputRoot}/thread-slot-${pad(publication.slot)}-publication-v1.json`;
        return {
          slot: publication.slot,
          threadId: publication.threadId,
          genesisId: publication.genesisId,
          firstLiveVersion: publication.firstLiveVersion,
          generationPath: genPath,
          generationDigest: digest(readJson(genPath)),
          publicationPath,
          publicationDigest: digest(readJson(publicationPath)),
        };
      }),
      databasePath: binding.oneShot.databasePath,
      generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_V3_VERSION,
      processRestartReplayUsed: modelEvents.some((event) => event.type === "durable_model_replay"),
      hostCrashFsyncDurabilityClaimed: false,
      qualityRegenerationAllowed: false,
      nextStep: "RUN_FROZEN_G5_DIAGNOSTICS_THEN_GATE_H_REVIEW",
    };
    writeJson(binding.oneShot.resultPath, result);
    heartbeat.finish();
    return result;
  } catch (error) {
    heartbeat.finish("Provider call ended");
    safeWriteFailure(binding.oneShot.failurePath, {
      evidenceVersion: RESULT_VERSION,
      status: "HOLD_FIRST_REPLACEMENT_COHORT_ATTEMPT_FAILED_NO_REGENERATION",
      attemptStartedAt,
      failedAt: nowIso(),
      error: { name: error?.name ?? "Error", message: error?.message ?? String(error), stack: error?.stack ?? null, gate: error?.gate ?? null },
      completedThreadGenerations: generations.map((item) => ({ slot: item.slot, threadId: item.binding.threadId })),
      modelEvents,
      generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_V3_VERSION,
      qualityRegenerationAllowed: false,
      instruction: "Preserve this failure. Do not rerun as a second attempt or change World, genome, assignment, treatment, provider, model, threshold or quality selection. A process restart before a terminal failure may only continue the same attempt through the frozen durable invocation identities.",
    }, error);
    throw error;
  }
}

function printPreflight(result) {
  process.stdout.write(`PR39 REPLACEMENT FINAL COHORT PREFLIGHT: ${result.status}\n\n`);
  process.stdout.write(`Execution binding digest: ${result.executionBindingDigest}\n`);
  process.stdout.write(`Gate-G(2): ${result.gateStatus}\n`);
  process.stdout.write(`Final-life cognition: ${result.executionAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"}\n`);
  process.stdout.write(`Generation policy: ${result.generationPolicyVersion} · form=${result.generationPolicy.maxFormRepairsPerRecord} · record=${result.generationPolicy.maxRecordRetriesPerRecord} · total=${result.generationPolicy.maxTotalGeneratedVersionsPerRecord}\n`);
  process.stdout.write(`Runtime: ${result.runtime.provider}/${result.runtime.modelId}\n`);
  process.stdout.write(`Offer seed domain: ${result.eventStructureSeedDomain}\n`);
  process.stdout.write(`Client request domain: ${result.clientRequestDomain}\n`);
  process.stdout.write(`Output root: ${result.oneShot.outputRoot}${result.outputState.rootExists ? " [exists]" : " [absent]"}\n`);
  process.stdout.write(`Process-restart replay: enabled; host-crash fsync durability claimed: ${result.durability.hostCrashFsyncDurabilityClaimed}\n\n`);
  for (const slot of result.slots) {
    process.stdout.write(`${slot.slot}. ${slot.threadId} · ${slot.originMode} · ${slot.worldSpecId} · genome=${slot.genomeId} · roster=${slot.rosterSize}\n`);
    process.stdout.write(`   Pass A=${slot.passAEpisodes}; Pass B=${slot.passBHorizons.join("/")}; modes=${slot.passBModes.map((mode) => mode === "life_plus_genome" ? "T" : "L").join(" ")}\n`);
  }
  process.stdout.write("\nPreflight made zero provider calls and wrote no replacement life artifacts.\n");
}

function usage() {
  process.stdout.write("Usage: node tools/genesis/genesis-replacement-final-cohort.mjs --preflight\n       node tools/genesis/genesis-replacement-final-cohort.mjs\n\nThe binding path, provider/model, policy, seeds and output paths are hardcoded by the frozen replacement execution binding. --preflight makes zero provider calls and writes nothing. Execution is blocked until a bound Gate-G(2) CLEAR witness exists.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return usage();
  const unknown = args.filter((arg) => arg !== "--preflight");
  if (unknown.length !== 0) fail(`unsupported replacement argument(s): ${unknown.join(", ")}`);
  if (args.includes("--preflight")) {
    printPreflight(verifyReplacementFinalCohortPreflight());
    return;
  }
  const result = await runReplacementFinalCohort();
  process.stdout.write(`\nPR39 REPLACEMENT FINAL COHORT: ${result.status}\n`);
  process.stdout.write(`Result: ${result.preflight.oneShot.resultPath}\n`);
  process.stdout.write(`Database: ${result.databasePath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stderr.write("genesis-replacement-final-cohort-core.mjs is import-only; use tools/genesis/genesis-replacement-final-cohort.mjs\n");
  process.exitCode = 2;
}
