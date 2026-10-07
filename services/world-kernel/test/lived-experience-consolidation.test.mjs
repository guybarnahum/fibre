import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { createExperienceConsolidationProcess } from "../src/lived-experience-consolidation.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const seed=JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8"),
);

function activeThread(){
  const thread=structuredClone(seed);
  thread.threadId="thr_n75_kaleo";
  thread.identity.name="Kaleo";
  thread.relationshipRefs=[];
  thread.memoryRefs=[];
  thread.provenance={
    createdAt:"2026-10-07T17:00:00.000Z",
    createdBy:"fibre.test",
    lastEventId:"evt_n75_seed",
  };
  return thread;
}

function story(experienceStore,{threadId,situationId,occurredAt,text,continuationOf=null}){
  const objective={
    storyVersion:"encounter-story-v0.1",
    ...(continuationOf===null?{}:{continuationOfEncounterRef:continuationOf}),
    beats:[
      {actorThreadId:null,kind:"utterance",text:`Guy: ${text}`},
      {actorThreadId:threadId,kind:"utterance",text:`Kaleo responds to ${text}`},
    ],
  };
  return experienceStore.recordEncounterStory({
    occurredAt,
    threadPresence:[{threadId,situationId}],
    story:objective,
    visualization:createEncounterVisualization({
      occurredAt,
      story:objective,
      scene:"Kaleo is eating breakfast while talking with Guy.",
      sourceReferences:[situationId,...(continuationOf===null?[]:[continuationOf])],
      depictedThreadRefs:[threadId],
    }),
  });
}

function experience(experienceStore,{threadId,situationId,occurredAt,encounterRef,text}){
  const attention=experienceStore.recordThreadEncounterAttention({
    threadId,
    encounterRef,
    situationId,
    occurredAt,
    outcome:"noticed",
    experienceText:text,
  });
  experienceStore.queueThreadExperienceConsolidation({
    experienceId:attention.experience.experienceId,
    queuedAt:occurredAt,
  });
  return attention.experience;
}

test("N7.5 clusters nearby experience and forms memory at consolidation time",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-n75-consolidation-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const thread=activeThread();
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  try{
    world.seedThread(thread);
    const situationId="sit_n75_breakfast";
    const firstStory=story(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:"2026-10-07T18:00:00.000Z",
      text:"I like drawing fish.",
    });
    const secondStory=story(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:"2026-10-07T18:02:00.000Z",
      text:"The act of drawing changes how I see.",
      continuationOf:firstStory.encounterId,
    });
    const laterStory=story(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:"2026-10-07T18:30:00.000Z",
      text:"I have to go.",
      continuationOf:secondStory.encounterId,
    });

    const first=experience(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:firstStory.occurredAt,
      encounterRef:firstStory.encounterId,
      text:"I was curious about why Guy draws fish.",
    });
    const second=experience(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:secondStory.occurredAt,
      encounterRef:secondStory.encounterId,
      text:"His distinction between fish and drawing made me reconsider what he meant.",
    });
    experience(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:laterStory.occurredAt,
      encounterRef:laterStory.encounterId,
      text:"The conversation ended naturally.",
    });

    const calls=[];
    const decisions=[
      {
        journalEntry:"Guy's point about drawing stayed with me more than the fish themselves. I liked having to revise what I thought he meant.",
        afterthoughts:[
          {
            kind:"question",
            text:"Would drawing something myself change what I notice about it?",
          },
        ],
        memory:{
          outcome:"retained",
          rememberedContent:"I remember talking with Guy over breakfast about drawing fish, and realizing he cared more about how drawing changes attention than about fish themselves.",
          rememberedMeaning:"A conversation can become more interesting when I let a correction change the question instead of defending my first interpretation.",
          confidence:0.88,
          salience:0.7,
          uncertainty:[],
        },
      },
      {
        journalEntry:null,
        afterthoughts:[],
        memory:{
          outcome:"not_remembered",
          rememberedContent:null,
          rememberedMeaning:null,
          confidence:null,
          salience:null,
          uncertainty:[],
        },
      },
    ];
    const modelAdapter={
      async invoke(request){
        calls.push(structuredClone(request.input));
        return {
          output:structuredClone(decisions[calls.length-1]),
          provenance:{provider:"fixture",modelId:"fixture-n75"},
        };
      },
    };
    const times=[
      "2026-10-07T19:00:00.000Z",
      "2026-10-07T19:00:01.000Z",
      "2026-10-07T19:00:02.000Z",
      "2026-10-07T19:00:03.000Z",
      "2026-10-07T19:00:04.000Z",
      "2026-10-07T19:00:05.000Z",
    ];
    const process=createExperienceConsolidationProcess({
      worldReader:world,
      livedNowStore:{
        getSituation(){
          return {
            situationId,
            threadId:thread.threadId,
            establishedAt:"2026-10-07T17:43:55.775Z",
            location:{kind:"place",placeRef:"place_home"},
            mediatedContext:null,
            activity:"eating breakfast and getting ready",
            evidenceRefs:[],
          };
        },
      },
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore,
      experienceStore,
      modelAdapter,
      now:()=>times.shift(),
      batchLimit:1,
      groupLimit:8,
      groupWindowMs:15*60*1000,
    });

    const firstRun=await process.runOnce();
    assert.equal(firstRun.completed,1,"first consolidation did not complete");
    assert.equal(firstRun.results[0].experienceCount,2,
      "nearby conversational experiences were not consolidated together");
    assert.equal(firstRun.hasPending,true,"later experience should remain pending");
    assert.equal(calls.length,1,"one consolidation cluster used more than one cognition call");
    assert.deepEqual(firstRun.results[0].afterthoughts,[{
      kind:"question",
      text:"Would drawing something myself change what I notice about it?",
    }],"delayed consolidation lost its private afterthought");
    assert.deepEqual(
      calls[0].experiences.map((item)=>item.experienceId),
      [first.experienceId,second.experienceId],
      "consolidation cognition lost its bounded lived cluster",
    );

    const memories=memoryStore.listCurrentMemories(thread.threadId);
    assert.equal(memories.length,1,"retained consolidation did not form one memory");
    assert.deepEqual(memories[0].eventRefs,[first.experienceId,second.experienceId],
      "cluster memory did not cite all contributing experiences");
    assert.equal(memories[0].subjectPeriod.startAt,first.occurredAt,
      "memory subject did not begin at lived experience time");
    assert.equal(memories[0].subjectPeriod.endAt,second.occurredAt,
      "memory subject did not end at lived experience time");
    assert.equal(memories[0].recordedAt,"2026-10-07T19:00:02.000Z",
      "delayed memory did not use its durable formation time");

    const secondRun=await process.runOnce();
    assert.equal(secondRun.completed,1,"no-consequence consolidation did not complete");
    assert.equal(secondRun.hasPending,false,"consolidation frontier did not become quiescent");
    assert.equal(calls.length,2,"later cluster did not get exactly one cognition opportunity");
    assert.equal(memoryStore.listCurrentMemories(thread.threadId).length,1,
      "not_remembered cluster fabricated a memory");

    const idle=await process.runOnce();
    assert.equal(idle.attempted,0,"completed experience reentered consolidation");
    assert.equal(calls.length,2,"quiescent consolidation resampled cognition");
  }finally{
    memoryStore.close();
    experienceStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});

