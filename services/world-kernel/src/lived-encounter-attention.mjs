import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";
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
  selfRole=null,
  venueName=null,
  modelAdapter,
}) {
  assertPlainObject("attention Thread", thread);
  assertId("attention Thread.threadId", thread.threadId);
  assertPlainObject("attention situation", situation);
  assertPlainObject("attention Encounter Story", encounterStory);
  assertId("attention Encounter Story.encounterId", encounterStory.encounterId);
  if(![null,"arriver","witness"].includes(selfRole))
    throw new TypeError("attention selfRole is invalid");

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
      story:{
        ...structuredClone(encounterStory.story),
        // Observer-relative cognition only; never alter World Story evidence.
        beats:encounterStory.story.beats.map(beat=>{
          const self=beat.actorThreadId===thread.threadId;
          return {
            ...structuredClone(beat),self,
            ...(self&&selfRole==="arriver"&&beat.kind==="action"
              ?{text:venueName?`You arrive at ${venueName}.`:"You arrive here."}
              :self&&selfRole==="witness"&&beat.kind==="occurrence"
                ?{text:situation.outwardActivity
                  ?`You are ${situation.outwardActivity} nearby.`:"You are nearby."}
                :{}),
          };
        }),
      },
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
Co-presence is not enough. Each Story beat carries self=true only when its actor is you; distinguish your own arrival or presence from the actions of others. Consider the Thread's current activity, focus, needs, feelings, stable tendencies and the salience of the observable occurrence.
Return not_noticed when it plausibly passed without entering lived attention.
If noticed, write a concise first-person immediate experience: what this Thread actually noticed and the thought, feeling, association or bodily response it stirred now. This is not a journal entry and not a durable memory.
If it did not enter attention, say briefly in passedReason why it passed by.
Do not add objective facts absent from the Encounter Story. Do not claim lasting meaning, relationship change, memory retention or future behavior.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["outcome","experienceText","passedReason"],
      properties:{
        outcome:{ type:"string", enum:["noticed","not_noticed"] },
        experienceText:{ anyOf:[{ type:"string", minLength:1, maxLength:1200 },{ type:"null" }] },
        passedReason:{ anyOf:[{type:"string",minLength:1,maxLength:300},{type:"null"}] },
      },
    },
    clientRequestId:requestId(input),
  });

  assertPlainObject("attention output", invocation.output);
  assertExactKeys("attention output", invocation.output, ["outcome","experienceText","passedReason"]);
  if (!["noticed","not_noticed"].includes(invocation.output.outcome)) {
    throw new TypeError("attention outcome is invalid");
  }
  if (invocation.output.outcome === "noticed") {
    assertNonEmpty("attention experienceText", invocation.output.experienceText);
    if(invocation.output.passedReason!==null)
      throw new TypeError("noticed cannot carry a passed reason");
  } else {
    if(invocation.output.experienceText!==null)
      throw new TypeError("not_noticed cannot carry experience text");
    assertNonEmpty("attention passedReason",invocation.output.passedReason);
    if(invocation.output.passedReason.length>300)
      throw new TypeError("attention passedReason exceeds 300 characters");
  }

  return Object.freeze({
    outcome:invocation.output.outcome,
    experienceText:invocation.output.experienceText,
    passedReason:invocation.output.passedReason,
    cognition:Object.freeze({
      provider:invocation.provenance.provider,
      modelId:invocation.provenance.modelId,
      providerRequestId:invocation.provenance.providerRequestId ?? null,
    }),
  });
}

/** Admit one observer's attention to an already-admitted objective World story. */
export async function admitEncounterAttention({
  thread,
  situation,
  encounterStory,
  semanticStates=[],
  memories=[],
  experienceStore,
  modelAdapter,
  onExperienceQueued=null,
  selfRole=null,
  venueName=null,
}){
  let attention=experienceStore.getThreadEncounterAttention(
    thread.threadId,encounterStory.encounterId,
  );
  if(attention===null){
    const appraisal=await appraiseEncounterAttention({
      thread,situation,encounterStory,semanticStates,memories,modelAdapter,selfRole,venueName,
    });
    attention=experienceStore.recordThreadEncounterAttention({
      threadId:thread.threadId,
      encounterRef:encounterStory.encounterId,
      situationId:situation.situationId,
      occurredAt:encounterStory.occurredAt,
      outcome:appraisal.outcome,
      experienceText:appraisal.experienceText,
      passedReason:appraisal.passedReason,
    });
  }
  if(attention.outcome==="noticed"){
    await queueThreadExperienceConsolidation({
      experienceStore,
      experienceRecord:attention.experience,
      queuedAt:attention.occurredAt,
      onQueued:onExperienceQueued,
    });
  }
  return attention;
}
