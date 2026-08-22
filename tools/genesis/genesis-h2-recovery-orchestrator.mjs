#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createBirthCenterRuntime } from "../../services/birth-center/src/runtime.mjs";
import { continueRichPassAFromHistoricalState } from "../../services/birth-center/src/historical-pass-a-continuation.mjs";
import { createOpenAIModelAdapter } from "../../services/world-kernel/src/model-runtime/openai.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  sampleEventStructuresV2,
} from "../../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  buildRichLifePassAInput,
  projectRichLifePassAInputForCognition,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { passACognitionInputDigest } from "../../services/world-kernel/src/genesis-pass-a-cognition.mjs";
import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import { generateRichPassAEpisode } from "../../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { generateAdmittedPassBMemory } from "../../services/world-kernel/src/genesis-pass-b-admission.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
  normalizeReinterpretationPassCModelOutput,
} from "../../services/world-kernel/src/genesis-pass-c-domain.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "../../services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { projectPassCInputForCognition } from "../../services/world-kernel/src/genesis-pass-c-cognition.mjs";
import {
  buildScheduledReinterpretationPassCInput,
  scheduleReinterpretationOpportunities,
} from "../../services/world-kernel/src/genesis-pass-c-reinterpretation.mjs";
import { sharedIntellectualSourceRefs } from "../../services/world-kernel/src/genesis-intellectual-encounter.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMemoryId,
  normalizeAutobiographicalMemory,
} from "../../services/world-kernel/src/autobiographical-memory-domain.mjs";
import { genesisLifeEpisodeEventId } from "../../services/world-kernel/src/genesis-life-episode.mjs";
import {
  genesisRecordDigest,
  normalizeGenesisManifest,
} from "../../services/world-kernel/src/genesis-domain.mjs";
import { GenesisStore } from "../../services/world-kernel/src/genesis-store.mjs";
import { SymbolicGenomeStore } from "../../services/world-kernel/src/symbolic-genome-store.mjs";
import { symbolicGenomeDigest } from "../../services/world-kernel/src/symbolic-genome-domain.mjs";
import { lifeRelationId, normalizeLifeRelation } from "../../services/world-kernel/src/situated-life-domain.mjs";
import { normalizeSeedSnapshot } from "../../services/world-kernel/src/persistence-domain.mjs";
import { openWorldStore } from "../../services/world-kernel/src/persistence.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

import {
  createH2OpenAICompatibilityFetch,
  projectPassBResponseSchemaForOpenAI,
} from "./genesis-h2-openai-schema-compat.mjs";
import {
  buildNeutralHThreadSeed,
  buildHPassBInput,
} from "./genesis-h-final-cohort.mjs";
import { buildH2RecoveryExecutionPlan } from "./genesis-h2-recovery-plan.mjs";
import { executeH2RecoverySequence } from "./genesis-h2-recovery-sequencer.mjs";
import { buildH2Slot4Episode3RecoveryState } from "./genesis-h2-recovery-state.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const RECOVERY_BINDING_PATH = "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-binding-v1.json";
const H2_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/h/protocol/h-execution-binding-v2.json";
export const H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH = "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-execution-authorization-v1.json";
const G3_V1_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json";
const ATTEMPT_START_FILENAME = "h-recovery-attempt-start-v1.json";
const RESULT_FILENAME = "h-recovery-result-v1.json";
const TRANSPORT_FILENAME = "h-recovery-transport-compatibility-v1.json";

export const H2_RECOVERY_ORCHESTRATOR_VERSION = "pr39-h-v2-recovery-orchestrator-v1";

const absolute = (path) => resolve(ROOT, path);
const readJson = (path) => JSON.parse(readFileSync(absolute(path), "utf8"));
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const pad = (value, width = 2) => String(value).padStart(width, "0");
const fail = (message) => { throw new Error(message); };

