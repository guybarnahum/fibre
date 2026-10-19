import {admitEncounterAttention} from "./lived-encounter-attention.mjs";
import {createEncounterVisualization} from "./lived-encounter-visualization.mjs";
import {assertIsoTimestamp} from "./persistence-common.mjs";

const FRESH_ATTENTION_MS=60*60_000;

// World-enacted arrival is objective history. This bounded work only joins
// historical co-presence to that action, then permits personal attention.
// The witness set was captured from the venue index at the enacted moment;
// delayed reconciliation never chooses people from a later scene.
export function createWorldArrivalPerception({
  experienceStore,livedNowStore,worldReader,semanticStateStore,memoryStore,
  modelAdapter,onExperienceQueued=null,now=()=>new Date().toISOString(),
}={}){
  return Object.freeze({
    async runOnce(){
      const at=now();
      assertIsoTimestamp("arrival perception time",at);
      const due=experienceStore.listDueArrivalPerceptions({at});
      let failed=0,noticed=0;
      const results=[];
      for(const obligation of due){
        try{
          const arrival=livedNowStore.getSituation(obligation.situationId,{required:false});
          const place=arrival?.location?.kind==="place"
            ?livedNowStore.getWorldPlace(
              arrival.threadId,arrival.location.placeRef,{required:false},
            ):null;
          const eligible=arrival?.provenance==="world_enacted"
            &&arrival?.establishedAt===obligation.dueAt
            &&place?.physicalVenue?.ref===obligation.venueRef;
          const witnesses=eligible?obligation.witnesses.flatMap(candidate=>{
            const situation=livedNowStore.getSituation(candidate.situationId,{
              required:false,
            });
            if(situation?.threadId!==candidate.threadId
              ||situation.location?.kind!=="place"
              ||situation.wakefulness==="asleep"
              ||Date.parse(situation.establishedAt)>Date.parse(obligation.dueAt)){
              return [];
            }
            const witnessPlace=livedNowStore.getWorldPlace(
              candidate.threadId,situation.location.placeRef,{required:false},
            );
            return witnessPlace?.physicalVenue?.ref===obligation.venueRef
              ?[situation]:[];
          }):[];
          let encounterRef=null;
          if(witnesses.length>0){
            const story={storyVersion:"encounter-story-v0.1",
              beats:[{actorThreadId:arrival.threadId,kind:"action",
                text:"A Thread arrives at the shared venue."}]};
            const encounter=experienceStore.recordEncounterStory({
              occurredAt:obligation.dueAt,
              threadPresence:[
                {threadId:arrival.threadId,situationId:arrival.situationId},
                ...witnesses.map(s=>({threadId:s.threadId,situationId:s.situationId})),
              ].sort((a,b)=>a.threadId.localeCompare(b.threadId)),
              story,
              visualization:createEncounterVisualization({
                occurredAt:obligation.dueAt,story,
                scene:`At ${place.physicalVenue.displayName??"an admitted shared venue"}.`,
                sourceReferences:[arrival.situationId,obligation.venueRef],
                depictedThreadRefs:[],
              }),
            });
            encounterRef=encounter.encounterId;
            // A delayed process must not author retroactive psychological
            // attention using present-day private state. Its objective World
            // story remains inspectable, with attention not_appraised.
            if(Date.parse(at)-Date.parse(obligation.dueAt)<=FRESH_ATTENTION_MS){
              for(const situation of witnesses){
                const thread=worldReader.getThread(situation.threadId,{required:false});
                if(thread===null||thread.status==="retired")continue;
                const prior=experienceStore.getThreadEncounterAttention(
                  situation.threadId,encounter.encounterId,
                );
                const attention=await admitEncounterAttention({
                  thread,situation,encounterStory:encounter,
                  semanticStates:prior===null
                    ?semanticStateStore.listCurrentState(situation.threadId):[],
                  memories:prior===null
                    ?memoryStore.listCurrentMemories(situation.threadId,{
                      limit:6,newestFirst:true,
                    }).filter(m=>Date.parse(m.recordedAt)<=Date.parse(obligation.dueAt)):[],
                  experienceStore,modelAdapter,onExperienceQueued,
                });
                if(attention.outcome==="noticed")noticed++;
              }
            }
          }
          experienceStore.completeArrivalPerception({
            situationId:obligation.situationId,encounterRef,at,
          });
          results.push({situationId:obligation.situationId,
            outcome:encounterRef===null?"not_observable":"recorded",
            encounterId:encounterRef});
        }catch(error){
          failed++;
          results.push({situationId:obligation.situationId,outcome:"failed",
            message:String(error?.message??error).slice(0,180)});
        }
      }
      const nextDueAt=experienceStore.nextArrivalPerceptionAt();
      return Object.freeze({
        attempted:due.length,failed,noticed,nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
