import assert from "node:assert/strict";
import test from "node:test";

import { createLiveEncounter } from "../src/live-encounter.mjs";

test("participants can overlap without any turn transfer", () => {
  const encounter=createLiveEncounter({
    participantIds:["guy","kaleo"],
    pauseThresholdMs:650,
  });
  const guyEvents=[];
  const kaleoEvents=[];
  encounter.subscribe("guy",(event)=>guyEvents.push(event));
  encounter.subscribe("kaleo",(event)=>kaleoEvents.push(event));

  encounter.pushSpeechDelta({
    actorId:"guy",
    text:"I think drawing changes how you see.",
  });

  assert.equal(
    kaleoEvents.filter((event)=>event.type==="speaking_opportunity"&&event.reason==="sentence").length,
    1,
    "sentence did not create a speaking opportunity",
  );
  assert.deepEqual(
    encounter.snapshot().activeSpeakers,
    ["guy"],
    "speech opportunity incorrectly ended the speaker",
  );

  encounter.pushSpeechDelta({
    actorId:"guy",
    text:" It slows you down",
  });
  assert.equal(
    encounter.pauseSpeech({actorId:"guy",durationMs:700}),
    true,
    "meaningful pause did not create an opportunity",
  );

  encounter.pushSpeechDelta({
    actorId:"kaleo",
    text:"Yes.",
  });

  assert.deepEqual(
    encounter.snapshot().activeSpeakers,
    ["guy","kaleo"],
    "live encounter serialized overlapping speakers",
  );
  assert.equal(
    guyEvents.some((event)=>
      event.type==="speaking_opportunity"
      && event.sourceActorId==="kaleo"
      && event.reason==="sentence"),
    true,
    "overlapping speaker was not heard",
  );
  assert.equal(
    kaleoEvents.some((event)=>event.type.includes("turn")),
    false,
    "live encounter introduced turn state",
  );
  assert.equal(
    encounter.heardSoFar("kaleo").guy.text,
    "I think drawing changes how you see. It slows you down",
    "heard-so-far lost continuous speech",
  );
});

test("sentence, pause and end are independent speaking opportunities", () => {
  const encounter=createLiveEncounter({
    participantIds:["a","b"],
    pauseThresholdMs:650,
  });
  const events=[];
  encounter.subscribe("b",(event)=>events.push(event));

  encounter.pushSpeechDelta({actorId:"a",text:"One. Two?"});
  encounter.pauseSpeech({actorId:"a",durationMs:400});
  encounter.pauseSpeech({actorId:"a",durationMs:700});
  encounter.pauseSpeech({actorId:"a",durationMs:900});
  encounter.endSpeech({actorId:"a"});

  const opportunities=events
    .filter((event)=>event.type==="speaking_opportunity")
    .map((event)=>({
      reason:event.reason,
      heardText:event.heardText,
    }));

  assert.deepEqual(opportunities,[
    {reason:"sentence",heardText:"One."},
    {reason:"sentence",heardText:"One. Two?"},
    {reason:"pause",heardText:"One. Two?"},
    {reason:"end",heardText:"One. Two?"},
  ],"speaking opportunities did not follow outward speech boundaries");

  const deltas=events
    .filter((event)=>event.type==="speech_delta")
    .map((event)=>event.text);
  assert.deepEqual(
    deltas,
    ["One."," Two?"],
    "batched speech crossed a sentence opportunity before being heard",
  );
});

test("private opportunity reaches only the owning participant", () => {
  const encounter=createLiveEncounter({participantIds:["mina","noor"]});
  const minaEvents=[];
  const noorEvents=[];
  encounter.subscribe("mina",(event)=>minaEvents.push(event));
  encounter.subscribe("noor",(event)=>noorEvents.push(event));

  encounter.pushPrivateOpportunity({
    participantId:"mina",
    reason:"afterthought",
    sourceRef:"con_private_thought",
    privateContext:{
      afterthoughts:[{
        kind:"question",
        text:"I wonder whether I misunderstood Noor.",
      }],
    },
  });

  const opportunity=minaEvents.find((event)=>event.type==="speaking_opportunity");
  assert.equal(opportunity?.reason,"afterthought",
    "private thought did not become Mina's speaking opportunity");
  assert.equal(opportunity?.privateContext?.afterthoughts?.[0]?.kind,"question",
    "private thought lost its kind");
  assert.equal(noorEvents.length,0,
    "private thought leaked to another participant");
});

