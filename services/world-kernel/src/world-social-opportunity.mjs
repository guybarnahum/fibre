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
    "getCurrentSituation","getWorldPlace","listCurrentVenueSituations",
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
      let decision=null;
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
          const observed=opportunity.kind==="observed";
          const matching=observed?venue===opportunity.venueRef
            :current?.situationId===opportunity.situationId;
          const target=observed
            ?livedNowStore.getCurrentSituation(opportunity.counterpartyThreadId)
            :null;
          const targetPlace=target?.location?.kind==="place"
            ?livedNowStore.getWorldPlace(
              target.threadId,target.location.placeRef,{required:false},
            ):null;
          if(!matching||current?.wakefulness==="asleep"||venue===null
            ||overdue<0||overdue>60*60_000
            ||(observed&&(target?.wakefulness==="asleep"
              ||targetPlace?.physicalVenue?.ref!==venue))){
            outcome="no_co_presence";
          }else{
            const other=observed?true
              :livedNowStore.listCurrentVenueSituations({
                venueRef:venue,at,limit:8,excludeThreadId:opportunity.threadId,
              }).some((situation)=>{
                if(situation.threadId===opportunity.threadId
                  ||situation.location?.kind!=="place"
                  ||situation.wakefulness==="asleep")return false;
                const place=livedNowStore.getWorldPlace(
                  situation.threadId,situation.location.placeRef,{required:false},
                );
                return place?.physicalVenue?.ref===venue;
              });
            if(!other){
              outcome="no_co_presence";
            }else{
              // The same salience, Thread-owned initiation, recipient consent,
              // and lived conversation apply to both causal opportunities.
              const result=await meetingService.meet(observed
                ?{initiatorThreadId:opportunity.threadId,at,
                  counterpartyThreadId:opportunity.counterpartyThreadId}
                :{initiatorThreadId:opportunity.threadId,at});
              const attempt=result.attempts?.[0]??null;
              outcome=attempt?.outcome??"no_co_presence";
              // One witness for the actual opportunity, not a second
              // event or a retrospective explanation model.
              if(typeof attempt?.counterpartyThreadId==="string"){
                const {salience,initiation,stance,encounterStory}=attempt;
                decision={
                  counterpartyThreadId:attempt.counterpartyThreadId,
                  salience:salience==null?null:{
                    outcome:salience.outcome,
                    anchors:[...salience.anchors],
                    sourceReferences:[...salience.sourceReferences],
                    bodyAtGate:salience.bodyAtGate??null,
                  },
                  initiation:initiation==null?null:{
                    decision:initiation.decision,reportedReason:initiation.reason,
                    decisionContext:initiation.decisionContext??null,
                    selectedEvidenceRefs:[...(initiation.cognition?.selectedEvidenceRefs??[])],
                    evidenceRefs:[...(initiation.cognition?.evidenceRefs??[])],
                  },
                  response:stance==null?null:{
                    decision:stance.decision,reportedReason:stance.reason,
                    selectedEvidenceRefs:[...(stance.cognition?.selectedEvidenceRefs??[])],
                    evidenceRefs:[...(stance.cognition?.evidenceRefs??[])],
                  },
                  encounterRef:encounterStory?.encounterId??null,
                };
              }
            }
          }
          experienceStore.completeSocialOpportunity({
            situationId:opportunity.situationId,at,outcome,
            sourceEncounterRef:opportunity.sourceEncounterRef,
            threadId:opportunity.threadId,decision,
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
