import { assertIsoTimestamp } from "./persistence-common.mjs";

// Situation identity may change while a person remains at the same venue.
// Inspect a bounded lived history, never advance anyone's life to make a choice.
function atVenue(lived,situation,venue){
  if(situation?.location?.kind!=="place"||situation.wakefulness==="asleep"
    ||venue===null)return false;
  return lived.getWorldPlace(situation.threadId,situation.location.placeRef,{
    required:false,
  })?.physicalVenue?.ref===venue;
}

function continuouslyPresent(lived,threadId,venue,since,at){
  const current=lived.getCurrentSituation(threadId);
  if(!atVenue(lived,current,venue)
    ||Date.parse(current.establishedAt)>Date.parse(at))return false;
  let cursor=current;
  for(let count=0;count<16;count++){
    if(!atVenue(lived,cursor,venue))return false;
    if(Date.parse(cursor.establishedAt)<=Date.parse(since))return true;
    cursor=lived.getPreviousSituation(threadId,cursor.establishedAt);
    if(cursor===null)return false;
  }
  return false; // Unbounded history is not proof of uninterrupted company.
}

// An unknown continuity window is not evidence that a person left.
function recordedDeparture(lived,threadId,venue,since,at){
  let cursor=lived.getCurrentSituation(threadId);
  if(cursor===null||Date.parse(cursor.establishedAt)>Date.parse(at))return false;
  for(let count=0;count<16;count++){
    if(Date.parse(cursor.establishedAt)<=Date.parse(since))return false;
    if(cursor.location?.kind==="transit"
      ||(cursor.location?.kind==="place"
        &&lived.getWorldPlace(threadId,cursor.location.placeRef,{
          required:false,
        })?.physicalVenue?.ref!==venue))return true;
    cursor=lived.getPreviousSituation(threadId,cursor.establishedAt);
    if(cursor===null)return false;
  }
  return false;
}

function historicalCompany(lived,opportunity){
  const own=lived.getSituationAt(opportunity.threadId,opportunity.dueAt);
  const ownVenue=own?.location?.kind==="place"
    ?lived.getWorldPlace(own.threadId,own.location.placeRef,{
      required:false,
    })?.physicalVenue?.ref??null:null;
  if(ownVenue===null||!atVenue(lived,own,ownVenue))return [];
  if(opportunity.kind==="observed"){
    const other=lived.getSituationAt(
      opportunity.counterpartyThreadId,opportunity.dueAt,
    );
    return atVenue(lived,other,ownVenue)?[other]:[];
  }
  return lived.listCurrentVenueSituations({
    venueRef:ownVenue,at:opportunity.dueAt,limit:8,
    excludeThreadId:opportunity.threadId,
  }).filter(other=>other.threadId!==opportunity.threadId
    &&atVenue(lived,other,ownVenue));
}

function missedWindow(lived,opportunity,at){
  if(Date.parse(at)<=Date.parse(opportunity.dueAt))return false;
  const company=historicalCompany(lived,opportunity);
  if(company.length===0)return false;
  const own=lived.getSituationAt(opportunity.threadId,opportunity.dueAt);
  const venue=lived.getWorldPlace(
    own.threadId,own.location.placeRef,{required:false},
  )?.physicalVenue?.ref??null;
  return recordedDeparture(lived,own.threadId,venue,opportunity.dueAt,at)
    ||company.some(other=>recordedDeparture(
      lived,other.threadId,venue,opportunity.dueAt,at,
    ));
}

