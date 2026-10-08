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

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-08T16:00:00.000Z";
const DUE="2026-10-08T16:30:00.000Z";

function fixture(){
  const directory=mkdtempSync(join(tmpdir(),"fibre-environment-evolution-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const local=structuredClone(seed);
  local.threadId="thr_environment_local";
  local.provenance.lastEventId="evt_environment_local";
  const distant=structuredClone(seed);
  distant.threadId="thr_environment_distant";
  distant.provenance.lastEventId="evt_environment_distant";
  const world=openWorldStore(storage);
  try{world.seedThread(local);world.seedThread(distant);}
  finally{world.close();}
  const experiences=openLivedExperienceStore(storage);
  let current=[];

  function situation(thread,placeRef){
    return {
      threadId:thread.threadId,
      situationId:`sit_${thread.threadId}`,
      establishedAt:AT,
      location:{kind:"place",placeRef},
      activity:"outdoors with a view of the sky",
    };
  }
  function source(placeRef,description){
    const story={
      storyVersion:"encounter-story-v0.1",
      beats:[{actorThreadId:null,kind:"occurrence",text:description}],
    };
    return experiences.recordEncounterStory({
      occurredAt:AT,
      threadPresence:[{
        threadId:local.threadId,
        situationId:`sit_${local.threadId}`,
      }],
      story,
      visualization:createEncounterVisualization({
        occurredAt:AT,story,scene:`At ${placeRef}.`,
        sourceReferences:[placeRef],depictedThreadRefs:[],
      }),
    },{
      uniquePlaceOccurrenceRef:placeRef,
      followupAfterMs:30*60_000,
    });
  }
  return {
    local,distant,experiences,source,situation,
    setCurrent(value){current=value;},
    worldReader:{
      getThread:(threadId)=>structuredClone(
        [local,distant].find((thread)=>thread.threadId===threadId)??null,
      ),
    },
    semanticStateStore:{listCurrentState:()=>[]},
    memoryStore:{listCurrentMemories:()=>[]},
    livedNowStore:{
      listRecentCurrentSituations:({at,since,limit})=>structuredClone(current
        .filter((item)=>item.establishedAt>=since&&item.establishedAt<=at)
        .slice(0,limit)),
      getWorldPlace:(_threadId,ref)=>({ref,displayName:ref}),
      getSituation:(situationId)=>structuredClone(
        current.find((item)=>item.situationId===situationId)??null,
      ),
    },
    close(){
      experiences.close();
      rmSync(directory,{recursive:true,force:true});
    },
  };
}

test("E7.2 makes a distant but perceivable World change and lets no_change stay quiet",async()=>{
  const f=fixture();
  try{
    const flash=f.source("wpl_flash_source","A towering storm cloud forms above the valley.");
    const quiet=f.source("wpl_quiet_source","A bee lands on a flower.");
    f.setCurrent([
      f.situation(f.local,"wpl_flash_source"),
      f.situation(f.distant,"wpl_distant_overlook"),
    ]);
    const calls=[];
    const modelAdapter={
      async invoke(request){
        calls.push(structuredClone(request));
        if(request.clientRequestId.startsWith("encounter-attention_")){
          return {
            output:{outcome:"not_noticed",experienceText:null},
            provenance:{provider:"fixture",modelId:"attention"},
          };
        }
        assert.equal(Object.hasOwn(request.input,"thread"),false,
          "World cannot read private Thread identity");
        assert.equal(request.input.potentialObservers.length,2,
          "World did not receive bounded exterior observers");
        return {
          output:request.input.placeRef==="wpl_flash_source"
            ?{
              outcome:"changed",
              occurrenceText:"A brilliant lightning flash illuminates the distant skyline.",
              potentialObserverThreadIds:[f.distant.threadId],
            }
            :{
              outcome:"no_change",occurrenceText:null,
              potentialObserverThreadIds:[],
            },
        };
      },
    };
    let clock="2026-10-08T16:10:00.000Z";
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,
      livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,
      semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      modelAdapter,
      now:()=>clock,
    });
    const early=await process.runOnce();
    assert.equal(early.attempted,0,"early World wake should not run environmental cognition");
    assert.equal(early.nextDueAt,DUE,"earned due time was lost");
    assert.equal(calls.length,0,"early World wake spent model compute");

    clock=DUE;
    const result=await process.runOnce();
    assert.equal(result.completed,2,"two due opportunities should settle");
    assert.equal(result.failed,0,"World environment follow-up failed");
    assert.equal(result.nextDueAt,null,"completed work should return World to quiescence");
    const flashResult=f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_flash_source",
    });
    assert.equal(flashResult?.story.continuationOfEncounterRef,flash.encounterId,
      "objective change must continue the admitted source");
    assert.deepEqual(flashResult.threadPresence,[{
      threadId:f.distant.threadId,
      situationId:`sit_${f.distant.threadId}`,
    }],"distant potential observer should be admitted without distance cutoff");
    assert.equal(f.experiences.getThreadEncounterAttention(
      f.distant.threadId,flashResult.encounterId,
    )?.outcome,"not_noticed","potential perception must permit an independent miss");
    assert.equal(f.experiences.getThreadEncounterAttention(
      f.distant.threadId,flashResult.encounterId,
    )?.experience,null,"unnoticed change invented private Experience");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_quiet_source",
    }),null,"no_change must not create an event");
    await process.runOnce();
    assert.equal(calls.filter((call)=>
      call.clientRequestId.startsWith("world-environment-followup_")
    ).length,2,"completed work rerolled World change");
    assert.notEqual(flashResult.encounterId,quiet.encounterId,
      "unrelated objective events should remain separate");
  }finally{f.close();}
});

