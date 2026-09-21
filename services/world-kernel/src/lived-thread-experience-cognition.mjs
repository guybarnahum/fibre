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
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      memoryId:memory.memoryId,
      rememberedContent:memory.rememberedContent ?? null,
      rememberedMeaning:memory.rememberedMeaning ?? null,
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
    currentSituation:structuredClone(situation),
    encounterStory:{
      occurredAt:encounterStory.occurredAt,
      story:structuredClone(encounterStory.story),
    },
    semanticStates:semanticStates.map((state) => ({
      domain:state.domain,
      dimension:state.dimension,
      target:state.target ?? null,
      state:state.state,
    })),
    autobiographicalMemories:boundedMemories(memories),
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are the immediate lived experience of one persistent Fibre Thread inside an Encounter Story they are actively participating in.
Write a concise first-person account of what this particular Thread experienced in the moment: what they noticed, and the thought, feeling, association or bodily response it stirred.
The objective Encounter Story is shared evidence; this response is personal and may differ from another participant's experience of the same event.
This is not a journal entry and not durable memory.
Do not add objective events, dialogue or actions absent from the Encounter Story. Do not claim lasting meaning, relationship change, memory retention or future behavior.`,
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
