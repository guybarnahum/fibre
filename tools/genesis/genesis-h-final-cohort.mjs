#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
} from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
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
  genesisRecordDigest,
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
import { createProviderProgressHeartbeat } from "./provider-progress.mjs";
import { verifyG4CognitionFreeze } from "./genesis-g4-cognition-freeze.mjs";
import { verifyG34ReviewAmendments } from "./genesis-g34-review-amendments.mjs";
import { verifyG5DiagnosticsFreeze } from "./genesis-g5-diagnostics-freeze.mjs";
import { verifyG6VerdictFreeze } from "./genesis-g6-verdict-freeze.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const H_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/h/protocol/h-execution-binding-v1.json";
const REVIEWED_HEAD = "abcff37eacf82cd522e8276da20d33926b0cb754";
const EXPECTED_GATE_G_G6_DIGEST = "sha256:1cfaa3148599236526d5495b14cc0ef2468d5488aa37be38b3fec9c49e21afcc";
const EXPECTED_G2_PROTOCOL_DIGEST = "sha256:0c96faf2fe1a51479e612495a73e22e2371893ce37f8e6dff1acfa48739179fa";
const EXPECTED_G3_V2_DIGEST = "sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae";
const EXPECTED_G4_V2_DIGEST = "sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20";
const H_RESULT_VERSION = "pr39-slice-h-final-cohort-v1";

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