test("E7.2 consumes zero model calls when nobody could notice the change",async()=>{
  const f=fixture();
  try{
    f.source("wpl_unobserved","A passing cloud casts a shadow.");
    f.setCurrent([]);
    let calls=0;
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      modelAdapter:{async invoke(){calls++;throw new Error("unneeded cognition");}},
      now:()=>DUE,
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,"no-observer case should settle without error");
    assert.equal(result.results[0].outcome,"not_observable",
      "unobservable World event should not be generated");
    assert.equal(result.nextDueAt,null,"unobservable event left a repeating alarm");
    assert.equal(calls,0,"World wasted model compute without a potential observer");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_unobserved",
    }),null,"World invented a new event nobody could notice");
  }finally{f.close();}
});

test("E7.2 retries a persisted perceptible change without rerolling cognition",async()=>{
  const f=fixture();
  try{
    const source=f.source("wpl_retry","Clouds gather across the horizon.");
    f.setCurrent([f.situation(f.distant,"wpl_remote_hill")]);
    let calls=0;
    let fail=true;
    const store={
      listDueEnvironmentalFollowups:(args)=>f.experiences.listDueEnvironmentalFollowups(args),
      nextEnvironmentalFollowupAt:()=>f.experiences.nextEnvironmentalFollowupAt(),
      getEncounterStory:(id)=>f.experiences.getEncounterStory(id),
      recordEnvironmentalFollowupDecision:(args)=>
        f.experiences.recordEnvironmentalFollowupDecision(args),
      recordEncounterStory:(...args)=>{
        if(fail){fail=false;throw new Error("transient storage failure");}
        return f.experiences.recordEncounterStory(...args);
      },
      completeEnvironmentalFollowup:(args)=>f.experiences.completeEnvironmentalFollowup(args),
      getThreadEncounterAttention:(...args)=>f.experiences.getThreadEncounterAttention(...args),
      recordThreadEncounterAttention:(args)=>f.experiences.recordThreadEncounterAttention(args),
      queueThreadExperienceConsolidation:(args)=>
        f.experiences.queueThreadExperienceConsolidation(args),
    };
    const process=createWorldEnvironmentEvolution({
      experienceStore:store,livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      modelAdapter:{async invoke(request){
        if(request.clientRequestId.startsWith("encounter-attention_"))return {
          output:{outcome:"not_noticed",experienceText:null},
          provenance:{provider:"fixture",modelId:"attention"},
        };
        calls++;
        return {output:{
          outcome:"changed",
          occurrenceText:"The clouds disperse, exposing a bright mountain ridge.",
          potentialObserverThreadIds:[f.distant.threadId],
        }};
      }},
      now:()=>DUE,
    });
    const first=await process.runOnce();
    assert.equal(first.failed,1,"storage failure should retain pending work");
    const retry=await process.runOnce();
    assert.equal(retry.completed,1,"replay should finish the admitted decision");
    assert.equal(calls,1,"retry resampled objective World truth");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_retry",
    })?.story.continuationOfEncounterRef,source.encounterId,
    "retry lost the objective causal lineage");
  }finally{f.close();}
});

test("E7.2 with present but unexposed Threads admits no change",async()=>{
  const f=fixture();
  try{
    f.source("wpl_behind_wall","A small animal moves behind a closed courtyard wall.");
    f.setCurrent([f.situation(f.distant,"wpl_interior_room")]);
    let calls=0;
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      modelAdapter:{async invoke(){
        calls++;
        return {output:{
          outcome:"not_observable",
          occurrenceText:null,
          potentialObserverThreadIds:[],
        }};
      }},
      now:()=>DUE,
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,"World perceptibility gate failed");
    assert.equal(result.results[0].outcome,"not_observable",
      "World invented a change behind an unobservable boundary");
    assert.equal(f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_behind_wall",
    }),null,"non-perceptible event entered objective history");
    assert.equal(calls,1,"World should evaluate perceptibility only once");
    await process.runOnce();
    assert.equal(calls,1,"World reevaluated an already rejected opportunity");
  }finally{f.close();}
});

