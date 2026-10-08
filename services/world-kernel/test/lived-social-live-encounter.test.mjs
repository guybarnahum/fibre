import assert from "node:assert/strict";
import test from "node:test";

import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";

function context(threadId,name){
  return Object.freeze({
    thread:{
      threadId,
      version:1,
      identity:{
        name,
        selfDescription:name==="Mina"
          ?"I care about closeness but interrupt when something important is misunderstood."
          :"I am warm but protective of my quiet and my time.",
      },
      currentState:{
        selfModel:name==="Mina"
          ?"I speak up quickly when a distinction matters."
          :"I prefer calm, complete thoughts but do not insist on finishing them.",
        unresolvedIntentions:[],
      },
    },
    situation:{
      situationId:`sit_${threadId}`,
      threadId,
      establishedAt:"2026-10-07T18:00:00.000Z",
      location:{kind:"place",placeRef:"wpl_cafe"},
      mediatedContext:null,
      activity:"Sitting together over coffee.",
      participantRefs:[],
    },
    semanticStates:[],
    memories:[],
  });
}

test("Thread-to-Thread Live Encounter allows one Thread to cut into another without a turn owner", async () => {
  const mina=context("thr_live_mina","Mina");
  const noor=context("thr_live_noor","Noor");
  const choices=new Map();
  let minaSpeechFinished;
  const minaSpoke=new Promise((resolve)=>{ minaSpeechFinished=resolve; });

  const modelAdapter={
    provider:"fixture",
    modelId:"fixture-live-social",
    configuration:{transport:"fixture"},
    async invoke(call){
      assert.equal(
        call.clientRequestId.startsWith("social-live-contribution_"),
        true,
        "live social runner used the obsolete fixed-story cognition path",
      );
      const name=call.input.thread.name;
      const count=(choices.get(name)??0)+1;
      choices.set(name,count);
      return {
        output:{
          decision:count===1?"speak":"silent",
          actionText:null,
        },
        provenance:{provider:"fixture",modelId:"fixture-live-social-choice"},
      };
    },
    async *streamExpression(call){
      const name=call.input.thread.name;
      if(name==="Noor"){
        yield {type:"expression_delta",text:"I think that could work."};
        await minaSpoke;
        if(call.signal?.aborted)return;
        yield {type:"expression_delta",text:" But I wanted to finish explaining it."};
      }else{
        yield {type:"expression_delta",text:"Wait—"};
        // This resumes only after Live Encounter has exposed Mina's first delta.
        await Promise.resolve();
        minaSpeechFinished();
      }
      if(call.signal?.aborted)return;
      yield {
        type:"expression_complete",
        provenance:{
          provider:"fixture",
          modelId:"fixture-live-social-expression",
          providerRequestId:`fixture_${name.toLowerCase()}`,
        },
      };
    },
  };

  const result=await runThreadLiveSocialEncounter({
    initiator:mina,
    counterparty:noor,
    request:{
      initiatorThreadId:mina.thread.threadId,
      text:"Can I ask what you meant by that?",
    },
    stance:{
      decision:"accept",
      expression:null,
      suggestedAt:null,
      reason:"I am willing to answer.",
    },
    modelAdapter,
  });

  assert.deepEqual(
    result.story.beats.map((beat)=>({
      actorThreadId:beat.actorThreadId,
      text:beat.text,
      completion:beat.completion??"complete",
    })),
    [
      {
        actorThreadId:mina.thread.threadId,
        text:"Can I ask what you meant by that?",
        completion:"complete",
      },
      {
        actorThreadId:noor.thread.threadId,
        text:"I think that could work.",
        completion:"interrupted",
      },
      {
        actorThreadId:mina.thread.threadId,
        text:"Wait—",
        completion:"complete",
      },
    ],
    "live social encounter did not preserve audible interruption truth",
  );
  assert.equal(
    result.story.beats.some((beat)=>beat.text.includes("finish explaining")),
    false,
    "interrupted Thread speech leaked an unspoken suffix",
  );
  assert.equal(result.live.endedBy,"quiescent",
    "live social encounter did not settle when both Threads chose silence");
  assert.equal(Object.hasOwn(result.live,"turnOwner"),false,
    "live social encounter introduced turn ownership");
});
