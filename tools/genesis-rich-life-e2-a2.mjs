#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  eventStructureV2Metadata,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  generateRichPassAEpisode,
  richPassARepairPromptHash,
  richPassASchemaHash,
  richPassASelectedOpportunityPromptHash,
  richPassASelectedOpportunityRetryPromptHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  richCounterpartMode,
  richCounterpartPolicyWitness,
} from "../services/world-kernel/src/genesis-rich-participation-policy.mjs";
import { characterizeSliceERichLife } from "../services/world-kernel/src/genesis-slice-e-characterization.mjs";
import {
  E2_A0_DEFAULT_SEEDS,
  E2_A0_EPISODES,
  E2_A0_STRUCTURES_PER_WINDOW,
  buildE2A0Plan,
  characterizeE2BetweenLifeParticularity,
} from "./genesis-rich-life-e2-a0.mjs";
import {
  E2_A0_MAX_CANDIDATE_ATTEMPTS,
  runE2A0ThreadWithCandidateAttempts,
} from "./genesis-rich-life-e2-a0-candidate-driver.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_A2_EVIDENCE_VERSION = "pr39-slice-e2-a2-v2";
export const E2_A2_PROTOCOL_VERSION = "pr39-slice-e2-a2-selection-realization-v1";
export const E2_A2_ARM = "A2_stateless_opportunity_selection";
export const E2_A2_SELECTOR_INPUT_VERSION = "pr39-slice-e2-a2-selector-input-v1";

export const E2_A2_SELECTOR_PROMPT = `You are Fibre Genesis's stateless opportunity selector for one developmental time slot.
Choose exactly one currently offered EventStructure possibility or choose world_emergent.
You do not know this Thread's prior life, household, relationships, known people, memories, genome, personality or future.
Choose only from the supplied public world facts, developmental window and current offers.
Do not optimize for novelty, diversity, intellectual value, drama, consequence, maturity, richness, personality formation or future usefulness.
Do not invent a scene, participant, place, lesson or plot. You are selecting only the abstract opportunity kind that could plausibly occur in this world and time slot.
Return JSON matching the supplied schema.`;

export const E2_A2_SELECTOR_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["selectionKind", "structureRef"],
  properties: {
    selectionKind: { type: "string", enum: ["offered_structure", "world_emergent"] },
    structureRef: { type: ["string", "null"] },
  },
});

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function createAdapter({ provider, model, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ modelId: model, observer });
  if (provider === "google") return createGoogleModelAdapter({ modelId: model, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function replaceSubject(worldFixture, runOrdinal) {
  const suffix = String(runOrdinal).padStart(2, "0");
  const oldId = worldFixture.subject.provisionalThreadId;
  const newId = `${oldId}_a2_${suffix}`;
  return Object.freeze({
    subject: Object.freeze({ ...structuredClone(worldFixture.subject), provisionalThreadId: newId }),
    initialRoster: Object.freeze(worldFixture.initialRoster.map((participant) => Object.freeze({
      ...structuredClone(participant),
      participantId: participant.participantId === oldId ? newId : participant.participantId,
    }))),
  });
}

function publicWorldProjection(worldSpec) {
  return Object.freeze({
    timeFrame: structuredClone(worldSpec.timeFrame),
    places: structuredClone(worldSpec.places),
    languages: structuredClone(worldSpec.languages),
    schoolingOrCommunityContext: worldSpec.schoolingOrCommunityContext,
    culturalContext: worldSpec.culturalContext,
    availableInstitutions: structuredClone(worldSpec.availableInstitutions),
    intellectualEnvironment: worldSpec.intellectualEnvironment,
    affordedRoles: structuredClone(worldSpec.affordedRoles),
  });
}

function selectorOfferProjection(offeredEntries) {
  return Object.freeze([...offeredEntries]
    .sort((left, right) => left.structure.structureId.localeCompare(right.structure.structureId))
    .map((entry) => Object.freeze({
      structureId: entry.structure.structureId,
      abstractSituation: entry.structure.abstractSituation,
      participatingRoles: Object.freeze([...entry.structure.participatingRoles]),
    })));
}

export function buildE2A2SelectorInput({ worldFixture, developmentalWindow, offeredEntries, ordinal, total }) {
  return Object.freeze({
    inputVersion: E2_A2_SELECTOR_INPUT_VERSION,
    world: publicWorldProjection(worldFixture.worldSpec),
    developmentalWindow: structuredClone(developmentalWindow),
    chronology: Object.freeze({ ordinal, total }),
    offeredStructures: selectorOfferProjection(offeredEntries),
    policyWitness: Object.freeze({
      policyVersion: E2_A2_PROTOCOL_VERSION,
      eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      offerSelectionDigest: digest(offeredEntries.map((entry) => entry.structure.structureId).sort()),
    }),
  });
}

export function normalizeE2A2Selection(candidate, offeredEntries) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("A2 selector output must be an object");
  }
  const keys = Object.keys(candidate).sort();
  if (keys.length !== 2 || keys[0] !== "selectionKind" || keys[1] !== "structureRef") {
    throw new TypeError("A2 selector output must contain exactly selectionKind and structureRef");
  }
  if (!["offered_structure", "world_emergent"].includes(candidate.selectionKind)) {
    throw new TypeError("A2 selector selectionKind is invalid");
  }
  if (candidate.selectionKind === "world_emergent") {
    if (candidate.structureRef !== null) throw new TypeError("A2 world_emergent selection requires structureRef=null");
    return Object.freeze({ selectionKind: "world_emergent", structureRef: null });
  }
  if (typeof candidate.structureRef !== "string" || candidate.structureRef.trim() === "") {
    throw new TypeError("A2 offered_structure selection requires a structureRef");
  }
  const offeredIds = new Set(offeredEntries.map((entry) => entry.structure.structureId));
  if (!offeredIds.has(candidate.structureRef)) throw new TypeError(`A2 selector chose unoffered structure ${candidate.structureRef}`);
  return Object.freeze({ selectionKind: "offered_structure", structureRef: candidate.structureRef });
}

