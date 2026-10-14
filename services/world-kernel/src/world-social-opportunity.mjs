import { assertIsoTimestamp } from "./persistence-common.mjs";

// Enacted physical co-presence, not a caller-selected conversation.
// One recently arrived Thread, one bounded candidate and one attempt at most.
// The durable claim intentionally prevents repeating uncertain outward speech.
export function createWorldSocialOpportunity({
  experienceStore,livedNowStore,meetingService,
  now=()=>new Date().toISOString(),
}={}){
  for(const method of [
    "claimDueSocialOpportunity","nextSocialOpportunityAt","completeSocialOpportunity",
  ]){
    if(typeof experienceStore?.[method]!=="function"){
      throw new TypeError(`social opportunity requires ${method}()`);
    }
  }
  for(const method of [
    "getCurrentSituation","getWorldPlace","listRecentCurrentSituations",
  ]){
    if(typeof livedNowStore?.[method]!=="function"){
      throw new TypeError(`social opportunity requires ${method}()`);
    }
  }
  if(typeof meetingService?.meet!=="function"){
    throw new TypeError("social opportunity requires the ordinary meeting service");
  }

  return Object.freeze({
    async runOnce(){
      const at=now();
      assertIsoTimestamp("social opportunity at",at);
      const opportunity=experienceStore.claimDueSocialOpportunity({at});
      let outcome=null;
      let error=null;
      if(opportunity!==null){
        try{
          const current=livedNowStore.getCurrentSituation(opportunity.threadId);
          const overdue=Date.parse(at)-Date.parse(opportunity.dueAt);
          const place=current?.location?.kind==="place"
            ?livedNowStore.getWorldPlace(
              opportunity.threadId,current.location.placeRef,{required:false},
            ):null;
          const venue=place?.physicalVenue?.ref??null;
          if(current?.situationId!==opportunity.situationId
            ||current.wakefulness==="asleep"||venue===null
            ||overdue<0||overdue>60*60_000){
            outcome="no_co_presence";
          }else{
            const candidates=livedNowStore.listRecentCurrentSituations({
              at,since:new Date(Date.parse(at)-60*60_000).toISOString(),limit:16,
            });
            const other=candidates.some((situation)=>{
              if(situation.threadId===opportunity.threadId
                ||situation.location?.kind!=="place"
                ||situation.wakefulness==="asleep")return false;
              const target=livedNowStore.getWorldPlace(
                situation.threadId,situation.location.placeRef,{required:false},
              );
              return target?.physicalVenue?.ref===venue;
            });
            if(!other){
              outcome="no_co_presence";
            }else{
              // This path is server-owned. The meeting service still derives
              // counterparty presence, salience, desire and independent consent.
              const result=await meetingService.meet({
                initiatorThreadId:opportunity.threadId,at,
              });
              outcome=result.attempts?.[0]?.outcome??"no_co_presence";
            }
          }
          experienceStore.completeSocialOpportunity({
            situationId:opportunity.situationId,at,outcome,
          });
        }catch(cause){
          // A speech/model call may have occurred before interruption.
          // Never quietly invoke it again; inspection shows "interrupted".
          error=String(cause?.message??cause).slice(0,200);
        }
      }
      const nextDueAt=experienceStore.nextSocialOpportunityAt();
      return Object.freeze({
        attempted:opportunity===null?0:1,
        failed:error===null?0:1,
        nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(opportunity===null?[]:[Object.freeze({
          situationId:opportunity.situationId,
          outcome:error===null?outcome:"interrupted",
          ...(error===null?{}:{message:error}),
        })]),
      });
    },
  });
}
