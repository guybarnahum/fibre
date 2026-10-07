import assert from "node:assert/strict";
import test from "node:test";

import { createLiveEncounter } from "../src/live-encounter.mjs";
import { streamExpressionIntoLiveEncounter } from "../src/live-encounter-expression.mjs";
import { reconcileLiveEncounterScene } from "../src/live-encounter-world.mjs";

test("authoritative scene change enters the live encounter without client-authored reality", async () => {
  const live=createLiveEncounter({
    participantIds:["person_guy","thr_kaleo"],
  });
  const guyEvents=[];
  const kaleoEvents=[];
  live.subscribe("person_guy",(event)=>guyEvents.push(event));
  live.subscribe("thr_kaleo",(event)=>kaleoEvents.push(event));

  const currentSituation={
    situationId:"sit_kaleo_leaving",
    threadId:"thr_kaleo",
    establishedAt:"2026-10-07T18:05:00.000Z",
    location:{
      kind:"transit",
      fromPlaceRef:"place_home",
      toPlaceRef:"place_errand",
    },
    mediatedContext:null,
    activity:"heading out to take care of the first errand of the day",
    evidenceRefs:["plan_kaleo_morning"],
  };

  let validationInput=null;
  const result=await reconcileLiveEncounterScene({
    liveEncounter:live,
    livedNow:{
      async validateDisplayedSituation(input){
        validationInput=structuredClone(input);
        return {
          applies:false,
          currentSituation:structuredClone(currentSituation),
        };
      },
    },
    participantId:"thr_kaleo",
    threadId:"thr_kaleo",
    expectedSituationId:"sit_kaleo_breakfast",
    at:"2026-10-07T18:05:00.000Z",
  });

  assert.deepEqual(
    validationInput,
    {
      threadId:"thr_kaleo",
      situationId:"sit_kaleo_breakfast",
      at:"2026-10-07T18:05:00.000Z",
    },
    "scene reconciliation did not use the authoritative displayed-situation seam",
  );
  assert.equal(result.outcome,"scene_changed","material movement did not change the live scene");
  assert.equal(result.currentSituation.situationId,"sit_kaleo_leaving",
    "scene change lost authoritative current life");

  for(const events of [guyEvents,kaleoEvents]){
    const scene=events.find((event)=>event.type==="scene_changed");
    assert.equal(scene?.previousSituationId,"sit_kaleo_breakfast",
      "live encounter lost the prior scene witness");
    assert.equal(scene?.currentSituation.situationId,"sit_kaleo_leaving",
      "live encounter invented a scene instead of forwarding World state");
  }

  assert.equal(
    kaleoEvents.some((event)=>
      event.type==="speaking_opportunity"
      && event.reason==="scene_changed"
      && event.currentSituationId==="sit_kaleo_leaving"),
    true,
    "Thread did not receive a cognition opportunity from its changed life",
  );
});

test("same authoritative scene does not fabricate a World transition", async () => {
  const live=createLiveEncounter({
    participantIds:["person_guy","thr_kaleo"],
  });
  const events=[];
  live.subscribe("thr_kaleo",(event)=>events.push(event));

  const currentSituation={
    situationId:"sit_kaleo_breakfast_new_witness",
    threadId:"thr_kaleo",
    establishedAt:"2026-10-07T18:01:00.000Z",
    location:{kind:"place",placeRef:"place_home"},
    mediatedContext:null,
    activity:"eating breakfast and getting ready",
    evidenceRefs:["plan_kaleo_morning"],
  };

  const result=await reconcileLiveEncounterScene({
    liveEncounter:live,
    livedNow:{
      async validateDisplayedSituation(){
        return {
          applies:true,
          currentSituation:structuredClone(currentSituation),
        };
      },
    },
    participantId:"thr_kaleo",
    threadId:"thr_kaleo",
    expectedSituationId:"sit_kaleo_breakfast",
    at:"2026-10-07T18:01:00.000Z",
  });

  assert.equal(result.outcome,"same_scene","compatible LivedNow was treated as movement");
  assert.equal(
    events.some((event)=>event.type==="scene_changed"),
    false,
    "live encounter fabricated a scene change",
  );
});

test("material scene change interrupts expression grounded in the stale scene", async () => {
  const live=createLiveEncounter({
    participantIds:["person_guy","thr_kaleo"],
  });

  let firstDelta;
  const emitted=new Promise((resolve)=>{ firstDelta=resolve; });
  const adapter={
    provider:"fixture",
    modelId:"fixture-scene-change",
    configuration:{transport:"fixture"},
    async invoke(){
      throw new Error("structured cognition should not run");
    },
    async *streamExpression(call){
      yield {type:"expression_delta",text:"I should probably finish breakfast before—"};
      firstDelta();
      await new Promise((resolve)=>{
        if(call.signal.aborted)resolve();
        else call.signal.addEventListener("abort",resolve,{once:true});
      });
    },
  };

  const expression=streamExpressionIntoLiveEncounter({
    encounter:live,
    actorId:"thr_kaleo",
    modelAdapter:adapter,
    systemPrompt:"Speak from the current lived situation.",
    input:{currentSituationId:"sit_kaleo_breakfast"},
    clientRequestId:"expr_scene_change",
  });
  await emitted;

  await reconcileLiveEncounterScene({
    liveEncounter:live,
    livedNow:{
      async validateDisplayedSituation(){
        return {
          applies:false,
          currentSituation:{
            situationId:"sit_kaleo_leaving",
            threadId:"thr_kaleo",
            establishedAt:"2026-10-07T18:05:00.000Z",
            location:{
              kind:"transit",
              fromPlaceRef:"place_home",
              toPlaceRef:"place_errand",
            },
            mediatedContext:null,
            activity:"heading out for an errand",
            evidenceRefs:["plan_kaleo_morning"],
          },
        };
      },
    },
    participantId:"thr_kaleo",
    threadId:"thr_kaleo",
    expectedSituationId:"sit_kaleo_breakfast",
    at:"2026-10-07T18:05:00.000Z",
  });

  const result=await expression;
  assert.deepEqual(
    {
      text:result.text,
      completion:result.completion,
    },
    {
      text:"I should probably finish breakfast before—",
      completion:"interrupted",
    },
    "scene change allowed stale-scene speech to continue",
  );
  assert.deepEqual(
    live.snapshot().activeSpeakers,
    [],
    "scene change left stale expression active",
  );
});