function changedScientificSourcePaths(reviewedHead = REVIEWED_HEAD) {
  try {
    const output = execFileSync("git", [
      "diff", "--name-only", reviewedHead, "--", "services/world-kernel/src",
    ], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
  } catch (error) {
    throw new Error(`H preflight could not compare scientific source tree to reviewed head ${reviewedHead}: ${error.stderr?.toString?.() ?? error.message}`);
  }
}

function projectWorldForPassB(worldSpec) {
  const world = normalizeGenesisWorldSpec(worldSpec);
  return {
    worldSpecId: world.worldSpecId,
    timeFrame: structuredClone(world.timeFrame),
    places: structuredClone(world.places),
    householdShape: world.householdShape,
    familyRelations: [...world.familyRelations],
    languages: [...world.languages],
    materialCircumstances: world.materialCircumstances,
    mobilityPattern: world.mobilityPattern,
    schoolingOrCommunityContext: world.schoolingOrCommunityContext,
    culturalContext: world.culturalContext,
    availableInstitutions: [...world.availableInstitutions],
    intellectualEnvironment: world.intellectualEnvironment,
    affordedRoles: [...world.affordedRoles],
  };
}

function projectEpisodeForPassB(episode) {
  return {
    episodeId: episode.episodeId,
    occurredAt: episode.occurredAt,
    ageAtEvent: episode.ageAtEvent,
    placeRef: episode.placeRef,
    participantRefs: [...episode.participantRefs],
    observableAction: episode.observableAction,
    introducedParticipants: episode.introducedParticipants.map((item) => ({
      participantId: item.provisionalPersonId,
      roleRef: item.roleRef,
      introducedAt: item.introducedAt,
    })),
  };
}

function uniqueIntroductions(episodes) {
  const byId = new Map();
  for (const episode of episodes) {
    for (const participant of episode.introducedParticipants) {
      if (!byId.has(participant.provisionalPersonId)) byId.set(participant.provisionalPersonId, participant);
    }
  }
  return [...byId.values()].map((item) => structuredClone(item));
}

function modelRuntimeOptions(g4) {
  const runtime = g4.commonRuntime;
  if (runtime.provider !== "openai") fail("H frozen runtime provider is not openai");
  if (runtime.maxOutputTokens !== "auto") fail("H runner supports only the frozen automatic max-output-token policy");
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
  if (world.worldSpecId !== binding.worldSpecId) fail(`H slot ${binding.slot} WorldSpec ID drift`);
  if (genesisRecordDigest("world_spec", world) !== binding.worldSpecDigest) fail(`H slot ${binding.slot} WorldSpec digest drift`);
  const genome = readJson(binding.genomePath);
  const computedGenomeDigest = symbolicGenomeDigest({
    header: genome.header,
    loci: genome.loci,
    mutations: genome.mutations ?? [],
  });
  if (genome.header.genomeId !== binding.genomeId || computedGenomeDigest !== binding.genomeDigest || genome.genomeDigest !== binding.genomeDigest) {
    fail(`H slot ${binding.slot} symbolic genome binding drift`);
  }
  if (genome.header.owner?.ownerId !== binding.threadId || genome.header.genesisId !== binding.genesisId) {
    fail(`H slot ${binding.slot} symbolic genome owner/genesis drift`);
  }
  return { world, genome };
}

function verifySyntheticParents(g2, binding, genome) {
  if (binding.originMode !== "synthetic_lineage") return [];
  const lineage = g2.syntheticLineages.find((item) => item.slot === binding.slot);
  if (!lineage) fail(`H slot ${binding.slot} lacks frozen synthetic-lineage manifest`);
  if (canonicalJson(lineage.parentGenomeIds) !== canonicalJson(genome.header.sourceEligibility.sourceGenomeRefs)) {
    fail(`H slot ${binding.slot} parent genome IDs drift`);
  }
  return lineage.parentGenomePaths.map((path, index) => {
    const parent = readJson(path);
    const parentDigest = symbolicGenomeDigest({ header: parent.header, loci: parent.loci, mutations: parent.mutations ?? [] });
    if (parent.genomeDigest !== parentDigest || parentDigest !== lineage.parentGenomeDigests[index]) {
      fail(`H slot ${binding.slot} parent genome ${index + 1} digest drift`);
    }
    return parent;
  });
}

export function verifyHFinalCohortPreflight({ enforceReviewedSource = true } = {}) {
  const binding = readJson(H_EXECUTION_BINDING_PATH);
  if (binding.contractVersion !== "pr39-slice-h-execution-binding-v1" || binding.status !== "post_gate_g_implementation_binding_pre_final_life") {
    fail("unexpected H execution binding version/status");
  }
  const gate = readJson(binding.authorityBoundary.gateGClearWitnessPath);
  if (gate.status !== "CLEAR" || gate.authorization?.hFinalLifeGenerationAuthorized !== true) fail("Gate G does not authorize H final-life generation");
  if (gate.reviewedHead !== REVIEWED_HEAD) fail("Gate-G reviewed head drift");
  if (gate.verifiedBoundary?.g6CanonicalDigest !== EXPECTED_GATE_G_G6_DIGEST) fail("Gate-G G6 digest drift");
  if (gate.authorization.wholeCandidateAttemptCap !== 1 || gate.authorization.qualityDrivenRegenerationAllowed !== false) fail("Gate-G one-shot boundary drift");

  const scientificChanges = enforceReviewedSource ? changedScientificSourcePaths() : [];
  if (scientificChanges.length !== 0) fail(`scientific source changed after Gate-G reviewed head: ${scientificChanges.join(", ")}`);

  const g4BaseVerification = verifyG4CognitionFreeze({ protocolPath: binding.authorityBoundary.g4BaseProtocolPath });
  const amendments = verifyG34ReviewAmendments();
  const g5 = verifyG5DiagnosticsFreeze();
  const g6 = verifyG6VerdictFreeze();
  if (g6.g6ProtocolDigest !== EXPECTED_GATE_G_G6_DIGEST) fail("G6 verifier/gate witness disagreement");
  if (amendments.g3v2Digest !== EXPECTED_G3_V2_DIGEST || amendments.g4v2Digest !== EXPECTED_G4_V2_DIGEST) fail("G3/G4 amendment digest drift");

  const g2 = readJson(binding.authorityBoundary.g2ProtocolPath);
  if (digest(g2) !== EXPECTED_G2_PROTOCOL_DIGEST) fail("G2 protocol digest drift");
  const g3 = readJson(binding.authorityBoundary.g3ProtocolPath);
  const g4v1 = g4BaseVerification.protocol;
  const g4v2 = readJson(binding.authorityBoundary.g4AmendmentPath);
  if (digest(g3) !== EXPECTED_G3_V2_DIGEST || digest(g4v2) !== EXPECTED_G4_V2_DIGEST) fail("H frozen G3/G4 authority drift");
  if (g4v1.attemptAndRepairPolicy.wholeCandidateAttemptCap !== 1 || g4v1.attemptAndRepairPolicy.qualityDrivenRegeneration !== false) fail("H G4 one-shot policy drift");
  if (eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2) !== g4v1.eventStructurePool.digest) fail("H EventStructurePool digest drift");
  if (canonicalJson(g3.inheritedProductionProtocol.historyEpisodeHorizons) !== canonicalJson(g4v1.passBTiming.historyHorizons)) fail("H G3/G4 Pass-B horizon mismatch");
  if (g2.worldBindings.length !== 5 || g4v1.initialRosters.length !== 5) fail("H final cohort must contain exactly five frozen slots");

  const rosterBySlot = new Map(g4v1.initialRosters.map((item) => [item.slot, item]));
  const slots = g2.worldBindings.map((worldBinding) => {
    const { genome } = verifyWorldBinding(worldBinding);
    const parents = verifySyntheticParents(g2, worldBinding, genome);
    const roster = rosterBySlot.get(worldBinding.slot);
    if (!roster || roster.threadId !== worldBinding.threadId || roster.worldSpecId !== worldBinding.worldSpecId) fail(`H slot ${worldBinding.slot} roster binding drift`);
    return {
      slot: worldBinding.slot,
      threadId: worldBinding.threadId,
      genesisId: worldBinding.genesisId,
      originMode: worldBinding.originMode,
      worldSpecId: worldBinding.worldSpecId,
      worldSpecPath: worldBinding.worldSpecPath,
      worldSpecDigest: worldBinding.worldSpecDigest,
      genomeId: worldBinding.genomeId,
      genomePath: worldBinding.genomePath,
      genomeDigest: worldBinding.genomeDigest,
      parentGenomeCount: parents.length,
      passAEpisodes: g4v1.historicalPlan.episodesPerThread,
      passBHorizons: [...g4v1.passBTiming.historyHorizons],
      passBModes: [...g3.inheritedProductionProtocol.directModes],
      rosterSize: roster.participants.length,
    };
  });

  const outputRoot = binding.oneShot.outputRoot;
  return Object.freeze({
    status: "CLEAR_TO_EXECUTE_H",
    reviewedHead: REVIEWED_HEAD,
    gateGReviewRef: gate.reviewResultRef,
    gateGWitnessDigest: digest(gate),
    g2ProtocolDigest: digest(g2),
    g3ProtocolDigest: digest(g3),
    g4BaseProtocolDigest: g4BaseVerification.protocolDigest,
    g4AmendmentDigest: digest(g4v2),
    g5ProtocolDigest: g5.protocolDigest,
    g6ProtocolDigest: g6.g6ProtocolDigest,
    reviewedSourceCheckEnforced: enforceReviewedSource,
    scientificSourceChangesSinceReviewedHead: scientificChanges,
    runtime: structuredClone(g4v1.commonRuntime),
    eventStructurePoolDigest: g4v1.eventStructurePool.digest,
    oneShot: structuredClone(binding.oneShot),
    outputRootExists: existsSync(absolute(outputRoot)),
    slots,
  });
}

