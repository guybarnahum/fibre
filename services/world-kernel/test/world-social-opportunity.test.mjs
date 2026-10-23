import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { normalizeCurrentSituation } from "../src/lived-now.mjs";
import { canonicalJson,sha256 } from "../src/persistence-common.mjs";
import {
  createWorldSocialOpportunity,
  enqueueEnactedSocialReconsideration,
  socialNeedBandReached,
} from "../src/world-social-opportunity.mjs";
import { createWorldArrivalPerception } from "../src/world-arrival-perception.mjs";
import { createWorldReconciliationProcess } from "../src/world-reconciliation-process.mjs";
import { createSocialMeetingService } from "../src/lived-social-meeting.mjs";
import {observablePerson} from "../src/world-observable-person.mjs";
import {projectSituatedPercept} from "../src/situated-percept.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-13T19:00:00.000Z";


test("four act-triggered reply opportunities bound one shared visit, not future visits",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-social-reciprocity-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({
      scopes:{world:join(directory,"world.sqlite")},
    }),stateScopeId:"world",
  };
  const ids=["thr_reciprocal_a","thr_reciprocal_b"];
  const world=openWorldStore(storage);
  const experience=openLivedExperienceStore(storage);
  try{
    for(const threadId of ids){
      const person=structuredClone(seed);
      person.threadId=threadId;person.provenance.lastEventId="evt_"+threadId;
      world.seedThread(person);
    }
    const sharedVisit="2026-10-23T09:00:00.000Z";
    const venueRef="venue_reciprocity_library";
    const makeAct=(index,visitSince)=>{
      const occurredAt=new Date(Date.parse(visitSince)+index*60_000).toISOString();
      const actor=ids[index%2],recipient=ids[(index+1)%2];
      const story={storyVersion:"encounter-story-v0.1",beats:[
        {actorThreadId:actor,kind:"utterance",text:"Hello there."},
      ]};
      const encounter=experience.recordEncounterStory({
        occurredAt,
        threadPresence:ids.map(threadId=>({
          threadId,situationId:"sit_"+threadId,
        })),
        story,visualization:createEncounterVisualization({
          occurredAt,story,scene:"At the shared library.",
          sourceReferences:ids.map(id=>"sit_"+id),depictedThreadRefs:[],
        }),
      });
      return experience.enqueueObservedSocialOpportunity({
        sourceKind:"social_act",visitSince,venueRef,encounterRef:encounter.encounterId,
        threadId:recipient,counterpartyThreadId:actor,
        situationId:"sit_"+recipient,dueAt:occurredAt,
      });
    };
    const first=Array.from({length:5},(_,i)=>makeAct(i,sharedVisit));
    assert.deepEqual(first.map(x=>x.inserted),[true,true,true,true,false],
      "the same pair could create an unbounded reply chain");
    const future=makeAct(0,"2026-10-24T09:00:00.000Z");
    assert.equal(future.inserted,true,
      "a previous visit suppressed the next independent meeting chance");
  }finally{
    experience.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


function groundedReconsiderationFixture({onInvoke=null}={}){
  const directory=mkdtempSync(join(tmpdir(),"fibre-reconsideration-"));
  const path=join(directory,"world.sqlite");
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:path}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage),lived=openLivedNowStore(storage);
  const experience=openLivedExperienceStore(storage);
  const people=["thr_reconsider_reader","thr_reconsider_neighbor"];
  for(const threadId of people){
    const thread=structuredClone(seed);
    thread.threadId=threadId;
    thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  const place=lived.admitPublicPlace({
    venueIdentity:"fixture:reconsider-library",
    displayName:"Observed library",streetAddress:"10 Library Street",
    locality:"Tucson",country:"United States",countryCode:"US",
    lat:32.22,long:-110.97,timeZone:"America/Phoenix",
    evidenceRef:"https://example.org/reconsider-library",
    affordances:["Reading","Conversation"],
  });
  const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
  function enact(threadId,at,activity,participantRefs=[]){
    const situation=normalizeCurrentSituation({
      situationId:"sit_"+threadId+"_"+at.replace(/[^0-9]/gu,""),
      threadId,establishedAt:at,phase:"at_place",
      location:{kind:"place",placeRef:place.ref},
      mediatedContext:null,activity,wakefulness:"awake",
      reason:"An independent reading visit.",participantRefs,
      evidenceRefs:["evt_"+threadId],sourcePlanRefs:["plan_"+threadId],
      resolution:{
        kind:"personal_plan",conflict:false,observedDivergence:false,
        governingPlanRef:"plan_"+threadId,constrainedPlanRef:null,
        summary:"An independently enacted visit.",
      },provenance:"world_enacted",
    });
    const json=canonicalJson(situation);
    db.prepare(`INSERT INTO current_situation_records
      (situation_id,thread_id,established_at,record_json,record_digest)
      VALUES (?,?,?,?,?)`).run(situation.situationId,threadId,at,json,
      "sha256:"+sha256(json));
    return situation;
  }
  const meeting=createSocialMeetingService({
    worldReader:world,livedNow:{async ensure(){
      throw Error("social reconsideration must not enact any life");
    }},
    livedNowStore:lived,
    identityStore:{getCurrentIdentityView:()=>({assertions:[]})},
    situatedLifeStore:{
      listCurrentLifeRelations:()=>[],listCurrentPlaceEpisodes:()=>[],
    },
    semanticStateStore:{listCurrentState:()=>[]},
    memoryStore:{listCurrentMemories:()=>[]},
    experienceStore:experience,boundedVenueDiscovery:true,
    modelAdapter:{
      async invoke(request){
        if(onInvoke===null)throw Error("unearned social decision spent cognition");
        return onInvoke(request);
      },
      async *streamExpression(){throw Error("unearned speech");},
    },
  });
  function close(){
    db.close();experience.close();lived.close();world.close();
    rmSync(directory,{recursive:true,force:true});
  }
  return {world,lived,experience,people,place,enact,meeting,close};
}

