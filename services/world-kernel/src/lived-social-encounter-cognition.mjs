import { streamExpressionIntoLiveEncounter } from "./live-encounter-expression.mjs";
import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

function requestId(kind, input) {
  return `${kind}_${sha256(canonicalJson(input))}`;
}

export async function continueSocialEncounterStory({
  thread,
  situation,
  counterparties,
  story,
  modelAdapter,
}) {
  assertPlainObject("social encounter Thread", thread);
  assertId("social encounter Thread.threadId", thread.threadId);
  assertPlainObject("social encounter situation", situation);
  if (!Array.isArray(counterparties) || counterparties.length < 1) {
    throw new TypeError("social encounter continuation requires counterparties");
  }
  assertPlainObject("social encounter story", story);
  if (!Array.isArray(story.beats) || story.beats.length < 1) {
    throw new TypeError("social encounter story requires prior beats");
  }

  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
    },
    currentSituation:structuredClone(situation),
    counterparties:counterparties.map((counterparty) => ({
      threadId:counterparty.threadId,
      name:counterparty.identity?.name ?? null,
      selfDescription:counterparty.identity?.selfDescription ?? "",
    })),
    story:structuredClone(story),
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread already participating in a small social encounter.
The supplied story contains only the observable encounter so far. Decide whether this Thread contributes one next observable beat or stays silent.
Staying silent is normal. If speaking, use this Thread's own voice. If acting, describe only a short outwardly observable action.
Do not narrate private feelings, hidden thoughts, memory records, system state, or another person's interior.
Do not rewrite prior beats or move anyone to another place.
Return both beatKind and beatText as null to contribute nothing on this turn.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["beatKind","beatText"],
      properties:{
        beatKind:{ anyOf:[{ type:"string", enum:["utterance","action"] },{ type:"null" }] },
        beatText:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      },
    },
    clientRequestId:requestId("social-encounter-story", input),
  });

  assertPlainObject("social encounter continuation", invocation.output);
  assertExactKeys("social encounter continuation", invocation.output, ["beatKind","beatText"]);
  const silent = invocation.output.beatKind === null && invocation.output.beatText === null;
  if (!silent && (invocation.output.beatKind === null || invocation.output.beatText === null)) {
    throw new TypeError("social encounter beat kind and text must appear together");
  }
  if (silent) return null;
  assertNonEmpty("social encounter beatText", invocation.output.beatText);
  return Object.freeze({
    actorThreadId:thread.threadId,
    kind:invocation.output.beatKind,
    text:invocation.output.beatText,
  });
}

const LIVE_CONTRIBUTION_DECISIONS=Object.freeze(["speak","act","silent"]);

function socialLiveInput({
  thread,
  situation,
  semanticStates=[],
  memories=[],
  counterparties,
  story,
  liveEncounter,
  opportunity,
}){
  assertPlainObject("live social Thread",thread);
  assertId("live social Thread.threadId",thread.threadId);
  assertPlainObject("live social situation",situation);
  if(!Array.isArray(counterparties)||counterparties.length<1){
    throw new TypeError("live social encounter requires counterparties");
  }
  assertPlainObject("live social story",story);
  if(!Array.isArray(story.beats)||story.beats.length<1){
    throw new TypeError("live social story requires observable history");
  }
  if(!liveEncounter||typeof liveEncounter.heardSoFar!=="function"
    ||typeof liveEncounter.perceivedWorldEvents!=="function"){
    throw new TypeError("live social cognition requires Live Encounter state");
  }
  assertPlainObject("live social opportunity",opportunity);

  return Object.freeze({
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
    },
    currentSituation:structuredClone(situation),
    semanticStates:structuredClone(semanticStates),
    autobiographicalMemories:structuredClone(memories),
    counterparties:counterparties.map((counterparty)=>({
      threadId:counterparty.threadId,
      name:counterparty.identity?.name??null,
      selfDescription:counterparty.identity?.selfDescription??"",
    })),
    story:structuredClone(story),
    liveInteraction:{
      heardSoFar:liveEncounter.heardSoFar(thread.threadId),
      perceivedWorldEvents:liveEncounter.perceivedWorldEvents(thread.threadId),
      opportunity:structuredClone(opportunity),
    },
  });
}

export async function chooseLiveSocialContribution({
  thread,
  situation,
  semanticStates=[],
  memories=[],
  counterparties,
  story,
  liveEncounter,
  opportunity,
  modelAdapter,
}={}){
  const input=socialLiveInput({
    thread,
    situation,
    semanticStates,
    memories,
    counterparties,
    story,
    liveEncounter,
    opportunity,
  });
  const invocation=await modelAdapter.invoke({
    systemPrompt:`You are temporary cognition for one persistent Fibre Thread already inside an accepted live social encounter.
A speaking opportunity is permission to consider contributing, never an obligation.
Choose speak only if this Thread naturally wants to say something now. Choose act only for one short outwardly observable action that naturally belongs in the current scene. Choose silent when no contribution is wanted.
Do not script future speech in this decision. If decision is act, actionText is the exact short outward action. Otherwise actionText must be null.
Use only this Thread's private grounding plus observable live encounter evidence. Do not invent another person's interior, a relationship, a new place, or hidden World facts.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["decision","actionText"],
      properties:{
        decision:{type:"string",enum:LIVE_CONTRIBUTION_DECISIONS},
        actionText:{anyOf:[{type:"string",minLength:1,maxLength:500},{type:"null"}]},
      },
    },
    clientRequestId:requestId("social-live-contribution",input),
  });

  assertPlainObject("live social contribution",invocation.output);
  assertExactKeys("live social contribution",invocation.output,["decision","actionText"]);
  if(!LIVE_CONTRIBUTION_DECISIONS.includes(invocation.output.decision)){
    throw new TypeError("live social contribution decision is invalid");
  }
  if(invocation.output.decision==="act"){
    assertNonEmpty("live social actionText",invocation.output.actionText);
  }else if(invocation.output.actionText!==null){
    throw new TypeError("only live social act may carry actionText");
  }
  return Object.freeze({
    decision:invocation.output.decision,
    actionText:invocation.output.actionText,
    provenance:Object.freeze(structuredClone(invocation.provenance??{})),
  });
}

export async function streamLiveSocialSpeech({
  thread,
  situation,
  semanticStates=[],
  memories=[],
  counterparties,
  story,
  liveEncounter,
  opportunity,
  modelAdapter,
  signal=null,
}={}){
  const input=socialLiveInput({
    thread,
    situation,
    semanticStates,
    memories,
    counterparties,
    story,
    liveEncounter,
    opportunity,
  });
  return streamExpressionIntoLiveEncounter({
    encounter:liveEncounter,
    actorId:thread.threadId,
    modelAdapter,
    systemPrompt:`You are temporary outward-expression cognition for one persistent Fibre Thread speaking inside an asynchronous live social encounter.
The supplied currentSituation is authoritative lived reality. The story contains completed observable beats. liveInteraction.heardSoFar may contain speech still in progress.
Speak naturally from this Thread's identity, developed state, autobiographical memory and current life. The Thread may agree, disagree, redirect, ask, answer, joke, hesitate or say very little.
Do not narrate private thoughts or system state. Do not describe another person's hidden feelings. Do not invent a new place, event or relationship. Do not mention that this is a model or prompt.
Produce only the words this Thread says aloud now. There is no requirement to finish a thought before another participant speaks.`,
    input,
    clientRequestId:requestId("social-live-expression",input),
    signal,
  });
}

