import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  autobiographicalMemoryId,
  buildGenesisPassBInput,
  buildRichLifePassAInput,
  buildScheduledReinterpretationPassCInput,
  canonicalJson,
  constrainPassAContextToHistoricalEnvelope,
  deriveGenesisLifeContinuity,
  generateGenesisHistoricalEpisode,
  generateGenesisInitialMeaning,
  generateGenesisPassBMemory,
  generateGenesisReinterpretation,
  genesisLifeEpisodeEventId,
  normalizePassCInput,
  scheduleReinterpretationOpportunities,
  sha256,
  sharedIntellectualSourceRefs,
  syntheticLineageWitnessFromRecombinedGenome,
} from "./genesis-development-contracts.mjs";

// Keep the persisted version string stable while the implementation sheds its
// replacement-era module names. Candidate bytes remain comparable across the
// currentization refactor.
export const GENESIS_LIFE_CANDIDATE_VERSION = "pr39-replacement-v2-candidate-v1";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const pad = (value) => String(value).padStart(2, "0");
const fail = (message) => { throw new Error(message); };

function uniqueIntroductions(episodes) {
  const byId = new Map();
  for (const episode of episodes) {
    for (const participant of episode.introducedParticipants ?? []) {
      if (!byId.has(participant.provisionalPersonId)) {
        byId.set(participant.provisionalPersonId, participant);
      }
    }
  }
  return [...byId.values()].map((item) => structuredClone(item));
}

function eventMapForLife({ threadId, genesisId, episodes }) {
  return new Map(episodes.map((episode, index) => [episode.episodeId, Object.freeze({
    ordinal: index + 1,
    episode,
    eventId: genesisLifeEpisodeEventId({ threadId, genesisId, episode }),
  })]));
}

function memoryIdentityFromPassB({ threadId, callOrdinal, output, eventMap }) {
  const cited = output.episodeRefs.map((ref) => {
    const item = eventMap.get(ref);
    if (!item) fail(`replacement Pass-B cited unknown admitted episode ${ref}`);
    return item;
  }).sort((left, right) => left.ordinal - right.ordinal);
  if (cited.length === 0) fail("remembered replacement Pass-B output has no cited episode");
  const origin = cited[0];
  const slot = `pass_b_call_${pad(callOrdinal)}`;
  return Object.freeze({
    memoryRef: autobiographicalMemoryId({ threadId, originReference: origin.eventId, slot }),
    slot,
    origin,
    cited: Object.freeze(cited),
    eventRefs: Object.freeze(cited.map((item) => item.eventId)),
  });
}

function buildInitialPassCInput({ memory, passBInput, horizon }) {
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: memory.memoryRef,
      episodeRefs: [...memory.eventRefs],
      rememberedContent: memory.rememberedContent,
      uncertainty: [...memory.uncertainty],
    },
    formation: {
      asOf: passBInput.rememberingAt,
      ageAtFormation: passBInput.ageAtRemembering,
      chronologyIndex: horizon,
    },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