test("N7.5 retry reuses the durable consolidation decision",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-n75-retry-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const thread=activeThread();
  thread.threadId="thr_n75_retry";
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  try{
    world.seedThread(thread);
    const situationId="sit_n75_retry";
    const encounter=story(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:"2026-10-07T18:00:00.000Z",
      text:"Something worth remembering.",
    });
    experience(experienceStore,{
      threadId:thread.threadId,
      situationId,
      occurredAt:encounter.occurredAt,
      encounterRef:encounter.encounterId,
      text:"This landed harder than I expected.",
    });

    let cognitionCalls=0;
    const modelAdapter={
      async invoke(){
        cognitionCalls+=1;
        return {
          output:{
            journalEntry:null,
            afterthoughts:[],
            memory:{
              outcome:"retained",
              rememberedContent:"I remember one conversation landing more strongly than I expected.",
              rememberedMeaning:null,
              confidence:0.8,
              salience:0.7,
              uncertainty:[],
            },
          },
          provenance:{provider:"fixture",modelId:"fixture-n75-retry"},
        };
      },
    };
    let failOnce=true;
    const attemptedRecordedAt=[];
    const flakyMemoryStore={
      listCurrentMemories:(...args)=>memoryStore.listCurrentMemories(...args),
      memoryHistory:(...args)=>memoryStore.memoryHistory(...args),
      recordMemory(candidate){
        attemptedRecordedAt.push(candidate.recordedAt);
        if(failOnce){
          failOnce=false;
          throw new Error("simulated memory persistence interruption");
        }
        return memoryStore.recordMemory(candidate);
      },
    };
    const process=createExperienceConsolidationProcess({
      worldReader:world,
      livedNowStore:{
        getSituation(){
          return {
            situationId,
            threadId:thread.threadId,
            establishedAt:"2026-10-07T17:50:00.000Z",
            location:{kind:"place",placeRef:"place_home"},
            mediatedContext:null,
            activity:"talking over breakfast",
            evidenceRefs:[],
          };
        },
      },
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:flakyMemoryStore,
      experienceStore,
      modelAdapter,
      now:(()=>{
        const times=[
          "2026-10-07T19:00:00.000Z",
          "2026-10-07T19:00:01.000Z",
          "2026-10-07T19:05:00.000Z",
          "2026-10-07T19:05:01.000Z",
        ];
        return ()=>times.shift();
      })(),
      batchLimit:1,
    });

    const failed=await process.runOnce();
    assert.equal(failed.failed,1,"simulated persistence failure did not leave consolidation retryable");
    assert.equal(cognitionCalls,1,"first consolidation did not form one decision");
    assert.notEqual(
      experienceStore.listPendingThreadExperienceConsolidations({limit:1}).length,
      0,
      "failed consolidation was incorrectly marked complete",
    );

    const retried=await process.runOnce();
    assert.equal(retried.completed,1,"retry did not finish consolidation");
    assert.equal(cognitionCalls,1,"retry resampled the Thread's consolidation decision");
    assert.deepEqual(
      attemptedRecordedAt,
      ["2026-10-07T19:00:01.000Z","2026-10-07T19:05:00.000Z"],
      "retry backdated memory materialization instead of preserving the decision and advancing formation time",
    );
    assert.equal(memoryStore.listCurrentMemories(thread.threadId).length,1,
      "retry did not materialize the retained memory");
    assert.equal(
      memoryStore.listCurrentMemories(thread.threadId)[0].recordedAt,
      "2026-10-07T19:05:00.000Z",
      "retried memory did not record when it actually became durable",
    );
  }finally{
    memoryStore.close();
    experienceStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
