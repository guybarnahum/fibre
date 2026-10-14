import assert from "node:assert/strict";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createWorldEnvironmentOpportunity,worldStayOpportunityDueAt } from "../src/world-environment-opportunity.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-08T17:24:00.000Z";
const DUE="2026-10-08T17:25:00.000Z";

test("an enacted arrival earns at most one observable event or an ordinary no_change",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-world-arrival-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const threads=new Map();
  const situations=new Map();
  const world=openWorldStore(storage);
  for(const [i,situationId] of ["sit_arrival_a","sit_arrival_b"].entries()){
    const thread=structuredClone(seed);
    thread.threadId=`thr_world_arrival_${i}`;
    thread.provenance.lastEventId=`evt_world_arrival_${i}`;
    world.seedThread(thread);
    threads.set(thread.threadId,thread);
    situations.set(situationId,{
      threadId:thread.threadId,situationId,establishedAt:AT,
      location:{kind:"place",placeRef:`wpl_home_study_${i}`},
      activity:"Reading at home.",
    });
  }
  world.close();
  const experience=openLivedExperienceStore(storage);
  try{
    const all=[...situations.values()];
    for(const situation of all){
      const first=experience.enqueueEnvironmentalOpportunity({
        threadId:situation.threadId,situationId:situation.situationId,dueAt:DUE,
      });
      const second=experience.enqueueEnvironmentalOpportunity({
        threadId:situation.threadId,situationId:situation.situationId,dueAt:DUE,
      });
      assert.equal(first.inserted,true,"newly enacted life did not earn an opportunity");
      assert.equal(second.inserted,false,"same situation earned duplicate opportunities");
    }
    const calls=[];
    const queued=[];
    const process=createWorldEnvironmentOpportunity({
      experienceStore:experience,
      livedNowStore:{
        getSituation:(id)=>structuredClone(situations.get(id)??null),
        getCurrentSituation:(id)=>structuredClone(
          all.find((item)=>item.threadId===id)??null,
        ),
        getWorldPlace:()=>({ref:"wpl_home",displayName:
          "Homework is done at a dining table or on a bed."}),
        listRecentCurrentSituations:()=>structuredClone(all),
      },
      worldReader:{getThread:(id)=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      onExperienceQueued:async(item)=>queued.push(item.experienceId),
      modelAdapter:{
        async invoke(request){
          calls.push(request.clientRequestId);
          if(request.clientRequestId.startsWith("world-initial-opportunity_")){
            assert.equal(request.input.initiatingSituation.physicalVenue,null,
              "home study incorrectly became a public venue");
            const isFirst=request.input.initiatingSituation.situationId==="sit_arrival_a";
            return {output:{
              outcome:isFirst?"changed":"no_change",
              occurrenceText:isFirst?"A gust rattles the nearby window.":null,
              potentialObserverThreadIds:isFirst?[all[0].threadId]:[],
            }};
          }
          if(request.clientRequestId.startsWith("encounter-attention_")){
            return {output:{
              outcome:"noticed",experienceText:"I hear the window rattle.",
            },provenance:{provider:"fixture",modelId:"attention"}};
          }
          throw new Error("unexpected World cognition");
        },
      },
      now:()=>DUE,
    });

    const first=await process.runOnce();
    const second=await process.runOnce();
    assert.equal(first.failed+second.failed,0,
      "bounded World initial opportunity failed");
    assert.equal(first.results[0].outcome,"changed",
      "ordinary physical scene was unable to admit a perceptible change");
    assert.equal(second.results[0].outcome,"no_change",
      "World forced an event from an ordinary quiet scene");
    const story=experience.listEncounterStories(all[0].threadId);
    assert.equal(story.length,1,"one lived situation produced multiple World stories");
    assert.deepEqual(story[0].threadPresence,[{
      threadId:all[0].threadId,situationId:all[0].situationId,
    }],"private home setting invited an unrelated Thread");
    assert.equal(experience.getThreadEncounterAttention(
      all[0].threadId,story[0].encounterId,
    )?.outcome,"noticed","World occurrence did not become private attention");
    assert.equal(experience.listEncounterStories(all[1].threadId).length,0,
      "a no-change decision fabricated objective history");
    assert.equal(experience.nextEnvironmentalOpportunityAt(),null,
      "completed World opportunity left a polling wake");
    const noScene=experience.enqueueEnvironmentalOpportunity({
      threadId:all[0].threadId,situationId:"sit_e7_nonexistent",dueAt:DUE,
    });
    assert.equal(noScene.inserted,true);
    const rejected=await process.runOnce();
    assert.equal(rejected.results[0].outcome,"not_observable",
      "an absent lived scene became a World event");
    await process.runOnce();
    assert.equal(calls.filter((id)=>id.startsWith("world-initial-opportunity_")).length,2,
      "World spent cognition on a missing scene or resampled settled history");
    assert.equal(queued.length,1,
      "only independently noticed Experience may enter selective consolidation");
  }finally{
    experience.close();rmSync(directory,{recursive:true,force:true});
  }
});


