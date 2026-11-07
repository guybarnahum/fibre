import { situationInMind } from "./situation-in-mind.mjs";
import { memoryInMind } from "./memory-in-mind.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MAX_MEMORIES = 6;

function boundedMemories(memories) {
  return [...(memories ?? [])]
    .sort((left, right) => Date.parse(right.asOf) - Date.parse(left.asOf))
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      memoryId:memory.memoryId,
      ...memoryInMind(memory),
      salience:memory.salience,
      asOf:memory.asOf,
    }));
}

function requestId(input) {
  return `encounter-experience_${sha256(canonicalJson(input))}`;
}

export async function formThreadEncounterExperience({
  thread,
  situation,
  encounterStory,
  others = [],
  semanticStates = [],
  memories = [],
  modelAdapter,
}) {
  assertPlainObject("experience Thread", thread);
  assertId("experience Thread.threadId", thread.threadId);
  assertPlainObject("experience situation", situation);
  assertPlainObject("experience Encounter Story", encounterStory);
  assertId("experience Encounter Story.encounterId", encounterStory.encounterId);

  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    // Stable self first and the event last, so successive experiences share a prefix.
    semanticStates:semanticStates.map((state) => ({
      domain:state.domain,
      dimension:state.dimension,
      target:state.target ?? null,
      state:state.state,
    })),
    autobiographicalMemories:boundedMemories(memories),
    currentSituation:situationInMind(situation),
    encounterStory:{
      occurredAt:encounterStory.occurredAt,
      others:structuredClone(others),
      story:structuredClone(encounterStory.story),
    },
  };

  const invocation = await modelAdapter.invoke({
    ...promptRequest("encounter.experience",{threadId:thread.threadId}),
    cacheThrough:"currentSituation",
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["experienceText"],
      properties:{
        experienceText:{ type:"string", minLength:1, maxLength:1200 },
      },
    },
    clientRequestId:requestId(input),
  });

  assertPlainObject("Thread Experience output", invocation.output);
  assertNonEmpty("Thread Experience experienceText", invocation.output.experienceText);
  return invocation.output.experienceText;
}