test("an activity change earns one independent social chance, not a timer",async()=>{
  const f=groundedReconsiderationFixture();
  try{
    const [reader,neighbor]=f.people;
    f.enact(neighbor,"2026-10-23T08:00:00.000Z","Reading quietly.");
    const previous=f.enact(reader,"2026-10-23T09:00:00.000Z",
      "Settling in with a book.");
    const next=f.enact(reader,"2026-10-23T10:00:00.000Z",
      "Finished the book and paused.");
    const args={
      situation:next,previous,thread:f.world.getThread(reader),
      livedNowStore:f.lived,experienceStore:f.experience,
      nextBoundaryAt:"2026-10-23T11:00:00.000Z",
    };
    assert.equal(enqueueEnactedSocialReconsideration(args).length,1,
      "changing activity among others did not earn a chance");
    assert.deepEqual(enqueueEnactedSocialReconsideration(args),[],
      "replaying one activity change created duplicate choice");
    assert.equal(f.experience.inspectSocialOpportunities(reader)
      .filter(x=>x.trigger==="activity_change").length,1,
    "activity change did not retain its single durable obligation");
    const process=createWorldSocialOpportunity({
      experienceStore:f.experience,livedNowStore:f.lived,
      meetingService:f.meeting,worldReader:f.world,
      now:()=>next.establishedAt,
    });
    const decision=await process.runOnce();
    assert.equal(decision.results[0].outcome,"background",
      "quiet co-presence forced a social decision");
    assert.equal(f.experience.inspectSocialOpportunities(reader)[0].decision
      ?.salience?.outcome,"background",
    "World discarded the Thread's unsalient choice context");
    const same=f.enact(reader,"2026-10-23T10:30:00.000Z",
      next.activity);
    assert.deepEqual(enqueueEnactedSocialReconsideration({
      ...args,situation:same,previous:next,nextBoundaryAt:"2026-10-23T11:00:00.000Z",
    }),[],"unchanged activity manufactured another social choice");
  }finally{f.close();}
});

test("a predicted social-need band is not a poll and can be invalidated by contact",async()=>{
  const f=groundedReconsiderationFixture();
  try{
    const [reader,neighbor]=f.people;
    const start="2026-10-23T05:00:00.000Z";
    f.enact(neighbor,start,"Reading.");
    f.enact(reader,start,"Reading.");
    const middle=f.enact(reader,"2026-10-23T12:00:00.000Z","Reading.");
    const present=f.enact(reader,"2026-10-23T17:00:00.000Z","Reading.");
    const waits=enqueueEnactedSocialReconsideration({
      situation:present,previous:middle,
      thread:f.world.getThread(reader),livedNowStore:f.lived,
      experienceStore:f.experience,
      nextBoundaryAt:"2026-10-24T01:00:00.000Z",
    });
    assert.deepEqual(waits,["2026-10-23T23:00:00.001Z"],
      "World did not predict the next grounded Body crossing");
    assert.equal(f.experience.listDueSocialOpportunities({
      at:"2026-10-23T22:59:59.000Z",
    }).length,0,"a future Body event became periodic social polling");
    const pressure={
      livedNowStore:f.lived,experienceStore:f.experience,
      thread:f.world.getThread(reader),situation:present,
      at:waits[0],band:0.6,
    };
    assert.equal(socialNeedBandReached(pressure),true,
      "the predicted crossing did not reach the actual Body regulator");
    f.experience.recordSocialInteraction({
      occurredAt:"2026-10-23T21:00:00.000Z",
      initiatorThreadId:reader,recipientThreadId:neighbor,
      initiatorSituationId:present.situationId,
      recipientSituationId:"sit_"+neighbor+"_"+start.replace(/[^0-9]/gu,""),
      requestText:"Would you like to chat?",responseDecision:"accept",
      responseExpression:"Yes.",suggestedAt:null,
    });
    assert.equal(socialNeedBandReached(pressure),false,
      "real contact did not reduce grounded social pressure");
    const process=createWorldSocialOpportunity({
      experienceStore:f.experience,livedNowStore:f.lived,
      meetingService:f.meeting,worldReader:f.world,now:()=>waits[0],
    });
    const result=await process.runOnce();
    assert.equal(result.results[0].outcome,"need_unreached",
      "a cancelled Body need still forced social cognition");
    assert.equal(f.experience.inspectSocialOpportunities(reader)[0].outcome,
      "need_unreached","World lost the truth of the predicted but unrealized need");
  }finally{f.close();}
});


test("a later voluntary choice recalls the Thread's own earlier silence",async()=>{
  let decisions=0;
  const f=groundedReconsiderationFixture({onInvoke:request=>{
    assert.equal(request.input?.concern?.kind,"social_initiation",
      "reconsideration did not reach ordinary social judgment");
    const prior=request.input.concern.externalContext.priorSocialChoicesThisVisit;
    assert.deepEqual(prior,[{
      at:"2026-10-23T09:00:00.000Z",act:"none",expression:null,
      reportedReason:"I wanted to finish my book first.",
    }],"the Thread's earlier choice disappeared from its social context");
    decisions++;
    return {
      output:{result:{
        act:"none",expression:null,experienceText:null,
        reason:"I still prefer to read.",
      },evidenceRefs:[],conflictingMotives:[],uncertainty:null},
      provenance:{provider:"fixture",modelId:"reconsideration-choice"},
    };
  }});
  try{
    const [reader,neighbor]=f.people;
    f.enact(neighbor,"2026-10-23T08:00:00.000Z","Reading.");
    const visit="2026-10-23T09:00:00.000Z";
    const old=f.enact(reader,visit,"Reading.",[neighbor]);
    f.enact(reader,"2026-10-23T10:00:00.000Z","Looking up.",[neighbor]);
    f.experience.enqueueSocialOpportunity({
      threadId:reader,situationId:old.situationId,dueAt:visit,
    });
    const claimed=f.experience.claimDueSocialOpportunity({at:visit});
    assert.ok(claimed,"the previous autonomous choice had no durable opportunity");
    f.experience.completeSocialOpportunity({
      situationId:old.situationId,at:visit,outcome:"not_initiated",
      decision:{
        counterpartyThreadId:neighbor,
        initiation:{act:"none",expression:null,
          reportedReason:"I wanted to finish my book first."},
      },
    });
    const result=await f.meeting.meet({
      initiatorThreadId:reader,
      at:"2026-10-23T10:00:00.000Z",
      counterpartyThreadId:neighbor,
      reconsiderationVisitSince:visit,
    });
    assert.equal(result.attempts[0].outcome,"not_initiated",
      "remembering a prior refusal forced a response");
    assert.equal(decisions,1,"one consideration spent multiple model calls");
  }finally{f.close();}
});

