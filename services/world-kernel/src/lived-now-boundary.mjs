import { LivedNowCoverageError } from "./lived-now-service.mjs";

function futurePlanBoundaries(plan,after){
  if(plan===null)return [];
  const candidates=[...plan.stops.flatMap((stop)=>[stop.startAt,stop.endAt])];
  // End-of-plan is inclusive for LivedNow; the next millisecond
  // requires renewal or bounded historical continuation.
  candidates.push(new Date(Date.parse(plan.horizonEnd)+1).toISOString());
  return candidates.filter((at)=>Date.parse(at)>Date.parse(after));
}

// Derive a single wake from a Thread's own admitted Flight Plan, not a
// population clock or synthetic environmental schedule.
export function nextLivedBoundary(livedNowStore,situation){
  const at=situation.establishedAt;
  const personal=livedNowStore.latestPlan(situation.threadId,"personal",{at});
  const care=livedNowStore.latestPlan(situation.threadId,"care",{at});
  const times=[
    ...futurePlanBoundaries(personal,at),
    ...futurePlanBoundaries(care,at),
  ].sort();
  return times[0]??null;
}

export function createLivedBoundaryProcess({
  livedNowStore,livedNow,now=()=>new Date().toISOString(),
}={}){
  for(const key of [
    "listDueLivedBoundaries","nextLivedBoundaryAt","settleLivedBoundary",
  ]){
    if(typeof livedNowStore?.[key]!=="function")
      throw new TypeError(`Lived boundary process requires ${key}()`);
  }
  if(typeof livedNow?.ensure!=="function"){
    throw new TypeError("Lived boundary process requires LivedNow.ensure()");
  }
  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=livedNowStore.listDueLivedBoundaries({at,limit:1});
      let failed=0;
      const results=[];
      for(const item of due){
        try{
          // The normal LivedNow authority performs all plan renewal,
          // care resolution, regulation and material-scene callbacks.
          const current=await livedNow.ensure({
            threadId:item.threadId,
            at,
          });
          livedNowStore.settleLivedBoundary(item);
          results.push({
            threadId:item.threadId,
            outcome:"advanced",
            situationId:current.situationId,
          });
        }catch(error){
          const message=String(error?.message??error).slice(0,180);
          // A persistently ungrounded life is not a reason to burn cognition
          // every five minutes. A later real ensure can re-arm its frontier.
          if(error instanceof LivedNowCoverageError){
            livedNowStore.settleLivedBoundary({...item,blockedReason:message});
            results.push({threadId:item.threadId,outcome:"blocked",message});
          }else{
            failed+=1;
            results.push({threadId:item.threadId,outcome:"failed",message});
          }
        }
      }
      const nextDueAt=livedNowStore.nextLivedBoundaryAt();
      return Object.freeze({
        attempted:due.length,failed,
        nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
