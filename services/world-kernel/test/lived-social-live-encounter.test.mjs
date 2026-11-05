import assert from "node:assert/strict";
import test from "node:test";

import { createLiveEncounterRegistry } from "../src/live-encounter-registry.mjs";
import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";

function context(threadId,name,other){
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
    perspective:{
      developedSelfEvidence:[],
      placeName:"the café",
      counterparts:[{threadId:other.threadId,name:other.name,appearance:"a person across the table",noticedBefore:[]}],
    },
  });
}

function pair(prefix){
  const ids={mina:`${prefix}_mina`,noor:`${prefix}_noor`};
  return [
    context(ids.mina,"Mina",{threadId:ids.noor,name:"Noor"}),
    context(ids.noor,"Noor",{threadId:ids.mina,name:"Mina"}),
  ];
}

// Each speaking opportunity is one streamed model call. turn() yields the
// text pieces the fixture model streams for that opportunity.
function liveModel(turn){
  const counts=new Map();
  const calls=[];
  return {
    calls,
    provider:"fixture",
    modelId:"fixture-live-turn",
    configuration:{transport:"fixture"},
    async invoke(){
      throw new Error("a speaking opportunity spent a separate structured decision");
    },
    async *streamExpression(call){
      calls.push(call);
      const name=call.input.thread.name;
      const count=(counts.get(name)??0)+1;
      counts.set(name,count);
      for await(const text of turn({name,count,call})){
        if(call.signal?.aborted)return;
        yield {type:"expression_delta",text};
      }
      if(call.signal?.aborted)return;
      yield {type:"expression_complete",provenance:{provider:"fixture",modelId:"fixture-live-turn"}};
    },
  };
}

function encounter(mina,noor,modelAdapter,{text="Can I ask what you meant by that?",expression=null,...rest}={}){
  return runThreadLiveSocialEncounter({
    initiator:mina,
    counterparty:noor,
    request:{initiatorThreadId:mina.thread.threadId,text},
    stance:{decision:"accept",expression,suggestedAt:null,reason:"I am willing."},
    modelAdapter,
    ...rest,
  });
}

