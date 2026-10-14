import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
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
