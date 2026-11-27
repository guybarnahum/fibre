import { localMoment } from "./appointments.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
import { genesisPlaceLabel } from "./genesis-place-presentation.mjs";
import { admitEncounterAttention } from "./lived-encounter-attention.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { placeForSituation } from "./lived-environmental-encounter.mjs";
import {
  assertExactKeys,assertNonEmpty,assertPlainObject,canonicalJson,sha256,
} from "./persistence-common.mjs";

const FRESH_MS=60*60_000;
const AMBIENT_MINUTE_MS=60_000;
const FOLLOWUP_MS=30*60_000;
const LATELY_MS=24*60*60_000;

// The ambience of a place now (Guy, November 26: "how ambience affects the
// body"): World fact authored with each occasion, never a feeling. Kept with
// the occasion's decision for its Body to feel through the inherited urges
// that answer it (sensory_load, thermal_comfort, ambient company), once that
// wiring is dry-run; until then it is recorded and shown, not felt.
export const AMBIENCE=Object.freeze({
  sound:Object.freeze(["silent","quiet","murmur","lively","loud"]),
  crowding:Object.freeze(["alone","few","some","busy","crowded"]),
  light:Object.freeze(["dark","dim","soft","bright","glaring"]),
  warmth:Object.freeze(["cold","cool","mild","warm","hot"]),
});
const AMBIENCE_SCHEMA=Object.freeze({type:"object",additionalProperties:false,
  required:["texture","sound","crowding","light","warmth"],
  properties:{texture:{type:"string",minLength:1,maxLength:240},
    ...Object.fromEntries(Object.entries(AMBIENCE).map(([key,values])=>[key,{type:"string",enum:[...values]}]))}});
// What the World answers for one occasion (world.happening): how likely a
// happening is here now, the one that would come, who could perceive it, and
// the place's ambience.
export const HAPPENING_SCHEMA=Object.freeze({type:"object",additionalProperties:false,
  required:["likelihood","occurrenceText","potentialObserverThreadIds","ambience"],
  properties:{
    likelihood:{type:"number",minimum:0,maximum:1},
    occurrenceText:{type:"string",minLength:1,maxLength:800},
    potentialObserverThreadIds:{type:"array",maxItems:2,items:{type:"string"}},
    ambience:AMBIENCE_SCHEMA,
  }});

// Whether the happening comes is chance (World events v4, Nov 27). Asked once
// per occasion whether something happens "now and then", a model answers
// always or never (v3 replay: 0 of 39 at home, 15 of 16 in public), so it says
// how likely a happening is and the World draws. The draw is fixed by the
// occasion, so the same occasion always comes out the same way.
export function happeningChance(input){
  return Number.parseInt(sha256(`${input?.initiatingSituation?.situationId}|${input?.occurrenceAt}`).slice(0,13),16)/2**52;
}
// What came of an occasion; answers under an earlier prompt chose it
// themselves. A happening nobody present could perceive does not come.
export function happeningOutcome(input,output){
  if(output?.outcome!==undefined)return output.outcome;
  return Number.isFinite(output?.likelihood)&&(output.potentialObserverThreadIds?.length??0)>0
    &&happeningChance(input)<output.likelihood?"changed":"no_change";
}
function ambienceOf(value){
  assertPlainObject("World ambience",value);
  assertExactKeys("World ambience",value,["texture","sound","crowding","light","warmth"]);
  assertNonEmpty("World ambience texture",value.texture);
  for(const [key,values] of Object.entries(AMBIENCE))
    if(!values.includes(value[key]))throw new TypeError(`World ambience ${key} is invalid`);
  return {texture:value.texture.trim().slice(0,240),sound:value.sound,crowding:value.crowding,
    light:value.light,warmth:value.warmth};
}

// Only the initiating Thread's private scene is available to this World
// consideration. A private place never implies a shared venue or bystander.
// What the World knows of a place, as an ordinary happening's ingredients
// (Nov 25): its name, its kind, what people do there, its town and its civil
// time. Only the World's own place records speak; a setting the World has no
// record of is named as such, never guessed.
const PLACE_KINDS=Object.freeze({
  public_venue:"public venue",library_or_learning:"library or place of learning",
  school:"school",market_or_commerce:"market or shops",
  residence:"home",study:"place of study",work:"workplace",
});