// Enacted physical co-presence, not a caller-selected conversation.
// One recently arrived Thread, one bounded candidate and one attempt at most.
// The durable claim intentionally prevents repeating uncertain outward speech.
export function createWorldSocialOpportunity({
  experienceStore,livedNowStore,meetingService,
  now=()=>new Date().toISOString(),
}={}){
  for(const method of [
    "listDueSocialOpportunities","claimDueSocialOpportunity",
    "nextSocialOpportunityAt","completeSocialOpportunity",
  ]){
    if(typeof experienceStore?.[method]!=="function"){
      throw new TypeError(`social opportunity requires ${method}()`);
    }
  }
  for(const method of [
    "getCurrentSituation","getSituationAt","getPreviousSituation",
    "inspectLivedBoundary","getWorldPlace","listCurrentVenueSituations",
  ]){
    if(typeof livedNowStore?.[method]!=="function"){
      throw new TypeError(`social opportunity requires ${method}()`);
    }
  }
  if(typeof meetingService?.meet!=="function"){
    throw new TypeError("social opportunity requires the ordinary meeting service");
  }

  const lifeUnresolved=(threadId,at)=>{
    const debt=livedNowStore.inspectLivedBoundary(threadId);
    return (debt?.failedAttempts??0)>0
      ||(debt?.dueAt!==null&&debt?.dueAt!==undefined
        &&Date.parse(debt.dueAt)<=Date.parse(at));
  };

  function unresolvedVenueCompany(opportunity,at){
    if(opportunity.kind==="observed"){
      return lifeUnresolved(opportunity.threadId,at)
        ||lifeUnresolved(opportunity.counterpartyThreadId,at);
    }
    if(lifeUnresolved(opportunity.threadId,at))return true;
    const own=livedNowStore.getCurrentSituation(opportunity.threadId);
    const venue=own?.location?.kind==="place"
      ?livedNowStore.getWorldPlace(
        opportunity.threadId,own.location.placeRef,{required:false},
      )?.physicalVenue?.ref??null:null;
    if(venue===null||!atVenue(livedNowStore,own,venue))return false;
    const company=livedNowStore.listCurrentVenueSituations({
      venueRef:venue,at,limit:8,excludeThreadId:opportunity.threadId,
    }).filter(person=>atVenue(livedNowStore,person,venue));
    return company.length>0
      &&company.every(person=>lifeUnresolved(person.threadId,at));
  }

  return Object.freeze({
    async runOnce(){
      const at=now();
      assertIsoTimestamp("social opportunity at",at);
      // Never start an irreversible one-shot while its scene is uncertain.
      // Inspect a bounded set; skipped opportunities remain untouched.
      const candidates=experienceStore.listDueSocialOpportunities({at,limit:8});
      const selected=candidates.find(item=>!unresolvedVenueCompany(item,at))??null;
      const opportunity=selected===null?null
        :experienceStore.claimDueSocialOpportunity({at,selected});
      let outcome=null;
      let decision=null;
      let error=null;
      if(opportunity!==null){
        try{
          const overdue=Date.parse(at)-Date.parse(opportunity.dueAt);
          const initial=livedNowStore.getSituationAt(
            opportunity.threadId,opportunity.dueAt,
          );
          const venue=initial?.location?.kind==="place"
            ?livedNowStore.getWorldPlace(
              opportunity.threadId,initial.location.placeRef,{required:false},
            )?.physicalVenue?.ref??null:null;
          const observed=opportunity.kind==="observed";
          const hasDue=threadId=>lifeUnresolved(threadId,at);
          const present=venue!==null
            &&(!observed||venue===opportunity.venueRef)
            &&continuouslyPresent(livedNowStore,opportunity.threadId,
              venue,opportunity.dueAt,at)
            &&!hasDue(opportunity.threadId)
            &&(!observed||(continuouslyPresent(livedNowStore,
              opportunity.counterpartyThreadId,
              venue,opportunity.dueAt,at)
              &&!hasDue(opportunity.counterpartyThreadId)));
          if(!present){
            outcome=missedWindow(livedNowStore,opportunity,at)
              ?"missed_window":"no_co_presence";
          }else if(overdue<0||overdue>60*60_000){
            outcome="expired";
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
              outcome=missedWindow(livedNowStore,opportunity,at)
                ?"missed_window":"no_co_presence";
            }else{
              // The same salience, Thread-owned initiation, recipient consent,
              // and lived conversation apply to both causal opportunities.
              const result=await meetingService.meet(observed
                ?{initiatorThreadId:opportunity.threadId,at,
                  counterpartyThreadId:opportunity.counterpartyThreadId}
                :{initiatorThreadId:opportunity.threadId,at});
              const attempt=result.attempts?.[0]??null;
              outcome=attempt?.outcome??(unresolvedVenueCompany(opportunity,at)
                ?"life_unresolved":missedWindow(livedNowStore,opportunity,at)
                  ?"missed_window":"no_co_presence");
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
          // started_at is the claimed decision instant; completed_at is the
          // actual end, not a repeated copy of the claim timestamp.
          experienceStore.completeSocialOpportunity({
            situationId:opportunity.situationId,at:now(),outcome,
            sourceEncounterRef:opportunity.sourceEncounterRef,
            threadId:opportunity.threadId,decision,
          });
        }catch(cause){
          // A speech/model call may have occurred before interruption.
          // Never quietly invoke it again; inspection shows "interrupted".
          error=String(cause?.message??cause).slice(0,200);
        }
      }
      // A blocked due opportunity does not keep waking World in a hot
      // loop. Its already-armed life boundary will cause reinspection.
      const anotherReady=candidates.some(item=>item!==selected
        &&!unresolvedVenueCompany(item,at));
      const nextDueAt=anotherReady
        ?experienceStore.nextSocialOpportunityAt()
        :experienceStore.nextSocialOpportunityAt({after:at});
      return Object.freeze({
        attempted:opportunity===null?0:1,
        failed:error===null?0:1,
        nextDueAt,
        hasDue:anotherReady,
        results:Object.freeze(opportunity===null?[]:[Object.freeze({
          situationId:opportunity.situationId,
          outcome:error===null?outcome:"interrupted",
          ...(error===null?{}:{message:error}),
        })]),
      });
    },
  });
}