export function e2A2SelectorPromptHash() { return digest(E2_A2_SELECTOR_PROMPT); }
export function e2A2SelectorSchemaHash() { return digest(E2_A2_SELECTOR_RESPONSE_SCHEMA); }

export async function freezeE2A2SelectorSchedule({ worldFixture, seed, adapter, onProgress = null }) {
  const plan = buildE2A0Plan(worldFixture, seed);
  const selections = [];
  const evidence = [];
  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    const input = buildE2A2SelectorInput({
      worldFixture,
      developmentalWindow,
      offeredEntries,
      ordinal,
      total: plan.length,
    });
    if (typeof onProgress === "function") onProgress({
      type: "selector_start",
      worldId: worldFixture.id,
      seed,
      ordinal,
      total: plan.length,
    });
    const result = await adapter.invoke({
      systemPrompt: E2_A2_SELECTOR_PROMPT,
      input,
      responseSchema: E2_A2_SELECTOR_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-a2:${worldFixture.id}:${seed}:selector:${String(ordinal).padStart(2, "0")}`,
    });
    const selection = normalizeE2A2Selection(result.output, offeredEntries);
    selections.push(selection);
    evidence.push(Object.freeze({
      ordinal,
      developmentalWindow: structuredClone(developmentalWindow),
      offeredStructureIds: Object.freeze(offeredEntries.map((entry) => entry.structure.structureId).sort()),
      selectorInputDigest: digest(input),
      selectorOutputDigest: digest(result.output),
      selection: structuredClone(selection),
      provenance: structuredClone(result.provenance),
    }));
    if (typeof onProgress === "function") onProgress({
      type: "selector_complete",
      worldId: worldFixture.id,
      seed,
      ordinal,
      total: plan.length,
      selection,
    });
  }
  return Object.freeze({
    plan,
    selections: Object.freeze(selections),
    evidence: Object.freeze(evidence),
    scheduleDigest: digest(selections),
  });
}

export function rehydrateE2A2SelectorSchedule({ worldFixture, seed, scheduleEvidence }) {
  if (scheduleEvidence === null || typeof scheduleEvidence !== "object" || Array.isArray(scheduleEvidence)) {
    throw new TypeError("A2 resume selector schedule must be an object");
  }
  if (scheduleEvidence.worldId !== worldFixture.id || scheduleEvidence.seed !== seed) {
    throw new TypeError("A2 resume selector schedule world/seed mismatch");
  }
  const plan = buildE2A0Plan(worldFixture, seed);
  if (!Array.isArray(scheduleEvidence.evidence) || scheduleEvidence.evidence.length !== plan.length) {
    throw new TypeError("A2 resume selector schedule does not cover the full frozen life");
  }
  const selections = [];
  const evidence = [];
  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    const prior = scheduleEvidence.evidence[index];
    if (prior.ordinal !== ordinal) throw new TypeError(`A2 resume selector ordinal mismatch at ${ordinal}`);
    const offeredStructureIds = offeredEntries.map((entry) => entry.structure.structureId).sort();
    if (canonicalJson(prior.offeredStructureIds) !== canonicalJson(offeredStructureIds)) {
      throw new TypeError(`A2 resume offered structures changed at selector ${ordinal}`);
    }
    const selectorInput = buildE2A2SelectorInput({
      worldFixture,
      developmentalWindow,
      offeredEntries,
      ordinal,
      total: plan.length,
    });
    if (prior.selectorInputDigest !== digest(selectorInput)) {
      throw new TypeError(`A2 resume selector input digest changed at ${ordinal}`);
    }
    const selection = normalizeE2A2Selection(prior.selection, offeredEntries);
    selections.push(selection);
    evidence.push(Object.freeze(structuredClone(prior)));
  }
  const scheduleDigest = digest(selections);
  if (scheduleEvidence.scheduleDigest !== scheduleDigest) {
    throw new TypeError("A2 resume selector schedule digest mismatch");
  }
  return Object.freeze({
    plan,
    selections: Object.freeze(selections),
    evidence: Object.freeze(evidence),
    scheduleDigest,
  });
}

function uniqueIntroductions(episodes) {
  return episodes.flatMap((episode) => episode.introducedParticipants);
}

function knownRoleSet(initialRoster, priorEpisodes) {
  const roles = new Set();
  for (const participant of initialRoster) {
    for (const role of participant.factualRoles) roles.add(role);
  }
  for (const introduced of uniqueIntroductions(priorEpisodes)) roles.add(introduced.roleRef);
  return roles;
}

function selectionPressureWitness({ selectedOpportunity, offeredEntries, initialRoster, priorEpisodes }) {
  if (selectedOpportunity.selectionKind === "world_emergent") {
    return Object.freeze({
      selectionKind: "world_emergent",
      structureRef: null,
      counterpartMode: null,
      participatingRoles: Object.freeze([]),
      knownAllowedCounterpartExists: null,
      requiresNewCounterpart: false,
      knownRequiredPreconditionSatisfied: null,
    });
  }
  const entry = offeredEntries.find((candidate) => candidate.structure.structureId === selectedOpportunity.structureRef);
  if (entry === undefined) throw new TypeError(`selected A2 structure ${selectedOpportunity.structureRef} is not in frozen offer window`);
  const participatingRoles = [...entry.structure.participatingRoles];
  const knownRoles = knownRoleSet(initialRoster, priorEpisodes);
  const knownAllowedCounterpartExists = participatingRoles.some((role) => knownRoles.has(role));
  const counterpartMode = richCounterpartMode(entry.structure.structureId);
  return Object.freeze({
    selectionKind: "offered_structure",
    structureRef: entry.structure.structureId,
    counterpartMode,
    participatingRoles: Object.freeze(participatingRoles),
    knownAllowedCounterpartExists,
    requiresNewCounterpart: counterpartMode === "present_required" && !knownAllowedCounterpartExists,
    knownRequiredPreconditionSatisfied: counterpartMode === "known_required" ? knownAllowedCounterpartExists : null,
  });
}

function roleMap(initialRoster, episodes) {
  const roles = new Map();
  for (const participant of initialRoster) roles.set(participant.participantId, [...participant.factualRoles]);
  for (const episode of episodes) {
    for (const introduced of episode.introducedParticipants) roles.set(introduced.provisionalPersonId, [introduced.roleRef]);
  }
  return roles;
}

function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

function concentration(values) {
  if (values.length === 0) return Object.freeze({ topShare: null, hhi: null });
  const valueCounts = [...counts(values).values()];
  return Object.freeze({
    topShare: Math.max(...valueCounts) / values.length,
    hhi: valueCounts.reduce((sum, count) => sum + (count / values.length) ** 2, 0),
  });
}

function characterizeLife(life) {
  const roles = roleMap(life.initialRoster, life.episodes);
  const subjectId = life.subject.provisionalThreadId;
  const participantRoleEvents = [];
  for (const episode of life.episodes) {
    const eventRoles = new Set();
    for (const participantRef of episode.participantRefs) {
      if (participantRef === subjectId) continue;
      for (const role of roles.get(participantRef) ?? []) eventRoles.add(role);
    }
    participantRoleEvents.push(...eventRoles);
  }
  const selectedIntellectualStructures = life.episodes.filter((episode) =>
    episode.structureRef !== null
      && eventStructureV2Metadata(episode.structureRef)?.contextKinds.includes("intellectual_encounter"));
  const pressure = life.a2RealizationEvidence.map((item) => item.selectionPressure);
  return Object.freeze({
    placeConcentration: concentration(life.episodes.map((episode) => episode.placeRef)),
    structureConcentration: concentration(life.episodes.map((episode) => episode.structureRef ?? "world_emergent")),
    participantRoleConcentration: concentration(participantRoleEvents),
    uniquePlaces: new Set(life.episodes.map((episode) => episode.placeRef)).size,
    uniqueStructures: new Set(life.episodes.map((episode) => episode.structureRef).filter((value) => value !== null)).size,
    introducedParticipants: life.episodes.reduce((sum, episode) => sum + episode.introducedParticipants.length, 0),
    selectedIntellectualStructureEvents: selectedIntellectualStructures.length,
    intellectualEncounterEvents: life.episodes.filter((episode) => episode.intellectualEncounter !== undefined).length,
    repairCount: life.recordEvidence.reduce((sum, record) => sum + record.repairs.length, 0),
    recordRetryCount: life.recordEvidence.reduce((sum, record) => sum + record.recordRetries.length, 0),
    selectorWorldEmergentCount: life.a2SelectorEvidence.filter((item) => item.selection.selectionKind === "world_emergent").length,
    newCounterpartPressureCount: pressure.filter((item) => item.requiresNewCounterpart).length,
    knownRequiredImpossibleCount: pressure.filter((item) => item.knownRequiredPreconditionSatisfied === false).length,
    pressureEpisodesWithIntroductions: life.a2RealizationEvidence.filter((item) =>
      item.selectionPressure.requiresNewCounterpart && item.introducedParticipants.length > 0).length,
  });
}

export async function runE2A2Life({
  worldFixture,
  provider,
  model,
  seed,
  runOrdinal,
  adapter,
  frozenSchedule,
  onProgress = null,
}) {
  const identity = replaceSubject(worldFixture, runOrdinal);
  const episodes = [];
  const recordEvidence = [];
  const a2RealizationEvidence = [];

  for (let index = 0; index < frozenSchedule.plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = frozenSchedule.plan[index];
    const selectedOpportunity = frozenSchedule.selections[index];
    const pressure = selectionPressureWitness({
      selectedOpportunity,
      offeredEntries,
      initialRoster: identity.initialRoster,
      priorEpisodes: episodes,
    });
    if (typeof onProgress === "function") onProgress({
      type: "episode_start",
      worldId: worldFixture.id,
      seed,
      runOrdinal,
      ordinal,
      total: frozenSchedule.plan.length,
      developmentalWindow,
      selectedOpportunity,
      selectionPressure: pressure,
    });
    const input = buildRichLifePassAInput({
      originMode: "de_novo",
      syntheticLineageWitness: null,
      worldSpec: worldFixture.worldSpec,
      subject: identity.subject,
      developmentalWindow,
      chronologyEndsAt: developmentalWindow.endAt,
      initialRoster: identity.initialRoster,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants: uniqueIntroductions(episodes),
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
      offeredEntries,
    });
    const startedAt = Date.now();
    const result = await generateRichPassAEpisode({
      adapter,
      input,
      selectedOpportunity,
      clientRequestId: `slice-e2-a2:${worldFixture.id}:${seed}:episode:${String(ordinal).padStart(2, "0")}`,
      onRecordRepair: (repair) => {
        if (typeof onProgress === "function") onProgress({
          type: "record_repair",
          worldId: worldFixture.id,
          seed,
          runOrdinal,
          ordinal,
          total: frozenSchedule.plan.length,
          repair,
        });
      },
      onRecordRetry: (recordRetry) => {
        if (typeof onProgress === "function") onProgress({
          type: "record_retry",
          worldId: worldFixture.id,
          seed,
          runOrdinal,
          ordinal,
          total: frozenSchedule.plan.length,
          recordRetry,
        });
      },
    });
    episodes.push(result.episode);
    recordEvidence.push(Object.freeze({
      inputDigest: result.inputDigest,
      episodeDigest: result.episodeDigest,
      selectedOpportunity: structuredClone(selectedOpportunity),
      calls: structuredClone(result.calls),
      repairs: structuredClone(result.repairs),
      recordRetries: structuredClone(result.recordRetries),
    }));
    const realized = Object.freeze({
      ordinal,
      selectedOpportunity: structuredClone(selectedOpportunity),
      selectionPressure: structuredClone(pressure),
      realizedStructureRef: result.episode.structureRef,
      introducedParticipants: structuredClone(result.episode.introducedParticipants),
    });
    a2RealizationEvidence.push(realized);
    if (typeof onProgress === "function") onProgress({
      type: "episode_complete",
      worldId: worldFixture.id,
      seed,
      runOrdinal,
      ordinal,
      total: frozenSchedule.plan.length,
      elapsedMs: Date.now() - startedAt,
      episode: result.episode,
      repairs: result.repairs.length,
      recordRetries: result.recordRetries.length,
      selectedOpportunity,
      selectionPressure: pressure,
    });
  }

  const life = {
    worldId: worldFixture.id,
    worldSpecId: worldFixture.worldSpec.worldSpecId,
    seed,
    runOrdinal,
    originMode: "de_novo",
    subject: structuredClone(identity.subject),
    initialRoster: structuredClone(identity.initialRoster),
    developmentalSpan: structuredClone(worldFixture.span),
    selectorScheduleDigest: frozenSchedule.scheduleDigest,
    a2SelectorEvidence: structuredClone(frozenSchedule.evidence),
    a2RealizationEvidence: structuredClone(a2RealizationEvidence),
    offeredWindows: frozenSchedule.plan.map(({ developmentalWindow, offeredEntries }) => ({
      developmentalWindow: structuredClone(developmentalWindow),
      offeredStructureIds: offeredEntries.map((entry) => entry.structure.structureId).sort(),
      offeredIntellectualStructureIds: offeredEntries
        .filter((entry) => entry.contextKinds.includes("intellectual_encounter"))
        .map((entry) => entry.structure.structureId)
        .sort(),
    })),
    episodes: structuredClone(episodes),
    recordEvidence: structuredClone(recordEvidence),
    sliceECharacterization: characterizeSliceERichLife({
      originMode: "de_novo",
      episodes,
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    }),
  };
  return Object.freeze({ ...life, e2Characterization: characterizeLife(life) });
}

function aggregateRejectionProfile(lives) {
  const byGate = {};
  let candidateAttempts = 0;
  let candidateAttemptFailures = 0;
  let rejectedAttemptRecordRepairs = 0;
  for (const life of lives) {
    candidateAttempts += life.candidateAttemptsPerThread;
    candidateAttemptFailures += life.rejectionProfile.candidateAttemptFailures;
    rejectedAttemptRecordRepairs += life.rejectionProfile.rejectedAttemptRecordRepairs;
    for (const [gate, count] of Object.entries(life.rejectionProfile.candidateAttemptFailuresByGate)) {
      byGate[gate] = (byGate[gate] ?? 0) + count;
    }
  }
  return Object.freeze({
    candidateAttempts,
    candidateAttemptFailures,
    candidateAttemptFailuresByGate: Object.freeze(byGate),
    rejectedAttemptRecordRepairs,
  });
}

function buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSelectorSchedules) {
  if (resumeArtifact === null) return null;
  return Object.freeze({
    sourceEvidenceVersion: resumeArtifact.evidenceVersion ?? null,
    sourceProtocolVersion: resumeArtifact.protocolVersion ?? null,
    sourceGeneratedAt: resumeArtifact.generatedAt ?? null,
    sourceArtifactDigest: digest(resumeArtifact),
    reusedCompletedLives,
    reusedSelectorSchedules,
  });
}

function buildFailureArtifact({ provider, model, modelEvents, completedLives, selectorSchedules, error, resumeWitness }) {
  return Object.freeze({
    evidenceVersion: E2_A2_EVIDENCE_VERSION,
    protocolVersion: E2_A2_PROTOCOL_VERSION,
    status: "failed",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_A2_ARM,
    provider,
    model,
    seeds: Object.freeze([...E2_A0_DEFAULT_SEEDS]),
    resumedFrom: resumeWitness,
    selector: Object.freeze({
      promptHash: e2A2SelectorPromptHash(),
      schemaHash: e2A2SelectorSchemaHash(),
      schedules: structuredClone(selectorSchedules),
    }),
    generator: Object.freeze({
      selectedOpportunityPromptHash: richPassASelectedOpportunityPromptHash(),
      selectedOpportunityRetryPromptHash: richPassASelectedOpportunityRetryPromptHash(),
      repairPromptHash: richPassARepairPromptHash(),
      schemaHash: richPassASchemaHash(),
      eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      counterpartPolicyWitness: richCounterpartPolicyWitness(),
      structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
      modelEvents: structuredClone(modelEvents),
    }),
    completedLives: structuredClone(completedLives),
    failure: Object.freeze({
      worldId: error?.worldId ?? null,
      seed: error?.seed ?? null,
      runOrdinal: error?.runOrdinal ?? null,
      code: error?.code ?? null,
      gate: error?.gate ?? null,
      message: error?.message ?? String(error),
      causeGate: error?.cause?.gate ?? null,
      candidateFailures: Array.isArray(error?.candidateFailures) ? structuredClone(error.candidateFailures) : [],
    }),
    admissionVerdict: null,
  });
}

function validateResumeArtifact(resumeArtifact, { provider, model }) {
  if (resumeArtifact === null) return;
  if (resumeArtifact === null || typeof resumeArtifact !== "object" || Array.isArray(resumeArtifact)) {
    throw new TypeError("A2 resume artifact must be an object");
  }
  if (resumeArtifact.arm !== E2_A2_ARM) throw new TypeError("A2 resume artifact arm mismatch");
  if (resumeArtifact.protocolVersion !== E2_A2_PROTOCOL_VERSION) throw new TypeError("A2 resume protocol mismatch");
  if (resumeArtifact.status !== "failed") throw new TypeError("A2 resume requires a failed source artifact");
  if (resumeArtifact.provider !== provider || resumeArtifact.model !== model) throw new TypeError("A2 resume provider/model mismatch");
  if (!Array.isArray(resumeArtifact.selector?.schedules)) throw new TypeError("A2 resume artifact lacks selector schedules");
  if (!Array.isArray(resumeArtifact.completedLives)) throw new TypeError("A2 resume artifact lacks completedLives");
}

export async function runE2A2({
  provider,
  model,
  adapterOverride = null,
  onProgress = null,
  resumeArtifact = null,
} = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  validateResumeArtifact(resumeArtifact, { provider, model });

  const priorModelEvents = resumeArtifact?.generator?.modelEvents ?? [];
  const modelEvents = structuredClone(priorModelEvents);
  const adapter = adapterOverride ?? createAdapter({
    provider,
    model,
    observer: (event) => modelEvents.push(event),
  });
  const lives = structuredClone(resumeArtifact?.completedLives ?? []);
  const selectorSchedules = structuredClone(resumeArtifact?.selector?.schedules ?? []);
  let reusedCompletedLives = 0;
  let reusedSelectorSchedules = 0;

  const keyMatches = (candidate, worldId, seed, runOrdinal) =>
    candidate.worldId === worldId && candidate.seed === seed && candidate.runOrdinal === runOrdinal;

  try {
    for (const worldFixture of E2_DIAGNOSTIC_WORLDS) {
      for (let index = 0; index < E2_A0_DEFAULT_SEEDS.length; index += 1) {
        const seed = E2_A0_DEFAULT_SEEDS[index];
        const runOrdinal = index + 1;
        const completed = lives.find((life) => keyMatches(life, worldFixture.id, seed, runOrdinal));
        if (completed !== undefined) {
          reusedCompletedLives += 1;
          if (typeof onProgress === "function") onProgress({
            type: "completed_life_reused",
            worldId: worldFixture.id,
            seed,
            runOrdinal,
          });
          continue;
        }

        const priorSchedules = selectorSchedules.filter((schedule) =>
          keyMatches(schedule, worldFixture.id, seed, runOrdinal));
        if (priorSchedules.length > 1) throw new TypeError("A2 resume artifact contains duplicate selector schedules");
        let frozenSchedule;
        if (priorSchedules.length === 1) {
          frozenSchedule = rehydrateE2A2SelectorSchedule({
            worldFixture,
            seed,
            scheduleEvidence: priorSchedules[0],
          });
          reusedSelectorSchedules += 1;
          if (typeof onProgress === "function") onProgress({
            type: "selector_schedule_reused",
            worldId: worldFixture.id,
            seed,
            runOrdinal,
            scheduleDigest: frozenSchedule.scheduleDigest,
          });
        } else {
          frozenSchedule = await freezeE2A2SelectorSchedule({ worldFixture, seed, adapter, onProgress });
          selectorSchedules.push(Object.freeze({
            worldId: worldFixture.id,
            seed,
            runOrdinal,
            scheduleDigest: frozenSchedule.scheduleDigest,
            evidence: structuredClone(frozenSchedule.evidence),
          }));
        }

        const life = await runE2A0ThreadWithCandidateAttempts({
          worldFixture,
          provider,
          model,
          seed,
          runOrdinal,
          adapter,
          candidateRunner: (args) => runE2A2Life({ ...args, frozenSchedule }),
          maxCandidateAttempts: E2_A0_MAX_CANDIDATE_ATTEMPTS,
          onProgress,
        });
        lives.push(life);
      }
    }
  } catch (error) {
    const resumeWitness = buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSelectorSchedules);
    error.e2A2FailureArtifact = buildFailureArtifact({
      provider,
      model,
      modelEvents,
      completedLives: lives,
      selectorSchedules,
      error,
      resumeWitness,
    });
    throw error;
  }

  const worlds = E2_DIAGNOSTIC_WORLDS.map((worldFixture) => {
    const worldLives = lives.filter((life) => life.worldId === worldFixture.id);
    return Object.freeze({
      worldId: worldFixture.id,
      worldSpecId: worldFixture.worldSpec.worldSpecId,
      worldSpecDigest: digest(worldFixture.worldSpec),
      lives: Object.freeze(structuredClone(worldLives)),
      betweenLife: characterizeE2BetweenLifeParticularity(worldLives),
    });
  });

  const resumeWitness = buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSelectorSchedules);
  return Object.freeze({
    evidenceVersion: E2_A2_EVIDENCE_VERSION,
    protocolVersion: E2_A2_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_A2_ARM,
    pairedControlArm: "H6_counterpart_participation_correction",
    provider,
    model,
    seeds: Object.freeze([...E2_A0_DEFAULT_SEEDS]),
    resumedFrom: resumeWitness,
    selector: Object.freeze({
      promptHash: e2A2SelectorPromptHash(),
      schemaHash: e2A2SelectorSchemaHash(),
      inputBoundary: Object.freeze({
        subjectVisible: false,
        householdShapeVisible: false,
        familyRelationsVisible: false,
        priorEpisodesVisible: false,
        knownParticipantsVisible: false,
        counterpartModeVisible: false,
        contextKindsVisible: false,
        priorSelectorChoicesVisible: false,
      }),
      schedules: Object.freeze(structuredClone(selectorSchedules)),
    }),
    generator: Object.freeze({
      selectedOpportunityPromptHash: richPassASelectedOpportunityPromptHash(),
      selectedOpportunityRetryPromptHash: richPassASelectedOpportunityRetryPromptHash(),
      repairPromptHash: richPassARepairPromptHash(),
      schemaHash: richPassASchemaHash(),
      eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      counterpartPolicyWitness: richCounterpartPolicyWitness(),
      structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
      modelEvents,
    }),
    worlds: Object.freeze(worlds),
    rejectionProfile: aggregateRejectionProfile(lives),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  if (event.type === "selector_start") {
    process.stderr.write(`[E2 A2 ${event.worldId} ${event.seed} · selector ${String(event.ordinal).padStart(2, "0")}/${event.total}] ... `);
    return;
  }
  if (event.type === "selector_complete") {
    process.stderr.write(`✓ ${event.selection.structureRef ?? "world-emergent"}\n`);
    return;
  }
  if (event.type === "selector_schedule_reused") {
    process.stderr.write(`[E2 A2 ${event.worldId} ${event.seed}] reuse frozen selector schedule ${event.scheduleDigest}\n`);
    return;
  }
  if (event.type === "completed_life_reused") {
    process.stderr.write(`[E2 A2 ${event.worldId} ${event.seed}] reuse completed life from failure artifact\n`);
    return;
  }
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2 A2 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
    return;
  }
  if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2 A2 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
    return;
  }
  const prefix = `[E2 A2 ${event.worldId} run ${event.runOrdinal}/3 · attempt ${event.candidateAttemptNumber} · episode ${String(event.ordinal).padStart(2, "0")}/${event.total}]`;
  if (event.type === "episode_start") {
    const pressure = event.selectionPressure.requiresNewCounterpart ? " · new-counterpart-pressure" : "";
    process.stderr.write(`${prefix} selected=${event.selectedOpportunity.structureRef ?? "world-emergent"}${pressure} ... `);
  } else if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "record_retry") {
    process.stderr.write(`\n  retry record ${event.recordRetry.failedGate} ... `);
  } else if (event.type === "episode_complete") {
    const encounter = event.episode.intellectualEncounter?.kind ?? "none";
    process.stderr.write(`✓ ${event.elapsedMs} ms · realized=${event.episode.structureRef ?? "world-emergent"} · introduced=${event.episode.introducedParticipants.length} · encounter=${encounter} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

function printSummary(result) {
  for (const world of result.worlds) {
    process.stdout.write(`${world.worldId}:\n`);
    for (const life of world.lives) {
      const c = life.e2Characterization;
      process.stdout.write(`  ${life.seed}: attempts=${life.candidateAttemptsPerThread} · places=${c.uniquePlaces} · structures=${c.uniqueStructures} · introductions=${c.introducedParticipants} · new-pressure=${c.newCounterpartPressureCount} · pressure-realized-with-intro=${c.pressureEpisodesWithIntroductions} · encounters=${c.intellectualEncounterEvents} · repairs=${c.repairCount} · retries=${c.recordRetryCount}\n`);
    }
    for (const pair of world.betweenLife.pairs) {
      process.stdout.write(`  pair ${pair.leftSeed}/${pair.rightSeed}: placeJ=${pair.placeRefs?.value ?? "n/a"} · roleJ=${pair.participantRoles?.value ?? "n/a"} · structureJ=${pair.structureRefs?.value ?? "n/a"} · sourceJ=${pair.intellectualSubjectRefs?.value ?? "n/a"}\n`);
    }
  }
  process.stdout.write(`Candidate attempts: ${result.rejectionProfile.candidateAttempts} · rejected attempts: ${result.rejectionProfile.candidateAttemptFailures}\n`);
  if (result.resumedFrom !== null) {
    process.stdout.write(`Resumed: selector schedules=${result.resumedFrom.reusedSelectorSchedules} · completed lives=${result.resumedFrom.reusedCompletedLives}\n`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-a2 -- --provider <openai|google> --model <model> [--resume <failed-artifact>] [--out <file>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const resumePath = readArg(argv, "--resume");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));

  process.stderr.write(`E2 A2: START · ${E2_DIAGNOSTIC_WORLDS.length} worlds · ${E2_A0_DEFAULT_SEEDS.length} lives/world · ${E2_A0_EPISODES} selector+episode slots/life · ${E2_A0_STRUCTURES_PER_WINDOW} offers/window${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2A2({ provider, model, resumeArtifact, onProgress: progressPrinter });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
    else process.stdout.write(text);
    printSummary(result);
    if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    const artifact = error?.e2A2FailureArtifact ?? null;
    if (artifact !== null) {
      const text = `${JSON.stringify(artifact, null, 2)}\n`;
      if (outputPath !== null) {
        writeFileSync(outputPath, text, "utf8");
        process.stderr.write(`Failure artifact: ${outputPath}\n`);
      } else process.stdout.write(text);
    }
    throw error;
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 A2: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