export function buildNeutralHThreadSeed({ threadId, createdAt, binding = readJson(H_EXECUTION_BINDING_PATH) }) {
  const p = binding.threadSeedProjection;
  const thread = {
    threadId,
    version: 1,
    status: p.threadStatus,
    identity: structuredClone(p.identity),
    genome: structuredClone(p.legacyGenome),
    currentState: structuredClone(p.currentState),
    accounts: structuredClone(p.accounts),
    relationshipRefs: [...p.relationshipRefs],
    memoryRefs: [...p.memoryRefs],
    provenance: { createdAt, createdBy: p.createdBy },
  };
  validateThreadSnapshot(thread);
  return thread;
}

function passBGenomeExposure(genome, g3v1) {
  return {
    policy: { kind: g3v1.genomeExposure.kind, k: g3v1.genomeExposure.k },
    genomeRef: genome.header.genomeId,
    genomeDigest: genome.genomeDigest,
    totalLoci: genome.loci.length,
    loci: genome.loci.map(({ locusId, ordinal, value }) => ({ locusId, ordinal, value })),
  };
}

export function buildHPassBInput({ threadId, bornAt, worldSpec, episodes, horizon, callOrdinal, formationMode, priorRememberedMemories, genome, g3v1, g4v1 }) {
  const window = g4v1.historicalPlan.windows[horizon - 1];
  const priorTreatmentMemoryExposure = priorRememberedMemories.some((item) => item.formationMode === "life_plus_genome");
  const analysisStratum = formationMode === "life_plus_genome" ? "life_plus_genome" : priorTreatmentMemoryExposure ? "life_only_exposed" : "life_only_unexposed";
  return normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: threadId, bornAt },
    world: projectWorldForPassB(worldSpec),
    rememberingAt: window.endAt,
    ageAtRemembering: window.maxAge,
    chronologyEndsAt: window.endAt,
    history: episodes.slice(0, horizon).map(projectEpisodeForPassB),
    priorMemories: priorRememberedMemories.map((item) => ({
      memoryRef: item.memoryRef,
      episodeRefs: [...item.passBEpisodeRefs],
      rememberedContent: item.rememberedContent,
      uncertainty: [...item.uncertainty],
      formationMode: item.formationMode,
    })),
    assignment: { formationMode, priorTreatmentMemoryExposure, analysisStratum },
    genomeExposure: formationMode === "life_plus_genome" ? passBGenomeExposure(genome, g3v1) : null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: `${g3v1.assignment.version}:call:${pad(callOrdinal)}`,
      genomeExposurePolicyRef: formationMode === "life_plus_genome" ? g3v1.genomeExposure.policyVersion : null,
    },
  });
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

