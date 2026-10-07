import assert from "node:assert/strict";
import test from "node:test";

import { createLiveEncounter } from "../src/live-encounter.mjs";
import {
  expressionEncounterBeat,
} from "../src/live-encounter-expression.mjs";
import {
  streamLivedEncounterResponse,
} from "../src/lived-encounter-cognition.mjs";

function livedContext(){
  return Object.freeze({
    thread:{
      threadId:"thr_kaleo",
      identity:{
        selfDescription:"Kaleo is observant, independent, and interested in drawing.",
      },
      currentState:{
        selfModel:"I notice small things and do not rush to agree.",
        unresolvedIntentions:[],
      },
    },
    situation:{
      situationId:"sit_breakfast",
      establishedAt:"2026-10-07T17:43:55.775Z",
      activity:"Eat breakfast and get ready for the day.",
      location:{kind:"place",placeRef:"place_home"},
    },
    semanticStates:[],
    memories:[],
  });
}

function history(){
  return [{
    encounterId:"story_prior",
    occurredAt:"2026-10-07T17:55:00.000Z",
    story:{
      storyVersion:"encounter-story-v0.1",
      beats:[
        {actorThreadId:null,kind:"utterance",text:"I like drawing fish."},
        {actorThreadId:"thr_kaleo",kind:"utterance",text:"What do you like about drawing them?"},
      ],
    },
  }];
}

function scriptedAdapter(scripts,inputs){
  let index=0;
  return {
    provider:"fixture",
    modelId:"fixture-live-expression",
    configuration:{transport:"fixture"},
    async invoke(){
      throw new Error("structured cognition should not run in streamed-expression proof");
    },
    async *streamExpression(call){
      inputs.push(structuredClone(call.input));
      const script=scripts[index++];
      for(const text of script){
        if(call.signal?.aborted)return;
        yield {type:"expression_delta",text};
      }
      if(call.signal?.aborted)return;
      yield {
        type:"expression_complete",
        provenance:{
          provider:"fixture",
          modelId:"fixture-live-expression",
          providerRequestId:`fixture_${index}`,
        },
      };
    },
  };
}

test("interruption preserves audible speech and restart sees the changed encounter", async () => {
  const encounter=createLiveEncounter({
    participantIds:["person_guy","thr_kaleo"],
    pauseThresholdMs:650,
  });
  const events=[];
  encounter.subscribe("person_guy",(event)=>events.push(event));

  encounter.pushSpeechDelta({
    actorId:"person_guy",
    text:"What do you think I mean by drawing fish?",
  });
  encounter.endSpeech({actorId:"person_guy"});

  const inputs=[];
  const adapter=scriptedAdapter([
    [
      "I think the fish matter because—",
      " they seem detached from ordinary worries.",
    ],
    [
      "Oh. Yes—that is different. You mean the act of drawing changes what you notice.",
    ],
  ],inputs);

  const interruption=new AbortController();
  const unsubscribe=encounter.subscribe("person_guy",(event)=>{
    if(
      event.type==="speech_delta"
      && event.actorId==="thr_kaleo"
      && event.text==="I think the fish matter because—"
    ){
      interruption.abort("Guy began speaking");
    }
  });

  const first=await streamLivedEncounterResponse({
    livedContext:livedContext(),
    encounter:{
      utterance:"What do you think I mean by drawing fish?",
      occurredAt:"2026-10-07T17:56:00.000Z",
    },
    recentEncounterStories:history(),
    liveEncounter:encounter,
    participantId:"thr_kaleo",
    modelAdapter:adapter,
    signal:interruption.signal,
  });
  unsubscribe();

  assert.equal(first.text,"I think the fish matter because—",
    "interrupted expression did not preserve its audible prefix");
  assert.equal(first.completion,"interrupted",
    "interrupted expression was not marked interrupted");
  assert.equal(
    events.some((event)=>
      event.type==="speech_end"
      && event.actorId==="thr_kaleo"
      && event.completion==="interrupted"
      && event.text===first.text),
    true,
    "live encounter did not expose interrupted speech truth",
  );
  assert.deepEqual(
    expressionEncounterBeat({actorThreadId:"thr_kaleo",expression:first}),
    {
      actorThreadId:"thr_kaleo",
      kind:"utterance",
      text:"I think the fish matter because—",
      completion:"interrupted",
    },
    "Encounter Story beat lost interruption",
  );

  encounter.pushSpeechDelta({
    actorId:"person_guy",
    text:"Wait, not the fish themselves. I mean the act of drawing them.",
  });
  encounter.endSpeech({actorId:"person_guy"});

  const second=await streamLivedEncounterResponse({
    livedContext:livedContext(),
    encounter:{
      utterance:"Wait, not the fish themselves. I mean the act of drawing them.",
      occurredAt:"2026-10-07T17:56:03.000Z",
    },
    recentEncounterStories:history(),
    liveEncounter:encounter,
    participantId:"thr_kaleo",
    priorExpression:first,
    modelAdapter:adapter,
  });

  assert.equal(second.completion,"complete","restarted expression did not complete");
  assert.equal(
    inputs[1].currentSituation.situationId,
    "sit_breakfast",
    "restart lost current World situation",
  );
  assert.equal(
    inputs[1].recentEncounterStories[0].encounterId,
    "story_prior",
    "restart lost admitted encounter history",
  );
  assert.deepEqual(
    inputs[1].liveInteraction.priorExpression,
    {
      text:"I think the fish matter because—",
      completion:"interrupted",
    },
    "restart lost what the Thread actually said",
  );
  assert.equal(
    inputs[1].liveInteraction.heardSoFar.person_guy.text,
    "Wait, not the fish themselves. I mean the act of drawing them.",
    "restart did not hear the interrupting speech",
  );
});

test("uninterrupted expression keeps the suffix interruption removes", async () => {
  const encounter=createLiveEncounter({
    participantIds:["person_guy","thr_kaleo"],
  });
  encounter.pushSpeechDelta({actorId:"person_guy",text:"Tell me more."});
  encounter.endSpeech({actorId:"person_guy"});

  const inputs=[];
  const adapter=scriptedAdapter([[
    "I think the fish matter because—",
    " they seem detached from ordinary worries.",
  ]],inputs);

  const result=await streamLivedEncounterResponse({
    livedContext:livedContext(),
    encounter:{
      utterance:"Tell me more.",
      occurredAt:"2026-10-07T17:57:00.000Z",
    },
    recentEncounterStories:history(),
    liveEncounter:encounter,
    participantId:"thr_kaleo",
    modelAdapter:adapter,
  });

  assert.equal(
    result.text,
    "I think the fish matter because— they seem detached from ordinary worries.",
    "uninterrupted expression lost its generated suffix",
  );
  assert.equal(result.completion,"complete","uninterrupted expression was marked incomplete");
});
