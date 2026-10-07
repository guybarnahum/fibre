import { createLiveEncounter } from "./live-encounter.mjs";
import {
  chooseLiveSocialContribution,
  streamLiveSocialSpeech,
} from "./lived-social-encounter-cognition.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

const DEFAULT_OPPORTUNITY_BUDGET=8;

function contextMap(initiator,counterparty){
  const values=[initiator,counterparty];
  const map=new Map();
  for(const context of values){
    assertPlainObject("live social context",context);
    assertPlainObject("live social context.thread",context.thread);
    assertId("live social context.thread.threadId",context.thread.threadId);
    assertPlainObject("live social context.situation",context.situation);
    map.set(context.thread.threadId,context);
  }
  if(map.size!==2)throw new TypeError("live social encounter requires two distinct Threads");
  return map;
}

function syntheticOpportunity({participantId,sourceActorId,heardText}){
  return Object.freeze({
    type:"speaking_opportunity",
    participantId,
    sourceActorId,
    speechRef:null,
    reason:"end",
    heardText,
  });
}

export async function runThreadLiveSocialEncounter({
  initiator,
  counterparty,
  request,
  stance,
  modelAdapter,
  maxOpportunityAppraisals=DEFAULT_OPPORTUNITY_BUDGET,
}={}){
  const contexts=contextMap(initiator,counterparty);
  assertPlainObject("live social request",request);
  assertId("live social request.initiatorThreadId",request.initiatorThreadId);
  assertNonEmpty("live social request.text",request.text);
  assertPlainObject("live social stance",stance);
  if(stance.decision!=="accept")throw new TypeError("live social encounter requires accepted stance");
  if(!Number.isSafeInteger(maxOpportunityAppraisals)
    ||maxOpportunityAppraisals<1
    ||maxOpportunityAppraisals>32){
    throw new TypeError("live social maxOpportunityAppraisals must be 1-32");
  }
  if(!modelAdapter||typeof modelAdapter.invoke!=="function"
    ||typeof modelAdapter.streamExpression!=="function"){
    throw new TypeError("live social encounter requires structured and streaming model cognition");
  }

  const initiatorId=initiator.thread.threadId;
  const counterpartyId=counterparty.thread.threadId;
  if(request.initiatorThreadId!==initiatorId){
    throw new TypeError("live social request belongs to another initiator");
  }

  const liveEncounter=createLiveEncounter({
    participantIds:[initiatorId,counterpartyId],
  });
  const story={
    storyVersion:"encounter-story-v0.1",
    beats:[],
  };
  const busy=new Set();
  const deferred=new Map();
  const activeControllers=new Map();
  const pending=new Set();
  const subscriptions=[];
  let bootstrapping=true;
  let stopped=false;
  let endedBy="quiescent";
  let opportunityAppraisals=0;
  let contributionCount=0;

  function stop(reason){
    if(stopped)return;
    stopped=true;
    endedBy=reason;
    for(const controller of activeControllers.values())controller.abort(reason);
  }

  function recordEvent(listenerId,event){
    if(event.type==="speech_start"&&event.actorId===listenerId){
      for(const [actorId,controller] of activeControllers.entries()){
        if(actorId!==event.actorId)controller.abort("interrupted_by_speech");
      }
      return;
    }
    if(event.type==="speech_end"&&event.actorId===listenerId){
      if(typeof event.text==="string"&&event.text.trim()!==""){
        story.beats.push({
          actorThreadId:event.actorId,
          kind:"utterance",
          text:event.text,
          ...(event.completion==="interrupted"?{completion:"interrupted"}:{}),
        });
      }
      return;
    }
    if(event.type==="participant_action"&&event.actorId===listenerId){
      story.beats.push({
        actorThreadId:event.actorId,
        kind:"action",
        text:event.text,
      });
      return;
    }
    if(event.type==="scene_changed"&&event.participantId===listenerId){
      stop("scene_changed");
    }
  }

  async function handleOpportunity(participantId,opportunity){
    const context=contexts.get(participantId);
    const counterparties=[...contexts.values()]
      .filter((candidate)=>candidate.thread.threadId!==participantId)
      .map((candidate)=>candidate.thread);
    try{
      const choice=await chooseLiveSocialContribution({
        thread:context.thread,
        situation:context.situation,
        semanticStates:context.semanticStates,
        memories:context.memories,
        counterparties,
        story,
        liveEncounter,
        opportunity,
        modelAdapter,
      });
      if(stopped)return;
      if(choice.decision==="silent")return;
      contributionCount+=1;

      if(choice.decision==="act"){
        liveEncounter.pushAction({
          actorId:participantId,
          text:choice.actionText,
        });
        return;
      }

      const controller=new AbortController();
      activeControllers.set(participantId,controller);
      try{
        await streamLiveSocialSpeech({
          thread:context.thread,
          situation:context.situation,
          semanticStates:context.semanticStates,
          memories:context.memories,
          counterparties,
          story,
          liveEncounter,
          opportunity,
          modelAdapter,
          signal:controller.signal,
        });
      }finally{
        activeControllers.delete(participantId);
      }
    }catch{
      stop("cognition_error");
    }
  }

  function schedule(participantId,opportunity){
    if(stopped)return;
    if(busy.has(participantId)){
      deferred.set(participantId,opportunity);
      return;
    }
    if(opportunityAppraisals>=maxOpportunityAppraisals){
      endedBy="bounded";
      return;
    }

    opportunityAppraisals+=1;
    busy.add(participantId);
    const task=handleOpportunity(participantId,opportunity)
      .finally(()=>{
        busy.delete(participantId);
        pending.delete(task);
        const next=deferred.get(participantId)??null;
        deferred.delete(participantId);
        if(next!==null&&!stopped)schedule(participantId,next);
      });
    pending.add(task);
  }

  for(const participantId of contexts.keys()){
    subscriptions.push(liveEncounter.subscribe(participantId,(event)=>{
      recordEvent(participantId,event);
      if(bootstrapping||stopped)return;
      if(event.type==="speaking_opportunity"&&event.participantId===participantId){
        schedule(participantId,event);
      }
    }));
  }

  try{
    liveEncounter.pushSpeechDelta({
      actorId:initiatorId,
      text:request.text,
    });
    liveEncounter.endSpeech({actorId:initiatorId});

    if(typeof stance.expression==="string"&&stance.expression.trim()!==""){
      liveEncounter.pushSpeechDelta({
        actorId:counterpartyId,
        text:stance.expression,
      });
      liveEncounter.endSpeech({actorId:counterpartyId});
    }

    bootstrapping=false;
    if(typeof stance.expression==="string"&&stance.expression.trim()!==""){
      schedule(initiatorId,syntheticOpportunity({
        participantId:initiatorId,
        sourceActorId:counterpartyId,
        heardText:stance.expression,
      }));
    }else{
      schedule(counterpartyId,syntheticOpportunity({
        participantId:counterpartyId,
        sourceActorId:initiatorId,
        heardText:request.text,
      }));
    }

    while(pending.size>0){
      await Promise.race([...pending]);
    }
  }finally{
    for(const unsubscribe of subscriptions)unsubscribe();
    for(const controller of activeControllers.values())controller.abort("encounter_closed");
  }

  return Object.freeze({
    story:Object.freeze({
      storyVersion:story.storyVersion,
      beats:Object.freeze(story.beats.map((beat)=>Object.freeze(structuredClone(beat)))),
    }),
    live:Object.freeze({
      endedBy,
      opportunityAppraisals,
      contributionCount,
    }),
  });
}