test("E7.3 one observable World event yields distinct lives without coerced memory",async()=>{
  const f=fixture();
  try{
    const source=f.source("wpl_horizon","Storm clouds approach the northern horizon.");
    f.setCurrent([
      f.situation(f.local,"wpl_horizon"),
      f.situation(f.distant,"wpl_faraway_hill"),
    ]);
    const queued=[];
    const calls=[];
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      onExperienceQueued:async(item)=>queued.push(item.experienceId),
      modelAdapter:{
        async invoke(request){
          calls.push(request.clientRequestId);
          if(request.clientRequestId.startsWith("world-environment-followup_"))return {
            output:{
              outcome:"changed",
              occurrenceText:"A broad lightning flash lights the horizon.",
              potentialObserverThreadIds:[f.local.threadId,f.distant.threadId],
            },
          };
          if(request.clientRequestId.startsWith("encounter-attention_")){
            const local=request.input.thread.threadId===f.local.threadId;
            return {
              output:{
                outcome:local?"noticed":"not_noticed",
                experienceText:local?"I look up in surprise as the sky flashes.":null,
              },
              provenance:{provider:"fixture",modelId:"e7-attention"},
            };
          }
          throw new Error("unexpected cognition");
        },
      },
      now:()=>DUE,
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,"genuine environmental observation failed");
    assert.equal(result.noticed,1,"World attention must preserve individual noticing");
    const story=f.experiences.getSharedEnvironmentalStory({
      occurredAt:DUE,placeRef:"wpl_horizon",
    });
    assert.equal(story.story.continuationOfEncounterRef,source.encounterId,
      "shared perception lost the event's objective lineage");
    assert.deepEqual(new Set(story.threadPresence.map((p)=>p.threadId)),
      new Set([f.local.threadId,f.distant.threadId]),
      "two places did not share the same potentially visible event");
    const noticed=f.experiences.getThreadEncounterAttention(
      f.local.threadId,story.encounterId,
    );
    const missed=f.experiences.getThreadEncounterAttention(
      f.distant.threadId,story.encounterId,
    );
    assert.equal(noticed.outcome,"noticed","local witness did not form lived attention");
    assert.equal(typeof noticed.experience.experienceText,"string",
      "noticed World event did not become personal Experience");
    assert.equal(missed.outcome,"not_noticed","distant witness was forced to notice");
    assert.equal(missed.experience,null,"unnoticed event fabricated personal Experience");
    assert.deepEqual(f.experiences.listUnclaimedExperienceConsolidationCandidates({
      limit:8,
    }).map((item)=>item.experienceId),[noticed.experience.experienceId],
    "only lived Experience may enter delayed memory consideration");
    assert.deepEqual(queued,[noticed.experience.experienceId],
      "World did not wake selective consolidation for real Experience");

    await process.runOnce();
    assert.equal(calls.filter((id)=>id.startsWith("world-environment-followup_")).length,1,
      "World reauthored an admitted objective change");
    assert.equal(calls.filter((id)=>id.startsWith("encounter-attention_")).length,2,
      "retry reappraised an admitted subjective decision");
  }finally{f.close();}
});

test("E7.3 resumes admitted attention after interrupted consolidation scheduling",async()=>{
  const f=fixture();
  try{
    f.source("wpl_retry_notice","An approaching storm darkens the sky.");
    f.setCurrent([f.situation(f.local,"wpl_retry_notice")]);
    let worldCalls=0;
    let attentionCalls=0;
    let failWake=true;
    const process=createWorldEnvironmentEvolution({
      experienceStore:f.experiences,livedNowStore:f.livedNowStore,
      worldReader:f.worldReader,semanticStateStore:f.semanticStateStore,
      memoryStore:f.memoryStore,
      onExperienceQueued:async()=>{
        if(failWake){failWake=false;throw new Error("interrupted wake scheduling");}
      },
      modelAdapter:{
        async invoke(request){
          if(request.clientRequestId.startsWith("world-environment-followup_")){
            worldCalls++;
            return {output:{
              outcome:"changed",
              occurrenceText:"A flash lights the approaching storm clouds.",
              potentialObserverThreadIds:[f.local.threadId],
            }};
          }
          if(request.clientRequestId.startsWith("encounter-attention_")){
            attentionCalls++;
            return {
              output:{outcome:"noticed",experienceText:"I look up as the sky flashes."},
              provenance:{provider:"fixture",modelId:"attention"},
            };
          }
          throw new Error("unexpected cognition");
        },
      },
      now:()=>DUE,
    });
    const first=await process.runOnce();
    assert.equal(first.failed,1,"failed consolidation wake must preserve pending World work");
    const second=await process.runOnce();
    assert.equal(second.failed,0,"World continuation could not resume admitted attention");
    assert.equal(worldCalls,1,"retry rerolled an admitted World event");
    assert.equal(attentionCalls,1,"retry resampled an admitted personal perception");
    assert.equal(f.experiences.listUnclaimedExperienceConsolidationCandidates({
      limit:8,
    }).length,1,"retry duplicated or lost subjective experience");
    assert.equal(second.nextDueAt,null,"resumed World work did not settle");
  }finally{f.close();}
});
