import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createSqliteStateInfraDriver} from "../../../infra/providers/local/sqlite-state.mjs";
import {openWorldStore} from "../src/persistence.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {createWorldArrivalPerception} from "../src/world-arrival-perception.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-18T14:00:00.000Z";
function setup(){
  const dir=mkdtempSync(join(tmpdir(),"fibre-arrival-witness-"));
  const storage={infraDriver:createSqliteStateInfraDriver({
    scopes:{world:join(dir,"world.sqlite")}}),stateScopeId:"world"};
  const ids=["thr_arrival_actor","thr_arrival_reader","thr_arrival_worker"];
  const world=openWorldStore(storage);
  const threads=new Map();
  for(const id of ids){
    const thread=structuredClone(seed);
    thread.threadId=id;thread.provenance.lastEventId=`evt_${id}`;
    world.seedThread(thread);threads.set(id,thread);
  }
  world.close();
  const situations=ids.map((threadId,i)=>({
    threadId,situationId:["sit_real_arrival","sit_reader","sit_worker"][i],
    establishedAt:i===0?AT:"2026-10-18T13:00:00.000Z",
    provenance:"world_enacted",wakefulness:"awake",
    activity:i===0?"Entering the café.":"Reading in the café.",
    location:{kind:"place",placeRef:"wpl_verified_cafe"},
  }));
  const bySituation=new Map(situations.map(s=>[s.situationId,s]));
  const store=openLivedExperienceStore(storage);
  const work={situationId:situations[0].situationId,
    venueRef:"venue_verified_cafe",dueAt:AT,
    witnesses:situations.slice(1).map(s=>({
      threadId:s.threadId,situationId:s.situationId,
    }))};
  const livedNowStore={
    getSituation:id=>structuredClone(bySituation.get(id)??null),
    getWorldPlace:()=>({physicalVenue:{
      ref:"venue_verified_cafe",displayName:"An attested café",
    }}),
  };
  return {ids,situations,threads,store,work,livedNowStore,
    close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}

test("one enacted arrival permits distinct noticing and missed attention with retry",async()=>{
  const ctx=setup();
  try{
    const {ids,store,work,livedNowStore,threads}=ctx;
    assert.equal(store.enqueueArrivalPerception(work).inserted,true);
    assert.equal(store.enqueueArrivalPerception(work).inserted,false,
      "arrival was scheduled twice");
    let calls=0,interrupt=true;
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke({input}){
        calls++;
        assert.equal(input.encounterStory.occurredAt,AT,"World changed event time");
        assert.equal(input.encounterStory.story.beats[0].actorThreadId,ids[0],
          "actor was misattributed");
        if(input.thread.threadId===ids[2]&&interrupt){
          interrupt=false;throw new Error("model interrupted");
        }
        return {output:input.thread.threadId===ids[1]
          ?{outcome:"noticed",experienceText:"I see the arrival."}
          :{outcome:"not_noticed",experienceText:null},
          provenance:{provider:"fixture",modelId:"attention"}};
      }},
      now:()=>AT,
    });
    assert.equal((await process.runOnce()).failed,1,
      "partial attention was falsely declared complete");
    const recovered=await process.runOnce();
    assert.equal(recovered.failed,0,recovered.results[0]?.message??"perception failed");
    const stories=store.listEncounterStories(ids[1]);
    assert.equal(stories.length,1,"World duplicated its arrival Story");
    const story=stories[0];
    assert.deepEqual(story.threadPresence.map(x=>x.threadId).sort(),[...ids].sort(),
      "independently situated witnesses were lost");
    assert.deepEqual(story.visualization.visualizationSourceReferences,
      [work.situationId,work.venueRef],"event lost its enacted source");
    const noticed=store.getThreadEncounterAttention(ids[1],story.encounterId);
    const ignored=store.getThreadEncounterAttention(ids[2],story.encounterId);
    assert.equal(noticed?.outcome,"noticed","first witness did not notice");
    assert.ok(noticed?.experience?.experienceId,"noticed event has no Experience");
    assert.equal(ignored?.outcome,"not_noticed","second witness was forced to notice");
    assert.equal(ignored?.experience,null,"missed event became an Experience");
    assert.equal(store.getThreadEncounterAttention(ids[0],story.encounterId),null,
      "actor was forced to experience its own action");
    assert.equal(calls,3,"replay rerolled admitted personal attention");
    assert.equal(store.nextArrivalPerceptionAt(),null,"completed event kept polling");
  }finally{ctx.close();}
});

test("late inspection retains arrival truth without inventing old psychology",async()=>{
  const ctx=setup();
  try{
    const {ids,store,work,livedNowStore}=ctx;
    store.enqueueArrivalPerception(work);
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,
      worldReader:{getThread:()=>{throw new Error("no retro cognition");}},
      semanticStateStore:{listCurrentState:()=>{throw new Error("no retro state");}},
      memoryStore:{listCurrentMemories:()=>{throw new Error("no retro memory");}},
      modelAdapter:{invoke:()=>{throw new Error("no retro model");}},
      now:()=> "2026-10-18T16:00:00.000Z",
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,result.results[0]?.message??"late arrival failed");
    const story=store.listEncounterStories(ids[1])[0];
    assert.equal(story.occurredAt,AT,"late processing moved the event");
    assert.equal(store.getThreadEncounterAttention(ids[1],story.encounterId),null,
      "late processing invented attention");
    assert.equal(store.nextArrivalPerceptionAt(),null,
      "late historical work kept rescheduling");
  }finally{ctx.close();}
});
