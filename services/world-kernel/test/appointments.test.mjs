import { installedWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { normalizeCurrentSituation } from "../src/lived-now.mjs";
import { canonicalJson,sha256 } from "../src/persistence-common.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openRelationshipInspectionStore } from "../src/relationship-inspection.mjs";
import { admitMeetingProposal,appointmentsForPlanning,createAppointmentProcess } from "../src/appointments.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const KADIR="thr_meet_kadir",HABIBA="thr_meet_habiba";
const AGREED_AT="2026-11-08T16:00:00.000Z";   // 09:00 in Phoenix
const PLAN_END="2026-11-09T04:00:00.000Z";
const TEN_TOMORROW="2026-11-09T17:00:00.000Z"; // 10:00 in Phoenix

function fixture(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-appointments-"));
  const path=join(directory,"world.sqlite");
  const storage=installedWorldStateStorage(path);
  const world=openWorldStore(storage),lived=openLivedNowStore(storage);
  const experience=openLivedExperienceStore(storage);
  for(const [threadId,name] of [[KADIR,"Kadir Ali"],[HABIBA,"Habiba Noor"]]){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.identity.name=name;thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  const venue=(label,lat)=>lived.admitPublicPlace({
    venueIdentity:`fixture:${label}`,displayName:label,streetAddress:`${label} Street`,
    locality:"Tucson",country:"United States",countryCode:"US",lat,long:-110.97,
    timeZone:"America/Phoenix",evidenceRef:`https://example.org/${label}`,affordances:["Sitting"],
  });
  const library=venue("Library",32.22),cafe=venue("Corner Cafe",32.23),home=venue("Park",32.24);
  const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
  const enact=(threadId,at,place)=>{
    const situation=normalizeCurrentSituation({
      situationId:`sit_${threadId}_${at.replace(/[^0-9]/gu,"")}`,threadId,establishedAt:at,
      phase:"at_place",location:{kind:"place",placeRef:place.ref},mediatedContext:null,
      activity:"Being here.",wakefulness:"awake",reason:"Ordinary life.",participantRefs:[],
      evidenceRefs:["evt_"+threadId],sourcePlanRefs:["plan_"+threadId],
      resolution:{kind:"personal_plan",conflict:false,observedDivergence:false,
        governingPlanRef:"plan_"+threadId,constrainedPlanRef:null,summary:"Enacted."},
      provenance:"world_enacted",
    });
    const json=canonicalJson(situation);
    db.prepare(`INSERT INTO current_situation_records(situation_id,thread_id,established_at,record_json,record_digest)
      VALUES (?,?,?,?,?)`).run(situation.situationId,threadId,at,json,"sha256:"+sha256(json));
    return situation;
  };
  const planUntil=(threadId,horizonEnd)=>lived.recordPlan({
    planId:"plan_meet_"+threadId,kind:"personal",subjectThreadId:threadId,
    owner:{partyId:threadId,kind:"thread"},authoredAt:AGREED_AT,horizonStart:AGREED_AT,horizonEnd,
    stops:[{startAt:AGREED_AT,endAt:horizonEnd,physicalPlaceRef:library.ref,mediatedContext:null,
      activity:"Read.",purpose:"Read.",companionRefs:[],travelFromPrevious:null}],
    sourceReferences:[world.listEvents(threadId)[0].eventId,library.ref],
    cognition:{provider:"fixture",modelId:"fixture-plan",providerRequestId:null},
  });
  const conversation=(beats)=>{
    const story={storyVersion:"encounter-story-v0.1",beats};
    return experience.recordEncounterStory({occurredAt:AGREED_AT,story,
      threadPresence:[KADIR,HABIBA].map(threadId=>({threadId,situationId:`sit_${threadId}_library`})),
      visualization:createEncounterVisualization({occurredAt:AGREED_AT,story,scene:"At the library.",
        sourceReferences:[library.ref],depictedThreadRefs:[]})});
  };
  const close=()=>{db.close();experience.close();lived.close();world.close();
    rmSync(directory,{recursive:true,force:true});};
  return {storage,world,lived,experience,library,cafe,home,enact,planUntil,conversation,close};
}

const proposalModel=(asked,answer)=>({async invoke(request){
  asked.push(request.input);
  return {output:answer(request.input)};
}});

test("an agreed proposal becomes an appointment both will plan around; a declined one still teaches the place",async()=>{
  const f=fixture();
  try{
    f.enact(KADIR,AGREED_AT,f.library);f.enact(HABIBA,AGREED_AT,f.library);
    f.enact(KADIR,"2026-11-07T16:00:00.000Z",f.cafe);
    f.planUntil(KADIR,PLAN_END);f.planUntil(HABIBA,PLAN_END);
    const asked=[];
    const cafeAtTen=proposalModel(asked,input=>({
      placeRef:input.places.find(place=>place.name==="Corner Cafe").placeRef,localStart:"2026-11-09T10:00"}));
    const threads=[f.world.getThread(KADIR),f.world.getThread(HABIBA)];
    const admit=(story,modelAdapter)=>admitMeetingProposal({encounterStory:story,threads,
      livedNowStore:f.lived,experienceStore:f.experience,modelAdapter,at:AGREED_AT});

    const declined=await admit(f.conversation([
      {actorThreadId:KADIR,kind:"utterance",text:"Shall we meet at the Corner Cafe tomorrow at ten?",proposesMeeting:true},
      {actorThreadId:HABIBA,kind:"utterance",text:"I don't think I can."},
    ]),cafeAtTen);
    assert.equal(declined.outcome,"proposed","a declined proposal became an appointment");
    assert.ok(f.lived.listKnownPublicPlaces(HABIBA).some(place=>place.ref===f.cafe.ref),
      "being told where to meet did not teach the place");
    assert.ok(asked[0].places.some(place=>place.placeRef===f.cafe.ref),
      "the proposer could not name a place it has been to");

    const tooSoon=await admit(f.conversation([
      {actorThreadId:KADIR,kind:"utterance",text:"Meet me at the cafe in an hour?",proposesMeeting:true},
      {actorThreadId:HABIBA,kind:"utterance",text:"Yes, in an hour.",agreesToMeet:true},
    ]),proposalModel([],input=>({placeRef:input.places[0].placeRef,localStart:"2026-11-08T10:00"})));
    assert.equal(tooSoon.outcome,"unresolved","an appointment fell inside a plan already made");

    const agreed=await admit(f.conversation([
      {actorThreadId:KADIR,kind:"utterance",text:"Corner Cafe, tomorrow at ten?",proposesMeeting:true},
      {actorThreadId:HABIBA,kind:"utterance",text:"Yes, ten at the cafe.",agreesToMeet:true},
    ]),cafeAtTen);
    assert.equal(agreed.startsAt,TEN_TOMORROW,"the agreed local time was not kept as its instant");
    const planned=appointmentsForPlanning({experienceStore:f.experience,livedNowStore:f.lived,
      worldReader:f.world,threadId:HABIBA,from:PLAN_END,to:"2026-11-09T18:00:00.000Z"});
    assert.deepEqual(planned.map(item=>[item.placeRef,item.startsAt,item.proposedBy]),
      [[f.cafe.ref,TEN_TOMORROW,"them"]],"the appointment did not reach the partner's next plan");
    const inspection=openRelationshipInspectionStore(f.storage);
    try{
      assert.ok(inspection.inspect({since:AGREED_AT}).doors.some(door=>door.door==="time"),
        "agreeing did not open the time door");
    }finally{inspection.close();}
  }finally{f.close();}
});

test("whether each came is read from where they were; the one who waited experiences only the fact",async()=>{
  const f=fixture();
  try{
    const story=f.conversation([{actorThreadId:KADIR,kind:"utterance",text:"Tomorrow at ten?"}]);
    f.experience.recordAppointment({appointmentId:"apt_fixture",
      proposerThreadId:KADIR,partnerThreadId:HABIBA,placeRef:f.cafe.ref,venueRef:f.cafe.physicalVenue.ref,
      placeName:"Corner Cafe",startsAt:TEN_TOMORROW,agreedAt:AGREED_AT,encounterRef:story.encounterId});
    f.enact(KADIR,"2026-11-09T16:50:00.000Z",f.cafe);
    f.enact(HABIBA,"2026-11-09T15:00:00.000Z",f.home);
    let now=Date.parse("2026-11-09T17:20:00.000Z");
    const queued=[];
    const process=createAppointmentProcess({experienceStore:f.experience,livedNowStore:f.lived,
      worldReader:f.world,clock:()=>now,onExperienceQueued:item=>queued.push(item.threadId)});

    assert.equal((await process.runOnce()).completed,0,"an appointment was judged before its window closed");
    f.lived.scheduleNextLivedBoundary({threadId:HABIBA,situationId:`sit_${HABIBA}_20261109150000000`,
      dueAt:"2026-11-09T17:10:00.000Z"});
    now=Date.parse("2026-11-09T17:31:00.000Z");
    assert.equal((await process.runOnce()).completed,0,"a life not yet enacted through the window was judged");
    f.lived.settleLivedBoundary({threadId:HABIBA,situationId:`sit_${HABIBA}_20261109150000000`,
      dueAt:"2026-11-09T17:10:00.000Z"});

    const [settled]=(await process.runOnce()).results;
    assert.deepEqual([settled.outcome,settled.absent],["broken",[HABIBA]],
      "where each actually was did not decide the outcome");
    const [recorded]=f.experience.listAppointments(KADIR);
    assert.equal(recorded.outcome,"broken","the outcome was not recorded");
    assert.deepEqual(queued.sort(),[HABIBA,KADIR].sort(),"each party did not get its own experience to reflect on");
    assert.equal((await process.runOnce()).completed,0,"a settled appointment was judged again");
  }finally{f.close();}
});