test("reconsideration bounds cognition by visit and by chosen counterpart",async()=>{
  const f=groundedReconsiderationFixture();
  try{
    const [reader,neighbor]=f.people;
    f.enact(neighbor,"2026-10-23T08:00:00.000Z","Reading.");
    let previous=f.enact(reader,"2026-10-23T09:00:00.000Z","Reading.");
    const results=[];
    for(const [i,time] of [
      "2026-10-23T10:00:00.000Z",
      "2026-10-23T10:15:00.000Z",
      "2026-10-23T10:30:00.000Z",
      "2026-10-23T10:45:00.000Z",
    ].entries()){
      const next=f.enact(reader,time,"Activity "+i);
      results.push(...enqueueEnactedSocialReconsideration({
        situation:next,previous,thread:f.world.getThread(reader),
        livedNowStore:f.lived,experienceStore:f.experience,
        nextBoundaryAt:"2026-10-23T11:00:00.000Z",
      }));
      previous=next;
    }
    assert.equal(results.length,3,
      "unbounded activity changes created too many choices in one visit");
    const social=createWorldSocialOpportunity({
      experienceStore:f.experience,livedNowStore:f.lived,
      meetingService:f.meeting,worldReader:f.world,
      now:()=>previous.establishedAt,
    });
    const choices=[];
    for(let i=0;i<3;i++){
      const result=await social.runOnce();
      choices.push(result.results[0]?.outcome);
    }
    assert.deepEqual(choices,["background","background","pair_limit"],
      "the same counterpart exceeded the bounded reconsideration limit");
    assert.equal(f.experience.listDueSocialOpportunities({
      at:previous.establishedAt,
    }).length,0,"completed reconsideration left a hot retry loop");
  }finally{f.close();}
});