test("an extended stay earns one independent World event consideration after a quiet arrival",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-world-extended-stay-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const arrive="2026-10-08T10:00:00.000Z";
  const arrivalDue="2026-10-08T10:01:00.000Z";
  const stayDue="2026-10-08T12:00:00.000Z";
  const people=["thr_world_stay_a","thr_world_stay_b"];
  const world=openWorldStore(storage);
  const threads=new Map(people.map((threadId)=> {
    const thread={...structuredClone(seed),threadId};
    thread.provenance.lastEventId=`evt_${threadId}`;
    world.seedThread(thread);
    return [threadId,thread];
  }));
  world.close();
  const first={
    threadId:people[0],situationId:"sit_long_stay_a",establishedAt:arrive,
    wakefulness:"awake",activity:"Reading near the café window.",
    location:{kind:"place",placeRef:"wpl_long_cafe"},
  };
  const second={
    threadId:people[1],situationId:"sit_cafe_arrival_b",
    establishedAt:"2026-10-08T11:45:00.000Z",
    activity:"Having a quiet coffee.",wakefulness:"awake",
    location:{kind:"place",placeRef:"wpl_long_cafe"},
  };
  const situations=new Map([first,second].map(item=>[item.situationId,item]));
  const store=openLivedExperienceStore(storage);
  try{
    assert.equal(worldStayOpportunityDueAt(first,"2026-10-08T13:00:00.000Z"),stayDue,
      "admitted long residence did not earn a later World occasion");
    assert.equal(worldStayOpportunityDueAt(first,"2026-10-08T11:00:00.000Z"),null,
      "brief visit was misrepresented as a long stay");
    assert.equal(worldStayOpportunityDueAt({...first,wakefulness:"asleep"},
      "2026-10-08T13:00:00.000Z"),null,
      "known sleeping life earned a waking encounter opportunity");

    store.enqueueEnvironmentalOpportunity({
      threadId:first.threadId,situationId:first.situationId,dueAt:arrivalDue,
    });
    store.enqueueEnvironmentalOpportunity({
      threadId:first.threadId,situationId:first.situationId,
      dueAt:stayDue,kind:"stay",
    });
    assert.equal(store.enqueueEnvironmentalOpportunity({
      threadId:first.threadId,situationId:first.situationId,
      dueAt:stayDue,kind:"stay",
    }).inserted,false,"same long stay was scheduled twice");

    let at=arrivalDue;
    const invoked=[];
    const queued=[];
    let interruptWitness=true;
    const process=createWorldEnvironmentOpportunity({
      experienceStore:store,
      livedNowStore:{
        getSituation:id=>structuredClone(situations.get(id)??null),
        getCurrentSituation:id=>structuredClone(people[0]===id?first:second),
        getWorldPlace:()=>({
          displayName:"The neighborhood café",
          physicalVenue:{ref:"venue_stay_cafe",displayName:"The neighborhood café",
            locality:"Tucson",country:"US"},
        }),
        listRecentCurrentSituations:()=>at===arrivalDue?[structuredClone(first)]
          :[structuredClone(second)],
      },
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{
        async invoke(request){
          invoked.push(request.clientRequestId);
          if(request.clientRequestId.startsWith("world-initial-opportunity_")){
            const changed=request.input.occurrenceAt===stayDue;
            assert.equal(request.input.initiatingSituation.situationId,first.situationId);
            return {output:{
              outcome:changed?"changed":"no_change",
              occurrenceText:changed?"A sudden shower patters against the café windows.":null,
              potentialObserverThreadIds:changed?people:[],
            }};
          }
          if(request.clientRequestId.startsWith("encounter-attention_")){
            const observed=request.input.thread.threadId;
            if(observed===people[1]&&interruptWitness){
              interruptWitness=false;
              throw new Error("temporary attention interruption");
            }
            return {output:observed===people[0]
              ?{outcome:"noticed",experienceText:"I hear the rain begin at the window."}
              :{outcome:"not_noticed",experienceText:null},
              provenance:{provider:"fixture",modelId:"world-attention"}};
          }
          throw new Error("unexpected World cognition");
        },
      },
      onExperienceQueued:async(item)=>queued.push(item.experienceId),
      now:()=>at,
    });
    const quiet=await process.runOnce();
    assert.equal(quiet.results[0].outcome,"no_change",
      "arrival invented an objective event");
    assert.equal(store.listEncounterStories(first.threadId).length,0);
    assert.equal(store.nextEnvironmentalOpportunityAt(),stayDue,
      "later opportunity was lost after the quiet arrival");

    at=stayDue;
    const interrupted=await process.runOnce();
    assert.equal(interrupted.failed,1,
      "interrupted witness should leave the event pending for exact replay");
    const recovered=await process.runOnce();
    assert.equal(recovered.failed,0,
      "pending World attention could not resume");
    const stories=store.listEncounterStories(first.threadId);
    assert.equal(stories.length,1,"long residence authored duplicate World occurrences");
    assert.deepEqual(stories[0].threadPresence.map(item=>item.threadId),people,
      "one World event did not preserve two independently present observers");
    assert.equal(store.getThreadEncounterAttention(people[0],stories[0].encounterId)?.outcome,
      "noticed","first person lost independently admitted experience");
    assert.equal(store.getThreadEncounterAttention(people[1],stories[0].encounterId)?.outcome,
      "not_noticed","second person was forced to notice the rain");
    assert.equal(store.getThreadEncounterAttention(people[1],stories[0].encounterId)?.experience,
      null,"a missed event became a private experience");
    assert.equal(new Set(queued).size,1,
      "one noticed Experience produced multiple selective aftermath identities");
    assert.equal(invoked.filter(id=>id.startsWith("world-initial-opportunity_")).length,2,
      "retry rerolled exterior World history");
    assert.equal(store.nextEnvironmentalOpportunityAt(),null,
      "finished long stay retained a recurring World wake");
  }finally{
    store.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
