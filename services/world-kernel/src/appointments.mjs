import { promptRequest } from "./cognition-prompts.mjs";
import { observablePerson } from "./world-observable-person.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";
import { planningLocalityForPlace,planningPublicDiscoveries } from "./lived-now-service.mjs";
import { assertPlainObject,canonicalJson,sha256 } from "./persistence-common.mjs";

// Appointments: two Threads agree in conversation to meet at a place and time
// (the time door). Each later decides for itself whether to go; World reads
// only where both actually were and records kept or broken. What a missed
// meeting meant is each Thread's own. See docs/architecture/social-life.md §7.

// Kept when both were at the place at some moment in this window around the
// agreed time. Reversible constants, not social rules.
export const APPOINTMENT_EARLY_MS=15*60_000;
export const APPOINTMENT_LATE_MS=30*60_000;
const LATEST_MS=3*86_400_000;
const MINIMUM_NOTICE_MS=60*60_000;
// How long a check waits for a life not yet enacted through the window.
const SETTLE_PATIENCE_MS=6*3_600_000;
const RETRY_MS=10*60_000;
const MEETING_PLACE_LIMIT=12;

// The last proposal in a Story, and whether the other person then agreed to it.
export function meetingProposalIn(story){
  const beats=story?.beats??[];
  const index=beats.findLastIndex(beat=>beat.proposesMeeting===true);
  if(index<0)return null;
  const proposal=beats[index];
  const agreement=beats.slice(index+1).find(beat=>beat.agreesToMeet===true
    &&beat.actorThreadId!==proposal.actorThreadId)??null;
  return Object.freeze({proposerThreadId:proposal.actorThreadId,proposalText:proposal.text,
    agreedBy:agreement?.actorThreadId??null,agreementText:agreement?.text??null});
}

// Public venues this Thread knows and can reach: where it is, where it has
// recently been, what it was told of, and today's City Guide around it. Only a
// World-attested public venue is a place two people can actually share.
export function meetingPlacesFor({livedNowStore,situatedLifeStore=null,threadId,at}){
  const refs=[
    livedNowStore.getCurrentSituation(threadId)?.location?.placeRef,
    ...(livedNowStore.listRecentSituations?.(threadId,{limit:16})??[])
      .map(situation=>situation.location?.placeRef),
    ...(livedNowStore.listKnownPublicPlaces?.(threadId)??[]).map(place=>place.ref),
  ];
  const current=livedNowStore.getCurrentSituation(threadId);
  if(current?.location?.kind==="place"){
    const locality=planningLocalityForPlace({livedNowStore,threadId,placeRef:current.location.placeRef,
      placeEpisodes:situatedLifeStore?.listCurrentPlaceEpisodes?.(threadId)??[]});
    refs.push(...planningPublicDiscoveries(livedNowStore,locality,at).map(place=>place.ref));
  }
  const places=new Map();
  for(const ref of refs){
    if(typeof ref!=="string"||places.has(ref))continue;
    const place=livedNowStore.getPublicPlace?.(ref)??null;
    if(place?.physicalVenue?.ref)places.set(ref,place);
  }
  return [...places.values()].slice(0,MEETING_PLACE_LIMIT);
}

function localParts(at,timeZone){
  return Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",
    day:"2-digit",hour:"2-digit",minute:"2-digit",weekday:"long",hourCycle:"h23"})
    .formatToParts(new Date(at)).filter(part=>part.type!=="literal")
    .map(part=>[part.type,part.value]));
}