function progressPrinter(phase, message) { process.stderr.write(`genesis:h · ${phase} · ${message}\n`); }

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

async function generateThread({ slotPlan, g2, g3v1, g3v2, g4v1, adapter, attemptStartedAt }) {
  const binding = g2.worldBindings.find((item) => item.slot === slotPlan.slot);
  const roster = g4v1.initialRosters.find((item) => item.slot === slotPlan.slot);
  const worldSpec = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const parents = verifySyntheticParents(g2, binding, genome);
  const subject = { provisionalThreadId: binding.threadId, bornAt: g4v1.historicalPlan.entry.bornAt };
  const lineageWitness = binding.originMode === "synthetic_lineage" ? syntheticLineageWitnessFromRecombinedGenome(genome) : null;
  const episodes = [];
  const passA = [];
  const repairWitnesses = [];

  for (const window of g4v1.historicalPlan.windows) {
    const seed = `${g4v1.eventStructurePool.seedDomain}:slot:${pad(binding.slot)}:structures:${window.windowId}`;
    const offeredEntries = sampleEventStructuresV2(GENESIS_EVENT_STRUCTURE_POOL_V2, window, { seed, count: g4v1.eventStructurePool.structuresPerWindow });
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
      clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-a:episode-${pad(window.ordinal)}`,
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
  const directModes = g3v2.inheritedProductionProtocol.directModes;
  const horizons = g3v2.inheritedProductionProtocol.historyEpisodeHorizons;

  for (let index = 0; index < horizons.length; index += 1) {
    const callOrdinal = index + 1;
    const horizon = horizons[index];
    const formationMode = directModes[index];
    const input = buildHPassBInput({ threadId: binding.threadId, bornAt: subject.bornAt, worldSpec, episodes, horizon, callOrdinal, formationMode, priorRememberedMemories, genome, g3v1, g4v1 });
    const result = await generateAdmittedPassBMemory({ adapter, input, clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-b:call-${pad(callOrdinal)}` });
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
    const c = await runPassCInitial({ adapter, input: passCInput, clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-c:initial-${pad(callOrdinal)}` });
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
    const result = await runPassCReinterpretation({ adapter, input, clientRequestId: `pr39-h:slot-${pad(binding.slot)}:pass-c:reinterpret:${scheduled.opportunityId}` });
    reinterpretationRuns.push({ opportunityId: scheduled.opportunityId, memoryRef: memory.memoryRef, ...structuredClone(result) });
    if (result.output.outcome === "revised") {
      memory.currentMeaning = { summary: result.output.summary, parts: structuredClone(result.output.parts), formedAt: scheduled.trigger.occurredAt, ageAtFormation: triggerItem.episode.ageAtEvent, chronologyIndex: triggerItem.ordinal };
      memory.pendingRevisions ??= [];
      memory.pendingRevisions.push({ asOf: scheduled.trigger.occurredAt, output: structuredClone(result.output), supportingEvidenceRefs: [triggerItem.eventId] });
    }
  }

  return {
    evidenceVersion: H_RESULT_VERSION,
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

function buildManifest({ threadGeneration, thread, memoryRecords, publicationAt, g4v1, g4v2 }) {
  const binding = threadGeneration.binding;
  const genome = threadGeneration.genome;
  const parentRefs = binding.originMode === "synthetic_lineage" ? genome.header.sourceEligibility.sourceOwners.map((owner) => owner.ownerId) : [];
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

function publishCohort({ generations, g4v1, g4v2, databasePath, attemptStartedAt }) {
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
      const thread = buildNeutralHThreadSeed({ threadId: generation.binding.threadId, createdAt: attemptStartedAt });
      const memories = materializeMemoryRecords(generation, publicationAt);
      const manifest = buildManifest({ threadGeneration: generation, thread, memoryRecords: memories, publicationAt, g4v1, g4v2 });
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

export async function runHFinalCohort() {
  const preflight = verifyHFinalCohortPreflight();
  if (preflight.outputRootExists) fail(`H output root already exists: ${preflight.oneShot.outputRoot}; one-shot execution refuses overwrite or regeneration`);

  const binding = readJson(H_EXECUTION_BINDING_PATH);
  const g2 = readJson(binding.authorityBoundary.g2ProtocolPath);
  const g3v1 = readJson("artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json");
  const g3v2 = readJson(binding.authorityBoundary.g3ProtocolPath);
  const g4v1 = readJson(binding.authorityBoundary.g4BaseProtocolPath);
  const g4v2 = readJson(binding.authorityBoundary.g4AmendmentPath);
  const modelEvents = [];
  const heartbeat = createProviderProgressHeartbeat({ progress: progressPrinter });
  const baseAdapter = createOpenAIModelAdapter({ ...modelRuntimeOptions(g4v1), observer: (event) => modelEvents.push(structuredClone(event)) });
  const adapter = createProgressAdapter(baseAdapter, heartbeat);

  const attemptStartedAt = nowIso();
  mkdirSync(absolute(binding.oneShot.outputRoot), { recursive: false });
  writeJson(`${binding.oneShot.outputRoot}/h-attempt-start-v1.json`, { evidenceVersion: H_RESULT_VERSION, status: "in_progress", attemptStartedAt, preflight });
  const generations = [];
  try {
    for (const slotPlan of preflight.slots) {
      progressPrinter(`slot ${slotPlan.slot}/5`, `Generating ${slotPlan.threadId}`);
      const generation = await generateThread({ slotPlan, g2, g3v1, g3v2, g4v1, adapter, attemptStartedAt });
      generations.push(generation);
      const path = `${binding.oneShot.outputRoot}/thread-slot-${pad(slotPlan.slot)}-generation-v1.json`;
      writeJson(path, structuredClone(generation));
      progressPrinter(`slot ${slotPlan.slot}/5`, `Generation complete · ${generation.episodes.length} episodes · ${generation.passB.length} Pass-B calls`);
    }

    const published = publishCohort({ generations, g4v1, g4v2, databasePath: binding.oneShot.databasePath, attemptStartedAt });
    for (const publication of published.publications) writeJson(`${binding.oneShot.outputRoot}/thread-slot-${pad(publication.slot)}-publication-v1.json`, publication);
    const modelEventsPath = `${binding.oneShot.outputRoot}/h-model-events-v1.json`;
    writeJson(modelEventsPath, { evidenceVersion: H_RESULT_VERSION, modelEvents });
    const result = {
      evidenceVersion: H_RESULT_VERSION,
      status: "FIRST_INTEGRITY_VALID_FIVE_THREAD_COHORT_FROZEN",
      attemptStartedAt,
      completedAt: nowIso(),
      publicationAt: published.publicationAt,
      preflight,
      modelEventsPath,
      modelEventsDigest: digest({ evidenceVersion: H_RESULT_VERSION, modelEvents }),
      threads: published.publications.map((publication) => {
        const generationPath = `${binding.oneShot.outputRoot}/thread-slot-${pad(publication.slot)}-generation-v1.json`;
        const publicationPath = `${binding.oneShot.outputRoot}/thread-slot-${pad(publication.slot)}-publication-v1.json`;
        return {
          slot: publication.slot,
          threadId: publication.threadId,
          genesisId: publication.genesisId,
          firstLiveVersion: publication.firstLiveVersion,
          generationPath,
          generationDigest: digest(readJson(generationPath)),
          publicationPath,
          publicationDigest: digest(readJson(publicationPath)),
        };
      }),
      databasePath: binding.oneShot.databasePath,
      qualityRegenerationAllowed: false,
      nextStep: "RUN_FROZEN_G5_DIAGNOSTICS_THEN_GATE_H_REVIEW",
    };
    writeJson(binding.oneShot.resultPath, result);
    heartbeat.finish();
    return result;
  } catch (error) {
    heartbeat.finish("Provider call ended");
    writeJson(binding.oneShot.failurePath, {
      evidenceVersion: H_RESULT_VERSION,
      status: "HOLD_FIRST_COHORT_ATTEMPT_FAILED_NO_REGENERATION",
      attemptStartedAt,
      failedAt: nowIso(),
      error: { name: error?.name ?? "Error", message: error?.message ?? String(error), stack: error?.stack ?? null, gate: error?.gate ?? null },
      completedThreadGenerations: generations.map((item) => ({ slot: item.slot, threadId: item.binding.threadId })),
      modelEvents,
      qualityRegenerationAllowed: false,
      instruction: "Preserve this failure. Do not rerun H with a new seed, provider, model, treatment schedule or quality selection.",
    });
    throw error;
  }
}

function printPreflight(result) {
  process.stdout.write("H FINAL COHORT PREFLIGHT: CLEAR\n\n");
  process.stdout.write(`Gate-G reviewed head: ${result.reviewedHead}\n`);
  process.stdout.write(`Runtime: ${result.runtime.provider}/${result.runtime.modelId}\n`);
  process.stdout.write(`EventStructurePool: ${result.eventStructurePoolDigest}\n`);
  process.stdout.write(`Output root: ${result.oneShot.outputRoot}${result.outputRootExists ? " [EXISTS — EXECUTION BLOCKED]" : " [absent]"}\n\n`);
  for (const slot of result.slots) {
    process.stdout.write(`${slot.slot}. ${slot.threadId} · ${slot.originMode} · ${slot.worldSpecId} · genome=${slot.genomeId}\n`);
    process.stdout.write(`   Pass A=${slot.passAEpisodes}; Pass B horizons=${slot.passBHorizons.join("/")}; modes=${slot.passBModes.map((mode) => mode === "life_plus_genome" ? "T" : "L").join(" ")}\n`);
  }
  process.stdout.write("\nNo provider call was made.\n");
}

function usage() {
  process.stdout.write("Usage: npm run genesis:h-generate -- --preflight\n       npm run genesis:h-generate\n\n--preflight performs zero model calls and writes no H cohort artifacts. Execution has no provider/model/seed/overwrite knobs and is one-shot.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return usage();
  const unknown = args.filter((arg) => arg !== "--preflight");
  if (unknown.length !== 0) fail(`unsupported H argument(s): ${unknown.join(", ")}`);
  if (args.includes("--preflight")) {
    printPreflight(verifyHFinalCohortPreflight());
    return;
  }
  const result = await runHFinalCohort();
  process.stdout.write(`\nH FINAL COHORT: ${result.status}\n`);
  process.stdout.write(`Result: ${result.preflight.oneShot.resultPath}\n`);
  process.stdout.write(`Database: ${result.databasePath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
