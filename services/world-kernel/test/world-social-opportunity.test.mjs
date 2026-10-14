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
const AT="2026-10-13T19:01:00.000Z";

test("ordinary shared presence permits a single voluntary consideration, not a scheduled conversation",async()=>{
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
    establishedAt:"2026-10-13T19:00:00.000Z",wakefulness:"awake",
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
      return {attempts:[{outcome:"not_initiated"}]};
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