function worldPlaceFacts({livedNowStore,situatedLifeStore,threadId,situation,origin}){
  const lived=origin===null&&situatedLifeStore
    ?placeForSituation(threadId,situation,situatedLifeStore,livedNowStore):null;
  const named=origin?.displayName??origin?.specificPlace??lived?.displayName??null;
  const label=genesisPlaceLabel(named);
  const kind=PLACE_KINDS[origin?.placeKind??lived?.placeKind]
    ??(label===null?null:label.toLowerCase());
  return {
    name:(label??named??"a setting the World has no record of").slice(0,320),
    kind:kind??null,
    shared:origin?.physicalVenue!=null,
    affordances:[...(origin?.affordances??[])],
    locality:origin?.locality??origin?.physicalVenue?.locality??lived?.location?.locality??null,
    country:origin?.country??origin?.physicalVenue?.country??null,
    timeZone:origin?.timeZone
      ??livedNowStore.getWorldContext?.(threadId,{required:false})?.timeZone??null,
  };
}

// The World's own happenings this person was present for in the past day,
// newest first, at most five.
export function latelyShown({experienceStore,threadId,at}){
  return (experienceStore.listEncounterStories?.(threadId,{limit:12})??[])
    .filter(story=>story!==null&&Date.parse(story.occurredAt)<=Date.parse(at)
      &&Date.parse(at)-Date.parse(story.occurredAt)<=LATELY_MS)
    .flatMap(story=>(story.story?.beats??[]).filter(beat=>beat.kind==="occurrence"&&beat.actorThreadId===null)
      .map(beat=>String(beat.text).slice(0,200))).slice(0,5);
}

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
  modelAdapter,situatedLifeStore=null,onExperienceQueued=null,now=()=>new Date().toISOString(),
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
            const venueObservers=venueCandidates.filter((item)=>
              item.location?.kind==="place"
              &&item.wakefulness!=="asleep"
              &&Date.parse(item.establishedAt)<=Date.parse(opportunity.dueAt));
            const anchorPresent=current?.situationId===situation?.situationId
              &&current?.wakefulness!=="asleep";
            const eligible=timed
              &&(opportunity.kind==="scene"
                ?(physicalVenue===null?anchorPresent
                  :venueObservers.length>0)
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
              // A moved former scene anchor must resolve its *current*
              // place, never inherit the venue it left.
              const place=item.situationId===opportunity.situationId
                ?origin:observedPlace(livedNowStore,item.threadId,
                  item.location.placeRef,opportunity.threadId);
              return {
                threadId:item.threadId,situationId:item.situationId,
                physicalVenueRef:place?.physicalVenue?.ref??null,
                placeName:(place?.physicalVenue?.displayName??place?.displayName
                  ??place?.specificPlace??"").slice(0,300),
                activity:item.outwardActivity?.slice(0,220)??null,
              };
            });
            const existing=physicalVenue===null?null
              :experienceStore.getSharedEnvironmentalStory?.({
                occurredAt:opportunity.dueAt,placeRef:physicalVenue.ref,
              })??null;
            const hasGroundedObserver=opportunity.kind==="scene"
              &&physicalVenue!==null
              ?candidateScenes.some((item)=>item.physicalVenueRef===physicalVenue.ref)
              :candidateScenes.some((item)=>item.threadId===opportunity.threadId);
            if(!eligible||existing!==null||!hasGroundedObserver){
              decision={
                outcome:"not_observable",occurrenceText:null,presence:[],
                occurredAt:opportunity.dueAt,
              };
            }else{
              // The original scene witness may have departed. Another
              // independently present visitor can still observe this scene.
              const sceneWitness=opportunity.kind==="scene"&&physicalVenue!==null
                ?venueObservers[0]:null;
              const place=worldPlaceFacts({livedNowStore,situatedLifeStore,
                threadId:opportunity.threadId,situation,origin});
              // What the World has already shown this person in the past day,
              // so the same rooster is not news twice (World events v3, Nov 26).
              const lately=latelyShown({experienceStore,threadId:opportunity.threadId,at:opportunity.dueAt});
              const input={
                place,
                occurrenceAt:opportunity.dueAt,
                localTime:place.timeZone===null?null
                  :localMoment(opportunity.dueAt,place.timeZone),
                initiatingSituation:{
                  situationId:sceneWitness?.situationId??situation.situationId,
                  activity:(sceneWitness?.outwardActivity??situation.outwardActivity)?.slice(0,220)??null,
                  physicalVenue:physicalVenue===null?null:{
                    ref:physicalVenue.ref,name:physicalVenue.displayName,
                    locality:physicalVenue.locality??null,country:physicalVenue.country??null,
                  },
                },
                potentialObservers:candidateScenes,
                lately,
              };
              const result=await modelAdapter.invoke({
                ...promptRequest("world.happening"),
                input,
                responseSchema:HAPPENING_SCHEMA,
                clientRequestId:`world-initial-opportunity_${sha256(canonicalJson(input))}`,
              });
              assertPlainObject("World initial opportunity output",result.output);
              assertExactKeys("World initial opportunity output",result.output,[
                "likelihood","occurrenceText","potentialObserverThreadIds","ambience",
              ]);
              const output=result.output;
              if(typeof output.likelihood!=="number"||!(output.likelihood>=0&&output.likelihood<=1)
                ||!Array.isArray(output.potentialObserverThreadIds)){
                throw new TypeError("World initial outcome is invalid");
              }
              assertNonEmpty("World initial occurrence",output.occurrenceText);
              const outcome=happeningOutcome(input,output);
              const byId=new Map(candidateScenes.map((scene)=>[scene.threadId,scene]));
              const selected=(outcome==="changed"?output.potentialObserverThreadIds:[]).map((id)=>{
                const scene=byId.get(id);
                if(scene===undefined)throw new TypeError("World selected an unknown observer");
                return {threadId:id,situationId:scene.situationId};
              });
              if(new Set(selected.map((x)=>x.threadId)).size!==selected.length){
                throw new TypeError("World repeated an initial event observer");
              }
              decision={
                outcome,
                occurrenceText:outcome==="changed"?output.occurrenceText.trim():null,
                presence:selected,occurredAt:opportunity.dueAt,
                ambience:ambienceOf(output.ambience),likelihood:output.likelihood,
              };
              // Everyone present at the place shares its ambience: at a shared
              // venue each visitor there now, elsewhere the person alone; one
              // row each, never overwritten (review, Nov 26).
              const venueRef=physicalVenue?.ref??null;
              const present=venueRef===null
                ?[{threadId:opportunity.threadId,situationId:situation.situationId}]
                :candidateScenes.filter(item=>item.physicalVenueRef===venueRef)
                  .map(item=>({threadId:item.threadId,situationId:item.situationId}));
              experienceStore.recordAmbience?.({at:opportunity.dueAt,
                placeRef:venueRef??situation.location.placeRef,ambience:decision.ambience,present});
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
                  ?memoryStore.listCurrentMemories(presence.threadId,{inMind:"background",
                    limit:6,newestFirst:true,
                  }):[],
                experienceStore,modelAdapter,onExperienceQueued,worldReader,
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
export function combineWorldEnvironmentProcesses(initial,evolution,actorPerception){
  for(const process of [initial,evolution,actorPerception]){
    if(typeof process?.runOnce!=="function"){
      throw new TypeError("World occurrence processes must expose runOnce()");
    }
  }
  return Object.freeze({
    async runOnce(){
      const first=await initial.runOnce();
      const later=await evolution.runOnce();
      const actor=await actorPerception.runOnce();
      const due=[first.nextDueAt,later.nextDueAt,actor.nextDueAt]
        .filter(Boolean).sort()[0]??null;
      return Object.freeze({
        attempted:first.attempted+later.attempted+actor.attempted,
        failed:first.failed+later.failed+actor.failed,
        noticed:first.noticed+later.noticed+actor.noticed,
        hasDue:first.hasDue||later.hasDue||actor.hasDue,
        nextDueAt:due,
        results:Object.freeze([...first.results,...later.results,...actor.results]),
      });
    },
  });
}
