import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createSqliteStateInfraDriver} from "../../../infra/providers/local/sqlite-state.mjs";
import {openWorldStore} from "../src/persistence.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {createWorldArrivalPerception} from "../src/world-arrival-perception.mjs";
import {createWorldSocialOpportunity} from "../src/world-social-opportunity.mjs";
import {projectSituatedPercept} from "../src/situated-percept.mjs";
import {evaluateSalience} from "../src/salience-gate.mjs";

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
    // The bystander may have already spent the social chance earned by
    // their own earlier arrival. This is a different witnessed event.
    const reader=ctx.situations[1];
    store.enqueueSocialOpportunity({
      threadId:reader.threadId,situationId:reader.situationId,
      dueAt:reader.establishedAt,
    });
    const earlier=store.claimDueSocialOpportunity({at:reader.establishedAt});
    assert.equal(earlier.threadId,reader.threadId,
      "the earlier independent social chance was lost");
    store.completeSocialOpportunity({
      situationId:earlier.situationId,at:reader.establishedAt,
      outcome:"not_initiated",
    });
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

    // An observed arrival is a personal causal input, not generic
    // co-presence. Its impact on salience is grounded in noticed attention.
    const perceptFor=(threadId)=>projectSituatedPercept({
      observerThreadId:threadId,
      situation:ctx.situations.find(x=>x.threadId===threadId),
      at:AT,
      observedThreads:[{
        threadId:ids[0],name:"Newcomer",situation:ctx.situations[0],
      }],
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[]},
      livedNowStore,experienceStore:store,
    });
    const noticedPercept=perceptFor(ids[1]);
    const missedPercept=perceptFor(ids[2]);
    assert.equal(noticedPercept.recentEvents.length,1,
      "lived attention did not influence later social context");
    assert.deepEqual(noticedPercept.recentEvents[0].personalExperience,{
      experienceId:noticed.experience.experienceId,
      experienceText:noticed.experience.experienceText,
    },"the observer's own Experience never reached social cognition");
    const past=projectSituatedPercept({
      observerThreadId:ids[1],
      situation:ctx.situations[1],
      at:"2026-10-18T21:00:00.000Z",
      observedThreads:[{
        threadId:ids[0],name:"Newcomer",situation:ctx.situations[0],
      }],
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[]},
      livedNowStore,experienceStore:store,
    });
    assert.equal(past.recentEvents.length,0,
      "old World history was silently promoted to lifelong recollection");
    assert.equal(missedPercept.recentEvents.length,0,
      "a missed occurrence leaked into private social knowledge");
    const salient=evaluateSalience({
      opportunity:noticedPercept.opportunities[0],
      situatedPercept:noticedPercept,
    });
    const background=evaluateSalience({
      opportunity:missedPercept.opportunities[0],
      situatedPercept:missedPercept,
    });
    assert.equal(salient.outcome,"salient",
      "noticing a person did not matter to social consideration");
    assert.equal(background.outcome,"background",
      "mere co-presence forced social attention");

    const bystander=store.inspectSocialOpportunities(ids[1]);
    assert.equal(bystander.length,2,
      "later noticing did not earn a distinct social chance");
    assert.equal(bystander[0].sourceEncounterRef,story.encounterId,
      "social consideration lost its actual perceived cause");
    assert.equal(store.inspectSocialOpportunities(ids[2]).length,0,
      "a bystander who missed the arrival was forced into social consideration");
    let approached=0;
    const social=createWorldSocialOpportunity({
      experienceStore:store,
      livedNowStore:{
        getCurrentSituation:id=>ctx.situations.find(x=>x.threadId===id)??null,
        getWorldPlace:livedNowStore.getWorldPlace,
        listCurrentVenueSituations:()=>{throw Error("targeted attention must not scan population");},
      },
      meetingService:{async meet(input){
        approached++;
        assert.equal(input.initiatorThreadId,ids[1],
          "the wrong person initiated the observed social choice");
        assert.equal(input.counterpartyThreadId,ids[0],
          "observation targeted a different person");
        return {attempts:[{outcome:"not_initiated"}]};
      }},
      now:()=>AT,
    });
    const considered=await social.runOnce();
    assert.equal(considered.failed,0,
      considered.results[0]?.message??"observed social choice failed");
    assert.equal(considered.results[0]?.outcome,"not_initiated",
      "bystander lost the freedom not to approach");
    assert.equal(approached,1,"noticed arrival prompted repeated social inference");
    assert.equal((await social.runOnce()).attempted,0,
      "completed observed social choice did not settle");
    assert.equal(store.listSocialInteractions(ids[1]).length,0,
      "choosing not to approach created shared interaction history");
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
    assert.equal(store.nextSocialOpportunityAt(),null,
      "late arrival fabricated a present-day social opportunity");
  }finally{ctx.close();}
});
