import { assertIsoTimestamp } from "./persistence-common.mjs";
import {
  socialContactEvidenceForLivedHistory,
  livedRegulationForLivedHistory,
} from "./lived-now-regulation.mjs";
import { threadRegulatorProfile } from "../../../core/src/intrinsic-regulation.mjs";
import { nextLivedBoundary } from "./lived-now-boundary.mjs";


const RECONSIDERATION_BANDS=Object.freeze([0.4,0.6]);

// Same proven physical venue across enacted changes; never infer a visit
// start from a plan. Unbounded history is uncertainty, not an invitation.
export function socialVenueVisitSince(lived,situation,venue){
  let cursor=situation;
  for(let i=0;i<16;i++){
    const previous=lived.getPreviousSituation(cursor.threadId,cursor.establishedAt);
    if(previous===null)return cursor.establishedAt;
    if(previous.location?.kind!=="place"||previous.wakefulness==="asleep"
      ||lived.getWorldPlace(previous.threadId,previous.location.placeRef,{
        required:false,
      })?.physicalVenue?.ref!==venue)return cursor.establishedAt;
    cursor=previous;
  }
  return null;
}

function eligibleVenueCompany(lived,situation,venue,at){
  return lived.listCurrentVenueSituations({
    venueRef:venue,at,limit:8,excludeThreadId:situation.threadId,
  }).some(other=>other.threadId!==situation.threadId
    &&other.wakefulness!=="asleep"
    &&atVenue(lived,other,venue)
    &&(lived.inspectLivedBoundary?.(other.threadId)?.failedAttempts??0)===0);
}

// Predict a Body *threshold*, never the social choice or a feeling.
// The linear schedule is the inverse of the existing social-contact drive,
// using exactly the regulator's grounded observation and inherited sensitivity.
export function enqueueNextSocialNeedBand({
  livedNowStore,experienceStore,thread,situation,nextBoundaryAt,
  visitSince,at=situation.establishedAt,
}){
  if(nextBoundaryAt===null||visitSince===null)return null;
  const contact=socialContactEvidenceForLivedHistory({
    threadId:situation.threadId,currentSituation:situation,
    livedNowStore,experienceStore,asOf:at,
  });
  if(contact===null)return null; // Time alone is not proof of social deprivation.
  const sensitivity=threadRegulatorProfile(
    thread.genome?.runtimeBaselines??{},
  ).sensitivity.social;
  // Match the Body's six-decimal pressure before scheduling. Otherwise
  // floating-point error can requeue a band already crossed.
  const pressure=Math.round(
    Math.min(1,contact.observedUnmetHours/24)*0.8*sensitivity*1_000_000,
  )/1_000_000;
  for(const band of RECONSIDERATION_BANDS){
    if(pressure>=band)continue;
    const targetHours=band*24/(0.8*sensitivity);
    const due=new Date(Math.ceil(Date.parse(at)
      +(targetHours-contact.observedUnmetHours)*3600_000)+1).toISOString();
    if(Date.parse(due)>=Date.parse(nextBoundaryAt))continue;
    const result=experienceStore.enqueueSocialOpportunity({
      threadId:situation.threadId,situationId:situation.situationId,
      dueAt:due,trigger:"need_band",needBand:band,visitSince,
    });
    if(result.inserted)return Object.freeze({dueAt:due,band});
    // The visit already owns this band, whether pending or completed.
    // Do not arm a higher band until the preceding obligation fires.
    if(result.alreadyScheduled)return null;
  }
  return null;
}

// Called only when LivedNow enacts a World-owned situation. This adds neither
// a new simulation clock nor a population scan.
export function enqueueEnactedSocialReconsideration({
  situation,previous,thread,livedNowStore,experienceStore,nextBoundaryAt,
}){
  if(situation.location?.kind!=="place"||situation.wakefulness==="asleep"
    ||!thread)return [];
  const venue=livedNowStore.getWorldPlace(
    situation.threadId,situation.location.placeRef,{required:false},
  )?.physicalVenue?.ref??null;
  if(venue===null||!eligibleVenueCompany(
    livedNowStore,situation,venue,situation.establishedAt,
  ))return [];
  const visitSince=socialVenueVisitSince(livedNowStore,situation,venue);
  if(visitSince===null)return [];
  const scheduled=[];
  const former=previous?.location?.kind==="place"
    ?livedNowStore.getWorldPlace(
      previous.threadId,previous.location.placeRef,{required:false},
    )?.physicalVenue?.ref:null;
  if(former===venue&&previous.wakefulness!=="asleep"
    &&previous.activity!==situation.activity){
    const result=experienceStore.enqueueSocialOpportunity({
      threadId:situation.threadId,situationId:situation.situationId,
      dueAt:situation.establishedAt,trigger:"activity_change",visitSince,
    });
    if(result.inserted)scheduled.push(situation.establishedAt);
  }
  const predicted=enqueueNextSocialNeedBand({
    livedNowStore,experienceStore,thread,situation,nextBoundaryAt,visitSince,
  });
  if(predicted!==null)scheduled.push(predicted.dueAt);
  return scheduled;
}