function currentBlob(path) {
  return execFileSync("git", ["rev-parse", `HEAD:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeJsonExclusive(path, value) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function writeJsonOnceOrVerify(path, value) {
  const target = absolute(path);
  if (!existsSync(target)) {
    writeJsonExclusive(path, value);
    return Object.freeze({ path, reused: false });
  }
  const existing = JSON.parse(readFileSync(target, "utf8"));
  if (canonicalJson(existing) !== canonicalJson(value)) {
    fail(`recovery artifact ${path} already exists with different content`);
  }
  return Object.freeze({ path, reused: true });
}

function readRecoveryBinding() {
  const binding = readJson(RECOVERY_BINDING_PATH);
  if (binding.recoveryVersion !== "pr39-h-v2-recovery-continuation-v1") fail("unexpected H-v2 recovery binding");
  return binding;
}

function readExecutionAuthorization({ required = false } = {}) {
  if (!existsSync(absolute(H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH))) {
    if (required) {
      fail(`H-v2 recovery provider execution remains blocked: reviewed authorization witness is absent (${H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH})`);
    }
    return null;
  }
  const authorization = readJson(H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH);
  if (authorization.authorizationVersion !== "pr39-h-v2-recovery-execution-authorization-v1" ||
      authorization.status !== "AUTHORIZED_FOR_RECOVERY_EXECUTION") {
    fail("H-v2 recovery execution authorization version/status drift");
  }
  return authorization;
}

function assertExecutionAuthorization(binding, authorization) {
  const orchestratorBlobSha = currentBlob("tools/genesis/genesis-h2-recovery-orchestrator.mjs");
  if (authorization.recoveryBindingDigest !== digest(binding) ||
      authorization.orchestratorVersion !== H2_RECOVERY_ORCHESTRATOR_VERSION ||
      authorization.orchestratorBlobSha !== orchestratorBlobSha ||
      authorization.firstProviderOperation !== "pr39-h:slot-04:pass-a:episode-03:record-retry:2" ||
      authorization.scientificStanding !== "recovery_resilience_only" ||
      authorization.mayReplaceH2Hold !== false ||
      authorization.mayEnterFrozenG5G6 !== false) {
    fail("H-v2 recovery execution authorization does not exactly bind the reviewed recovery boundary");
  }
  return authorization;
}

function readFrozenProtocols() {
  const executionBinding = readJson(H2_EXECUTION_BINDING_PATH);
  const g2 = readJson(executionBinding.authorityBoundary.g2ProtocolPath);
  const g3v1 = readJson(G3_V1_PATH);
  const g3v2 = readJson(executionBinding.authorityBoundary.g3ProtocolPath);
  const g4v1 = readJson(executionBinding.authorityBoundary.g4BaseProtocolPath);
  const g4v2 = readJson(executionBinding.authorityBoundary.g4AmendmentPath);
  return { executionBinding, g2, g3v1, g3v2, g4v1, g4v2 };
}

export function verifyH2RecoveryOrchestratorPreflight() {
  const binding = readRecoveryBinding();
  const plan = buildH2RecoveryExecutionPlan();
  const { executionBinding, g2, g3v2, g4v1 } = readFrozenProtocols();
  const executionAuthorization = readExecutionAuthorization();
  if (executionAuthorization !== null) assertExecutionAuthorization(binding, executionAuthorization);

  if (binding.authorization?.providerCallsAuthorizedByThisFreeze !== false) {
    fail("recovery implementation review boundary unexpectedly authorizes provider calls");
  }
  if (binding.authorization?.executionRequiresSeparateReviewedContinuationImplementation !== true) {
    fail("recovery binding no longer requires separate continuation review");
  }
  if (plan.providerCallsAuthorized !== false) fail("recovery plan unexpectedly authorizes provider calls");
  if (plan.firstProviderOperation.clientRequestId !== "pr39-h:slot-04:pass-a:episode-03:record-retry:2") {
    fail("recovery orchestrator first provider operation drift");
  }
  if (executionBinding.executionAttemptVersion !== "H-v2") fail("recovery orchestrator requires H-v2 execution authority");
  if (g2.worldBindings.length !== 5 || g4v1.historicalPlan.episodesPerThread !== 10) {
    fail("recovery orchestrator frozen cohort shape drift");
  }
  if (g3v2.inheritedProductionProtocol.historyEpisodeHorizons.length !==
      g3v2.inheritedProductionProtocol.directModes.length) {
    fail("recovery orchestrator Pass-B schedule drift");
  }

  return Object.freeze({
    status: executionAuthorization === null
      ? "CLEAR_RECOVERY_ORCHESTRATOR_IMPLEMENTED_NOT_AUTHORIZED"
      : "CLEAR_RECOVERY_ORCHESTRATOR_REVIEW_AUTHORIZED",
    orchestratorVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    recoveryVersion: binding.recoveryVersion,
    executionAttemptVersion: executionBinding.executionAttemptVersion,
    providerCallsAuthorized: executionAuthorization !== null,
    executionAuthorizationPath: H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH,
    firstProviderOperation: structuredClone(plan.firstProviderOperation),
    outputRoot: binding.output.root,
    stageCount: plan.stages.length,
    scientificStanding: Object.freeze({ ...binding.scientificStanding }),
  });
}

function verifyPreservedGenerationArtifact(expected) {
  if (currentBlob(expected.artifactPath) !== expected.artifactBlobSha) {
    fail(`preserved slot ${expected.slot} generation artifact blob drift`);
  }
  const generation = readJson(expected.artifactPath);
  if (generation.slot !== expected.slot || generation.binding?.threadId !== expected.threadId) {
    fail(`preserved slot ${expected.slot} generation identity drift`);
  }
  return generation;
}

function createAttemptStart(plan, binding) {
  const now = new Date().toISOString();
  return {
    evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    status: "in_progress",
    attemptStartedAt: now,
    publicationAt: now,
    recoveryBindingDigest: digest(binding),
    sourceFailureBlobSha: binding.sourceAttempt.failureBlobSha,
    plan: structuredClone(plan),
  };
}

function loadOrCreateAttemptStart(binding) {
  const root = binding.output.root;
  const path = `${root}/${ATTEMPT_START_FILENAME}`;
  if (!existsSync(absolute(root))) {
    const plan = buildH2RecoveryExecutionPlan();
    mkdirSync(absolute(root), { recursive: false });
    const start = createAttemptStart(plan, binding);
    writeJsonExclusive(path, start);
    return Object.freeze({ start, restarted: false });
  }

  if (!existsSync(absolute(path))) {
    fail(`recovery output root exists without ${ATTEMPT_START_FILENAME}`);
  }
  const start = readJson(path);
  if (start.evidenceVersion !== H2_RECOVERY_ORCHESTRATOR_VERSION || start.status !== "in_progress") {
    fail("recovery attempt-start record version/status drift");
  }
  if (start.recoveryBindingDigest !== digest(binding) ||
      start.sourceFailureBlobSha !== binding.sourceAttempt.failureBlobSha) {
    fail("recovery attempt-start authority drift");
  }
  if (start.plan?.firstProviderOperation?.clientRequestId !== "pr39-h:slot-04:pass-a:episode-03:record-retry:2") {
    fail("recovery restart first provider operation drift");
  }
  for (const expected of start.plan.stages?.[0]?.slots ?? []) verifyPreservedGenerationArtifact(expected);
  const recovery = buildH2Slot4Episode3RecoveryState();
  if (recovery.episode3.inspection.nextOrdinal !== 2 ||
      recovery.episode3.inspection.currentGate !== "pass_a_structure_participation") {
    fail("recovery restart historical resume point drift");
  }
  return Object.freeze({ start, restarted: true });
}

function modelRuntimeOptions(g4v1) {
  const runtime = g4v1.commonRuntime;
  if (runtime.provider !== "openai") fail("recovery frozen provider is not openai");
  if (runtime.maxOutputTokens !== "auto") fail("recovery supports only frozen automatic max-output-token policy");
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

function uniqueIntroductions(episodes) {
  const byId = new Map();
  for (const episode of episodes) {
    for (const participant of episode.introducedParticipants ?? []) {
      if (!byId.has(participant.provisionalPersonId)) byId.set(participant.provisionalPersonId, participant);
    }
  }
  return [...byId.values()].map((item) => structuredClone(item));
}

function verifySyntheticParents(g2, binding, genome) {
  if (binding.originMode !== "synthetic_lineage") return [];
  const lineage = g2.syntheticLineages.find((item) => item.slot === binding.slot);
  if (!lineage) fail(`recovery slot ${binding.slot} lacks synthetic-lineage manifest`);
  return lineage.parentGenomePaths.map((path, index) => {
    const parent = readJson(path);
    const parentDigest = symbolicGenomeDigest({
      header: parent.header,
      loci: parent.loci,
      mutations: parent.mutations ?? [],
    });
    if (parent.genomeDigest !== parentDigest || parentDigest !== lineage.parentGenomeDigests[index]) {
      fail(`recovery slot ${binding.slot} synthetic parent ${index + 1} digest drift`);
    }
    return parent;
  });
}

function buildPassAInput({ binding, roster, worldSpec, subject, lineageWitness, g4v1, priorEpisodes, window }) {
  const seed = `${g4v1.eventStructurePool.seedDomain}:slot:${pad(binding.slot)}:structures:${window.windowId}`;
  const offeredEntries = sampleEventStructuresV2(
    GENESIS_EVENT_STRUCTURE_POOL_V2,
    window,
    { seed, count: g4v1.eventStructurePool.structuresPerWindow },
  );
  const input = buildRichLifePassAInput({
    originMode: binding.originMode,
    syntheticLineageWitness: lineageWitness,
    worldSpec,
    subject,
    developmentalWindow: {
      windowId: window.windowId,
      startAt: window.startAt,
      endAt: window.endAt,
      minAge: window.minAge,
      maxAge: window.maxAge,
    },
    chronologyEndsAt: window.endAt,
    initialRoster: roster.participants,
    priorEpisodes,
    previouslyIntroducedParticipants: uniqueIntroductions(priorEpisodes),
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries,
  });
  return { input, seed, offeredEntries };
}

function passAEntryFromEvidence({ window, seed, offeredEntries, evidence }) {
  return {
    ordinal: window.ordinal,
    developmentalWindow: structuredClone(window),
    offerSeed: seed,
    offeredStructureIds: offeredEntries.map((item) => item.structure.structureId),
    inputDigest: evidence.inputDigest,
    episode: structuredClone(evidence.episode),
    episodeDigest: evidence.episodeDigest,
    calls: structuredClone(evidence.calls ?? evidence.continuationCalls ?? []),
    repairs: structuredClone(evidence.repairs ?? evidence.continuationRepairs ?? []),
    recordRetries: structuredClone(evidence.recordRetries ?? evidence.continuationRetries ?? []),
    generationPolicyVersion: evidence.generationPolicyVersion ?? null,
  };
}

export function recoveredHistoricalPassAEntry({ window, seed, offeredEntries, inputDigest, evidence }) {
  if (window.ordinal !== evidence.ordinal) fail("preserved historical Pass-A ordinal drift");
  return {
    ordinal: window.ordinal,
    developmentalWindow: structuredClone(window),
    offerSeed: seed,
    offeredStructureIds: offeredEntries.map((item) => item.structure.structureId),
    inputDigest,
    episode: structuredClone(evidence.episode),
    episodeDigest: digest(evidence.episode),
    calls: structuredClone(evidence.historicalCalls),
    repairs: [],
    recordRetries: [],
    historicalCalls: structuredClone(evidence.historicalCalls),
    recoveryCalls: [],
    historicalRepairWitnesses: structuredClone(evidence.repairWitnesses),
    preservedHistoricalSource: RECOVERY_BINDING_PATH,
  };
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
    if (!item) fail(`recovery Pass-B cited unknown episode ${ref}`);
    return item;
  }).sort((a, b) => a.ordinal - b.ordinal);
  if (cited.length === 0) fail("recovery remembered Pass-B output has no cited episode");
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

async function runPassCInitial({ adapter, input, clientRequestId }) {
  const cognitionInput = projectPassCInputForCognition(input);
  const result = await adapter.invoke({
    systemPrompt: GENESIS_PASS_C_INITIAL_PROMPT,
    input: cognitionInput,
    responseSchema: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
    clientRequestId,
  });
  return {
    input,
    cognitionInput,
    output: normalizeInitialPassCModelOutput(result.output, input),
    provenance: result.provenance,
  };
}

async function runPassCReinterpretation({ adapter, input, clientRequestId }) {
  const cognitionInput = projectPassCInputForCognition(input);
  const result = await adapter.invoke({
    systemPrompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
    input: cognitionInput,
    responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    clientRequestId,
  });
  return {
    input,
    cognitionInput,
    output: normalizeReinterpretationPassCModelOutput(result.output, input),
    provenance: result.provenance,
  };
}

function relationFactsForMemoryTrigger({ threadId, memory, triggerEpisode }) {
  const target = memory.origin.episode;
  const targetPeople = new Set(target.participantRefs.filter((ref) => ref !== threadId));
  return {
    targetStructureRef: target.structureRef,
    triggerStructureRef: triggerEpisode.structureRef,
    targetStructureFamilyRef: null,
    triggerStructureFamilyRef: null,
    sharedPersonRefs: triggerEpisode.participantRefs
      .filter((ref) => ref !== threadId && targetPeople.has(ref))
      .sort(),
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
        trigger: {
          episodeRef: triggerEpisode.episodeId,
          occurredAt: triggerEpisode.occurredAt,
          observableAction: triggerEpisode.observableAction,
        },
        relationFacts: relationFactsForMemoryTrigger({ threadId, memory, triggerEpisode }),
      });
    }
  }
  return candidates;
}

function currentPriorMeaning(memory) {
  return {
    summary: memory.currentMeaning.summary,
    parts: structuredClone(memory.currentMeaning.parts),
  };
}

async function completeMemoryAndMeaning({
  binding,
  subject,
  worldSpec,
  genome,
  episodes,
  g3v1,
  g3v2,
  g4v1,
  adapter,
}) {
  const eventMap = eventMapForLife({
    threadId: binding.threadId,
    genesisId: binding.genesisId,
    episodes,
  });
  const priorRememberedMemories = [];
  const memories = [];
  const passB = [];
  const passCInitial = [];
  const directModes = g3v2.inheritedProductionProtocol.directModes;
  const horizons = g3v2.inheritedProductionProtocol.historyEpisodeHorizons;

  for (let index = 0; index < horizons.length; index += 1) {
    const callOrdinal = index + 1;
    const horizon = horizons[index];
    const formationMode = directModes[index];
    const input = buildHPassBInput({
      threadId: binding.threadId,
      bornAt: subject.bornAt,
      worldSpec,
      episodes,
      horizon,
      callOrdinal,
      formationMode,
      priorRememberedMemories,
      genome,
      g3v1,
      g4v1,
    });
    const result = await generateAdmittedPassBMemory({
      adapter,
      input,
      clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-b:call-${pad(callOrdinal)}`,
    });
    const output = result.output;
    passB.push({
      callOrdinal,
      horizon,
      formationMode,
      assignment: structuredClone(input.assignment),
      input: structuredClone(input),
      output: structuredClone(output),
      calls: structuredClone(result.calls),
    });
    if (output.outcome !== "remembered") continue;

    const identity = memoryIdentityFromPassB({
      threadId: binding.threadId,
      callOrdinal,
      passBOutput: output,
      eventMap,
    });
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
    const passCInput = buildInitialPassCInput({
      memory,
      asOf: input.rememberingAt,
      ageAtFormation: input.ageAtRemembering,
      chronologyIndex: horizon,
    });
    const c = await runPassCInitial({
      adapter,
      input: passCInput,
      clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-c:initial-${pad(callOrdinal)}`,
    });
    passCInitial.push({ callOrdinal, memoryRef: memory.memoryRef, ...structuredClone(c) });
    if (c.output.outcome === "durable_meaning") {
      memory.currentMeaning = {
        summary: c.output.summary,
        parts: structuredClone(c.output.parts),
        formedAt: input.rememberingAt,
        ageAtFormation: input.ageAtRemembering,
        chronologyIndex: horizon,
      };
    }
    memories.push(memory);
    priorRememberedMemories.push({
      memoryRef: memory.memoryRef,
      passBEpisodeRefs: memory.passBEpisodeRefs,
      rememberedContent: memory.rememberedContent,
      uncertainty: memory.uncertainty,
      formationMode,
    });
  }

  const candidates = buildReinterpretationCandidates({
    threadId: binding.threadId,
    memories,
    episodes,
  });
  const reinterpretationSchedule = scheduleReinterpretationOpportunities(candidates);
  const reinterpretationRuns = [];
  const byMemory = new Map(memories.map((memory) => [memory.memoryRef, memory]));

  for (const scheduled of reinterpretationSchedule.filter((item) => item.run)) {
    const memory = byMemory.get(scheduled.memoryRef);
    if (!memory?.currentMeaning) fail(`recovery reinterpretation ${scheduled.opportunityId} lacks current meaning`);
    const triggerItem = eventMap.get(scheduled.trigger.episodeRef);
    if (!triggerItem) fail(`recovery reinterpretation ${scheduled.opportunityId} trigger missing`);
    const input = buildScheduledReinterpretationPassCInput({
      scheduledOpportunity: scheduled,
      targetMemory: {
        memoryRef: memory.memoryRef,
        episodeRefs: [...memory.eventRefs],
        rememberedContent: memory.rememberedContent,
        uncertainty: [...memory.uncertainty],
      },
      priorMeaning: currentPriorMeaning(memory),
      formation: {
        asOf: scheduled.trigger.occurredAt,
        ageAtFormation: triggerItem.episode.ageAtEvent,
        chronologyIndex: triggerItem.ordinal,
      },
    });
    const result = await runPassCReinterpretation({
      adapter,
      input,
      clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-c:reinterpret:${scheduled.opportunityId}`,
    });
    reinterpretationRuns.push({
      opportunityId: scheduled.opportunityId,
      memoryRef: memory.memoryRef,
      ...structuredClone(result),
    });
    if (result.output.outcome === "revised") {
      memory.currentMeaning = {
        summary: result.output.summary,
        parts: structuredClone(result.output.parts),
        formedAt: scheduled.trigger.occurredAt,
        ageAtFormation: triggerItem.episode.ageAtEvent,
        chronologyIndex: triggerItem.ordinal,
      };
      memory.pendingRevisions ??= [];
      memory.pendingRevisions.push({
        asOf: scheduled.trigger.occurredAt,
        output: structuredClone(result.output),
        supportingEvidenceRefs: [triggerItem.eventId],
      });
    }
  }

  return {
    passB,
    passCInitial,
    memories,
    reinterpretationSchedule: structuredClone(reinterpretationSchedule),
    reinterpretationRuns,
  };
}

