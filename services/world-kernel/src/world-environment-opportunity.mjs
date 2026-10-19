import { admitEncounterAttention } from "./lived-encounter-attention.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import {
  assertExactKeys,assertNonEmpty,assertPlainObject,canonicalJson,sha256,
} from "./persistence-common.mjs";

const FRESH_MS=60*60_000;
const AMBIENT_MINUTE_MS=60_000;
const FOLLOWUP_MS=30*60_000;

// Only the initiating Thread's private scene is available to this World
// consideration. A private place never implies a shared venue or bystander.
function observedPlace(livedNowStore,threadId,placeRef,initiatorThreadId){
  if(placeRef.startsWith("per:")){
    return threadId===initiatorThreadId
      ?livedNowStore.getPrivatePlace?.(threadId,placeRef)??null:null;
  }
  return livedNowStore.getWorldPlace(threadId,placeRef,{required:false});
}

// An occupied, waking scene may earn one *ambient consideration* at the
// next civil minute. The minute is only a scheduling/coalescing granularity:
// no event is required, and there is no repeating minute tick. Arrivals are
// already enacted World facts and do not wait for this opportunity.
export function worldStayOpportunityDueAt(situation,nextBoundaryAt){
  if(situation?.location?.kind!=="place"||situation.wakefulness==="asleep"
    ||nextBoundaryAt===null)return null;
  const start=Date.parse(situation.establishedAt);
  const boundary=Date.parse(nextBoundaryAt);
  if(!Number.isFinite(start)||!Number.isFinite(boundary))return null;
  const due=Math.floor(start/AMBIENT_MINUTE_MS+1)*AMBIENT_MINUTE_MS;
  return boundary>due?new Date(due).toISOString():null;
}

// Ambient opportunities are keyed to an attested shared physical venue, or to
// an individual's own scoped place. Similar descriptions cannot make co-presence.
export function worldAmbientScene({situation,place,nextBoundaryAt}){
  const dueAt=worldStayOpportunityDueAt(situation,nextBoundaryAt);
  if(dueAt===null)return null;
  const venue=place?.physicalVenue?.ref??null;
  return Object.freeze({
    sceneRef:venue===null
      ?`personal:${situation.threadId}:${situation.location.placeRef}`
      :`venue:${venue}`,
    dueAt,
  });
}