function relationFactsForMemoryTrigger({ threadId, memory, triggerEpisode }) {
  const target = memory.origin.episode;
  const targetPeople = new Set((target.participantRefs ?? []).filter((ref) => ref !== threadId));
  return {
    targetStructureRef: target.structureRef,
    triggerStructureRef: triggerEpisode.structureRef,
    targetStructureFamilyRef: null,
    triggerStructureFamilyRef: null,
    sharedPersonRefs: (triggerEpisode.participantRefs ?? [])
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

function assertSlotPlan(slotPlan) {
  if (slotPlan === null || typeof slotPlan !== "object") throw new TypeError("replacement candidate slotPlan is required");
  if (!Number.isInteger(slotPlan.slot) || slotPlan.slot < 1 || slotPlan.slot > 5) throw new TypeError("replacement candidate slot is invalid");
  if (!Array.isArray(slotPlan.windows) || slotPlan.windows.length !== 14) throw new TypeError("replacement candidate requires fourteen historical windows");
  if (!Array.isArray(slotPlan.envelopePlan?.envelopes) || slotPlan.envelopePlan.envelopes.length !== 14) throw new TypeError("replacement candidate requires fourteen reviewed envelopes");
  if (!(slotPlan.offersByWindow instanceof Map) || slotPlan.offersByWindow.size !== 14) throw new TypeError("replacement candidate requires fourteen offer sets");
}

export async function generateGenesisLifeCandidate({
  slotPlan,
  adapter,
  repairAdapter = adapter,
  attemptStartedAt,
} = {}) {
  assertSlotPlan(slotPlan);
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("replacement candidate adapter must expose invoke()");
  if (repairAdapter === null || typeof repairAdapter?.invoke !== "function") throw new TypeError("replacement candidate repairAdapter must expose invoke()");
  if (typeof attemptStartedAt !== "string" || !Number.isFinite(Date.parse(attemptStartedAt))) throw new TypeError("replacement candidate attemptStartedAt is required");

  const lineageWitness = slotPlan.originMode === "synthetic_lineage"
    ? syntheticLineageWitnessFromRecombinedGenome(slotPlan.genome)
    : null;
  const subject = Object.freeze({ provisionalThreadId: slotPlan.threadId, bornAt: slotPlan.bornAt });
  const episodes = [];
  const passA = [];

  for (let index = 0; index < slotPlan.windows.length; index += 1) {
    const window = slotPlan.windows[index];
    const envelope = slotPlan.envelopePlan.envelopes[index];
    if (envelope.windowId !== window.windowId || envelope.ordinal !== index + 1) {
      fail(`replacement slot ${slotPlan.slot} envelope/window alignment drift at ordinal ${index + 1}`);
    }
    const offeredEntries = slotPlan.offersByWindow.get(window.windowId);
    if (!Array.isArray(offeredEntries) || offeredEntries.length < 8) {
      fail(`replacement slot ${slotPlan.slot} window ${window.windowId} lacks current EventStructure offers`);
    }
    const constrainedContext = constrainPassAContextToHistoricalEnvelope({
      worldSpec: slotPlan.worldSpec,
      envelope,
    });
    const input = buildRichLifePassAInput({
      originMode: slotPlan.originMode,
      syntheticLineageWitness: lineageWitness,
      worldSpec: constrainedContext.worldSpec,
      subject,
      developmentalWindow: constrainedContext.developmentalWindow,
      chronologyEndsAt: constrainedContext.chronologyEndsAt,
      initialRoster: slotPlan.roster.participants,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants: uniqueIntroductions(episodes),
      offeredEntries,
    });
    const result = await generateGenesisHistoricalEpisode({
      adapter,
      repairAdapter,
      passAInput: input,
      envelope,
      clientRequestId: `${slotPlan.freshModelRequestDomain}:slot-${pad(slotPlan.slot)}:pass-a:episode-${pad(index + 1)}`,
    });
    episodes.push(result.episode);
    passA.push(Object.freeze({
      ordinal: index + 1,
      windowId: window.windowId,
      envelopeDigest: digest(envelope),
      inputDigest: digest(input),
      episode: structuredClone(result.episode),
      episodeDigest: digest(result.episode),
      calls: structuredClone(result.calls),
      budgetState: structuredClone(result.budgetState),
    }));
  }

  const continuity = deriveGenesisLifeContinuity({
    threadId: slotPlan.threadId,
    worldSpec: slotPlan.worldSpec,
    initialRoster: slotPlan.roster.participants,
    episodes,
  });
  const eventMap = eventMapForLife({ threadId: slotPlan.threadId, genesisId: slotPlan.genesisId, episodes });
  const priorRememberedMemories = [];
  const memories = [];
  const passB = [];
  const passCInitial = [];

  for (let callOrdinal = 1; callOrdinal <= 6; callOrdinal += 1) {
    const input = buildGenesisPassBInput({
      threadId: slotPlan.threadId,
      bornAt: slotPlan.bornAt,
      worldSpec: slotPlan.worldSpec,
      episodes,
      windows: slotPlan.windows,
      callOrdinal,
      priorRememberedMemories,
      genome: slotPlan.genome,
    });
    const result = await generateGenesisPassBMemory({
      adapter,
      input,
      clientRequestId: `${slotPlan.freshModelRequestDomain}:slot-${pad(slotPlan.slot)}:pass-b:call-${pad(callOrdinal)}`,
    });
    const horizon = input.history.length;
    const formationMode = input.assignment.formationMode;
    passB.push(Object.freeze({
      callOrdinal,
      horizon,
      formationMode,
      input: structuredClone(input),
      output: structuredClone(result.output),
      calls: structuredClone(result.calls),
    }));
    if (result.output.outcome !== "remembered") continue;

    const identity = memoryIdentityFromPassB({
      threadId: slotPlan.threadId,
      callOrdinal,
      output: result.output,
      eventMap,
    });
    const memory = {
      ...identity,
      callOrdinal,
      horizon,
      formationMode,
      passBEpisodeRefs: [...result.output.episodeRefs],
      rememberedContent: result.output.rememberedContent,
      uncertainty: [...result.output.uncertainty],
      initialMeaningFormedAt: input.rememberingAt,
      ageAtInitialMeaning: input.ageAtRemembering,
      currentMeaning: null,
      reinterpretations: [],
    };
    const cInput = buildInitialPassCInput({ memory, passBInput: input, horizon });
    const cResult = await generateGenesisInitialMeaning({
      adapter,
      input: cInput,
      clientRequestId: `${slotPlan.freshModelRequestDomain}:slot-${pad(slotPlan.slot)}:pass-c:initial-${pad(callOrdinal)}`,
    });
    passCInitial.push(Object.freeze({
      callOrdinal,
      memoryRef: memory.memoryRef,
      input: structuredClone(cResult.input),
      output: structuredClone(cResult.output),
      call: structuredClone(cResult.call),
    }));
    if (cResult.output.outcome === "durable_meaning") {
      memory.currentMeaning = {
        summary: cResult.output.summary,
        parts: structuredClone(cResult.output.parts),
        formedAt: input.rememberingAt,
        ageAtFormation: input.ageAtRemembering,
        chronologyIndex: horizon,
      };
    }
    memories.push(memory);
    priorRememberedMemories.push({
      memoryRef: memory.memoryRef,
      passBEpisodeRefs: [...memory.passBEpisodeRefs],
      rememberedContent: memory.rememberedContent,
      uncertainty: [...memory.uncertainty],
      formationMode,
    });
  }

  const reinterpretationCandidates = buildReinterpretationCandidates({
    threadId: slotPlan.threadId,
    memories,
    episodes,
  });
  const reinterpretationSchedule = scheduleReinterpretationOpportunities(reinterpretationCandidates);
  const reinterpretationRuns = [];
  const byMemory = new Map(memories.map((memory) => [memory.memoryRef, memory]));
  for (const scheduled of reinterpretationSchedule.filter((item) => item.run)) {
    const memory = byMemory.get(scheduled.memoryRef);
    if (!memory?.currentMeaning) fail(`scheduled reinterpretation ${scheduled.opportunityId} lacks current durable meaning`);
    const trigger = eventMap.get(scheduled.trigger.episodeRef);
    if (!trigger) fail(`scheduled reinterpretation ${scheduled.opportunityId} trigger is not admitted history`);
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
        ageAtFormation: trigger.episode.ageAtEvent,
        chronologyIndex: trigger.ordinal,
      },
    });
    const result = await generateGenesisReinterpretation({
      adapter,
      input,
      clientRequestId: `${slotPlan.freshModelRequestDomain}:slot-${pad(slotPlan.slot)}:pass-c:reinterpret:${scheduled.opportunityId}`,
    });
    reinterpretationRuns.push(Object.freeze({
      opportunityId: scheduled.opportunityId,
      memoryRef: memory.memoryRef,
      input: structuredClone(result.input),
      output: structuredClone(result.output),
      call: structuredClone(result.call),
    }));
    memory.reinterpretations.push({
      opportunityId: scheduled.opportunityId,
      asOf: scheduled.trigger.occurredAt,
      outcome: result.output.outcome,
      supportingEventRef: trigger.eventId,
      output: structuredClone(result.output),
    });
    if (result.output.outcome === "revised") {
      memory.currentMeaning = {
        summary: result.output.summary,
        parts: structuredClone(result.output.parts),
        formedAt: scheduled.trigger.occurredAt,
        ageAtFormation: trigger.episode.ageAtEvent,
        chronologyIndex: trigger.ordinal,
      };
    }
  }

  const core = {
    candidateVersion: GENESIS_LIFE_CANDIDATE_VERSION,
    attemptStartedAt,
    slot: slotPlan.slot,
    threadId: slotPlan.threadId,
    genesisId: slotPlan.genesisId,
    originMode: slotPlan.originMode,
    worldSpecId: slotPlan.worldSpec.worldSpecId,
    worldSpecDigest: slotPlan.worldSpecDigest,
    genomeId: slotPlan.genome.header.genomeId,
    genomeDigest: slotPlan.genomeDigest,
    envelopePlanDigest: slotPlan.envelopePlan.digest,
    passA,
    episodes: structuredClone(episodes),
    lifeContinuity: structuredClone(continuity),
    passB,
    passCInitial,
    memories: structuredClone(memories),
    reinterpretationSchedule: structuredClone(reinterpretationSchedule),
    reinterpretationRuns,
  };
  return Object.freeze({
    ...core,
    candidateDigest: digest(core),
  });
}
