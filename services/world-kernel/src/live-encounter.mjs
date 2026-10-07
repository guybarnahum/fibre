const DEFAULT_PAUSE_THRESHOLD_MS=650;
const WORLD_EVENT_LIMIT=12;
const SENTENCE_END=/[.!?]+(?=\s|$)/gu;

function participantId(value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError("live encounter participant id is required");
  return value.trim();
}

function finiteMilliseconds(name,value){
  if(!Number.isFinite(value)||value<0)throw new TypeError(`${name} must be a non-negative number`);
  return value;
}

function freezeEvent(sequence,event){
  return Object.freeze({sequence,...structuredClone(event)});
}

export function createLiveEncounter({
  participantIds,
  pauseThresholdMs=DEFAULT_PAUSE_THRESHOLD_MS,
}={}){
  if(!Array.isArray(participantIds)||participantIds.length<2){
    throw new TypeError("live encounter requires at least two participants");
  }
  const ids=participantIds.map(participantId);
  if(new Set(ids).size!==ids.length)throw new TypeError("live encounter participants must be unique");
  finiteMilliseconds("live encounter pauseThresholdMs",pauseThresholdMs);

  const listeners=new Map(ids.map((id)=>[id,new Set()]));
  const heard=new Map(ids.map((listenerId)=>[
    listenerId,
    new Map(ids.filter((actorId)=>actorId!==listenerId).map((actorId)=>[
      actorId,
      {speechRef:null,text:"",active:false},
    ])),
  ]));
  const speakers=new Map(ids.map((id)=>[id,{
    active:false,
    speechNumber:0,
    speechRef:null,
    text:"",
    lastPauseOffset:-1,
    ended:false,
  }]));
  const perceivedWorld=new Map(ids.map((id)=>[id,[]]));
  let sequence=0;

  function requireParticipant(value){
    const id=participantId(value);
    if(!speakers.has(id))throw new TypeError(`unknown live encounter participant ${id}`);
    return id;
  }

  function emit(participant,event){
    const frozen=freezeEvent(++sequence,event);
    for(const listener of listeners.get(participant))listener(frozen);
    return frozen;
  }

  function emitAll(event){
    const frozen=freezeEvent(++sequence,event);
    for(const id of ids){
      for(const listener of listeners.get(id))listener(frozen);
    }
    return frozen;
  }

  function start(actorId){
    const speaker=speakers.get(actorId);
    speaker.active=true;
    speaker.ended=false;
    speaker.speechNumber+=1;
    speaker.speechRef=`${actorId}:speech:${speaker.speechNumber}`;
    speaker.text="";
    speaker.lastPauseOffset=-1;
    for(const listenerId of ids){
      if(listenerId===actorId)continue;
      heard.get(listenerId).set(actorId,{
        speechRef:speaker.speechRef,
        text:"",
        active:true,
      });
    }
    emitAll({
      type:"speech_start",
      actorId,
      speechRef:speaker.speechRef,
    });
  }

  function append(actorId,text){
    const speaker=speakers.get(actorId);
    speaker.text+=text;
    for(const listenerId of ids){
      if(listenerId===actorId)continue;
      const prior=heard.get(listenerId).get(actorId);
      heard.get(listenerId).set(actorId,{
        speechRef:speaker.speechRef,
        text:prior.text+text,
        active:true,
      });
    }
    emitAll({
      type:"speech_delta",
      actorId,
      speechRef:speaker.speechRef,
      text,
    });
  }

  function opportunity(actorId,reason,extra={}){
    const speaker=speakers.get(actorId);
    for(const listenerId of ids){
      if(listenerId===actorId)continue;
      const perception=heard.get(listenerId).get(actorId);
      emit(listenerId,{
        type:"speaking_opportunity",
        participantId:listenerId,
        sourceActorId:actorId,
        speechRef:speaker.speechRef,
        reason,
        heardText:perception.text,
        ...extra,
      });
    }
  }

  return Object.freeze({
    subscribe(participant,listener){
      const id=requireParticipant(participant);
      if(typeof listener!=="function")throw new TypeError("live encounter listener must be a function");
      listeners.get(id).add(listener);
      return ()=>listeners.get(id).delete(listener);
    },

    pushSpeechDelta({actorId,text}={}){
      const actor=requireParticipant(actorId);
      if(typeof text!=="string"||text==="")throw new TypeError("speech delta text is required");
      const speaker=speakers.get(actor);
      if(!speaker.active)start(actor);

      let offset=0;
      SENTENCE_END.lastIndex=0;
      for(const match of text.matchAll(SENTENCE_END)){
        const end=match.index+match[0].length;
        const segment=text.slice(offset,end);
        if(segment!=="")append(actor,segment);
        opportunity(actor,"sentence");
        offset=end;
      }
      const tail=text.slice(offset);
      if(tail!=="")append(actor,tail);
    },

    pauseSpeech({actorId,durationMs}={}){
      const actor=requireParticipant(actorId);
      const duration=finiteMilliseconds("speech pause durationMs",durationMs);
      const speaker=speakers.get(actor);
      if(!speaker.active||duration<pauseThresholdMs)return false;
      if(speaker.lastPauseOffset===speaker.text.length)return false;
      speaker.lastPauseOffset=speaker.text.length;
      opportunity(actor,"pause",{durationMs:duration});
      return true;
    },

    endSpeech({actorId}={}){
      const actor=requireParticipant(actorId);
      const speaker=speakers.get(actor);
      if(!speaker.active)return false;
      opportunity(actor,"end",{completion:"complete"});
      speaker.active=false;
      speaker.ended=true;
      for(const listenerId of ids){
        if(listenerId===actor)continue;
        const prior=heard.get(listenerId).get(actor);
        heard.get(listenerId).set(actor,{...prior,active:false});
      }
      emitAll({
        type:"speech_end",
        actorId:actor,
        speechRef:speaker.speechRef,
        text:speaker.text,
        completion:"complete",
      });
      return true;
    },

    interruptSpeech({actorId}={}){
      const actor=requireParticipant(actorId);
      const speaker=speakers.get(actor);
      if(!speaker.active)return null;
      opportunity(actor,"end",{completion:"interrupted"});
      speaker.active=false;
      speaker.ended=true;
      for(const listenerId of ids){
        if(listenerId===actor)continue;
        const prior=heard.get(listenerId).get(actor);
        heard.get(listenerId).set(actor,{...prior,active:false});
      }
      const result=Object.freeze({
        speechRef:speaker.speechRef,
        text:speaker.text,
        completion:"interrupted",
      });
      emitAll({
        type:"speech_end",
        actorId:actor,
        ...result,
      });
      return result;
    },

    pushAction({actorId,text}={}){
      const actor=requireParticipant(actorId);
      if(typeof text!=="string"||text.trim()==="")throw new TypeError("live action text is required");
      const action=emitAll({
        type:"participant_action",
        actorId:actor,
        text:text.trim(),
      });
      for(const listenerId of ids){
        if(listenerId===actor)continue;
        emit(listenerId,{
          type:"speaking_opportunity",
          participantId:listenerId,
          sourceActorId:actor,
          speechRef:null,
          reason:"action",
          heardText:null,
          actionText:text.trim(),
        });
      }
      return action;
    },

    pushWorldEvent({
      eventRef,
      occurredAt,
      beats,
      perceivedBy=[],
    }={}){
      if(typeof eventRef!=="string"||eventRef.trim()==="")throw new TypeError("live World eventRef is required");
      if(typeof occurredAt!=="string"||Number.isNaN(Date.parse(occurredAt))){
        throw new TypeError("live World occurredAt must be an ISO timestamp");
      }
      if(!Array.isArray(beats)||beats.length<1)throw new TypeError("live World event requires beats");
      if(!Array.isArray(perceivedBy))throw new TypeError("live World perceivedBy must be an array");
      const perceivers=perceivedBy.map(requireParticipant);
      const worldEvent=Object.freeze({
        eventRef:eventRef.trim(),
        occurredAt,
        beats:Object.freeze(beats.map((beat)=>{
          if(!beat||typeof beat!=="object"||Array.isArray(beat))throw new TypeError("live World beat must be an object");
          if(!["utterance","action","occurrence"].includes(beat.kind))throw new TypeError("live World beat kind is invalid");
          if(typeof beat.text!=="string"||beat.text.trim()==="")throw new TypeError("live World beat text is required");
          return Object.freeze({
            actorThreadId:beat.actorThreadId??null,
            kind:beat.kind,
            text:beat.text,
            ...(beat.completion==="interrupted"?{completion:"interrupted"}:{}),
          });
        })),
      });
      emitAll({type:"world_event",...worldEvent});
      for(const participant of perceivers){
        const recent=perceivedWorld.get(participant);
        recent.push(worldEvent);
        if(recent.length>WORLD_EVENT_LIMIT)recent.splice(0,recent.length-WORLD_EVENT_LIMIT);
        emit(participant,{
          type:"speaking_opportunity",
          participantId:participant,
          sourceActorId:null,
          speechRef:null,
          reason:"world_event",
          heardText:null,
          worldEventRef:worldEvent.eventRef,
        });
      }
      return worldEvent;
    },

    pushSceneChange({
      participantId,
      previousSituationId,
      currentSituation,
    }={}){
      const participant=requireParticipant(participantId);
      if(typeof previousSituationId!=="string"||previousSituationId.trim()===""){
        throw new TypeError("previous live situation id is required");
      }
      if(!currentSituation||typeof currentSituation!=="object"||Array.isArray(currentSituation)){
        throw new TypeError("current live situation is required");
      }
      if(typeof currentSituation.situationId!=="string"||currentSituation.situationId.trim()===""){
        throw new TypeError("current live situation id is required");
      }
      const event=emitAll({
        type:"scene_changed",
        participantId:participant,
        previousSituationId:previousSituationId.trim(),
        currentSituation:structuredClone(currentSituation),
      });
      emit(participant,{
        type:"speaking_opportunity",
        participantId:participant,
        sourceActorId:null,
        speechRef:null,
        reason:"scene_changed",
        heardText:null,
        currentSituationId:currentSituation.situationId,
      });
      return event;
    },

    perceivedWorldEvents(participant){
      const id=requireParticipant(participant);
      return Object.freeze(perceivedWorld.get(id).map((event)=>structuredClone(event)));
    },

    heardSoFar(participant){
      const id=requireParticipant(participant);
      return Object.freeze(Object.fromEntries(
        [...heard.get(id).entries()].map(([actorId,state])=>[
          actorId,
          Object.freeze(structuredClone(state)),
        ]),
      ));
    },

    snapshot(){
      return Object.freeze({
        participantIds:Object.freeze([...ids]),
        pauseThresholdMs,
        activeSpeakers:Object.freeze(
          ids.filter((id)=>speakers.get(id).active),
        ),
      });
    },
  });
}
