import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { admitEncounterAttention } from "./lived-encounter-attention.mjs";
import {
  assertExactKeys,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MAX_CANDIDATES=8;
const MAX_POTENTIAL_OBSERVERS=2;
const MAX_SITUATION_AGE_MS=60*60_000;

// One read of already-enacted situations. No LivedNow waking or geographic radius.
// World cognition, not a distance heuristic, determines whether the external
// event could actually be perceived from any of these independent scenes.
function currentObservers(livedNowStore,at){
  const due=Date.parse(at);
  return livedNowStore.listRecentCurrentSituations({
    at,since:new Date(due-MAX_SITUATION_AGE_MS).toISOString(),
    limit:MAX_CANDIDATES,
  }).filter((situation)=>situation.location?.kind==="place"
      && Number.isFinite(Date.parse(situation.establishedAt))
      && due-Date.parse(situation.establishedAt)>=0
      && due-Date.parse(situation.establishedAt)<=MAX_SITUATION_AGE_MS)
    .sort((a,b)=>Date.parse(b.establishedAt)-Date.parse(a.establishedAt))
    .slice(0,MAX_CANDIDATES)
    .map((situation)=>{
      const place=livedNowStore.getWorldPlace(
        situation.threadId,situation.location.placeRef,{required:false},
      );
      return Object.freeze({
        threadId:situation.threadId,
        situationId:situation.situationId,
        physicalPlaceRef:situation.location.placeRef,
        placeName:place?.displayName??null,
        activity:situation.activity??null,
        establishedAt:situation.establishedAt,
      });
    });
}

export function createWorldEnvironmentEvolution({
  experienceStore,
  livedNowStore,
  worldReader,
  semanticStateStore,
  memoryStore,
  modelAdapter,
  onExperienceQueued=null,
  now=()=>new Date().toISOString(),
  batchLimit=2,
}={}){
  for(const method of [
    "listDueEnvironmentalFollowups","nextEnvironmentalFollowupAt",
    "getEncounterStory","recordEnvironmentalFollowupDecision",
    "recordEncounterStory","completeEnvironmentalFollowup",
    "getThreadEncounterAttention","recordThreadEncounterAttention",
    "queueThreadExperienceConsolidation",
  ]){
    if(typeof experienceStore?.[method]!=="function"){
      throw new TypeError(`World environmental evolution requires ${method}()`);
    }
  }
  for(const method of ["listRecentCurrentSituations","getWorldPlace","getSituation"]){
    if(typeof livedNowStore?.[method]!=="function"){
      throw new TypeError(`World environmental evolution requires ${method}()`);
    }
  }
  if(typeof worldReader?.getThread!=="function"
    ||typeof semanticStateStore?.listCurrentState!=="function"
    ||typeof memoryStore?.listCurrentMemories!=="function"){
    throw new TypeError("World environmental evolution requires Thread perception authorities");
  }
  if(onExperienceQueued!==null&&typeof onExperienceQueued!=="function"){
    throw new TypeError("World environmental evolution onExperienceQueued must be a function or null");
  }
  if(typeof modelAdapter?.invoke!=="function")throw new TypeError("World environmental evolution requires cognition");
  if(!Number.isSafeInteger(batchLimit)||batchLimit<1||batchLimit>4){
    throw new TypeError("World environmental evolution batchLimit must be 1-4");
  }

  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=experienceStore.listDueEnvironmentalFollowups({at,limit:batchLimit});
      let failed=0;
      let noticed=0;
      const results=[];
      for(const opportunity of due){
        try{
          const source=experienceStore.getEncounterStory(opportunity.sourceEncounterRef);
          let decision=opportunity.decision;
          if(decision===null){
            const candidates=currentObservers(livedNowStore,opportunity.dueAt);
            if(candidates.length===0){
              // No one could notice it: do not even invoke World event cognition.
              decision=experienceStore.recordEnvironmentalFollowupDecision({
                sourceEncounterRef:opportunity.sourceEncounterRef,
                decision:{
                  outcome:"not_observable",occurrenceText:null,potentialObservers:[],
                },
              });
            }else{
              const sourcePlace=source.threadPresence
                .map((presence)=>livedNowStore.getWorldPlace(
                  presence.threadId,opportunity.placeRef,{required:false},
                ))
                .find((place)=>place!==null)??null;
              const input={
                placeRef:opportunity.placeRef,
                sourcePlace:sourcePlace===null?null:{
                  displayName:sourcePlace.displayName,
                  placeKind:sourcePlace.placeKind??null,
                },
                previousOccurrence:{
                  occurredAt:source.occurredAt,
                  text:source.story.beats[0].text,
                },
                considerationAt:opportunity.dueAt,
                potentialObservers:candidates,
              };
              const invocation=await modelAdapter.invoke({
                systemPrompt:`You author at most one observable continuation in Fibre's World.
First decide whether the described change could actually be noticed by any supplied Thread from its independently established physical scene at the consideration time.
Perceptibility may span arbitrary distances: a distant visible flash, weather formation, sound or other observable phenomenon can be perceptible from elsewhere. Do not impose a distance radius. Equally, do not claim people can see or hear through unsupported obstructions, from unrelated places, or because they are in the same country.
Use the exterior place/activity evidence and the prior occurrence only. You receive no private personalities, emotions, memories or goals.
Return not_observable if none of these people could plausibly perceive a continuation. Return no_change if perceptibility exists but there is no warranted meaningful new observable event. Return changed only for one natural, physically consistent objective change, naming 1-2 candidate Thread IDs who could potentially perceive that actual change. Potential perception is not automatic noticing. No change is also normal.
Do not author events to excite or engage any observer. Do not invent participants' actions. This is one bounded follow-up, not recurring simulation.`,
                input,
                responseSchema:{
                  type:"object",
                  additionalProperties:false,
                  required:["outcome","occurrenceText","potentialObserverThreadIds"],
                  properties:{
                    outcome:{type:"string",enum:["not_observable","no_change","changed"]},
                    occurrenceText:{anyOf:[{type:"string",minLength:1,maxLength:800},{type:"null"}]},
                    potentialObserverThreadIds:{
                      type:"array",items:{type:"string"},maxItems:MAX_POTENTIAL_OBSERVERS,
                    },
                  },
                },
                clientRequestId:`world-environment-followup_${sha256(canonicalJson(input))}`,
              });
              assertPlainObject("World follow-up cognition",invocation.output);
              assertExactKeys("World follow-up cognition",invocation.output,[
                "outcome","occurrenceText","potentialObserverThreadIds",
              ]);
              const output=invocation.output;
              if(!["not_observable","no_change","changed"].includes(output.outcome)
                ||!Array.isArray(output.potentialObserverThreadIds)){
                throw new TypeError("World follow-up outcome is invalid");
              }
              if(output.outcome==="changed"){
                assertNonEmpty("World follow-up change",output.occurrenceText);
                if(output.potentialObserverThreadIds.length===0){
                  throw new TypeError("World change requires a potentially perceiving Thread");
                }
              }else if(output.occurrenceText!==null
                ||output.potentialObserverThreadIds.length!==0){
                throw new TypeError("World non-event must not claim observers");
              }
              const byId=new Map(candidates.map((item)=>[item.threadId,item]));
              const selected=output.potentialObserverThreadIds.map((threadId)=>{
                const observer=byId.get(threadId);
                if(observer===undefined)throw new TypeError("World selected an ungrounded observer");
                return {threadId:observer.threadId,situationId:observer.situationId};
              });
              if(new Set(selected.map((item)=>item.threadId)).size!==selected.length){
                throw new TypeError("World selected the same observer twice");
              }
              decision=experienceStore.recordEnvironmentalFollowupDecision({
                sourceEncounterRef:opportunity.sourceEncounterRef,
                decision:{
                  outcome:output.outcome,
                  occurrenceText:output.occurrenceText,
                  potentialObservers:selected,
                },
              });
            }
          }

          let encounterId=null;
          if(decision.outcome==="changed"){
            const story={
              storyVersion:"encounter-story-v0.1",
              continuationOfEncounterRef:source.encounterId,
              beats:[{
                actorThreadId:null,kind:"occurrence",text:decision.occurrenceText,
              }],
            };
            const recorded=experienceStore.recordEncounterStory({
              occurredAt:opportunity.dueAt,
              // Perceptible physical scenes need not be co-located. Presence
              // identifies potential observers, never guaranteed attention.
              threadPresence:decision.potentialObservers,
              story,
              visualization:createEncounterVisualization({
                occurredAt:opportunity.dueAt,
                scene:`At shared World place ${opportunity.placeRef}.`,
                story,
                sourceReferences:[opportunity.placeRef,source.encounterId],
                depictedThreadRefs:[],
              }),
            },{uniquePlaceOccurrenceRef:opportunity.placeRef});
            if(recorded.story.continuationOfEncounterRef!==source.encounterId){
              throw new TypeError("World place/time already belongs to a different occurrence");
            }
            encounterId=recorded.encounterId;
            // Perceptibility is not attention. Each admitted possible observer
            // independently considers the same objective story. Complete the
            // World follow-up only once every decision is durable; retry must
            // resume partial attention without rerolling the occurrence.
            for(const presence of recorded.threadPresence){
              const situation=livedNowStore.getSituation(presence.situationId,{required:false});
              const thread=worldReader.getThread(presence.threadId,{required:false});
              if(situation?.threadId!==presence.threadId||thread===null){
                throw new TypeError("World observer lacks the admitted lived situation");
              }
              const already=experienceStore.getThreadEncounterAttention(
                presence.threadId,recorded.encounterId,
              );
              const attention=await admitEncounterAttention({
                thread,
                situation,
                encounterStory:recorded,
                semanticStates:already===null
                  ?semanticStateStore.listCurrentState(presence.threadId):[],
                memories:already===null
                  ?memoryStore.listCurrentMemories(presence.threadId,{
                    limit:6,newestFirst:true,
                  }):[],
                experienceStore,
                modelAdapter,
                onExperienceQueued,
              });
              if(attention.outcome==="noticed")noticed+=1;
            }
          }
          experienceStore.completeEnvironmentalFollowup({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            resultEncounterRef:encounterId,
            completedAt:at,
          });
          results.push(Object.freeze({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            outcome:decision.outcome,
            encounterId,
          }));
        }catch(error){
          failed+=1;
          results.push(Object.freeze({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            outcome:"failed",
            message:String(error?.message??error).slice(0,220),
          }));
        }
      }
      const nextDueAt=experienceStore.nextEnvironmentalFollowupAt();
      return Object.freeze({
        attempted:due.length,
        completed:due.length-failed,
        failed,
        noticed,
        nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
