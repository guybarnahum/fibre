import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MAX_MEMORIES = 6;

function requestId(input) {
  return `encounter-attention_${sha256(canonicalJson(input))}`;
}

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

export async function appraiseEncounterAttention({
  thread,
  situation,
  encounterStory,
  semanticStates = [],
  memories = [],
  modelAdapter,
}) {
  assertPlainObject("attention Thread", thread);
  assertId("attention Thread.threadId", thread.threadId);
  assertPlainObject("attention situation", situation);
  assertPlainObject("attention Encounter Story", encounterStory);
  assertId("attention Encounter Story.encounterId", encounterStory.encounterId);

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
    systemPrompt:`You are lived attention for one persistent Fibre Thread.
An objective Encounter Story occurred within this Thread's current situation. Decide whether it actually entered this person's attention.
Co-presence is not enough. Consider the Thread's current activity, focus, needs, feelings, stable tendencies and the salience of the observable occurrence.
Return not_noticed when it plausibly passed without entering lived attention.
If noticed, write a concise first-person immediate experience: what this Thread actually noticed and the thought, feeling, association or bodily response it stirred now. This is not a journal entry and not a durable memory.
Do not add objective facts absent from the Encounter Story. Do not claim lasting meaning, relationship change, memory retention or future behavior.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["outcome","experienceText"],
      properties:{
        outcome:{ type:"string", enum:["noticed","not_noticed"] },
        experienceText:{ anyOf:[{ type:"string", minLength:1, maxLength:1200 },{ type:"null" }] },
      },
    },
    clientRequestId:requestId(input),
  });

  assertPlainObject("attention output", invocation.output);
  assertExactKeys("attention output", invocation.output, ["outcome","experienceText"]);
  if (!["noticed","not_noticed"].includes(invocation.output.outcome)) {
    throw new TypeError("attention outcome is invalid");
  }
  if (invocation.output.outcome === "noticed") {
    assertNonEmpty("attention experienceText", invocation.output.experienceText);
  } else if (invocation.output.experienceText !== null) {
    throw new TypeError("not_noticed cannot carry experience text");
  }

  return Object.freeze({
    outcome:invocation.output.outcome,
    experienceText:invocation.output.experienceText,
    cognition:Object.freeze({
      provider:invocation.provenance.provider,
      modelId:invocation.provenance.modelId,
      providerRequestId:invocation.provenance.providerRequestId ?? null,
    }),
  });
}
