import {planThreadLocation} from "./thread-home-location.mjs";
import {projectThreadBirthLocation} from "./thread-directory-store.mjs";
import { LivedNowCoverageError } from "./lived-now-service.mjs";

// The first waking of a born Thread is ordinary LivedNow authority. This
// process only delivers one durable birth obligation into that same mind and
// scheduler; it neither authors a plan nor reconstructs missing biography.
export function createGenesisFirstLifeProcess({
  workStore,livedNow,livedNowStore=null,situatedLifeStore=null,
  worldReader=null,logUnlocated=entry=>console.warn(JSON.stringify(entry)),
  now=()=>new Date().toISOString(),
}={}){
  for(const method of ["due","complete","fail","block","nextDueAt"]){
    if(typeof workStore?.[method]!=="function"){
      throw new TypeError(`first-life work requires ${method}()`);
    }
  }
  if(typeof livedNow?.ensure!=="function"){
    throw new TypeError("first-life work requires LivedNow.ensure()");
  }
  for(const [owner,store,methods] of [
    ["livedNowStore",livedNowStore,[
      "getPrivatePlace","getWorldContext","listWorldPlaces","admitPrivatePlace",
    ]],
    ["situatedLifeStore",situatedLifeStore,["listCurrentPlaceEpisodes"]],
    ["worldReader",worldReader,["getThread"]],
  ]){
    for(const method of methods){
      if(typeof store?.[method]!=="function")
        throw new TypeError(`first-life work requires ${owner}.${method}()`);
    }
  }
  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=workStore.due(at);
      const results=[];
      if(due!==null){
        try{
          const situation=await livedNow.ensure({threadId:due.thread_id,at});
          // First Life's city is World admission, never another movement.
          // Missing or conflicting geography does not block the lived moment.
          try{
            const thread=worldReader.getThread(due.thread_id,{required:false});
            const privatePlace=situation.location?.kind==="place"
              ?livedNowStore.getPrivatePlace(due.thread_id,situation.location.placeRef):null;
            const decision=thread===null?{state:"missing_thread"}:planThreadLocation({
              threadId:due.thread_id,
              displayName:thread.identity?.name??null,
              birthLocation:projectThreadBirthLocation(thread.identity),
            },{
              currentSituation:situation,
              privatelyKnownCurrentPlace:privatePlace,
              placeEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(due.thread_id),
              worldPlaces:livedNowStore.listWorldPlaces(due.thread_id),
              worldContext:livedNowStore.getWorldContext(due.thread_id,{required:false}),
            });
            if(decision.state==="ready"){
              livedNowStore.admitPrivatePlace({
                ...decision.place,
                evidenceRef:decision.basis==="birth_city_operator_default"
                  ?`birth_city_world_default:${due.thread_id}`
                  :decision.place.evidenceRef,
              });
            }else{
              logUnlocated({event:"genesis-first-life-home-unlocated",
                threadId:due.thread_id,state:decision.state});
            }
          }catch(error){
            logUnlocated({event:"genesis-first-life-home-unlocated",
              threadId:due.thread_id,state:"location_unavailable"});
          }
          workStore.complete(due.thread_id,situation.establishedAt);
          results.push({threadId:due.thread_id,outcome:"established",
            situationId:situation.situationId});
        }catch(error){
          const message=String(error?.message??error).slice(0,180);
          if(error instanceof LivedNowCoverageError){
            workStore.block(due.thread_id,message);
            results.push({threadId:due.thread_id,outcome:"blocked",message});
          }else{
            const failure=workStore.fail(due.thread_id,at,message);
            results.push({
              threadId:due.thread_id,
              outcome:failure.blocked?"blocked":"retrying",message,
            });
          }
        }
      }
      const nextDueAt=workStore.nextDueAt();
      return Object.freeze({
        attempted:due===null?0:1,
        failed:0,
        nextDueAt,
        hasDue:nextDueAt!==null&&nextDueAt<=at,
        results:Object.freeze(results),
      });
    },
  });
}