test("Thread-to-Thread Live Encounter allows one Thread to cut into another without a turn owner", async () => {
  const [mina,noor]=pair("thr_live");
  let minaSpeechFinished;
  const minaSpoke=new Promise((resolve)=>{ minaSpeechFinished=resolve; });

  const result=await encounter(mina,noor,liveModel(async function*({name,count}){
    if(count>1){ yield "SILENT"; return; }
    if(name==="Noor"){
      yield "SAY: I think that could work.";
      await minaSpoke;
      yield " But I wanted to finish explaining it.";
    }else{
      yield "SAY: Wait—";
      // This resumes only after Live Encounter has exposed Mina's first words.
      await Promise.resolve();
      minaSpeechFinished();
    }
  }));

  assert.deepEqual(
    result.story.beats.map((beat)=>({
      actorThreadId:beat.actorThreadId,
      text:beat.text,
      completion:beat.completion??"complete",
    })),
    [
      {actorThreadId:mina.thread.threadId,text:"Can I ask what you meant by that?",completion:"complete"},
      {actorThreadId:noor.thread.threadId,text:"I think that could work.",completion:"interrupted"},
      {actorThreadId:mina.thread.threadId,text:"Wait—",completion:"complete"},
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
  const [mina,noor]=pair("thr_action");

  const result=await encounter(mina,noor,liveModel(async function*({name,count}){
    if(name==="Noor"&&count===1){
      yield "ACT: Noor slides the sketchbook ";
      yield "slightly toward Mina.";
      return;
    }
    yield "SILENT";
  }),{text:"Can I see what you're working on?"});

  assert.deepEqual(
    result.story.beats.map((beat)=>beat.kind),
    ["utterance","action"],
    "outward action did not become live encounter history",
  );
  assert.equal(result.story.beats[1].actorThreadId,noor.thread.threadId,
    "live action lost its actor");
  assert.equal(result.story.beats[1].text,"Noor slides the sketchbook slightly toward Mina.",
    "live action lost its observable content");
});

test("delayed private thought can originate speech during an active encounter", async () => {
  const [mina,noor]=pair("thr_afterthought");
  const registry=createLiveEncounterRegistry();
  const minaOpportunities=[];
  let noorContributionCount=0;
  let minaSpoke;
  const minaSpeech=new Promise((resolve)=>{minaSpoke=resolve;});
  let published=false;

  const result=await encounter(mina,noor,liveModel(async function*({name,call}){
    const opportunity=call.input.liveInteraction.opportunity;
    if(name==="Mina"){
      minaOpportunities.push(structuredClone(opportunity));
      if(opportunity.reason!=="afterthought"){ yield "SILENT"; return; }
      yield "SAY: Actually—did you want critique, or just company?";
      minaSpoke();
      return;
    }
    if(opportunity.reason!=="end"||++noorContributionCount>1){ yield "SILENT"; return; }
    yield "SAY: I thought the sketch needed more contrast.";
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
    yield " I was going to keep explaining.";
  }),{text:"What were you changing in the sketch?",liveEncounterRegistry:registry});

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

test("a reply begun mid-sentence answers that utterance once, in the speaker's own words",async()=>{
  const [mina,noor]=pair("thr_live_once");
  const result=await encounter(mina,noor,liveModel(async function*({name,count}){
    if(name==="Mina"){
      // Mina starts deciding after Noor's first sentence; Noor finishes meanwhile.
      await new Promise((resolve)=>setTimeout(resolve,20));
      // Like a real model, Mina would answer the same heard line again if asked.
      yield count<=2?"SAY: “Much the same, actually.”":"SILENT";
      return;
    }
    if(count>1){ yield "SILENT"; return; }
    yield "SAY: Usually I walk.";
    await new Promise((resolve)=>setTimeout(resolve,1));
    yield " What do you prefer?";
  }),{text:"Do you walk here often?"});
  const minaLines=result.story.beats.filter((beat)=>
    beat.actorThreadId===mina.thread.threadId&&beat.kind==="utterance")
    .map((beat)=>beat.text);
  assert.deepEqual(minaLines,["Do you walk here often?","Much the same, actually."],
    "one heard utterance produced a repeated reply or quoted speech");
});

test("each speaking opportunity costs exactly one model call, whether it becomes speech, action or silence",async()=>{
  const [mina,noor]=pair("thr_live_cost");
  const model=liveModel(async function*({name,count}){
    if(name==="Noor"&&count===1){
      // Arrives token by token, as a provider streams it.
      for(const piece of ["S","AY",": ","Sure",", let's talk."])yield piece;
      return;
    }
    if(name==="Mina"&&count===1){ yield "ACT: Mina pulls out a chair."; return; }
    yield "SILENT";
  });
  const result=await encounter(mina,noor,model);
  assert.deepEqual(result.story.beats.map((beat)=>beat.kind).sort(),["action","utterance","utterance"],
    "the conversation lost a chosen contribution");
  assert.equal(result.story.beats.find((beat)=>beat.actorThreadId===noor.thread.threadId)?.text,
    "Sure, let's talk.","the turn marker leaked into spoken words");
  assert.equal(model.calls.length,result.live.opportunityAppraisals,
    "a speaking opportunity did not cost exactly one model call");
  assert.equal(new Set(model.calls.map((call)=>call.promptRef)).size,1,
    "speaking opportunities used more than one cognitive job");
  assert.equal(result.live.endedBy,"quiescent","the conversation did not settle");
});

test("a Thread that decides to speak while the other starts again cuts in rather than losing its turn",async()=>{
  const [mina,noor]=pair("thr_live_forming");
  const registry=createLiveEncounterRegistry();
  let noorRestarted,minaSpoke;
  const restarted=new Promise((resolve)=>{noorRestarted=resolve;});
  const spoke=new Promise((resolve)=>{minaSpoke=resolve;});
  const result=await encounter(mina,noor,liveModel(async function*({name,count,call}){
    const reason=call.input.liveInteraction.opportunity.reason;
    if(name==="Mina"){
      if(count>1){ yield "SILENT"; return; }
      await restarted;
      yield "SAY: Before you go on—";
      minaSpoke();
      return;
    }
    if(reason==="afterthought"){
      yield "SAY: Actually, I remember something.";
      noorRestarted();
      await Promise.race([spoke,new Promise((resolve)=>setTimeout(resolve,50))]);
      yield " It was about the river.";
      return;
    }
    if(count>1){ yield "SILENT"; return; }
    yield "SAY: Yes, let's.";
    registry.publishAfterthoughts({
      threadId:noor.thread.threadId,
      consolidationId:"con_forming_turn",
      afterthoughts:[{kind:"insight",text:"I meant to mention the river."}],
    });
  }),{text:"Shall we sit?",liveEncounterRegistry:registry});
  assert.ok(result.story.beats.some((beat)=>
    beat.actorThreadId===mina.thread.threadId&&beat.text==="Before you go on—"),
  "a turn already forming was lost when the other person started speaking");
  assert.equal(result.story.beats.find((beat)=>beat.completion==="interrupted")?.text,
    "Actually, I remember something.","the decided speech did not cut in");
});

test("an unclear turn is silence for that opportunity and the conversation continues",async()=>{
  const [mina,noor]=pair("thr_live_unclear");
  const warn=console.warn;
  console.warn=()=>{};
  try{
    const result=await encounter(mina,noor,liveModel(async function*({name,count}){
      if(name==="Noor"){
        yield count===1?"SAY: I walk here most days. Usually alone.":"SILENT";
        return;
      }
      if(count===1){ yield "Hmm, well, I suppose I would say something."; return; }
      yield count===2?"SAY: Alone sounds peaceful.":"SILENT";
    }),{text:"Do you walk here often?"});
    assert.equal(result.live.endedBy,"quiescent","an unclear turn ended the conversation");
    assert.equal(result.story.beats.some((beat)=>beat.text.includes("suppose")),false,
      "unclear cognition output became audible history");
    assert.equal(result.story.beats.at(-1).text,"Alone sounds peaceful.",
      "the Thread lost its later chance to speak after an unclear turn");
  }finally{
    console.warn=warn;
  }
});
