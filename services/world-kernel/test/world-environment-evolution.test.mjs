import assert from "node:assert/strict";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { createWorldEnvironmentEvolution } from "../src/world-environment-evolution.mjs";

const sourceThread=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-08T16:00:00.000Z";
const DUE="2026-10-08T16:30:00.000Z";

function worldFixture(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-environment-evolution-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const resident=structuredClone(sourceThread);
  resident.threadId="thr_world_environment_evolution";
  resident.provenance.lastEventId="evt_world_environment_evolution";
  try{world.seedThread(resident);}finally{world.close();}
  const experiences=openLivedExperienceStore(storage);

  function source(placeRef,at,description){
    const story={
      storyVersion:"encounter-story-v0.1",
      beats:[{actorThreadId:null,kind:"occurrence",text:description}],
    };
    return experiences.recordEncounterStory({
      occurredAt:at,
      threadPresence:[{
        threadId:resident.threadId,situationId:`sit_${resident.threadId}`,
      }],
      story,
      visualization:createEncounterVisualization({
        occurredAt:at,story,scene:`At shared World place ${placeRef}.`,
        sourceReferences:[placeRef],depictedThreadRefs:[],
      }),
    },{
      uniquePlaceOccurrenceRef:placeRef,
      followupAfterMs:30*60_000,
    });
  }
  return {
    experiences,source,
    close(){
      experiences.close();
      rmSync(directory,{recursive:true,force:true});
    },
  };
}

test("World follows up shared rain once without forcing a change or waking observers",async()=>{
  const f=worldFixture();
  try{
    const rain=f.source("wpl_world_rain",AT,"Rain begins across the park.");
    const bee=f.source("wpl_world_bee",AT,"A bee lands on a flower.");
    const calls=[];
    const modelAdapter={
      async invoke(input){
        calls.push(structuredClone(input));
        assert.equal(Object.hasOwn(input.input,"thread"),false,
          "World evolution must not read a Thread's private identity");
        assert.equal(Object.hasOwn(input.input,"currentSituation"),false,
          "World evolution must not depend on a Thread's scene");
        return {
          output:input.input.placeRef==="wpl_world_rain"
            ?{outcome:"changed",occurrenceText:"The rain stops and sunlight returns."}
            :{outcome:"no_change",occurrenceText:null},
        };
      },
    };
    let time="2026-10-08T16:10:00.000Z";
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,modelAdapter,now:()=>time,
    });
    const early=await process.runOnce();
    assert.equal(early.attempted,0,"World should not evaluate evolution before it is due");
    assert.equal(early.nextDueAt,DUE,"World follow-up lost its due time");
    assert.equal(calls.length,0,"an early wake spent a model call");

    time=DUE;
    const evolved=await process.runOnce();
    assert.equal(evolved.failed,0,"World environmental continuation failed");
    assert.equal(evolved.completed,2,"two earned opportunities should settle once");
    assert.equal(evolved.nextDueAt,null,"settled World work should return to quiescence");
    const next=f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_world_rain",
    });
    assert.equal(next?.story.continuationOfEncounterRef,rain.encounterId,
      "the later rain change should cite the earlier objective occurrence");
    assert.deepEqual(next?.threadPresence,[],
      "the World must not invent an observer for unobserved weather");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_world_bee",
    }),null,"no_change must not become a fabricated objective event");

    await process.runOnce();
    assert.equal(calls.length,2,"retry must not resample completed World events");
    assert.equal(
      f.experiences.getSharedEnvironmentalStory({
        occurredAt:AT,placeRef:"wpl_world_rain",
      }).encounterId,
      rain.encounterId,
      "World environmental history was rewritten",
    );
    assert.notEqual(next.encounterId,bee.encounterId,
      "independent places should never share one environmental event");
  }finally{f.close();}
});

test("environmental continuation retries durable judgment instead of rerolling weather",async()=>{
  const f=worldFixture();
  try{
    const source=f.source("wpl_world_retry",AT,"Clouds gather over the park.");
    let calls=0;
    let failedOnce=false;
    const store={
      listDueEnvironmentalFollowups:(args)=>f.experiences.listDueEnvironmentalFollowups(args),
      nextEnvironmentalFollowupAt:()=>f.experiences.nextEnvironmentalFollowupAt(),
      getEncounterStory:(id)=>f.experiences.getEncounterStory(id),
      recordEnvironmentalFollowupDecision:(args)=>
        f.experiences.recordEnvironmentalFollowupDecision(args),
      recordEncounterStory:(...args)=>{
        if(!failedOnce){failedOnce=true;throw new Error("transient storage failure");}
        return f.experiences.recordEncounterStory(...args);
      },
      completeEnvironmentalFollowup:(args)=>
        f.experiences.completeEnvironmentalFollowup(args),
    };
    const process=createWorldEnvironmentEvolution({
      experienceStore:store,
      modelAdapter:{async invoke(){
        calls++;
        return {output:{
          outcome:"changed",occurrenceText:"The clouds disperse.",
        }};
      }},
      now:()=>DUE,
    });
    const first=await process.runOnce();
    assert.equal(first.failed,1,"materialization failure should remain pending");
    assert.equal(calls,1,"World should form only one private candidate decision");
    const retry=await process.runOnce();
    assert.equal(retry.completed,1,"World should resume the durable decision");
    assert.equal(calls,1,"retry rerolled the World continuation");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_world_retry",
    })?.story.continuationOfEncounterRef,source.encounterId,
    "retried continuation lost its objective history");
  }finally{f.close();}
});