test("an enacted arrival permits immediate voluntary consideration without forcing speech",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-natural-social-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const people=["thr_social_park","thr_social_cafe_visitor","thr_social_cafe_reader"];
  for(const threadId of people){
    const thread=structuredClone(seed);
    thread.threadId=threadId;
    thread.provenance.lastEventId=`evt_${threadId}`;
    world.seedThread(thread);
  }
  world.close();
  const experience=openLivedExperienceStore(storage);
  const situations=people.map((threadId,i)=>({
    threadId,situationId:`sit_social_${i}`,
    // The arriving visitor's immediate World event can expose a reader
    // who has already been there for an hour.
    establishedAt:i===2?"2026-10-13T18:00:00.000Z":AT,wakefulness:"awake",
    location:{kind:"place",placeRef:i===0?"wpl_park":"wpl_cafe"},
    activity:i===0?"Reading at the park.":"Enjoying a quiet café visit.",
  }));
  const invoked=[];
  const meetingService={
    async meet({initiatorThreadId,at}){
      invoked.push({initiatorThreadId,at});
      if(initiatorThreadId===people[2]){
        throw new Error("expression transport interrupted");
      }
      return {attempts:[{
        counterpartyThreadId:people[2],outcome:"not_initiated",
        salience:{outcome:"salient",anchors:["social_contact_pressure"],
          sourceReferences:["sit_social_1"],bodyAtGate:{
            asOf:AT,drives:[{family:"social_contact",orientation:"approach",
              pressure:0.6,evidenceRefs:["sit_social_1"]}],
          }},
        initiation:{act:"none",expression:null,reason:"I want quiet now.",
          decisionContext:{interoception:{
            asOf:AT,drives:[{family:"social_contact",pressure:0.6}],
            evidenceRefs:["sit_social_1"],
          },observedThreadId:people[2],recentPersonalExperienceRefs:[]},
          cognition:{selectedEvidenceRefs:["mem_private"],evidenceRefs:["mem_private"]}},
        stance:null,encounterStory:null,
      }]};
    },
  };
  const livedNowStore={
    inspectLivedBoundary:()=>null,
    getCurrentSituation(threadId){
      return situations.find(s=>s.threadId===threadId)??null;
    },
    getSituationAt:(threadId,at)=>situations.find(s=>
      s.threadId===threadId&&s.establishedAt<=at)??null,
    getPreviousSituation:()=>null,
    getWorldPlace(_threadId,ref){
      return {physicalVenue:{
        ref:ref==="wpl_park"?"venue_actual_park":"venue_actual_cafe",
      }};
    },
    listCurrentVenueSituations({venueRef,limit,at}){
      assert.ok(limit<=8&&at===AT,"social discovery exceeded its bounded venue query");
      return situations.filter(s=>s.location.placeRef===(venueRef==="venue_actual_park"?"wpl_park":"wpl_cafe"));
    },
  };
  try{
    for(const s of situations){
      const inserted=experience.enqueueSocialOpportunity({
        threadId:s.threadId,situationId:s.situationId,dueAt:AT,
      });
      assert.equal(inserted.inserted,true);
    }
    assert.equal(experience.enqueueSocialOpportunity({
      threadId:situations[1].threadId,
      situationId:situations[1].situationId,dueAt:AT,
    }).inserted,false,"one arrival earned more than one social consideration");

    const process=createWorldSocialOpportunity({
      experienceStore:experience,livedNowStore,meetingService,now:()=>AT,
    });
    const lonely=await process.runOnce();
    assert.equal(lonely.results[0].outcome,"no_co_presence",
      "an unrelated venue manufactured a counterpart");
    assert.equal(invoked.length,0,"no real co-presence spent meeting cognition");

    const ordinary=await process.runOnce();
    assert.equal(ordinary.results[0].outcome,"not_initiated",
      "Thread's choice not to approach was erased");
    assert.equal(invoked.length,1,"social opportunity summoned multiple initiators");
    assert.equal(experience.listSocialInteractions(people[1]).length,0,
      "private non-initiation manufactured reciprocal history");
    const witnessed=experience.inspectSocialOpportunities(people[1])[0];
    assert.equal(witnessed.decision.initiation.act,"none",
      "the Thread's non-action was not retained with its opportunity");
    assert.equal(witnessed.decision.initiation.decisionContext.interoception.drives[0].pressure,0.6,
      "actual decision-time Body input disappeared from the completed opportunity");
    assert.deepEqual(witnessed.decision.salience.anchors,["social_contact_pressure"],
      "salience was incorrectly collapsed into a motive");
    assert.equal(witnessed.decision.salience.bodyAtGate.drives[0].pressure,0.6,
      "completed opportunity discarded decision-time Body evidence");
    assert.equal(witnessed.decision.encounterRef,null,
      "a non-initiation manufactured a shared Encounter Story");

    const interrupted=await process.runOnce();
    assert.equal(interrupted.results[0].outcome,"interrupted",
      "uncertain outward contact was silently declared completed");
    const retry=await process.runOnce();
    assert.equal(retry.attempted,0,
      "a retry resampled a potentially already-delivered overture");
    assert.equal(invoked.length,2,"World retried private speech after interruption");
    assert.equal(experience.nextSocialOpportunityAt(),null,
      "completed or interrupted social decisions left recurring alarms");
    assert.deepEqual(
      experience.inspectSocialOpportunities(people[2]).map(x=>x.outcome),
      ["interrupted"],
      "uncertain contact was hidden instead of remaining inspectable",
    );
  }finally{
    experience.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


test("venue discovery reaches actual awake long-stayers beyond historical bindings",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-venue-presence-"));
  const path=join(directory,"world.sqlite");
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:path}}),
    stateScopeId:"world",
  };
  const historical=Array.from({length:32},(_,i)=>"thr_venue_history_"+String(i).padStart(2,"0"));
  const asleep="thr_venue_asleep";
  const reader="thr_venue_reader";
  const arriving="thr_venue_arriving";
  const threadIds=[...historical,asleep,reader,arriving];
  const venueRef="venue_library_attested";
  const placeRef="wpl_library_attested";
  let lived=null;
  try{
    const world=openWorldStore(storage);
    try{
      for(const threadId of threadIds){
        const person=structuredClone(seed);
        person.threadId=threadId;
        person.provenance.lastEventId="evt_"+threadId;
        world.seedThread(person);
      }
    }finally{world.close();}
    lived=openLivedNowStore(storage);
    const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
    try{
      const place={
        ref:placeRef,liveWorldRef:"lworld_venue_test",
        sourceWorldRef:"world_venue_test",sourcePlaceId:"library",
        placeKind:"library_or_learning",
        displayName:"An attested neighborhood library",
        authority:"live-world-place-admission-v1",
      };
      const placeJson=canonicalJson(place);
      db.prepare("INSERT INTO live_world_place_records("+
        "place_ref,live_world_ref,source_world_ref,source_place_id,place_kind,record_json,record_digest"+
        ") VALUES (?,?,?,?,?,?,?)").run(
        placeRef,place.liveWorldRef,place.sourceWorldRef,place.sourcePlaceId,
        place.placeKind,placeJson,"sha256:"+sha256(placeJson),
      );
      const bind=db.prepare("INSERT INTO live_physical_venue_bindings("+
        "thread_id,context_place_ref,venue_ref,display_name,locality,country,evidence_ref"+
        ") VALUES (?,?,?,?,?,?,?)");
      for(const threadId of threadIds){
        bind.run(threadId,placeRef,venueRef,"Neighborhood Library","Tucson","US","fixture-venue-attestation");
      }
      const record=db.prepare("INSERT INTO current_situation_records("+
        "situation_id,thread_id,established_at,record_json,record_digest"+
        ") VALUES (?,?,?,?,?)");
      for(const [threadId,establishedAt,wakefulness] of [
        [asleep,"2026-10-13T18:45:00.000Z","asleep"],
        [reader,"2026-10-13T16:00:00.000Z","awake"],
        [arriving,"2026-10-13T19:00:00.000Z","awake"],
      ]){
        const situation=normalizeCurrentSituation({
          situationId:"sit_"+threadId,threadId,establishedAt,
          phase:"at_place",location:{kind:"place",placeRef},
          mediatedContext:null,activity:"Spending time at the library.",
          wakefulness,reason:"World-enacted visit.",
          participantRefs:[],evidenceRefs:["evt_"+threadId],
          sourcePlanRefs:["plan_"+threadId],
          resolution:{
            kind:"personal_plan",conflict:false,observedDivergence:false,
            governingPlanRef:"plan_"+threadId,
            constrainedPlanRef:null,summary:"At the planned library.",
          },
          provenance:"world_enacted",
        });
        const body=canonicalJson(situation);
        record.run(situation.situationId,threadId,establishedAt,body,"sha256:"+sha256(body));
      }
    }finally{db.close();}
    const present=lived.listCurrentVenueSituations({
      venueRef,at:AT,limit:1,excludeThreadId:arriving,
    });
    assert.deepEqual(present.map((situation)=>situation.threadId),[reader],
      "real long-staying company was hidden by historical bindings or sleep");
    assert.equal(present[0].establishedAt,"2026-10-13T16:00:00.000Z",
      "venue discovery discarded the independently enacted long stay");
    assert.deepEqual(lived.listCurrentSituations({at:AT,livingOnly:true})
      .map(situation=>situation.threadId).sort(),[asleep,reader,arriving].sort(),
      "current World lost one of its enacted people");
    assert.deepEqual(lived.listCurrentSituations({
      at:"2026-10-13T17:00:00.000Z",livingOnly:true,
    }).map(situation=>situation.threadId),[reader],
      "later enactments rewrote who was present earlier");
    assert.deepEqual(lived.listCurrentVenueSituations({
      venueRef,at:"2026-10-13T15:00:00.000Z",excludeThreadId:arriving,
    }),[],"future presence was mistaken for current co-presence");
  }finally{
    lived?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


test("independently admitted public places reveal only actual same-venue visitors",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-public-venue-presence-"));
  const path=join(directory,"world.sqlite");
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:path}}),
    stateScopeId:"world",
  };
  const reader="thr_public_reader",visitor="thr_public_visitor";
  let lived=null;
  try{
    const world=openWorldStore(storage);
    try{
      for(const threadId of [reader,visitor]){
        const person=structuredClone(seed);
        person.threadId=threadId;
        person.provenance.lastEventId="evt_"+threadId;
        world.seedThread(person);
      }
    }finally{world.close();}
    lived=openLivedNowStore(storage);
    const library=lived.admitPublicPlace({
      venueIdentity:"fixture:independent-public-library",
      displayName:"Public city library",
      streetAddress:"7 Public Reading Street, Tbilisi",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.697,long:44.801,timeZone:"Asia/Tbilisi",
      evidenceRef:"https://example.org/public-library",
      affordances:["Reading","Research"],
    });
    const db=new DatabaseSync(path,{enableForeignKeyConstraints:true});
    try{
      const insert=db.prepare(
        "INSERT INTO current_situation_records("+
        "situation_id,thread_id,established_at,record_json,record_digest"+
        ") VALUES (?,?,?,?,?)"
      );
      function witness(threadId,at,phase,placeRef){
        const staying=phase==="at_place";
        const situation=normalizeCurrentSituation({
          situationId:"sit_public_"+threadId+"_"+at.slice(11,16).replace(":",""),
          threadId,establishedAt:at,phase,
          location:staying?{kind:"place",placeRef}
            :{kind:"transit",fromPlaceRef:library.ref,toPlaceRef:"per:home:1",progress:0.5},
          mediatedContext:null,activity:staying?"Quiet reading.":"Returning home.",
          wakefulness:"awake",reason:"Ordinary personal life.",
          participantRefs:[],evidenceRefs:["evt_"+threadId],
          sourcePlanRefs:["lplan_"+threadId],
          resolution:{
            kind:"personal_plan",conflict:false,observedDivergence:false,
            governingPlanRef:"lplan_"+threadId,
            constrainedPlanRef:null,summary:"Independent World presence.",
          },
          provenance:"world_enacted",
        });
        const body=canonicalJson(situation);
        insert.run(situation.situationId,threadId,at,body,"sha256:"+sha256(body));
      }
      witness(reader,"2026-10-13T16:00:00.000Z","at_place",library.ref);
      witness(visitor,"2026-10-13T18:00:00.000Z","at_place",library.ref);
      witness(visitor,"2026-10-13T20:00:00.000Z","in_transit",null);
    }finally{db.close();}
    const venueRef=library.physicalVenue.ref;
    assert.deepEqual(lived.listCurrentVenueSituations({
      venueRef,at:"2026-10-13T17:00:00.000Z",excludeThreadId:reader,
    }),[],"a future arrival was manufactured as company");
    assert.deepEqual(lived.listCurrentVenueSituations({
      venueRef,at:"2026-10-13T19:00:00.000Z",excludeThreadId:reader,
    }).map(situation=>situation.threadId),[visitor],
    "a second independent visitor was invisible at a shared public venue");
    assert.deepEqual(lived.listCurrentVenueSituations({
      venueRef,at:"2026-10-13T21:00:00.000Z",excludeThreadId:reader,
    }),[],"someone who departed remained available for a meeting");
  }finally{
    lived?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});

