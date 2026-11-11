import {admitEncounterAttention,recognitionFor} from "./lived-encounter-attention.mjs";
import {admitGlance,appraiseGlance,bookInHand,booksInProgress,displayHoldings,glanceItems,holdsBooks,readHolding}
  from "./scene-glance.mjs";
import {createEncounterVisualization} from "./lived-encounter-visualization.mjs";
import {assertIsoTimestamp} from "./persistence-common.mjs";
import {observablePerson} from "./world-observable-person.mjs";
import {bodyTowardPeople} from "./lived-now-regulation.mjs";
import {feltTowardPeople} from "./interoceptive-cognition.mjs";

const FRESH_ATTENTION_MS=60*60_000;

// World-enacted arrival is objective history. This bounded work only joins
// historical co-presence to that action, then permits personal attention.
// The witness set was captured from the venue index at the enacted moment;
// delayed reconciliation never chooses people from a later scene.
export function createWorldArrivalPerception({
  experienceStore,livedNowStore,worldReader,semanticStateStore,memoryStore,
  modelAdapter,onExperienceQueued=null,now=()=>new Date().toISOString(),
  embodimentStore=null,catalogue=null,
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
            // A resting life is not co-present anywhere.
            if(livedNowStore.threadLifeRests(candidate.threadId))return [];
            // A scheduled witness is only a hint. Later enacted history may
            // show a departure at precisely the arrival time.
            const situation=livedNowStore.getSituationAt(
              candidate.threadId,obligation.dueAt,
            );
            if(situation?.threadId!==candidate.threadId
              ||situation.location?.kind!=="place"
              ||situation.wakefulness==="asleep"){
              return [];
            }
            const witnessPlace=livedNowStore.getWorldPlace(
              candidate.threadId,situation.location.placeRef,{required:false},
            );
            return witnessPlace?.physicalVenue?.ref===obligation.venueRef
              ?[situation]:[];
          }):[];
          let encounterRef=null,glanced=false;
          const venueName=!eligible?null:typeof place.physicalVenue.displayName==="string"
            &&place.physicalVenue.displayName.trim()
            ?place.physicalVenue.displayName.trim()
            :place.displayName?.trim()??null;
          if(eligible&&!venueName)throw new TypeError("admitted arrival venue has no name");
          // A delayed process must not author retroactive psychological
          // attention using present-day private state. Its objective World
          // story remains inspectable, with attention not_appraised.
          const fresh=Date.parse(at)-Date.parse(obligation.dueAt)<=FRESH_ATTENTION_MS;
          // Books on the display table are there whether or not anyone else is.
          const holdings=eligible&&fresh&&holdsBooks(place)
            ?await displayHoldings({venueRef:obligation.venueRef,catalogue,experienceStore,at}):[];
          const describe=situation=>{
            const identity=worldReader.getThread(situation.threadId,{
              required:false,
            })?.identity;
            const words=observablePerson({
              threadId:situation.threadId,situation,embodimentStore,
              name:identity?.name??null,birthDate:identity?.birthDate??null,
              sex:identity?.sex??null,
              at:obligation.dueAt,
            }).observableDescription;
            return words[0].toUpperCase()+words.slice(1);
          };
          // What anyone can see of a person here: a book in hand, or what they
          // are doing.
          const presence=situation=>{
            const book=bookInHand({experienceStore,threadId:situation.threadId,
              venueRef:obligation.venueRef,at:obligation.dueAt});
            return book!==null?`${describe(situation)} is reading "${book.title}" by ${book.by}.`
              :situation.outwardActivity?`${describe(situation)} is ${situation.outwardActivity}.`
              :`${describe(situation)} is present at the venue.`;
          };
          let encounter=null;
          if(witnesses.length>0){
            const story={storyVersion:"encounter-story-v0.1",
              beats:[
                {actorThreadId:arrival.threadId,kind:"action",
                  text:`${describe(arrival)} arrives at ${venueName}.`},
                ...witnesses.map(situation=>({
                  actorThreadId:situation.threadId,kind:"occurrence",
                  text:presence(situation),
                })),
              ]};
            encounter=experienceStore.recordEncounterStory({
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
            if(fresh){
              for(const situation of witnesses){
                const thread=worldReader.getThread(situation.threadId,{required:false});
                if(thread===null||thread.status==="retired")continue;
                const prior=experienceStore.getThreadEncounterAttention(
                  situation.threadId,encounter.encounterId,
                );
                const attention=await admitEncounterAttention({
                  thread,situation,encounterStory:encounter,selfRole:"witness",
                  semanticStates:prior===null
                    ?semanticStateStore.listCurrentState(situation.threadId):[],
                  memories:prior===null
                    ?memoryStore.listCurrentMemories(situation.threadId,{inMind:"background",
                      limit:6,newestFirst:true,
                    }).filter(m=>Date.parse(m.asOf)<=Date.parse(obligation.dueAt)):[],
                  experienceStore,modelAdapter,onExperienceQueued,worldReader,
                });
                if(attention.outcome==="noticed"){
                  noticed++;
                  // Existing personal experience, not co-presence itself,
                  // earns a distinct, one-shot voluntary social chance.
                  // A repeated attention replay cannot duplicate it.
                  // A resting arriver cannot be addressed.
                  if(!livedNowStore.threadLifeRests(arrival.threadId)){
                    experienceStore.enqueueObservedSocialOpportunity({
                      encounterRef:encounter.encounterId,
                      threadId:situation.threadId,situationId:situation.situationId,
                      counterpartyThreadId:arrival.threadId,
                      venueRef:obligation.venueRef,dueAt:obligation.dueAt,
                    });
                  }
                }
              }
            }
          }
          // The arriver takes in the place in one glance: the people present
          // and the books within reach, in the order its eye falls on them.
          const arrivingThread=fresh&&(witnesses.length>0||holdings.length>0)
            ?worldReader.getThread(arrival.threadId,{required:false}):null;
          if(arrivingThread!==null&&arrivingThread.status!=="retired"
            &&!livedNowStore.threadLifeRests(arrival.threadId)
            &&experienceStore.getThreadGlance(arrival.threadId,arrival.situationId)===null){
            const knownAs=recognitionFor({thread:arrivingThread,worldReader,experienceStore,
              at:obligation.dueAt});
            // How its Body takes each person present: how far it is at ease
            // with them, and curiosity toward anyone hardly known.
            const curious=feltTowardPeople(bodyTowardPeople({thread:arrivingThread,experienceStore,
              asOf:obligation.dueAt,people:witnesses.map(situation=>({threadId:situation.threadId,
                evidenceRef:situation.situationId}))}));
            const items=glanceItems({venueRef:obligation.venueRef,at:obligation.dueAt,holdings,
              ownBooks:booksInProgress({experienceStore,threadId:arrival.threadId}).map(item=>item.holding),
              people:witnesses.map(situation=>{
                const known=knownAs(situation.threadId);
                const felt=curious.get(situation.threadId)?.join(" ");
                return {kind:"person",ref:situation.threadId,text:presence(situation),
                  ...(known?{knownAs:known}:{}),...(felt?{felt}:{})};
              })});
            const semanticStates=semanticStateStore.listCurrentState(arrival.threadId);
            const memories=memoryStore.listCurrentMemories(arrival.threadId,{inMind:"background",
              limit:6,newestFirst:true,
            }).filter(m=>Date.parse(m.asOf)<=Date.parse(obligation.dueAt));
            const appraisal=await appraiseGlance({thread:arrivingThread,situation:arrival,venueName,items,
              semanticStates,memories,modelAdapter});
            await admitGlance({thread:arrivingThread,situation:arrival,arrivalStory:encounter,items,appraisal,
              describeSelf:describe(arrival),experienceStore,onExperienceQueued});
            // Having taken a book down, it opens it and reads.
            const taken=appraisal.focus===null?null:items[appraisal.focus];
            // A reading that fails is lost, never retried as a different
            // moment; the arrival itself still completes.
            if(taken?.kind==="book")await readHolding({thread:arrivingThread,situation:arrival,holdingRef:taken.ref,
              describeSelf:describe(arrival),catalogue,experienceStore,semanticStates,memories,modelAdapter,
              onExperienceQueued}).catch(error=>console.warn(JSON.stringify({event:"book-reading-failed",
                holdingRef:taken.ref,message:String(error?.message??error).slice(0,160)})));
            glanced=true;
            if(appraisal.focus!==null)noticed++;
          }
          experienceStore.completeArrivalPerception({
            situationId:obligation.situationId,encounterRef,at,
          });
          results.push({situationId:obligation.situationId,
            outcome:encounterRef!==null?"recorded":glanced?"glanced":"not_observable",
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
