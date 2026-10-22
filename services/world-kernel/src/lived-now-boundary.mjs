import { LivedNowCoverageError } from "./lived-now-service.mjs";

function futurePlanBoundaries(plan,after){
  if(plan===null)return [];
  const candidates=plan.stops.flatMap((stop)=>[
    stop.startAt,
    ...(stop.endAt===plan.horizonEnd?[]:[stop.endAt]),
  ]);
  // Avoid two alarms one millisecond apart at the final stop.
  // End-of-plan is inclusive; the next millisecond needs renewal.
  candidates.push(new Date(Date.parse(plan.horizonEnd)+1).toISOString());
  return candidates.filter((at)=>Date.parse(at)>Date.parse(after))
    .map((at)=>new Date(Date.parse(at)).toISOString());
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

// The World watchdog repairs only lost obligations; actual life remains
// governed by each Thread's admitted Plan and the ordinary LivedNow wake.
export async function auditLivedContinuity({livedNowStore,reconciliationRuntime,at}){
  if(!livedNowStore.continuityAuditDue(at))return {audited:false};
  const result=livedNowStore.repairLostLivedBoundaries({at});
  // Reconcile the earliest durable debt, not just today's new repairs:
  // a previous audit may have saved a wake before its scheduler handoff failed.
  const nextDueAt=livedNowStore.nextLivedBoundaryAt();
  if(nextDueAt!==null){
    await reconciliationRuntime.requestWakeAt(Date.parse(nextDueAt));
  }
  const nextAuditAt=livedNowStore.recordContinuityAudit({
    at,hasMore:result.hasMore,
  });
  return {
    audited:true,repaired:result.repaired.length,
    hasMore:result.hasMore,nextAuditAt,earliestLifeWakeAt:nextDueAt,
  };
}

export function createLivedBoundaryProcess({
  livedNowStore,livedNow,now=()=>new Date().toISOString(),
}={}){
  for(const key of [
    "listDueLivedBoundaries","nextLivedBoundaryAt",
    "settleLivedBoundary","failLivedBoundary",
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
      const due=livedNowStore.listDueLivedBoundaries({at,limit:4});
      // The indexed queue already orders due instants and puts departures
      // before equal-time arrivals, even across bounded batch limits.
      const failed=0;
      const results=[];
      for(const item of due){
        try{
          // Plan-time enactment preserves the original place interval.
          // Never move behind a more recent authoritative present.
          const present=livedNowStore.getCurrentSituation?.(item.threadId);
          // A retry_due_at is backoff, not the original plan instant.
          const plannedAt=(item.failedAttempts??0)>0&&present!=null
            ?nextLivedBoundary(livedNowStore,present):null;
          const boundaryAt=plannedAt??item.dueAt;
          const enactAt=present?.establishedAt
            &&Date.parse(present.establishedAt)>Date.parse(boundaryAt)
            ?present.establishedAt:boundaryAt;
          const current=await livedNow.ensure({
            threadId:item.threadId,
            at:enactAt,
          });
          const settled=livedNowStore.settleLivedBoundary(item);
          if(settled&&present?.establishedAt
            &&Date.parse(present.establishedAt)>=Date.parse(boundaryAt)){
            // The old wake was overtaken by newer authoritative life.
            // Do not leave the current scene unarmed after settling it.
            livedNowStore.scheduleNextLivedBoundary?.({
              threadId:item.threadId,situationId:current.situationId,
              dueAt:nextLivedBoundary(livedNowStore,current),
            });
          }
          results.push({
            threadId:item.threadId,
            outcome:"advanced",
            situationId:current.situationId,
          });
        }catch(error){
          const message=String(error?.message??error).slice(0,180);
          const failure=livedNowStore.failLivedBoundary({
            ...item,message,at,unavailable:error instanceof LivedNowCoverageError,
          });
          results.push({
            threadId:item.threadId,
            outcome:failure.blocked?"blocked":"retry_scheduled",
            message,
          });
        }
      }
      const next=livedNowStore.nextLivedBoundaryAt();
      // A scheduler outage may leave many overdue lives. Recover one per
      // bounded interval rather than sending a burst of model requests.
      const nextDueAt=due.length>0&&next!==null
        &&Date.parse(next)<Date.parse(at)-15*60_000
        ?new Date(Date.parse(at)+10*60_000).toISOString():next;
      return Object.freeze({
        attempted:due.length,failed,
        nextDueAt,
        hasDue:next!==null&&Date.parse(next)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