async function generateProspectivePassA({
  binding,
  roster,
  worldSpec,
  subject,
  lineageWitness,
  g4v1,
  adapter,
  episodes,
  passA,
  repairWitnesses,
  startOrdinal,
  recordedAt,
}) {
  for (const window of g4v1.historicalPlan.windows.filter((item) => item.ordinal >= startOrdinal)) {
    const { input, seed, offeredEntries } = buildPassAInput({
      binding,
      roster,
      worldSpec,
      subject,
      lineageWitness,
      g4v1,
      priorEpisodes: episodes,
      window,
    });
    const evidence = await generateRichPassAEpisode({
      adapter,
      input,
      clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-a:episode-${pad(window.ordinal)}`,
      selectedOpportunity: null,
      generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
      onRecordRepair: (witness) => repairWitnesses.push({
        kind: "pass_a_form_repair",
        episodeOrdinal: window.ordinal,
        recordedAt,
        ...structuredClone(witness),
      }),
      onRecordRetry: (witness) => repairWitnesses.push({
        kind: "pass_a_record_retry",
        episodeOrdinal: window.ordinal,
        recordedAt,
        ...structuredClone(witness),
      }),
    });
    episodes.push(evidence.episode);
    passA.push(passAEntryFromEvidence({ window, seed, offeredEntries, evidence }));
  }
}

async function generateRecoveredSlot4({ protocols, adapter, attemptStartedAt }) {
  const { g2, g3v1, g3v2, g4v1 } = protocols;
  const recovery = buildH2Slot4Episode3RecoveryState();
  const binding = g2.worldBindings.find((item) => item.slot === 4);
  const roster = g4v1.initialRosters.find((item) => item.slot === 4);
  if (!binding || !roster || binding.threadId !== recovery.threadId) fail("recovery slot 4 binding drift");
  const worldSpec = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const parentGenomes = verifySyntheticParents(g2, binding, genome);
  const subject = {
    provisionalThreadId: binding.threadId,
    bornAt: g4v1.historicalPlan.entry.bornAt,
  };
  const lineageWitness = binding.originMode === "synthetic_lineage"
    ? syntheticLineageWitnessFromRecombinedGenome(genome)
    : null;
  const episodes = recovery.acceptedEpisodes.map((episode) => structuredClone(episode));
  const passA = [];
  const repairWitnesses = recovery.historicalRepairWitnesses.map((witness) => structuredClone(witness));

  for (const window of g4v1.historicalPlan.windows.filter((item) => item.ordinal <= 2)) {
    const { input, seed, offeredEntries } = buildPassAInput({
      binding,
      roster,
      worldSpec,
      subject,
      lineageWitness,
      g4v1,
      priorEpisodes: episodes.slice(0, window.ordinal - 1),
      window,
    });
    const evidence = recovery.acceptedEpisodeEvidence.find((item) => item.ordinal === window.ordinal);
    if (!evidence) fail(`recovery slot 4 lacks historical evidence for episode ${window.ordinal}`);
    passA.push(recoveredHistoricalPassAEntry({
      window,
      seed,
      offeredEntries,
      inputDigest: passACognitionInputDigest(projectRichLifePassAInputForCognition(input)),
      evidence,
    }));
  }

  const window3 = g4v1.historicalPlan.windows.find((item) => item.ordinal === 3);
  const continuation = await continueRichPassAFromHistoricalState({
    adapter,
    input: recovery.episode3.input,
    clientRequestId: "pr39-h:slot-04:pass-a:episode-03",
    state: recovery.episode3.state,
    onRecordRepair: (witness) => repairWitnesses.push({
      kind: "pass_a_form_repair",
      episodeOrdinal: 3,
      recordedAt: attemptStartedAt,
      ...structuredClone(witness),
    }),
    onRecordRetry: (witness) => repairWitnesses.push({
      kind: "pass_a_record_retry",
      episodeOrdinal: 3,
      recordedAt: attemptStartedAt,
      ...structuredClone(witness),
    }),
  });
  episodes.push(continuation.episode);
  const { seed: seed3, offeredEntries: offered3 } = buildPassAInput({
    binding,
    roster,
    worldSpec,
    subject,
    lineageWitness,
    g4v1,
    priorEpisodes: episodes.slice(0, 2),
    window: window3,
  });
  const episode3Entry = passAEntryFromEvidence({
    window: window3,
    seed: seed3,
    offeredEntries: offered3,
    evidence: continuation,
  });
  episode3Entry.historicalCalls = structuredClone(recovery.episode3.state.historicalCalls);
  episode3Entry.recoveryCalls = structuredClone(continuation.continuationCalls);
  episode3Entry.calls = [
    ...structuredClone(recovery.episode3.state.historicalCalls),
    ...structuredClone(continuation.continuationCalls),
  ];
  episode3Entry.historicalRepairWitnesses = recovery.historicalRepairWitnesses
    .filter((witness) => witness.episodeOrdinal === 3)
    .map((witness) => structuredClone(witness));
  passA.push(episode3Entry);

  await generateProspectivePassA({
    binding,
    roster,
    worldSpec,
    subject,
    lineageWitness,
    g4v1,
    adapter,
    episodes,
    passA,
    repairWitnesses,
    startOrdinal: 4,
    recordedAt: attemptStartedAt,
  });

  const downstream = await completeMemoryAndMeaning({
    binding,
    subject,
    worldSpec,
    genome,
    episodes,
    g3v1,
    g3v2,
    g4v1,
    adapter,
  });

  return {
    evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    recoveryRole: "partial_slot_continuation",
    generatedAt: attemptStartedAt,
    attemptStartedAt,
    slot: 4,
    binding: structuredClone(binding),
    subject,
    worldSpec,
    genome,
    parentGenomes,
    roster: structuredClone(roster),
    passA,
    episodes,
    repairWitnesses,
    historicalSuccessfulCalls: structuredClone(recovery.successfulHistoricalCalls),
    historicalContinuation: {
      sourceState: structuredClone(recovery.episode3.state),
      historicalCalls: structuredClone(recovery.episode3.state.historicalCalls),
      finalBudgetState: structuredClone(continuation.budgetState),
      continuationCalls: structuredClone(continuation.continuationCalls),
    },
    ...downstream,
  };
}

async function generateFreshSlot5({ protocols, adapter, attemptStartedAt }) {
  const { g2, g3v1, g3v2, g4v1 } = protocols;
  const binding = g2.worldBindings.find((item) => item.slot === 5);
  const roster = g4v1.initialRosters.find((item) => item.slot === 5);
  if (!binding || !roster) fail("recovery slot 5 binding missing");
  const worldSpec = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const parentGenomes = verifySyntheticParents(g2, binding, genome);
  const subject = {
    provisionalThreadId: binding.threadId,
    bornAt: g4v1.historicalPlan.entry.bornAt,
  };
  const lineageWitness = binding.originMode === "synthetic_lineage"
    ? syntheticLineageWitnessFromRecombinedGenome(genome)
    : null;
  const episodes = [];
  const passA = [];
  const repairWitnesses = [];

  await generateProspectivePassA({
    binding,
    roster,
    worldSpec,
    subject,
    lineageWitness,
    g4v1,
    adapter,
    episodes,
    passA,
    repairWitnesses,
    startOrdinal: 1,
    recordedAt: attemptStartedAt,
  });

  const downstream = await completeMemoryAndMeaning({
    binding,
    subject,
    worldSpec,
    genome,
    episodes,
    g3v1,
    g3v2,
    g4v1,
    adapter,
  });

  return {
    evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    recoveryRole: "previously_unstarted_slot",
    generatedAt: attemptStartedAt,
    attemptStartedAt,
    slot: 5,
    binding: structuredClone(binding),
    subject,
    worldSpec,
    genome,
    parentGenomes,
    roster: structuredClone(roster),
    passA,
    episodes,
    repairWitnesses,
    ...downstream,
  };
}

function buildMemoryRevision({
  threadId,
  publicationAt,
  memory,
  revision,
  asOf,
  meaningOutput,
  supportingEvidenceRefs = [],
}) {
  const durable = meaningOutput.outcome === "durable_meaning" || meaningOutput.outcome === "revised";
  return normalizeAutobiographicalMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId: memory.memoryRef,
    revision,
    threadId,
    subject: {
      originEventRef: memory.origin.eventId,
      slot: memory.slot,
    },
    subjectPeriod: {
      startAt: memory.cited[0].episode.occurredAt,
      endAt: memory.cited[memory.cited.length - 1].episode.occurredAt,
    },
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
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [...supportingEvidenceRefs],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: publicationAt,
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  });
}

function materializeMemoryRecords(generation, publicationAt) {
  const records = [];
  const initialByMemory = new Map(
    generation.passCInitial.map((item) => [item.memoryRef, item.output]),
  );
  for (const memory of generation.memories) {
    const initial = initialByMemory.get(memory.memoryRef);
    if (!initial) fail(`recovery missing initial Pass-C output for ${memory.memoryRef}`);
    records.push(buildMemoryRevision({
      threadId: generation.binding.threadId,
      publicationAt,
      memory,
      revision: 1,
      asOf: memory.initialMeaningFormedAt,
      meaningOutput: initial,
    }));
    let revision = 1;
    for (const pending of memory.pendingRevisions ?? []) {
      revision += 1;
      records.push(buildMemoryRevision({
        threadId: generation.binding.threadId,
        publicationAt,
        memory,
        revision,
        asOf: pending.asOf,
        meaningOutput: pending.output,
        supportingEvidenceRefs: pending.supportingEvidenceRefs,
      }));
    }
  }
  return records;
}

function buildManifest({
  generation,
  thread,
  memoryRecords,
  publicationAt,
  g4v1,
  g4v2,
}) {
  const binding = generation.binding;
  const genome = generation.genome;
  const parentRefs = binding.originMode === "synthetic_lineage"
    ? genome.header.sourceEligibility.sourceOwners.map((owner) => owner.ownerId)
    : [];
  return normalizeGenesisManifest({
    genesisId: binding.genesisId,
    threadId: binding.threadId,
    originMode: binding.originMode,
    entry: {
      stage: g4v2.manifestEntryAmendment.stage,
      ageAtEntry: g4v2.manifestEntryAmendment.ageAtEntry,
      chronologyEndsAt: g4v2.manifestEntryAmendment.chronologyEndsAt,
      justification: g4v2.manifestEntryAmendment.justification,
      policyRef: g4v2.manifestEntryAmendment.policyRef,
    },
    worldSpecRef: binding.worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs: parentRefs,
    genomeRef: binding.genomeId,
    cognition: structuredClone(g4v1.manifestCognitionTemplate),
    publication: {
      status: "published",
      publishedAt: publicationAt,
      resultingThreadVersion: thread.version + generation.episodes.length + memoryRecords.length,
    },
    createdAt: thread.provenance.createdAt,
  });
}

function buildSyntheticLineageRelations({ thread, genome, publicationAt, bornAt }) {
  if (genome.header.originKind !== "recombined") return [];
  const seed = normalizeSeedSnapshot(thread);
  return genome.header.sourceEligibility.sourceOwners.map((owner) => normalizeLifeRelation({
    relationId: lifeRelationId({
      threadId: thread.threadId,
      relatedPartyId: owner.ownerId,
      relationKind: "biological_parent",
      geneticContributionRole: "parent_genome_source",
    }),
    revision: 1,
    threadId: thread.threadId,
    relatedParty: {
      partyId: owner.ownerId,
      kind: "synthetic_ancestor",
      displayName: owner.ownerId,
    },
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

function persistGenomeBundle(store, bundle) {
  return store.recordGenome({
    header: bundle.header,
    loci: bundle.loci,
    mutations: bundle.mutations ?? [],
    genomeDigest: bundle.genomeDigest,
  });
}

export function persistRecoveryRepairWitnesses(genesisStore, generation, publicationAt) {
  let ordinal = 0;
  for (const witness of generation.repairWitnesses ?? []) {
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
  for (const passB of generation.passB ?? []) {
    if ((passB.calls ?? []).length <= 1) continue;
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
  return ordinal;
}

function publishRecoveredCohort({
  generations,
  protocols,
  databasePath,
  attemptStartedAt,
  publicationAt,
}) {
  const { executionBinding, g4v1, g4v2 } = protocols;
  const genesisStore = new GenesisStore(absolute(databasePath));
  const genomeStore = new SymbolicGenomeStore(absolute(databasePath));
  const publications = [];

  try {
    for (const generation of generations) {
      genesisStore.recordWorldSpec(generation.worldSpec);
      for (const parent of generation.parentGenomes ?? []) persistGenomeBundle(genomeStore, parent);
      persistGenomeBundle(genomeStore, generation.genome);
      persistRecoveryRepairWitnesses(genesisStore, generation, publicationAt);
    }

    for (const generation of generations) {
      const thread = buildNeutralHThreadSeed({
        threadId: generation.binding.threadId,
        createdAt: attemptStartedAt,
        binding: executionBinding,
      });
      const memories = materializeMemoryRecords(generation, publicationAt);
      const manifest = buildManifest({
        generation,
        thread,
        memoryRecords: memories,
        publicationAt,
        g4v1,
        g4v2,
      });
      const lifeRelations = buildSyntheticLineageRelations({
        thread,
        genome: generation.genome,
        publicationAt,
        bornAt: generation.subject.bornAt,
      });
      const expectedManifestDigest = genesisRecordDigest("manifest", manifest);
      const existing = genesisStore.getManifest(generation.binding.genesisId, { required: false });

      if (existing !== null) {
        if (existing.manifestDigest !== expectedManifestDigest ||
            canonicalJson(existing.manifest) !== canonicalJson(manifest)) {
          fail(`recovery publication ${generation.binding.genesisId} exists with different manifest`);
        }
        const inspection = genesisStore.inspectGenesis(generation.binding.genesisId);
        if (!inspection.threadPublished) fail(`recovery manifest ${generation.binding.genesisId} exists without Thread`);
        publications.push({
          slot: generation.slot,
          threadId: generation.binding.threadId,
          genesisId: generation.binding.genesisId,
          firstLiveVersion: manifest.publication.resultingThreadVersion,
          manifestDigest: expectedManifestDigest,
          idempotentReplay: true,
        });
        continue;
      }

      const result = genesisStore.publishBirth({
        manifest,
        thread,
        episodes: generation.episodes,
        memories,
        lifeRelations,
        originFixture: null,
      });
      publications.push({
        slot: generation.slot,
        threadId: generation.binding.threadId,
        genesisId: generation.binding.genesisId,
        firstLiveVersion: result.thread.version,
        manifestDigest: result.manifestDigest,
        idempotentReplay: false,
      });
    }
  } finally {
    genomeStore.close();
    genesisStore.close();
  }

  const world = openWorldStore(absolute(databasePath));
  try {
    for (const publication of publications) world.verifyThreadIntegrity(publication.threadId);
  } finally {
    world.close();
  }
  return publications;
}

function generationPath(root, slot) {
  return `${root}/thread-slot-${pad(slot)}-generation-recovery-v1.json`;
}

function writeFailure(root, error) {
  const path = `${root}/failures/h-recovery-failure-${Date.now()}.json`;
  writeJsonExclusive(path, {
    evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    failedAt: new Date().toISOString(),
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? String(error),
      gate: error?.gate ?? null,
    },
    providerCallsRemainDurablyJournaled: true,
    restartInstruction: "Rerun only the same reviewed recovery orchestrator; durable clientRequestIds replay successful calls.",
  });
}

export async function runAuthorizedH2Recovery() {
  const binding = readRecoveryBinding();
  if (binding.authorization?.providerCallsAuthorizedByThisFreeze !== false) {
    fail("frozen H-v2 recovery boundary must remain zero-call; execution authorization is separate");
  }
  const authorization = assertExecutionAuthorization(binding, readExecutionAuthorization({ required: true }));
  if (authorization === null) fail("recovery authorization unexpectedly absent");

  const { start, restarted } = loadOrCreateAttemptStart(binding);
  const root = binding.output.root;
  const completedResultPath = `${root}/${RESULT_FILENAME}`;
  if (existsSync(absolute(completedResultPath))) {
    const completed = readJson(completedResultPath);
    if (completed.evidenceVersion !== H2_RECOVERY_ORCHESTRATOR_VERSION ||
        completed.status !== "RECOVERY_RESILIENCE_WORLD_COMPLETED") {
      fail("recovery result exists with unexpected version/status");
    }
    return Object.freeze(structuredClone(completed));
  }

  const protocols = readFrozenProtocols();
  const projections = [];
  const projection = projectPassBResponseSchemaForOpenAI();
  writeJsonOnceOrVerify(`${root}/${TRANSPORT_FILENAME}`, {
    evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
    compatibilityVersion: projection.version,
    canonicalPassBSchemaHash: projection.canonicalSchemaHash,
    transportPassBSchemaHash: projection.transportSchemaHash,
    removedConstraints: projection.removedConstraints,
  });

  const compatFetch = createH2OpenAICompatibilityFetch({
    fetchImpl: globalThis.fetch,
    onProjection: (event) => projections.push(structuredClone(event)),
  });
  const baseAdapter = createOpenAIModelAdapter({
    ...modelRuntimeOptions(protocols.g4v1),
    fetchImpl: compatFetch,
  });
  const birthCenter = createBirthCenterRuntime({
    stateRoot: absolute(`${root}/birth-center-state`),
  });
  const adapter = birthCenter.durableAdapter(baseAdapter);

  try {
    const sequence = await executeH2RecoverySequence({
      plan: start.plan,
      loadPreserved: async (slots) => slots.map(verifyPreservedGenerationArtifact),
      recoverSlot4: async () => generateRecoveredSlot4({
        protocols,
        adapter,
        attemptStartedAt: start.attemptStartedAt,
      }),
      persistSlot4: async (slot4) => {
        writeJsonOnceOrVerify(generationPath(root, 4), slot4);
      },
      generateSlot5: async () => generateFreshSlot5({
        protocols,
        adapter,
        attemptStartedAt: start.attemptStartedAt,
      }),
      persistSlot5: async (slot5) => {
        writeJsonOnceOrVerify(generationPath(root, 5), slot5);
      },
      publishCohort: async (generations) => publishRecoveredCohort({
        generations,
        protocols,
        databasePath: `${root}/world.sqlite`,
        attemptStartedAt: start.attemptStartedAt,
        publicationAt: start.publicationAt,
      }),
    });
    const publications = sequence.publications;
    const databasePath = `${root}/world.sqlite`;

    const result = {
      evidenceVersion: H2_RECOVERY_ORCHESTRATOR_VERSION,
      status: "RECOVERY_RESILIENCE_WORLD_COMPLETED",
      attemptStartedAt: start.attemptStartedAt,
      publicationAt: start.publicationAt,
      restarted,
      sourceAttempt: {
        failurePath: binding.sourceAttempt.failurePath,
        failureBlobSha: binding.sourceAttempt.failureBlobSha,
      },
      preservedSlots: start.plan.stages[0].slots.map(({ slot, threadId, artifactPath, artifactBlobSha }) => ({
        slot, threadId, artifactPath, artifactBlobSha,
      })),
      recoveredGenerationPaths: [generationPath(root, 4), generationPath(root, 5)],
      publications,
      databasePath,
      durableInvocationRoot: `${root}/birth-center-state/model-invocations`,
      compatibilityProjectionCountThisProcess: projections.length,
      scientificStanding: structuredClone(binding.scientificStanding),
      mayReplaceH2Hold: false,
      mayEnterFrozenG5G6: false,
    };
    writeJsonOnceOrVerify(completedResultPath, result);
    return Object.freeze(structuredClone(result));
  } catch (error) {
    writeFailure(root, error);
    throw error;
  }
}

function printPreflight(result) {
  const authorized = result.providerCallsAuthorized === true;
  process.stdout.write(authorized
    ? "H-V2 RECOVERY ORCHESTRATOR: REVIEW AUTHORIZED — PREFLIGHT ZERO CALL\n\n"
    : "H-V2 RECOVERY ORCHESTRATOR: IMPLEMENTED — EXECUTION STILL BLOCKED\n\n");
  process.stdout.write(`Version: ${result.orchestratorVersion}\n`);
  process.stdout.write(`First provider operation: ${result.firstProviderOperation.clientRequestId}\n`);
  process.stdout.write(`Stages: ${result.stageCount}\n`);
  process.stdout.write(`Output root: ${result.outputRoot}${existsSync(absolute(result.outputRoot)) ? " [exists]" : " [absent]"}\n`);
  process.stdout.write(`Execution authorization: ${result.executionAuthorizationPath}${authorized ? " [present and blob-bound]" : " [absent — execution blocked]"}\n`);
  process.stdout.write("Scientific standing: recovery/resilience only.\n");
  process.stdout.write(authorized
    ? "\nPreflight made zero provider calls. Provider execution is authorized only through the reviewed --execute path.\n"
    : "\nNo provider call was made or authorized.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === "--preflight")) {
    printPreflight(verifyH2RecoveryOrchestratorPreflight());
    return;
  }
  if (args.length === 1 && args[0] === "--execute") {
    await runAuthorizedH2Recovery();
    return;
  }
  throw new Error("usage: genesis-h2-recovery-orchestrator.mjs [--preflight|--execute]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
