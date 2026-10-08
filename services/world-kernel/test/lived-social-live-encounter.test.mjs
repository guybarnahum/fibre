import assert from "node:assert/strict";
import test from "node:test";

import { createLiveEncounterRegistry } from "../src/live-encounter-registry.mjs";
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

test("Thread live encounter can contribute an outward action without forcing speech", async () => {
  const mina=context("thr_action_mina","Mina");
  const noor=context("thr_action_noor","Noor");
  const choices=new Map();

  const modelAdapter={
    provider:"fixture",
    modelId:"fixture-live-action",
    configuration:{transport:"fixture"},
    async invoke(call){
      const name=call.input.thread.name;
      const count=(choices.get(name)??0)+1;
      choices.set(name,count);
      if(name==="Noor"&&count===1){
        return {
          output:{decision:"act",actionText:"Noor slides the sketchbook slightly toward Mina."},
          provenance:{provider:"fixture",modelId:"fixture-live-action-choice"},
        };
      }
      return {
        output:{decision:"silent",actionText:null},
        provenance:{provider:"fixture",modelId:"fixture-live-action-choice"},
      };
    },
    async *streamExpression(){
      throw new Error("action-only proof should not stream speech");
    },
  };

  const result=await runThreadLiveSocialEncounter({
    initiator:mina,
    counterparty:noor,
    request:{
      initiatorThreadId:mina.thread.threadId,
      text:"Can I see what you're working on?",
    },
    stance:{
      decision:"accept",
      expression:null,
      suggestedAt:null,
      reason:"I am comfortable showing it.",
    },
    modelAdapter,
  });

  assert.deepEqual(
    result.story.beats.map((beat)=>beat.kind),
    ["utterance","action"],
    "outward action did not become live encounter history",
  );
  assert.equal(
    result.story.beats[1].actorThreadId,
    noor.thread.threadId,
    "live action lost its actor",
  );
  assert.equal(
    result.story.beats[1].text,
    "Noor slides the sketchbook slightly toward Mina.",
    "live action lost its observable content",
  );
});

test("delayed private thought can originate speech during an active encounter", async () => {
  const mina=context("thr_afterthought_mina","Mina");
  const noor=context("thr_afterthought_noor","Noor");
  const registry=createLiveEncounterRegistry();
  const minaOpportunities=[];
  let noorContributionCount=0;
  let minaSpoke;
  const minaSpeech=new Promise((resolve)=>{minaSpoke=resolve;});
  let published=false;

  const modelAdapter={
    provider:"fixture",
    modelId:"fixture-live-afterthought",
    configuration:{transport:"fixture"},
    async invoke(call){
      const name=call.input.thread.name;
      const opportunity=call.input.liveInteraction.opportunity;
      if(name==="Mina")minaOpportunities.push(structuredClone(opportunity));
      const speak=name==="Noor"
        ? opportunity.reason==="end"&&++noorContributionCount===1
        : opportunity.reason==="afterthought";
      return {
        output:{decision:speak?"speak":"silent",actionText:null},
        provenance:{provider:"fixture",modelId:"fixture-live-afterthought-choice"},
      };
    },
    async *streamExpression(call){
      if(call.input.thread.name==="Noor"){
        yield {type:"expression_delta",text:"I thought the sketch needed more contrast."};
        published=true;
        const delivery=registry.publishAfterthoughts({
          threadId:mina.thread.threadId,
          consolidationId:"con_afterthought_live",
          afterthoughts:[{
            kind:"question",
            text:"Did I assume Noor wanted critique when she wanted company?",
          }],
        });
        assert.equal(delivery.activeEncounters,1,
          "delayed thought did not find Mina's active encounter");
        await minaSpeech;
        if(call.signal?.aborted)return;
        yield {type:"expression_delta",text:" I was going to keep explaining."};
      }else{
        yield {type:"expression_delta",text:"Actually—did you want critique, or just company?"};
        minaSpoke();
      }
      if(call.signal?.aborted)return;
      yield {
        type:"expression_complete",
        provenance:{
          provider:"fixture",
          modelId:"fixture-live-afterthought-expression",
          providerRequestId:"fixture-live-afterthought",
        },
      };
    },
  };

  const result=await runThreadLiveSocialEncounter({
    initiator:mina,
    counterparty:noor,
    request:{
      initiatorThreadId:mina.thread.threadId,
      text:"What were you changing in the sketch?",
    },
    stance:{
      decision:"accept",
      expression:null,
      suggestedAt:null,
      reason:"I am happy to answer.",
    },
    modelAdapter,
    liveEncounterRegistry:registry,
  });

  assert.equal(published,true,"delayed thought was never published");
  assert.equal(
    minaOpportunities.some((opportunity)=>opportunity.reason==="sentence"),
    true,
    "ordinary speech boundary was not offered to Mina",
  );
  const delayed=minaOpportunities.find((opportunity)=>opportunity.reason==="afterthought");
  assert.equal(delayed?.sourceRef,"con_afterthought_live",
    "spontaneous opportunity lost its durable consolidation source");
  assert.equal(
    delayed?.privateContext?.afterthoughts?.[0]?.kind,
    "question",
    "spontaneous opportunity lost the private delayed thought",
  );
  assert.equal(
    result.story.beats.some((beat)=>
      beat.actorThreadId===mina.thread.threadId
      && beat.text==="Actually—did you want critique, or just company?"),
    true,
    "Thread did not originate outward speech from its delayed thought",
  );
  const interruptedNoor=result.story.beats.find((beat)=>
    beat.actorThreadId===noor.thread.threadId
    && beat.completion==="interrupted");
  assert.equal(
    interruptedNoor?.text,
    "I thought the sketch needed more contrast.",
    "spontaneous speech did not preserve only Noor's audible interrupted prefix",
  );
  assert.equal(registry.activeCount(mina.thread.threadId),0,
    "finished encounter remained registered as live");
});

