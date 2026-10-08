import assert from "node:assert/strict";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createWorldEnvironmentOpportunity } from "../src/world-environment-opportunity.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-08T17:24:00.000Z";
const DUE="2026-10-08T17:25:00.000Z";

test("E7.4 enacted life earns at most one observable event or an ordinary no_change",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-e7-initial-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const threads=new Map();
  const situations=new Map();
  const world=openWorldStore(storage);
  for(const [i,situationId] of ["sit_e7_a","sit_e7_b"].entries()){
    const thread=structuredClone(seed);
    thread.threadId=`thr_initial_e7_${i}`;
    thread.provenance.lastEventId=`evt_initial_e7_${i}`;
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
            const isFirst=request.input.initiatingSituation.situationId==="sit_e7_a";
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