export function localMoment(at,timeZone){
  const p=localParts(at,timeZone);
  return `${p.weekday} ${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// The instant at which a local civil time ("2026-11-09T10:00") occurs in a zone.
export function instantOfLocal(local,timeZone){
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(String(local??""));
  if(match===null)return null;
  const wanted=Date.UTC(+match[1],+match[2]-1,+match[3],+match[4],+match[5]);
  let guess=wanted;
  for(let step=0;step<2;step+=1){
    const p=localParts(guess,timeZone);
    const seen=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
    guess+=wanted-seen;
  }
  return new Date(guess).toISOString();
}

// The proposer turns its own spoken words into one of the places it knows and
// a local time. Words it cannot ground stay just talk.
async function resolveProposal({thread,proposal,places,at,earliest,latest,modelAdapter}){
  const timeZone=places[0].timeZone;
  const input={
    proposer:{threadId:thread.threadId,name:thread.identity?.name??null},
    spokenProposal:proposal.proposalText,
    reply:proposal.agreementText,
    now:localMoment(at,timeZone),
    earliest:localMoment(earliest,timeZone),
    latest:localMoment(latest,timeZone),
    places:places.map(place=>({placeRef:place.ref,name:place.displayName,
      ...(place.locality?{city:place.locality}:{})})),
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("social.meeting-proposal",{threadId:thread.threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["placeRef","localStart"],
      properties:{
        placeRef:{anyOf:[{type:"string",enum:places.map(place=>place.ref)},{type:"null"}]},
        localStart:{anyOf:[{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$"},{type:"null"}]},
      }},
    clientRequestId:`meeting-proposal_${sha256(canonicalJson(input)).slice(0,32)}`,
  });
  assertPlainObject("meeting proposal",invocation.output);
  const place=places.find(item=>item.ref===invocation.output.placeRef)??null;
  if(place===null)return null;
  const startsAt=instantOfLocal(invocation.output.localStart,place.timeZone??timeZone);
  if(startsAt===null||Date.parse(startsAt)<Date.parse(earliest)||Date.parse(startsAt)>Date.parse(latest))
    return null;
  return Object.freeze({place,startsAt});
}

// After a conversation: a proposal names a place the other is now told of,
// whatever it answered; an agreed one becomes an appointment. It must fall
// after both people's current plans end, so each meets it in its own next plan.
export async function admitMeetingProposal({encounterStory,threads,livedNowStore,situatedLifeStore=null,
  experienceStore,modelAdapter,at}){
  const proposal=meetingProposalIn(encounterStory.story);
  if(proposal===null)return null;
  const proposer=threads.find(thread=>thread.threadId===proposal.proposerThreadId);
  const partner=threads.find(thread=>thread.threadId!==proposal.proposerThreadId);
  if(proposer===undefined||partner===undefined)return null;
  const places=meetingPlacesFor({livedNowStore,situatedLifeStore,threadId:proposer.threadId,at});
  if(places.length===0||!places[0].timeZone)return Object.freeze({outcome:"no_meeting_place"});
  const planEnds=[proposer,partner].map(thread=>
    Date.parse(livedNowStore.latestPlan?.(thread.threadId,"personal",{at})?.horizonEnd??at));
  const earliest=new Date(Math.max(Date.parse(at)+MINIMUM_NOTICE_MS,...planEnds)).toISOString();
  const latest=new Date(Date.parse(at)+LATEST_MS).toISOString();
  const resolved=await resolveProposal({thread:proposer,proposal,places,at,earliest,latest,modelAdapter});
  if(resolved===null)return Object.freeze({outcome:"unresolved"});
  // Being told where is learning a place, whether or not one agrees to go.
  livedNowStore.learnPublicPlace(partner.threadId,resolved.place.ref);
  if(proposal.agreedBy!==partner.threadId)return Object.freeze({outcome:"proposed",placeRef:resolved.place.ref});
  const appointment=experienceStore.recordAppointment({
    appointmentId:`apt_${sha256(canonicalJson({encounterRef:encounterStory.encounterId})).slice(0,32)}`,
    proposerThreadId:proposer.threadId,partnerThreadId:partner.threadId,
    placeRef:resolved.place.ref,venueRef:resolved.place.physicalVenue.ref,
    placeName:resolved.place.displayName,startsAt:resolved.startsAt,agreedAt:at,
    encounterRef:encounterStory.encounterId,
  });
  return Object.freeze({outcome:"agreed",appointmentId:appointment.appointmentId,
    placeRef:appointment.placeRef,startsAt:appointment.startsAt});
}

// What a Thread's planning sees of its agreed appointments in a horizon.
export function appointmentsForPlanning({experienceStore,livedNowStore,embodimentStore=null,
  situatedLifeStore=null,worldReader,threadId,from,to}){
  return (experienceStore.listAppointments?.(threadId,{from,to})??[])
    .filter(item=>item.outcome===null)
    .map(item=>{
      const otherId=item.proposerThreadId===threadId?item.partnerThreadId:item.proposerThreadId;
      const other=worldReader.getThread(otherId,{required:false});
      const situation=livedNowStore.getCurrentSituation(otherId);
      const person=situation===null?null:observablePerson({threadId:otherId,situation,
        observerThreadId:threadId,at:from,name:other?.identity?.name??null,
        birthDate:other?.identity?.birthDate??null,sex:other?.identity?.sex??null,
        embodimentStore,situatedLifeStore,experienceStore});
      return Object.freeze({appointmentRef:item.appointmentId,
        with:person?.name??person?.observableDescription??"the person I agreed to meet",
        placeRef:item.placeRef,placeName:item.placeName,startsAt:item.startsAt,
        proposedBy:item.proposerThreadId===threadId?"me":"them"});
    });
}

function wasThere(livedNowStore,threadId,appointment){
  const from=new Date(Date.parse(appointment.startsAt)-APPOINTMENT_EARLY_MS).toISOString();
  const to=new Date(Date.parse(appointment.startsAt)+APPOINTMENT_LATE_MS).toISOString();
  return livedNowStore.listSituationsDuring(threadId,from,to).some(situation=>
    situation.location?.kind==="place"&&situation.location.placeRef===appointment.placeRef
    &&situation.wakefulness!=="asleep");
}

// Each party's plain experience of the outcome: a fact, never its meaning.
function outcomeFact({appointment,threadId,absent,otherAs,where}){
  const place=appointment.placeName;
  if(!absent.includes(threadId)){
    return absent.length===0?null
      :`${otherAs} did not come to ${place} around the time we had agreed to meet there.`;
  }
  return `I had agreed to meet ${otherAs} at ${place}, and I was not there at that time${where?`; I was at ${where}`:""}.`;
}

export function createAppointmentProcess({experienceStore,livedNowStore,worldReader,
  embodimentStore=null,situatedLifeStore=null,onExperienceQueued=null,clock=Date.now}={}){
  for(const [name,store,method] of [["experienceStore",experienceStore,"listDueAppointments"],
    ["livedNowStore",livedNowStore,"listSituationsDuring"],["worldReader",worldReader,"getThread"]]){
    if(typeof store?.[method]!=="function")throw new TypeError(`${name}.${method} is required`);
  }

  async function experience({appointment,threadId,absent,at}){
    if(livedNowStore.threadLifeRests(threadId))return;
    const situation=livedNowStore.getSituationAt(threadId,at);
    if(situation===null)return;
    const otherId=appointment.proposerThreadId===threadId?appointment.partnerThreadId:appointment.proposerThreadId;
    const other=worldReader.getThread(otherId,{required:false});
    const person=observablePerson({threadId:otherId,situation,observerThreadId:threadId,at,
      name:other?.identity?.name??null,birthDate:other?.identity?.birthDate??null,
      sex:other?.identity?.sex??null,embodimentStore,situatedLifeStore,experienceStore});
    const where=situation.location?.kind==="place"
      ?livedNowStore.getWorldPlace(threadId,situation.location.placeRef,{required:false})?.displayName??null:null;
    const text=outcomeFact({appointment,threadId,absent,
      otherAs:person.name??person.observableDescription,where});
    if(text===null)return;
    const story={storyVersion:"encounter-story-v0.1",beats:[{actorThreadId:null,kind:"occurrence",text}]};
    const recorded=experienceStore.recordEncounterStory({
      occurredAt:at,threadPresence:[{threadId,situationId:situation.situationId}],story,
      visualization:createEncounterVisualization({occurredAt:at,story,
        scene:`An appointment at ${appointment.placeName}.`,
        sourceReferences:[appointment.appointmentId],depictedThreadRefs:[]}),
    });
    const attention=experienceStore.getThreadEncounterAttention(threadId,recorded.encounterId)
      ??experienceStore.recordThreadEncounterAttention({threadId,encounterRef:recorded.encounterId,
        situationId:situation.situationId,occurredAt:at,outcome:"noticed",experienceText:text});
    const record=attention.experience;
    if(record)await queueThreadExperienceConsolidation({experienceStore,experienceRecord:record,
      queuedAt:at,onQueued:onExperienceQueued});
  }

  return Object.freeze({
    async runOnce(){
      const now=clock();
      const due=experienceStore.listDueAppointments({
        before:new Date(now-APPOINTMENT_LATE_MS).toISOString(),limit:4});
      const results=[];
      let waiting=false;
      for(const appointment of due){
        const windowEnd=Date.parse(appointment.startsAt)+APPOINTMENT_LATE_MS;
        const parties=[appointment.proposerThreadId,appointment.partnerThreadId];
        // A life not yet enacted through the window has not yet been anywhere.
        const unresolved=parties.some(threadId=>{
          const due=livedNowStore.inspectLivedBoundary?.(threadId)?.dueAt;
          return due!=null&&Date.parse(due)<=windowEnd&&!livedNowStore.threadLifeRests(threadId);
        });
        if(unresolved&&now-windowEnd<SETTLE_PATIENCE_MS){waiting=true;continue;}
        const absent=parties.filter(threadId=>!wasThere(livedNowStore,threadId,appointment));
        const at=new Date(windowEnd).toISOString();
        const settled=experienceStore.settleAppointment({appointmentId:appointment.appointmentId,
          absent,settledAt:at});
        if(settled.inserted)for(const threadId of parties)
          await experience({appointment,threadId,absent,at});
        results.push(Object.freeze({appointmentId:appointment.appointmentId,outcome:settled.outcome,absent}));
      }
      const next=experienceStore.nextUnsettledAppointmentStart();
      const nextDueAt=waiting?new Date(now+RETRY_MS).toISOString()
        :next===null?null:new Date(Date.parse(next)+APPOINTMENT_LATE_MS).toISOString();
      return Object.freeze({attempted:due.length,completed:results.length,failed:0,
        hasPending:false,nextDueAt,results:Object.freeze(results)});
    },
  });
}
