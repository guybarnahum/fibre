import { streamExpressionIntoLiveEncounter } from "./live-encounter-expression.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
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
    ...promptRequest("social.live-contribution",{threadId:thread.threadId}),
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
    ...promptRequest("social.live-expression",{threadId:thread.threadId}),
    input,
    clientRequestId:requestId("social-live-expression",input),
    signal,
  });
}