export function socialNeedBandReached({
  livedNowStore,experienceStore,thread,situation,at,band,
}){
  const regulation=livedRegulationForLivedHistory({
    thread,livedNowStore,currentSituation:situation,experienceStore,asOf:at,
  });
  return (regulation?.drives.find(d=>d.family==="social_contact")
    ?.pressure??0)>=band;
}

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
  experienceStore,livedNowStore,meetingService,worldReader=null,
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
      const candidates=experienceStore.listDueSocialOpportunities({at,limit:16});
      const uncertainty=new Map();
      const unresolved=item=>{
        const key=item.kind+":"+item.threadId+":"+(item.opportunityId??item.situationId);
        if(!uncertainty.has(key)){
          uncertainty.set(key,
            (item.trigger==="arrival"
              &&experienceStore.arrivalPerceptionPending?.(item.situationId)===true)
            ||unresolvedVenueCompany(item,at));
        }
        return uncertainty.get(key);
      };
      const selected=candidates.find(item=>!unresolved(item))??null;
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
          const reconsideration=["activity_change","need_band"].includes(
            opportunity.trigger,
          );
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
          }else if(opportunity.trigger==="need_band"
            &&(!worldReader?.getThread
              ||!socialNeedBandReached({
                livedNowStore,experienceStore,
                thread:worldReader.getThread(opportunity.threadId,{required:false}),
                situation:initial,at:opportunity.dueAt,band:opportunity.needBand,
              }))){
            outcome="need_unreached";
          }else{
            // A later arrival does not retroactively create the company
            // present when this particular reconsideration was earned.
            const company=reconsideration
              ?historicalCompany(livedNowStore,opportunity)
                .filter(person=>continuouslyPresent(livedNowStore,
                  person.threadId,venue,opportunity.dueAt,at)
                  &&!hasDue(person.threadId))
              :[];
            if(reconsideration&&company.length>1){
              const noticed=new Set(experienceStore.listEncounterStories(
                opportunity.threadId,{limit:8},
              ).filter(story=>
                experienceStore.getThreadEncounterAttention(
                  opportunity.threadId,story.encounterId,
                )?.outcome==="noticed")
                .flatMap(story=>story.threadPresence.map(person=>person.threadId)));
              company.sort((a,b)=>Number(noticed.has(b.threadId))
                -Number(noticed.has(a.threadId)));
            }
            const candidate=reconsideration?company.find(person=>
              experienceStore.reconsiderationCountForPair({
                threadId:opportunity.threadId,
                counterpartyThreadId:person.threadId,
                visitSince:opportunity.visitSince,
              })<2)??null:null;
            const other=reconsideration?candidate!==null:observed?true
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
              outcome=reconsideration&&company.length>0?"pair_limit"
                :missedWindow(livedNowStore,opportunity,at)
                  ?"missed_window":"no_co_presence";
            }else{
              // One ordinary Thread decision, from already-enacted company.
              const result=await meetingService.meet(reconsideration
                ?{initiatorThreadId:opportunity.threadId,at,
                  counterpartyThreadId:candidate.threadId,
                  reconsiderationVisitSince:opportunity.visitSince}
                :observed
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
                    act:initiation.act,expression:initiation.expression,
                    reportedReason:initiation.reason,
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
          // Advance only the existing durable band frontier. Later contact
          // may have reset Body pressure; no scheduled band can force action.
          if(opportunity.trigger==="need_band"&&worldReader?.getThread){
            const current=livedNowStore.getCurrentSituation(opportunity.threadId);
            if(current!==null&&opportunity.visitSince!==null
              &&current.location?.kind==="place"){
              const venue=livedNowStore.getWorldPlace(
                current.threadId,current.location.placeRef,{required:false},
              )?.physicalVenue?.ref??null;
              const since=venue===null?null
                :socialVenueVisitSince(livedNowStore,current,venue);
              const horizon=nextLivedBoundary(livedNowStore,current);
              if(since===opportunity.visitSince&&horizon!==null)
                enqueueNextSocialNeedBand({
                livedNowStore,experienceStore,
                thread:worldReader.getThread(opportunity.threadId,{required:false}),
                situation:current,nextBoundaryAt:horizon,
                visitSince:opportunity.visitSince,at:opportunity.dueAt,
              });
            }
          }
          // started_at is the claimed decision instant; completed_at is the
          // actual end, not a repeated copy of the claim timestamp.
          experienceStore.completeSocialOpportunity({
            situationId:opportunity.situationId,opportunityId:opportunity.opportunityId,
            at:now(),outcome,
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
        &&!unresolved(item));
      const nextDueAt=experienceStore.nextSocialOpportunityAt({
        after:anotherReady?null:at,asOf:at,
      });
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