// One bounded earned opportunity, never a standing weather loop. A distant
// observer is eligible for consideration: physics/scene evidence, not a radius,
// determines whether the particular occurrence can reach them.
export function createWorldEnvironmentOpportunity({
  experienceStore,livedNowStore,worldReader,semanticStateStore,memoryStore,
  modelAdapter,onExperienceQueued=null,now=()=>new Date().toISOString(),
}={}){
  for(const method of [
    "listDueEnvironmentalOpportunities","nextEnvironmentalOpportunityAt",
    "recordEnvironmentalOpportunityDecision","completeEnvironmentalOpportunity",
    "recordEncounterStory","getThreadEncounterAttention",
  ]){
    if(typeof experienceStore?.[method]!=="function"){
      throw new TypeError(`World initial opportunity requires ${method}()`);
    }
  }
  if(typeof livedNowStore?.getSituation!=="function"
    ||typeof livedNowStore?.getCurrentSituation!=="function"
    ||typeof livedNowStore?.getWorldPlace!=="function"
    ||typeof livedNowStore?.listRecentCurrentSituations!=="function"
    ||typeof worldReader?.getThread!=="function"
    ||typeof modelAdapter?.invoke!=="function"){
    throw new TypeError("World initial opportunity lacks lived/exterior authority");
  }

  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=experienceStore.listDueEnvironmentalOpportunities({at,limit:1});
      let noticed=0;
      let failed=0;
      const results=[];
      for(const opportunity of due){
        try{
          const situation=livedNowStore.getSituation(opportunity.situationId,{
            required:false,
          });
          let decision=opportunity.decision;
          if(decision===null){
            const current=livedNowStore.getCurrentSituation(opportunity.threadId);
            const age=Date.parse(at)-Date.parse(situation?.establishedAt??"");
            const overdue=Date.parse(at)-Date.parse(opportunity.dueAt);
            const timed=situation!==null
              &&situation.location?.kind==="place"
              &&overdue>=0&&overdue<=FRESH_MS&&age>=0;
            const origin=timed
              ?observedPlace(livedNowStore,opportunity.threadId,
                situation.location.placeRef,opportunity.threadId):null;
            const physicalVenue=origin?.physicalVenue??null;
            const venueCandidates=timed&&physicalVenue!==null
              &&typeof livedNowStore.listCurrentVenueSituations==="function"
              ?livedNowStore.listCurrentVenueSituations({
                venueRef:physicalVenue.ref,at:opportunity.dueAt,limit:8,
              }):[];
            const anchorPresent=current?.situationId===situation?.situationId
              &&current?.wakefulness!=="asleep";
            const eligible=timed
              &&(opportunity.kind==="scene"
                ?(physicalVenue===null?anchorPresent
                  :venueCandidates.some((item)=>item.wakefulness!=="asleep"))
                :anchorPresent
                  &&(opportunity.kind==="stay"
                    ?Date.parse(opportunity.dueAt)>Date.parse(situation.establishedAt)
                    :age<=FRESH_MS));
            // A private scene can only expose its owner. A verified shared
            // venue uses the presence index, including long-stayers; recent
            // exterior situations may additionally witness a distant event
            // when the World author finds actual perceptibility.
            const recentCandidates=eligible&&physicalVenue!==null
              ?livedNowStore.listRecentCurrentSituations({
                at:opportunity.dueAt,
                since:new Date(Date.parse(opportunity.dueAt)-FRESH_MS).toISOString(),
                limit:8,
              }):[];
            const byThread=new Map();
            for(const candidate of [current,...venueCandidates,...recentCandidates]){
              if(candidate?.location?.kind!=="place"
                ||candidate.wakefulness==="asleep"
                ||Date.parse(candidate.establishedAt)>Date.parse(opportunity.dueAt))continue;
              if(physicalVenue===null&&candidate.threadId!==opportunity.threadId)continue;
              if(!byThread.has(candidate.threadId))byThread.set(candidate.threadId,candidate);
              if(byThread.size===8)break;
            }
            const observableCandidates=eligible?[...byThread.values()]:[];
            const candidateScenes=observableCandidates.map((item)=>{
              const place=item.threadId===opportunity.threadId
                ?origin:observedPlace(livedNowStore,item.threadId,
                  item.location.placeRef,opportunity.threadId);
              return {
                threadId:item.threadId,situationId:item.situationId,
                physicalVenueRef:place?.physicalVenue?.ref??null,
                placeName:(place?.physicalVenue?.displayName??place?.displayName
                  ??place?.specificPlace??"").slice(0,300),
                activity:(item.activity??"").slice(0,220),
              };
            });
            const existing=physicalVenue===null?null
              :experienceStore.getSharedEnvironmentalStory?.({
                occurredAt:opportunity.dueAt,placeRef:physicalVenue.ref,
              })??null;
            if(!eligible||existing!==null
              ||!candidateScenes.some((item)=>item.threadId===opportunity.threadId)){
              decision={
                outcome:"not_observable",occurrenceText:null,presence:[],
                occurredAt:opportunity.dueAt,
              };
            }else{
              const input={
                occurrenceAt:opportunity.dueAt,
                initiatingSituation:{
                  situationId:situation.situationId,
                  activity:situation.activity??null,
                  physicalVenue:physicalVenue===null?null:{
                    ref:physicalVenue.ref,name:physicalVenue.displayName,
                    locality:physicalVenue.locality,country:physicalVenue.country,
                  },
                  sceneDescription:(origin?.displayName??origin?.specificPlace
                    ??"Ordinary lived setting").slice(0,320),
                },
                potentialObservers:candidateScenes,
              };
              const result=await modelAdapter.invoke({
                systemPrompt:`You author at most one ordinary new exterior happening in Fibre's World during an admitted lived place occasion.
First assess whether any supplied physically situated Thread could plausibly perceive a specific event at this time. Choose no_change freely and normally: Fibre does not need an interesting event every time a person moves.
There is no geographic distance cutoff. For distant observers require a phenomenon with supported long-range observability; scene labels alone do not establish shared physical co-presence.
A Genesis historical study context is not a public venue. Only physicalVenue is independently identified as a shared venue. If it is null, do not imply the initiating Thread is in a library or public meeting place.
Do not invent Thread actions, inner life, conversation, emotions, or another person's presence. Write only one concise objective external event, and select at most two candidate Thread IDs who could actually perceive it. Potentially perceiving never implies noticing.`,
                input,
                responseSchema:{
                  type:"object",additionalProperties:false,
                  required:["outcome","occurrenceText","potentialObserverThreadIds"],
                  properties:{
                    outcome:{type:"string",enum:["no_change","changed"]},
                    occurrenceText:{anyOf:[
                      {type:"string",minLength:1,maxLength:800},{type:"null"},
                    ]},
                    potentialObserverThreadIds:{
                      type:"array",maxItems:2,items:{type:"string"},
                    },
                  },
                },
                clientRequestId:`world-initial-opportunity_${sha256(canonicalJson(input))}`,
              });
              assertPlainObject("World initial opportunity output",result.output);
              assertExactKeys("World initial opportunity output",result.output,[
                "outcome","occurrenceText","potentialObserverThreadIds",
              ]);
              const output=result.output;
              if(!["changed","no_change"].includes(output.outcome)
                ||!Array.isArray(output.potentialObserverThreadIds)){
                throw new TypeError("World initial outcome is invalid");
              }
              if(output.outcome==="changed"){
                assertNonEmpty("World initial occurrence",output.occurrenceText);
                if(output.potentialObserverThreadIds.length===0)throw new TypeError(
                  "World initial event has no potentially perceiving observer",
                );
              }else if(output.occurrenceText!==null
                ||output.potentialObserverThreadIds.length!==0){
                throw new TypeError("World no-change may not claim observers");
              }
              const byId=new Map(candidateScenes.map((scene)=>[scene.threadId,scene]));
              const selected=output.potentialObserverThreadIds.map((id)=>{
                const scene=byId.get(id);
                if(scene===undefined)throw new TypeError("World selected an unknown observer");
                return {threadId:id,situationId:scene.situationId};
              });
              if(new Set(selected.map((x)=>x.threadId)).size!==selected.length){
                throw new TypeError("World repeated an initial event observer");
              }
              decision={
                outcome:output.outcome,
                occurrenceText:output.outcome==="changed"?output.occurrenceText.trim():null,
                presence:selected,occurredAt:opportunity.dueAt,
              };
            }
            decision=experienceStore.recordEnvironmentalOpportunityDecision({
              situationId:opportunity.situationId,sceneRef:opportunity.sceneRef,
              decision,kind:opportunity.kind,
            });
          }

          let encounterId=null;
          if(decision.outcome==="changed"){
            const origin=livedNowStore.getWorldPlace(
              opportunity.threadId,situation.location.placeRef,{required:false},
            );
            const venue=origin?.physicalVenue??null;
            const story={
              storyVersion:"encounter-story-v0.1",
              beats:[{actorThreadId:null,kind:"occurrence",text:decision.occurrenceText}],
            };
            const encounter=experienceStore.recordEncounterStory({
              occurredAt:decision.occurredAt,
              threadPresence:decision.presence,
              story,
              visualization:createEncounterVisualization({
                occurredAt:decision.occurredAt,
                scene:venue===null
                  ?"In an ordinary personally situated place."
                  :`At ${venue.displayName}, ${venue.locality}.`,
                story,
                sourceReferences:[venue?.ref??opportunity.situationId],
                depictedThreadRefs:[],
              }),
            },{
              uniquePlaceOccurrenceRef:venue?.ref??null,
              followupAfterMs:venue===null?null:FOLLOWUP_MS,
            });
            encounterId=encounter.encounterId;
            for(const presence of encounter.threadPresence){
              const observerSituation=livedNowStore.getSituation(presence.situationId,{
                required:false,
              });
              const thread=worldReader.getThread(presence.threadId,{required:false});
              if(observerSituation?.threadId!==presence.threadId||thread===null){
                throw new TypeError("World initial observer lost situated authority");
              }
              const already=experienceStore.getThreadEncounterAttention(
                presence.threadId,encounterId,
              );
              const attention=await admitEncounterAttention({
                thread,situation:observerSituation,
                encounterStory:encounter,
                semanticStates:already===null
                  ?semanticStateStore.listCurrentState(presence.threadId):[],
                memories:already===null
                  ?memoryStore.listCurrentMemories(presence.threadId,{
                    limit:6,newestFirst:true,
                  }):[],
                experienceStore,modelAdapter,onExperienceQueued,
              });
              if(attention.outcome==="noticed")noticed+=1;
            }
          }
          experienceStore.completeEnvironmentalOpportunity({
            situationId:opportunity.situationId,sceneRef:opportunity.sceneRef,
            kind:opportunity.kind,resultEncounterRef:encounterId,completedAt:at,
          });
          results.push({situationId:opportunity.situationId,
            outcome:decision.outcome,encounterId});
        }catch(error){
          failed+=1;
          results.push({
            situationId:opportunity.situationId,
            outcome:"failed",
            message:String(error?.message??error).slice(0,180),
          });
        }
      }
      const nextDueAt=experienceStore.nextEnvironmentalOpportunityAt();
      return Object.freeze({
        attempted:due.length,failed,noticed,nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}

/** Reuse the existing World reconciliation alarm for both earned event kinds. */
export function combineWorldEnvironmentProcesses(initial,evolution){
  if(typeof initial?.runOnce!=="function"||typeof evolution?.runOnce!=="function"){
    throw new TypeError("World environment phases must expose runOnce()");
  }
  return Object.freeze({
    async runOnce(){
      const first=await initial.runOnce();
      const later=await evolution.runOnce();
      const due=[first.nextDueAt,later.nextDueAt].filter(Boolean).sort()[0]??null;
      return Object.freeze({
        attempted:first.attempted+later.attempted,
        failed:first.failed+later.failed,
        noticed:first.noticed+later.noticed,
        hasDue:first.hasDue||later.hasDue,
        nextDueAt:due,
        results:Object.freeze([...first.results,...later.results]),
      });
    },
  });
}
