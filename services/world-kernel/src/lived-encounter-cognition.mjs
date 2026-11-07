import { memoryInMind } from "./memory-in-mind.mjs";
import { promptFor } from "./cognition-prompts.mjs";
import { streamExpressionIntoLiveEncounter } from "./live-encounter-expression.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MAX_ENCOUNTER_MEMORIES = 6;

const SYSTEM_PROMPT = promptFor("visitor.reply").text;

const STREAM_SYSTEM_PROMPT = promptFor("visitor.speech").text;

function requestId(input) {
  return `lived-encounter_${sha256(canonicalJson(input))}`;
}

function validateStore(name, store, method) {
  if (store === null || typeof store !== "object" || typeof store[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function semanticContext(record) {
  return {
    stateId: record.stateId,
    domain: record.domain,
    dimension: record.dimension,
    target: record.target ?? null,
    state: record.state,
  };
}

function memoryContext(memories) {
  return [...memories]
    .sort((left, right) => Date.parse(right.asOf) - Date.parse(left.asOf))
    .slice(0, MAX_ENCOUNTER_MEMORIES)
    .map((memory) => ({
      memoryId: memory.memoryId,
      ...memoryInMind(memory),
      salience: memory.salience,
      accessibility: memory.accessibility,
      asOf: memory.asOf,
    }));
}

function recentEncounterContext(stories) {
  if (!Array.isArray(stories)) {
    throw new TypeError("recent Encounter Stories must be an array");
  }
  return stories.map((record) => {
    assertPlainObject("recent Encounter Story", record);
    assertId("recent Encounter Story.encounterId", record.encounterId);
    assertIsoTimestamp("recent Encounter Story.occurredAt", record.occurredAt);
    assertPlainObject("recent Encounter Story.story", record.story);
    if (!Array.isArray(record.story.beats)) {
      throw new TypeError("recent Encounter Story beats must be an array");
    }
    return {
      encounterId:record.encounterId,
      occurredAt:record.occurredAt,
      story:{
        storyVersion:record.story.storyVersion ?? "encounter-story-v0.1",
        beats:structuredClone(record.story.beats),
      },
    };
  });
}

function contextState({ livedContext, thread, livedNowStore, semanticStateStore, memoryStore }) {
  if (livedContext !== null) {
    assertPlainObject("lived context", livedContext);
    assertExactKeys("lived context", livedContext, ["thread", "situation", "semanticStates", "memories"]);
    if (!Array.isArray(livedContext.semanticStates) || !Array.isArray(livedContext.memories)) {
      throw new TypeError("lived context state must be arrays");
    }
    return {
      thread: livedContext.thread,
      currentSituation: livedContext.situation,
      semanticStates: livedContext.semanticStates,
      memories: livedContext.memories,
    };
  }
  validateStore("livedNowStore", livedNowStore, "getCurrentSituation");
  validateStore("semanticStateStore", semanticStateStore, "listCurrentState");
  const currentSituation = livedNowStore.getCurrentSituation(thread.threadId);
  return {
    thread,
    currentSituation,
    semanticStates: semanticStateStore.listCurrentState(thread.threadId),
    memories: memoryStore === null ? [] : (() => {
      validateStore("memoryStore", memoryStore, "listCurrentMemories");
      return memoryStore.listCurrentMemories(thread.threadId);
    })(),
  };
}

function livedEncounterResponseInput({
  livedContext,
  thread,
  encounter,
  livedNowStore,
  semanticStateStore,
  memoryStore,
  recentEncounterStories,
  liveInteraction=null,
}) {
  assertPlainObject("lived encounter", encounter);
  assertExactKeys("lived encounter", encounter, ["utterance", "occurredAt"]);
  assertNonEmpty("lived encounter.utterance", encounter.utterance);
  assertIsoTimestamp("lived encounter.occurredAt", encounter.occurredAt);

  const state = contextState({ livedContext, thread, livedNowStore, semanticStateStore, memoryStore });
  const activeThread = state.thread;
  assertPlainObject("Thread", activeThread);
  assertId("Thread.threadId", activeThread.threadId);

  const currentSituation = state.currentSituation;
  if (currentSituation === null) {
    throw new TypeError("lived encounter requires an already-enacted current situation");
  }
  if (Date.parse(currentSituation.establishedAt) > Date.parse(encounter.occurredAt)) {
    throw new TypeError("lived encounter cannot precede its current situation");
  }

  const semanticStates = state.semanticStates.map(semanticContext);
  const autobiographicalMemories = memoryContext(state.memories);
  const immediateEncounterHistory = recentEncounterContext(recentEncounterStories);
  const input = {
    thread: {
      threadId: activeThread.threadId,
      selfDescription: activeThread.identity?.selfDescription ?? "",
      selfModel: activeThread.currentState?.selfModel ?? "",
      unresolvedIntentions: [...(activeThread.currentState?.unresolvedIntentions ?? [])],
    },
    currentSituation,
    semanticStates,
    autobiographicalMemories,
    recentEncounterStories:immediateEncounterHistory,
    visitorUtterance: encounter.utterance,
    occurredAt: encounter.occurredAt,
    ...(liveInteraction===null?{}:{liveInteraction:structuredClone(liveInteraction)}),
  };
  return Object.freeze({
    input,
    currentSituation,
    semanticStates,
    autobiographicalMemories,
  });
}

export async function respondToLivedEncounter({
  livedContext = null,
  thread = null,
  encounter,
  livedNowStore = null,
  semanticStateStore = null,
  memoryStore = null,
  recentEncounterStories = [],
  modelAdapter,
}) {
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("lived encounter cognition requires a model adapter");
  }

  const {
    input,
    currentSituation,
    semanticStates,
    autobiographicalMemories,
  } = livedEncounterResponseInput({
    livedContext,
    thread,
    encounter,
    livedNowStore,
    semanticStateStore,
    memoryStore,
    recentEncounterStories,
  });

  const invocation = await modelAdapter.invoke({
    systemPrompt: SYSTEM_PROMPT,
    input,
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["responseText"],
      properties: {
        responseText: { type: "string", minLength: 1 },
      },
    },
    clientRequestId: requestId(input),
  });
  assertPlainObject("lived encounter cognition result", invocation);
  assertPlainObject("lived encounter cognition output", invocation.output);
  assertExactKeys("lived encounter cognition output", invocation.output, ["responseText"]);
  assertNonEmpty("lived encounter cognition responseText", invocation.output.responseText);
  assertPlainObject("lived encounter cognition provenance", invocation.provenance);
  assertNonEmpty("lived encounter cognition provenance.provider", invocation.provenance.provider);
  assertNonEmpty("lived encounter cognition provenance.modelId", invocation.provenance.modelId);

  return {
    responseText: invocation.output.responseText,
    grounding: {
      situationId: currentSituation.situationId,
      semanticStateIds: semanticStates.map((state) => state.stateId),
      memoryIds: autobiographicalMemories.map((memory) => memory.memoryId),
    },
    cognition: {
      provider: invocation.provenance.provider,
      modelId: invocation.provenance.modelId,
      providerRequestId: invocation.provenance.providerRequestId ?? null,
    },
  };
}

export async function streamLivedEncounterResponse({
  livedContext = null,
  thread = null,
  encounter,
  livedNowStore = null,
  semanticStateStore = null,
  memoryStore = null,
  recentEncounterStories = [],
  liveEncounter,
  participantId,
  priorExpression = null,
  modelAdapter,
  signal = null,
}) {
  if(!liveEncounter
    ||typeof liveEncounter.heardSoFar!=="function"
    ||typeof liveEncounter.perceivedWorldEvents!=="function"){
    throw new TypeError("streamed lived encounter requires a live encounter");
  }
  assertId("streamed lived encounter participantId",participantId);
  if(priorExpression!==null){
    assertPlainObject("streamed lived encounter priorExpression",priorExpression);
    assertNonEmpty("streamed lived encounter priorExpression.text",priorExpression.text);
    if(priorExpression.completion!=="interrupted"){
      throw new TypeError("prior live expression must be interrupted");
    }
  }

  const liveInteraction={
    heardSoFar:liveEncounter.heardSoFar(participantId),
    perceivedWorldEvents:liveEncounter.perceivedWorldEvents(participantId),
    ...(priorExpression===null?{}:{
      priorExpression:{
        text:priorExpression.text,
        completion:"interrupted",
      },
    }),
  };
  const {
    input,
    currentSituation,
    semanticStates,
    autobiographicalMemories,
  }=livedEncounterResponseInput({
    livedContext,
    thread,
    encounter,
    livedNowStore,
    semanticStateStore,
    memoryStore,
    recentEncounterStories,
    liveInteraction,
  });

  const expression=await streamExpressionIntoLiveEncounter({
    encounter:liveEncounter,
    actorId:participantId,
    modelAdapter,
    systemPrompt:STREAM_SYSTEM_PROMPT,
    input,
    clientRequestId:`lived-encounter-expression_${sha256(canonicalJson(input))}`,
    signal,
  });

  return Object.freeze({
    ...expression,
    grounding:Object.freeze({
      situationId:currentSituation.situationId,
      semanticStateIds:Object.freeze(semanticStates.map((state)=>state.stateId)),
      memoryIds:Object.freeze(autobiographicalMemories.map((memory)=>memory.memoryId)),
    }),
  });
}
