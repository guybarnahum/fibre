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
import { createWorldSocialOpportunity } from "../src/world-social-opportunity.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-13T19:00:00.000Z";

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
        initiation:{decision:"not_initiate",reason:"I want quiet now.",
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
    getCurrentSituation(threadId){
      return situations.find(s=>s.threadId===threadId)??null;
    },
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
    assert.equal(witnessed.decision.initiation.decision,"not_initiate",
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
    getCurrentSituation:threadId=>threadId===ids[0]?visitor:departure,
    getSituation:id=>[visitor,witness].find(s=>s.situationId===id)??null,
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
    store.enqueueObservedSocialOpportunity({
      encounterRef:"story_dedaena_arrival",threadId:ids[1],
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
  let attempts=0;
  const livedNowStore={
    getCurrentSituation:id=>id===ids[0]?arrival:reader,
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
          initiation:{decision:"not_initiate",reason:"I prefer to keep reading.",
            decisionContext:null,cognition:{selectedEvidenceRefs:[],evidenceRefs:[]}},
          stance:null,encounterStory:null,
        }]};
      }},
    });
    assert.equal((await process.runOnce()).results[0].outcome,"not_initiated",
      "a sustained shared visit never reached the voluntary decision path");
    assert.equal(attempts,1,"shared company triggered repeated social cognition");
    const record=store.inspectSocialOpportunities(arrival.threadId)[0];
    assert.equal(record.decision.initiation.decision,"not_initiate",
      "the Thread's right not to initiate was erased");
    assert.equal(record.decision.encounterRef,null,
      "a non-initiation created fictitious conversation history");
    assert.equal(record.startedAt,considered,
      "the actual time of consideration was lost");
    assert.equal((await process.runOnce()).attempted,0,
      "a completed voluntary judgment was invoked twice");
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