test("arrival exactly as another Thread leaves never creates a missed social window",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-zero-social-overlap-"));
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:join(dir,"world.sqlite")}}),stateScopeId:"world"};
  const world=openWorldStore(storage);
  const ids=["thr_tie_arrives","thr_tie_leaves"];
  for(const threadId of ids){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  world.close();
  const store=openLivedExperienceStore(storage);
  const due="2026-10-22T17:00:00.000Z";
  const placeRef="wpl_tie_venue",venueRef="venue_tie";
  const arrival={threadId:ids[0],situationId:"sit_tie_arrival",
    establishedAt:due,wakefulness:"awake",
    location:{kind:"place",placeRef}};
  const departure={threadId:ids[1],situationId:"sit_tie_departure",
    establishedAt:due,wakefulness:"awake",
    location:{kind:"transit",fromPlaceRef:placeRef,toPlaceRef:"per:home"}};
  let modelCalls=0;
  try{
    store.enqueueSocialOpportunity({
      threadId:ids[0],situationId:arrival.situationId,dueAt:due,
    });
    const livedNowStore={
      inspectLivedBoundary:()=>null,
      getCurrentSituation:id=>id===ids[0]?arrival:departure,
      getSituationAt:id=>id===ids[0]?arrival:departure,
      getPreviousSituation:()=>null,
      getWorldPlace:(_id,ref)=>ref===placeRef?{physicalVenue:{ref:venueRef}}:null,
      listCurrentVenueSituations:()=>[arrival],
    };
    const process=createWorldSocialOpportunity({
      experienceStore:store,livedNowStore,
      meetingService:{async meet(){modelCalls++;throw Error("false conversation");}},
      now:()=>due,
    });
    assert.equal((await process.runOnce()).results[0].outcome,"no_co_presence",
      "simultaneous departure manufactured a missed meeting");
    assert.equal(modelCalls,0,"zero-length overlap reached social cognition");
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test("a witnessed short overlap expires without inventing a social refusal or conversation",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-missed-social-window-"));
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:join(dir,"world.sqlite")}}),stateScopeId:"world"};
  const world=openWorldStore(storage);
  const ids=["thr_social_visitor","thr_social_witness"];
  for(const threadId of ids){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  world.close();
  const store=openLivedExperienceStore(storage);
  const due="2026-10-21T11:15:00.063Z";
  const left="2026-10-21T11:15:04.841Z";
  const considered="2026-10-21T11:15:13.646Z";
  const venueRef="venue_dedaena";
  const visit=(threadId,situationId,at)=>({
    threadId,situationId,establishedAt:at,wakefulness:"awake",
    location:{kind:"place",placeRef:"wpl_dedaena"},
  });
  const visitor=visit(ids[0],"sit_social_visitor_arrived",due);
  const witness=visit(ids[1],"sit_social_witness_present","2026-10-21T09:15:00.005Z");
  const departure={
    ...witness,situationId:"sit_social_witness_left",establishedAt:left,
    location:{kind:"transit",fromPlaceRef:"wpl_dedaena",toPlaceRef:"per:home"},
  };
  let meetingCalls=0;
  const livedNowStore={
    inspectLivedBoundary:()=>null,
    getCurrentSituation:threadId=>threadId===ids[0]?visitor:departure,
    getSituationAt:(threadId,at)=>threadId===ids[0]?visitor
      :at<left?witness:departure,
    getPreviousSituation:(threadId)=>threadId===ids[1]?witness:null,
    getWorldPlace:(_id,ref)=>ref==="wpl_dedaena"
      ?{physicalVenue:{ref:venueRef}}:null,
    listCurrentVenueSituations:({venueRef:venue,at,excludeThreadId})=>{
      assert.equal(venue,venueRef,"social window examined an unrelated venue");
      const present=Date.parse(at)<Date.parse(left)?[visitor,witness]:[visitor];
      return present.filter(s=>s.threadId!==excludeThreadId);
    },
  };
  try{
    store.enqueueSocialOpportunity({
      threadId:ids[0],situationId:visitor.situationId,dueAt:due,
    });
    const story={
      storyVersion:"encounter-story-v0.1",
      beats:[{actorThreadId:visitor.threadId,kind:"action",
        text:"A Thread arrives at the park."}],
    };
    const admitted=store.recordEncounterStory({
      occurredAt:due,
      threadPresence:[
        {threadId:visitor.threadId,situationId:visitor.situationId},
        {threadId:witness.threadId,situationId:witness.situationId},
      ],
      story,
      visualization:createEncounterVisualization({
        occurredAt:due,story,scene:"At the shared park.",
        sourceReferences:[visitor.situationId,venueRef],
        depictedThreadRefs:[],
      }),
    });
    store.recordThreadEncounterAttention({
      threadId:witness.threadId,encounterRef:admitted.encounterId,
      situationId:witness.situationId,occurredAt:due,
      outcome:"noticed",experienceText:"I noticed someone arrive.",
    });
    store.enqueueObservedSocialOpportunity({
      encounterRef:admitted.encounterId,threadId:ids[1],
      situationId:witness.situationId,counterpartyThreadId:ids[0],
      venueRef,dueAt:due,
    });
    const process=createWorldSocialOpportunity({
      experienceStore:store,livedNowStore,
      meetingService:{async meet(){meetingCalls++;throw Error("retroactive speech");}},
      now:()=>considered,
    });
    assert.equal((await process.runOnce()).results[0].outcome,"missed_window",
      "arrival's historical company was erased by a later departure");
    assert.equal((await process.runOnce()).results[0].outcome,"missed_window",
      "the witness's noticed arrival became a false lack of company");
    assert.equal(meetingCalls,0,"social cognition occurred after the person left");
    const recorded=ids.map(id=>store.inspectSocialOpportunities(id)[0]);
    assert.ok(recorded.every(row=>row.outcome==="missed_window"
      &&row.decision===null&&row.startedAt===considered),
    "a missed encounter was attributed to private social refusal");
    assert.equal((await process.runOnce()).attempted,0,
      "missed encounters were rescheduled after closure");
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test("sustained shared presence reaches voluntary social consideration without forcing contact",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"fibre-sustained-social-"));
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:join(dir,"world.sqlite")}}),stateScopeId:"world"};
  const world=openWorldStore(storage);
  const ids=["thr_social_arrival","thr_social_reader"];
  for(const threadId of ids){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  world.close();
  const store=openLivedExperienceStore(storage);
  const due="2026-10-21T11:15:00.063Z";
  const considered="2026-10-21T11:30:00.063Z"; // both remain for 15 minutes
  const venueRef="venue_cafe";
  const arrival={
    threadId:ids[0],situationId:"sit_long_arrival",establishedAt:due,
    wakefulness:"awake",location:{kind:"place",placeRef:"wpl_cafe"},
  };
  const reader={
    threadId:ids[1],situationId:"sit_long_reader",
    establishedAt:"2026-10-21T10:15:00.063Z",
    wakefulness:"awake",location:{kind:"place",placeRef:"wpl_cafe"},
  };
  // Another observation previously rotated this person's situation ID,
  // even though they never left the same venue.
  const refreshed={...arrival,situationId:"sit_long_same_venue",
    establishedAt:"2026-10-21T11:20:00.063Z"};
  let attempts=0;
  const livedNowStore={
    inspectLivedBoundary:()=>null,
    getCurrentSituation:id=>id===ids[0]?refreshed:reader,
    getSituationAt:(id,at)=>id===ids[0]?(at>=refreshed.establishedAt?refreshed:arrival):reader,
    getPreviousSituation:(id,before)=>id===ids[0]&&before>arrival.establishedAt
      ?arrival:null,
    getWorldPlace:()=>({physicalVenue:{ref:venueRef}}),
    listCurrentVenueSituations:({at,excludeThreadId})=>{
      assert.equal(at,considered,"shared presence was decided at historical time");
      return [arrival,reader].filter(s=>s.threadId!==excludeThreadId);
    },
  };
  try{
    store.enqueueSocialOpportunity({
      threadId:arrival.threadId,situationId:arrival.situationId,dueAt:due,
    });
    const process=createWorldSocialOpportunity({
      experienceStore:store,livedNowStore,now:()=>considered,
      meetingService:{async meet(input){
        attempts++;
        assert.equal(input.initiatorThreadId,arrival.threadId,
          "an arrival gave the other person's agency to the initiator");
        return {attempts:[{
          counterpartyThreadId:reader.threadId,outcome:"not_initiated",
          salience:{outcome:"salient",anchors:["co_present_person"],
            sourceReferences:[reader.situationId],bodyAtGate:null},
          initiation:{act:"none",expression:null,reason:"I prefer to keep reading.",
            decisionContext:null,cognition:{selectedEvidenceRefs:[],evidenceRefs:[]}},
          stance:null,encounterStory:null,
        }]};
      }},
    });
    assert.equal((await process.runOnce()).results[0].outcome,"not_initiated",
      "an unchanged venue visit lost eligibility when its situation ID changed");
    assert.equal(attempts,1,"shared company triggered repeated social cognition");
    const record=store.inspectSocialOpportunities(arrival.threadId)[0];
    assert.equal(record.decision.initiation.act,"none",
      "the Thread's right not to initiate was erased");
    assert.equal(record.decision.encounterRef,null,
      "a non-initiation created fictitious conversation history");
    assert.equal(record.startedAt,considered,
      "the actual time of consideration was lost");
    assert.equal((await process.runOnce()).attempted,0,
      "a completed voluntary judgment was invoked twice");
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test("unrelated life debt and Genesis cannot consume another venue's arrival or social chance",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-independent-venues-"));
  const databasePath=join(directory,"world.sqlite");
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:databasePath}}),stateScopeId:"world"};
  const ids=["thr_debt_arrival","thr_debt_reader","thr_free_arrival","thr_free_reader"];
  const world=openWorldStore(storage);
  const people=new Map();
  for(const threadId of ids){
    const person=structuredClone(seed);
    person.threadId=threadId;person.provenance.lastEventId="evt_"+threadId;
    world.seedThread(person);people.set(threadId,person);
  }
  world.close();
  const lived=openLivedNowStore(storage);
  const experience=openLivedExperienceStore(storage);
  try{
    const place=(label,number)=>lived.admitPublicPlace({
      venueIdentity:"fixture:life-debt-"+label,
      displayName:label+" public café",
      streetAddress:number+" Example Street, Tucson",
      locality:"Tucson",country:"United States",countryCode:"US",
      lat:32.22+number/10000,long:-110.97,
      timeZone:"America/Phoenix",evidenceRef:"https://example.org/"+label,
      affordances:["Conversation","Reading"],
    });
    const blockedPlace=place("debt",21),freePlace=place("free",22);
    const due="2026-10-21T11:15:00.000Z";
    const freeDue="2026-10-21T11:15:01.000Z";
    const decisionAt="2026-10-21T11:18:00.000Z";
    const scenes=new Map();
    const database=new DatabaseSync(databasePath,{enableForeignKeyConstraints:true});
    try{
      const insert=database.prepare(`INSERT INTO current_situation_records
        (situation_id,thread_id,established_at,record_json,record_digest)
        VALUES (?,?,?,?,?)`);
      for(const [threadId,placeRef,establishedAt] of [
        [ids[0],blockedPlace.ref,due],
        [ids[1],blockedPlace.ref,"2026-10-21T10:00:00.000Z"],
        [ids[2],freePlace.ref,freeDue],
        [ids[3],freePlace.ref,"2026-10-21T10:00:00.000Z"],
      ]){
        const situation=normalizeCurrentSituation({
          situationId:"sit_"+threadId,threadId,establishedAt,
          phase:"at_place",location:{kind:"place",placeRef},
          mediatedContext:null,activity:"Reading at a café.",
          wakefulness:"awake",reason:"An independent visit.",
          participantRefs:[],evidenceRefs:["evt_"+threadId],
          sourcePlanRefs:["plan_"+threadId],
          resolution:{
            kind:"personal_plan",conflict:false,observedDivergence:false,
            governingPlanRef:"plan_"+threadId,
            constrainedPlanRef:null,summary:"An independently enacted visit.",
          },
          provenance:"world_enacted",
        });
        const json=canonicalJson(situation);
        insert.run(situation.situationId,threadId,establishedAt,json,
          "sha256:"+sha256(json));
        scenes.set(threadId,situation);
      }
    }finally{database.close();}
    for(const [arrival,witness,worldPlace,at] of [
      [ids[0],ids[1],blockedPlace,due],
      [ids[2],ids[3],freePlace,freeDue],
    ]){
      experience.enqueueArrivalPerception({
        situationId:scenes.get(arrival).situationId,
        venueRef:worldPlace.physicalVenue.ref,dueAt:at,
        witnesses:[{threadId:witness,situationId:scenes.get(witness).situationId}],
      });
      experience.enqueueSocialOpportunity({
        threadId:arrival,situationId:scenes.get(arrival).situationId,
        dueAt:at,
      });
    }
    const blockedDue="2026-10-21T11:17:00.000Z";
    lived.scheduleNextLivedBoundary({
      threadId:ids[0],situationId:scenes.get(ids[0]).situationId,
      dueAt:blockedDue,
    });
    lived.failLivedBoundary({
      threadId:ids[0],situationId:scenes.get(ids[0]).situationId,
      dueAt:blockedDue,at:blockedDue,message:"Life needs another attempt.",
    });
    assert.equal(lived.inspectLivedBoundary(ids[0]).failedAttempts,1);
    let attemptedLifeEnactment=0;
    const arrival=createWorldArrivalPerception({
      experienceStore:experience,livedNowStore:lived,
      worldReader:{getThread:id=>structuredClone(people.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke(){
        return {output:{outcome:"not_noticed",experienceText:null},
          provenance:{provider:"fixture",modelId:"no-attention"}};
      }},
      now:()=>decisionAt,
    });
    const meetingService=createSocialMeetingService({
      worldReader:{getThread:id=>structuredClone(people.get(id)??null)},
      livedNow:{async ensure(){
        attemptedLifeEnactment++;
        throw Error("social decision must not enact a life");
      }},
      livedNowStore:lived,
      identityStore:{getCurrentIdentityView:()=>({assertions:[]})},
      situatedLifeStore:{
        listCurrentLifeRelations:()=>[],listCurrentPlaceEpisodes:()=>[],
      },
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      experienceStore:experience,
      modelAdapter:{
        async invoke(){throw Error("ordinary quiet co-presence forced cognition");},
        async *streamExpression(){throw Error("ordinary quiet scene forced speech");},
      },
      boundedVenueDiscovery:true,
    });
    const social=createWorldSocialOpportunity({
      experienceStore:experience,livedNowStore:lived,now:()=>decisionAt,
      meetingService,
    });
    const process=createWorldReconciliationProcess({
      firstLifeProcess:{async runOnce(){
        return {hasDue:true,attempted:1,failed:0,nextDueAt:decisionAt};
      }},
      livedBoundaryProcess:{async runOnce(){
        return {hasDue:true,attempted:0,failed:0,nextDueAt:decisionAt};
      }},
      environmentEvolutionProcess:arrival,
      socialOpportunityProcess:social,
    });
    const premature=await social.runOnce();
    assert.equal(premature.attempted,0,
      "social decision spent the arrival chance before perception completed");
    assert.equal(experience.inspectSocialOpportunities(ids[2])[0].startedAt,null,
      "social choice bypassed unspent arrival attention");
    const result=await process.runOnce();
    assert.equal(result.environmentEvolution.result.results[0].outcome,"recorded",
      "other venue's failed life suppressed real arrival perception");
    assert.equal(result.socialOpportunity.result.results[0].outcome,"background",
      "first-life backlog suppressed an independent social decision");
    assert.equal(attemptedLifeEnactment,0,
      "automatic social consideration advanced someone else's lived history");
    assert.equal(experience.inspectSocialOpportunities(ids[0])[0].startedAt,null,
      "failed life consumed its pending social chance");
    assert.equal(experience.nextArrivalPerceptionAt(),null,
      "deferred perception repeatedly woke unrelated World cognition");
    assert.equal(experience.inspectSocialOpportunities(ids[2])[0].outcome,
      "background","World failed to record a voluntary quiet social judgment");
    // The reader's only current company is the person whose life failed.
    // This is uncertainty, not absence of company or permission to spend
    // a one-shot meeting opportunity.
    experience.enqueueSocialOpportunity({
      threadId:ids[1],situationId:scenes.get(ids[1]).situationId,
      dueAt:"2026-10-21T10:00:00.000Z",
    });
    const deferred=await process.runOnce();
    assert.equal(deferred.socialOpportunity.result.attempted,0,
      "a blocked counterparty triggered irreversible social judgment");
    assert.equal(experience.inspectSocialOpportunities(ids[1])[0].outcome,
      "pending","unresolved company was recorded as no co-presence");
    assert.equal(experience.inspectSocialOpportunities(ids[1])[0].startedAt,
      null,"a pending social chance was claimed before life recovery");
    // Life recovers through its existing authoritative re-arm. The same
    // persisted social chance now becomes decidable, even when too old
    // to justify starting new conversation.
    lived.scheduleNextLivedBoundary({
      threadId:ids[0],situationId:scenes.get(ids[0]).situationId,
      dueAt:"2026-10-21T11:50:00.000Z",
    });
    assert.equal(lived.inspectLivedBoundary(ids[0]).failedAttempts,0,
      "recovered life retained failed status");
    const recovered=await process.runOnce();
    assert.equal(recovered.socialOpportunity.result.results[0]?.outcome,
      "expired","a recovered life stranded its deferred social opportunity");
    assert.equal(experience.inspectSocialOpportunities(ids[1])[0].outcome,
      "expired","the same social chance was not resolved after recovery");
  }finally{
    experience.close();lived.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


test("only actual acquaintance reveals a name in an ordinary perceived person",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-identity-familiarity-"));
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:join(directory,"world.sqlite")}}),stateScopeId:"world"};
  const ids=["thr_observing_witness","thr_unfamiliar_person"];
  const world=openWorldStore(storage);
  for(const threadId of ids){
    const thread=structuredClone(seed);
    thread.threadId=threadId;thread.provenance.lastEventId="evt_"+threadId;
    world.seedThread(thread);
  }
  world.close();
  const store=openLivedExperienceStore(storage);
  const at="2026-10-22T12:00:00.000Z";
  const situation={threadId:ids[1],situationId:"sit_unfamiliar_person",
    establishedAt:at,wakefulness:"awake",
    location:{kind:"place",placeRef:"wpl_public_cafe"},
    activity:"Reading a book."};
  try{
    const observe=(relations)=>projectSituatedPercept({
      observerThreadId:ids[0],
      situation:{...situation,threadId:ids[0],
        situationId:"sit_observing_witness"},
      observedThreads:[{threadId:ids[1],name:"Aisha N.",situation}],
      situatedLifeStore:{
        listCurrentPlaceEpisodes:()=>[],
        listCurrentLifeRelations:()=>relations,
      },
      experienceStore:store,
    }).observed[0];
    const unknown=observe([]);
    assert.equal(unknown.name,null,"a stranger inherited an unearned name");
    assert.match(unknown.observableDescription,/a person/,
      "missing public embodiment invented physical attributes");
    const related=observe([{
      relatedParty:{kind:"thread",partyId:ids[1]},
    }]);
    assert.equal(related.name,"Aisha N.",
      "established acquaintance lost the person's known name");
    const previous="2026-10-21T12:00:00.000Z";
    store.recordSocialInteraction({
      occurredAt:previous,
      initiatorThreadId:ids[0],recipientThreadId:ids[1],
      initiatorSituationId:"sit_prior_observer",
      recipientSituationId:"sit_prior_person",
      requestText:"Would you like to talk?",
      responseDecision:"accept",
      responseExpression:"Yes.",suggestedAt:null,
    });
    assert.equal(observe([]).name,null,
      "a request accepted without an encounter taught an unearned name");
    const priorStory={storyVersion:"encounter-story-v0.1",
      beats:[{actorThreadId:ids[0],kind:"utterance",text:"Hello there."}]};
    store.recordEncounterStory({
      occurredAt:previous,
      threadPresence:[
        {threadId:ids[0],situationId:"sit_prior_observer"},
        {threadId:ids[1],situationId:"sit_prior_person"},
      ],
      story:priorStory,
      visualization:createEncounterVisualization({
        occurredAt:previous,story:priorStory,scene:"At a shared table.",
        sourceReferences:["sit_prior_observer"],depictedThreadRefs:[],
      }),
    });
    assert.equal(observe([]).name,"Aisha N.",
      "an actual admitted meeting failed to establish familiarity");
    const description=observablePerson({
      threadId:ids[1],situation,observerThreadId:ids[0],
      name:"Aisha N.",experienceStore:store,
      situatedLifeStore:{listCurrentLifeRelations:()=>[]},
    });
    assert.equal(description.name,"Aisha N.",
      "the actual admitted meeting did not establish name knowledge");
  }finally{store.close();rmSync(directory,{recursive:true,force:true});}
});
