import { createLiveEncounter } from "./live-encounter.mjs";
import { spokenWords } from "./live-encounter-expression.mjs";
import { takeLiveSocialTurn } from "./lived-social-encounter-cognition.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

// A compute guard, not an ending: conversations end by the participants'
// own choices (closing, a lull, a changed scene). Reaching it is recorded.
const DEFAULT_OPPORTUNITY_BUDGET=24;

function contextMap(initiator,counterparty){
  const values=[initiator,counterparty];
  const map=new Map();
  for(const context of values){
    assertPlainObject("live social context",context);
    assertPlainObject("live social context.thread",context.thread);
    assertId("live social context.thread.threadId",context.thread.threadId);
    assertPlainObject("live social context.situation",context.situation);
    assertPlainObject("live social context.perspective",context.perspective);
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
  liveEncounterRegistry=null,
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
  if(typeof modelAdapter?.streamExpression!=="function"){
    throw new TypeError("live social encounter requires streaming model cognition");
  }
  if(liveEncounterRegistry!==null&&(
    typeof liveEncounterRegistry.register!=="function"
    ||typeof liveEncounterRegistry.publishAfterthoughts!=="function"
  )){
    throw new TypeError("live social encounter registry must be null or expose register() and publishAfterthoughts()");
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
  const speaking=new Set();
  const pending=new Set();
  const subscriptions=[];
  const registryUnsubscribes=[];
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

  // Starting to speak interrupts whoever is mid-utterance. A turn still forming
  // is not interrupted: if it opens as speech, that speech cuts in, as a person
  // who has decided to speak would.
  function recordEvent(listenerId,event){
    if(event.type==="speech_start"&&event.actorId===listenerId){
      speaking.add(listenerId);
      for(const [actorId,controller] of activeControllers.entries()){
        if(actorId!==listenerId&&speaking.has(actorId))controller.abort("interrupted_by_speech");
      }
      return;
    }
    if(event.type==="speech_end"&&event.actorId===listenerId){
      speaking.delete(listenerId);
      if(typeof event.text==="string"&&event.text.trim()!==""){
        story.beats.push({
          actorThreadId:event.actorId,
          kind:"utterance",
          text:spokenWords(event.text),
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
    const controller=new AbortController();
    activeControllers.set(participantId,controller);
    try{
      const turn=await takeLiveSocialTurn({
        thread:context.thread,
        situation:context.situation,
        perspective:context.perspective,
        story,
        liveEncounter,
        opportunity,
        modelAdapter,
        feltBody:context.feltBody??null,
        signal:controller.signal,
      });
      if(turn.decision==="silent")return;
      // The beat for this speech was recorded when it ended; a chosen
      // introduction marks it so World can admit the name actually spoken.
      if(turn.introducesSelf||turn.proposesMeeting||turn.agreesToMeet){
        const spoken=story.beats.findLast(beat=>
          beat.actorThreadId===participantId&&beat.kind==="utterance");
        if(spoken&&turn.introducesSelf)spoken.disclosesSpeakerName=true;
        if(spoken&&turn.proposesMeeting)spoken.proposesMeeting=true;
        if(spoken&&turn.agreesToMeet)spoken.agreesToMeet=true;
      }
      if(turn.decision==="act"||turn.decision==="pause"){
        if(stopped)return;
        liveEncounter.pushAction({
          actorId:participantId,
          text:turn.actionText,
        });
      }
      if(turn.decision==="pause"){
        const moment=story.beats.findLast(beat=>
          beat.actorThreadId===participantId&&beat.kind==="action");
        if(moment)moment.pause=true;
        // Each has let a pause stand without speaking into it: a lull.
        const [before,last]=story.beats.slice(-2);
        if(before?.pause&&last?.pause&&before.actorThreadId!==last.actorThreadId){
          contributionCount+=1;
          stop("lull");
          return true;
        }
      }
      contributionCount+=1;
      return true;
    }catch(error){
      // Never end a conversation silently: report the failure without any
      // private or spoken content, then stop as before.
      console.warn(JSON.stringify({
        event:"live-social-encounter-stopped",reason:"cognition_error",
        errorName:error?.name??null,errorCode:error?.code??null,
        message:String(error?.message??error).slice(0,160),
      }));
      stop("cognition_error");
    }finally{
      activeControllers.delete(participantId);
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
    let contributed=false;
    const task=handleOpportunity(participantId,opportunity)
      .then(result=>{contributed=result===true;})
      .finally(()=>{
        busy.delete(participantId);
        pending.delete(task);
        const next=deferred.get(participantId)??null;
        deferred.delete(participantId);
        // A sentence-level chance may start a reply before the speaker ends;
        // the same utterance's later "end" chance is already answered.
        const answered=contributed&&next?.speechRef!=null
          &&next.speechRef===opportunity.speechRef;
        if(next!==null&&!stopped&&!answered)schedule(participantId,next);
      });
    pending.add(task);
  }

  if(liveEncounterRegistry!==null){
    for(const participantId of contexts.keys()){
      registryUnsubscribes.push(liveEncounterRegistry.register(participantId,(residue)=>{
        if(stopped)return;
        liveEncounter.pushPrivateOpportunity({
          participantId,
          reason:"afterthought",
          sourceRef:residue.consolidationId,
          privateContext:{
            afterthoughts:residue.afterthoughts,
          },
        });
      }));
    }
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
    for(const unregister of registryUnsubscribes)unregister();
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
