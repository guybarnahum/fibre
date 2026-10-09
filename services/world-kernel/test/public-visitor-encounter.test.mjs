import assert from "node:assert/strict";
import test from "node:test";

import { createPublicVisitorEncounterService } from "../src/public-visitor-encounter.mjs";

const AT="2026-10-06T02:45:00.000Z";
const THREAD_ID="thr_n6_public_visitor";

const thread={
  threadId:THREAD_ID,
  version:7,
  identity:{
    name:"Maya",
    selfDescription:"I am thoughtful and protective of my time.",
  },
  currentState:{
    selfModel:"I am trying to finish what I started.",
    needs:[],
    feelings:[],
    unresolvedIntentions:[],
  },
  genome:{ textualTraits:{} },
};

function situation(situationId,activity="Reading and making notes at a library table."){
  return {
    situationId,
    threadId:THREAD_ID,
    establishedAt:"2026-10-06T02:40:00.000Z",
    phase:"at_place",
    location:{ kind:"place",placeRef:"wpl_n6_library" },
    mediatedContext:null,
    activity,
    reason:"World says this is what is actually happening.",
    participantRefs:[],
    evidenceRefs:["evt_n6_actual"],
    sourcePlanRefs:["lplan_n6_public"],
    resolution:{
      kind:"personal_plan",
      conflict:false,
      observedDivergence:false,
      governingPlanRef:"lplan_n6_public",
      constrainedPlanRef:null,
      summary:"Current enacted life.",
    },
    provenance:"world_enacted",
  };
}

const plan={
  planId:"lplan_n6_public",
  kind:"personal",
  subjectThreadId:THREAD_ID,
  horizonStart:"2026-10-06T02:00:00.000Z",
  horizonEnd:"2026-10-06T05:00:00.000Z",
  stops:[],
};

function fixture({ applies=true, decision="decline", actualSituation=situation("sit_actual"), failFirstWake=false, failFirstExperience=false, advanceDuring=null,failAfterFirstSentence=false,batchLiveSpeech=false }={}){
  let present=structuredClone(actualSituation);
  const stories=[];
  const receipts=new Map();
  const admissions=new Map();
  const checkpoints=new Map();
  const attentions=new Map();
  const modelCalls=[];
  const streamCalls=[];
  const queued=[];
  let wakeAttempts=0;
  let experienceAttempts=0;
  const experienceStore={
    recordEncounterStory(candidate,{publicRequest=null,publicCheckpoint=null}={}){
      const prior=publicRequest===null?null:admissions.get(publicRequest.requestId)??null;
      if(prior!==null){
        assert.equal(prior.requestDigest,publicRequest.requestDigest);
        assert.equal(prior.threadId,publicRequest.threadId);
        return this.getEncounterStory(prior.encounterRef);
      }
      if(publicCheckpoint?.position>0){
        const entries=checkpoints.get(publicCheckpoint.requestId)??[];
        const previous=entries.at(-1);
        assert.equal(publicCheckpoint.position,entries.length,
          "speech checkpoint skipped its causal predecessor");
        assert.equal(candidate.story.continuationOfEncounterRef,previous,
          "speech checkpoint lost its outward history");
      }
      const record={ encounterId:`story_n6_public_${stories.length+1}`,...structuredClone(candidate) };
      stories.push(structuredClone(record));
      if(publicRequest!==null){
        admissions.set(publicRequest.requestId,{...publicRequest,encounterRef:record.encounterId});
      }
      if(publicCheckpoint!==null){
        const entries=checkpoints.get(publicCheckpoint.requestId)??[];
        entries.push(record.encounterId);
        checkpoints.set(publicCheckpoint.requestId,entries);
      }
      return record;
    },
    getPublicEncounterAdmission(requestId){
      return structuredClone(admissions.get(requestId)??null);
    },
    listPublicEncounterCheckpointStories(requestId){
      return (checkpoints.get(requestId)??[]).map((id)=>this.getEncounterStory(id));
    },
    getEncounterStory(encounterId,{ required=true }={}){
      const record=stories.find((item)=>item.encounterId===encounterId)??null;
      if(record!==null)return structuredClone(record);
      if(required)throw new TypeError(`Encounter Story ${encounterId} was not found`);
      return null;
    },
    getPublicEncounterReceipt(requestId,{ required=false }={}){
      const record=receipts.get(requestId)??null;
      if(record!==null)return structuredClone(record);
      if(required)throw new TypeError(`public encounter receipt ${requestId} was not found`);
      return null;
    },
    recordPublicEncounterReceipt(candidate){
      const prior=receipts.get(candidate.requestId)??null;
      if(prior!==null){
        assert.deepEqual(prior,candidate);
        return structuredClone(prior);
      }
      receipts.set(candidate.requestId,structuredClone(candidate));
      return structuredClone(candidate);
    },
    recordThreadEncounterAttention(candidate){
      const prior=attentions.get(candidate.encounterRef);
      if(prior!==undefined)return structuredClone(prior);
      const record={
        threadId:candidate.threadId,
        encounterRef:candidate.encounterRef,
        situationId:candidate.situationId,
        occurredAt:candidate.occurredAt,
        outcome:candidate.outcome,
        experience:{
          experienceId:`exp_${candidate.encounterRef}`,
          threadId:candidate.threadId,
          encounterRef:candidate.encounterRef,
          situationId:candidate.situationId,
          occurredAt:candidate.occurredAt,
          experienceText:candidate.experienceText,
        },
      };
      attentions.set(candidate.encounterRef,structuredClone(record));
      return record;
    },
    getThreadEncounterAttention(threadId,encounterRef){
      return structuredClone(attentions.get(encounterRef)??null);
    },
    queueThreadExperienceConsolidation(candidate){
      const record={
        experienceId:candidate.experienceId,
        threadId:THREAD_ID,
        queuedAt:candidate.queuedAt,
      };
      if(!queued.some((item)=>item.experienceId===record.experienceId))queued.push(structuredClone(record));
      return record;
    },
  };
  const memoryStore={
    listCurrentMemories(){ return []; },
    recordMemory(candidate){ return structuredClone(candidate); },
  };
  const modelAdapter={
    provider:"fixture",
    modelId:"fixture-n6-public",
    configuration:{transport:"fixture"},
    async *streamExpression(call){
      streamCalls.push(structuredClone(call.input));
      if(advanceDuring==="live_speech"){
        present=situation("sit_world_departed","Heading home after leaving the library.");
      }
      if(advanceDuring==="same_scene_live_speech"){
        present=situation("sit_world_same_scene");
      }
      const chunks=batchLiveSpeech
        ?["I was thinking about this. But then I changed my mind."]
        :["I was thinking about this.", " But then I changed my mind."];
      for(const [index,text] of chunks.entries()){
        if(call.signal.aborted)return;
        yield {type:"expression_delta",text};
        if(index===0&&failAfterFirstSentence){
          assert.equal(stories.length,1,
            "spoken sentence was not durable before the next model delta");
          throw new Error("stream interrupted after sentence");
        }
      }
      if(!call.signal.aborted)yield {type:"expression_complete",provenance:null};
    },
    async invoke(call){
      modelCalls.push(structuredClone(call));
      if(call.clientRequestId.startsWith("interior_")){
        if(advanceDuring==="participation")present=situation("sit_world_advanced","Heading to a different place.");
        if(advanceDuring==="participation_compatible")present=situation("sit_same_life_new_witness");
        return {
          output:{
            result:{
              decision,
              expression:decision==="accept"?"Sure.":"Not right now, thanks.",
              suggestedAt:null,
              reason:"A private reason grounded in current life.",
            },
            evidenceRefs:[],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-n6-public",
            providerRequestId:"req_n6_stance",
          },
        };
      }
      if(call.clientRequestId.startsWith("lived-encounter_")){
        if(advanceDuring==="expression")present=situation("sit_world_advanced","Heading to a different place.");
        return {
          output:{
            responseText:call.input.recentEncounterStories?.length
              ?"I meant I can talk while I finish this page."
              :"Sure — what did you want to ask?",
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-n6-public",
            providerRequestId:"req_n6_response",
          },
        };
      }
      if(call.clientRequestId.startsWith("encounter-experience_")){
        if(failFirstExperience&&++experienceAttempts===1)throw new Error("simulated experience interruption");
        return {
          output:{ experienceText:"I shifted my attention from the page to the visitor." },
          provenance:{ provider:"fixture",modelId:"fixture-n6-public" },
        };
      }
      if(call.clientRequestId.startsWith("encounter-reflection_")){
        return {
          output:{ journalEntry:null },
          provenance:{ provider:"fixture",modelId:"fixture-n6-public" },
        };
      }
      if(call.clientRequestId.startsWith("lived-memory_")){
        return {
          output:{
            outcome:"not_remembered",
            rememberedContent:null,
            rememberedMeaning:null,
            confidence:null,
            salience:null,
            uncertainty:[],
          },
          provenance:{ provider:"fixture",modelId:"fixture-n6-public" },
        };
      }
      throw new Error(`unexpected model call ${call.clientRequestId}`);
    },
  };

  const service=createPublicVisitorEncounterService({
    worldReader:{ getThread:()=>structuredClone(thread) },
    livedNow:{
      async validateDisplayedSituation(){
        return {
          applies,
          currentSituation:structuredClone(present),
        };
      },
    },
    livedNowStore:{
      latestPlan:()=>structuredClone(plan),
      getSituation:()=>structuredClone(actualSituation),
      getCurrentSituation:()=>structuredClone(present),
    },
    identityStore:{
      getCurrentIdentityView(){
        return { threadId:THREAD_ID,assertions:[] };
      },
    },
    situatedLifeStore:{ listCurrentLifeRelations:()=>[] },
    semanticStateStore:{ listCurrentState:()=>[] },
    memoryStore,
    experienceStore,
    modelAdapter,
    ...(failFirstWake?{
      onExperienceQueued:async()=>{
        if(++wakeAttempts===1)throw new Error("simulated wake interruption");
      },
    }:{}),
  });

  return { service,stories,receipts,modelCalls,streamCalls,queued,
    advanceWorld:(next)=>{present=structuredClone(next);},
  };
}

function request(expectedSituationId="sit_displayed",{
  requestId="req_n6_public_001",
  utterance="Hi — do you have a minute?",
  priorEncounterStoryId=null,
  at=AT,
}={}){
  return {
    requestId,
    threadId:THREAD_ID,
    expectedSituationId,
    utterance,
    ...(priorEncounterStoryId===null?{}:{ priorEncounterStoryId }),
    at,
  };
}

test("N6.3d stale or declined visitor requests cannot become Encounter Stories",async()=>{
  const stale=fixture({ applies:false });
  const staleResult=await stale.service.encounter(request());
  assert.equal(staleResult.outcome,"scene_changed");
  assert.equal(stale.modelCalls.length,0,
    "stale scene reached participation cognition");
  assert.equal(stale.stories.length,0,
    "stale scene became an encounter");

  const declined=fixture({ decision:"decline" });
  const declinedResult=await declined.service.encounter(request());
  assert.equal(declinedResult.outcome,"decline");
  assert.equal(declinedResult.expression,"Not right now, thanks.");
  assert.equal(declined.modelCalls.length,1,
    "decline should require only participation cognition");
  assert.equal(declined.stories.length,0,
    "decline became an Encounter Story");
});

test("N6.3d accepted visitor request becomes one Encounter Story in revalidated actual life",async()=>{
  const actual=situation("sit_revalidated_actual");
  const f=fixture({ decision:"accept",actualSituation:actual });
  const result=await f.service.encounter(request("sit_displayed_witness"));

  assert.equal(result.outcome,"accepted");
  assert.equal(result.situationId,actual.situationId);
  assert.equal(result.responseText,"Sure — what did you want to ask?");
  assert.equal(f.stories.length,1,
    "accepted visitor request should create one Encounter Story");
  assert.deepEqual(f.stories[0].threadPresence,[{
    threadId:THREAD_ID,
    situationId:actual.situationId,
  }],"Encounter Story must cite actual revalidated life");
  assert.deepEqual(
    f.stories[0].visualization.visualizationSourceReferences.sort(),
    ["sit_displayed_witness",actual.situationId].sort(),
    "story reconstruction should retain both displayed witness and actual situation lineage",
  );
  assert.equal(
    f.stories[0].story.beats[0].text,
    "Hi — do you have a minute?",
    "visitor request should be the first observable beat",
  );
  assert.equal(f.queued.length,1,
    "accepted lived experience was not queued for later consolidation");
  assert.equal(
    f.modelCalls.some((call)=>
      call.clientRequestId.startsWith("encounter-reflection_")
      ||call.clientRequestId.startsWith("lived-memory_")),
    false,
    "public encounter still performs Journal/Memory consolidation on the hot path",
  );
});


test("World situation advances during cognition without inventing a stale encounter",async()=>{
  for(const phase of ["participation","expression"]){
    const f=fixture({
      decision:"accept",
      actualSituation:situation("sit_world_initial"),
      advanceDuring:phase,
    });
    const result=await f.service.encounter(request("sit_world_displayed",{
      requestId:`req_scene_advanced_${phase}`,
    }));
    assert.equal(result.outcome,"scene_changed",
      "World change must interrupt the pending encounter");
    assert.equal(result.currentSituationId,"sit_world_advanced",
      "scene change must report the actual World present");
    assert.equal(f.stories.length,0,
      "unspoken response entered objective history after World moved");
    assert.equal(f.queued.length,0,
      "a stale encounter became personal Experience");
    assert.equal(f.modelCalls.filter((call)=>
      call.clientRequestId.startsWith("lived-encounter_")).length,
      phase==="participation"?0:1,
      "World change should not generate needless speech");
  }
});

test("N6.3e later accepted turns use admitted Encounter Story history instead of session state",async()=>{
  const actual=situation("sit_n6_continuing_actual");
  const f=fixture({ decision:"accept",actualSituation:actual });

  const first=await f.service.encounter(request("sit_displayed_first"));
  const second=await f.service.encounter(request(first.situationId,{
    requestId:"req_n6_public_002",
    utterance:"What do you mean by that?",
    priorEncounterStoryId:first.encounterStoryId,
  }));

  assert.equal(second.outcome,"accepted");
  assert.equal(second.responseText,"I meant I can talk while I finish this page.");
  assert.equal(f.stories.length,2,
    "two accepted turns should be two objective encounters");
  assert.equal(
    f.stories[1].story.continuationOfEncounterRef,
    first.encounterStoryId,
    "continued encounter lost its causal predecessor",
  );

  const participationCalls=f.modelCalls.filter((call)=>call.clientRequestId.startsWith("interior_"));
  const responseCalls=f.modelCalls.filter((call)=>call.clientRequestId.startsWith("lived-encounter_"));
  assert.equal(participationCalls.length,2);
  assert.equal(responseCalls.length,2);
  assert.equal(
    participationCalls[1].input.concern.externalContext.recentEncounterStories[0].encounterId,
    first.encounterStoryId,
    "later participation did not see immediate lived history",
  );
  assert.equal(
    responseCalls[1].input.recentEncounterStories[0].encounterId,
    first.encounterStoryId,
    "later reply did not see immediate lived history",
  );
  assert.equal(Object.hasOwn(second,"sessionId"),false,
    "continued encounter invented session authority");
});


test("an enacted scene change retains admitted visitor dialogue while the Thread independently chooses the next reply",async()=>{
  const f=fixture({decision:"accept",actualSituation:situation("sit_before_movement")});
  const first=await f.service.encounter(request("sit_before_movement",{
    requestId:"req_before_world_movement",
  }));
  f.advanceWorld(situation("sit_after_movement","Walking towards the market."));
  const continued=await f.service.encounter(request("sit_after_movement",{
    requestId:"req_after_world_movement",
    utterance:"Are you still there?",
    priorEncounterStoryId:first.encounterStoryId,
  }));
  assert.equal(continued.outcome,"accepted",
    "World movement forced an already admitted conversation to end");
  assert.equal(f.stories[1].threadPresence[0].situationId,"sit_after_movement",
    "new speech did not belong to the Thread's actual new situation");
  assert.equal(f.stories[1].story.continuationOfEncounterRef,first.encounterStoryId,
    "the visitor's ongoing conversation forgot Faith after her World changed");
  assert.equal(f.modelCalls.filter((call)=>call.clientRequestId.startsWith("interior_")).length,2,
    "World movement bypassed the Thread's choice to keep participating");
});

test("an interrupted N7 public reply admits only spoken text and a retry cannot invent another life",async()=>{
  const f=fixture({decision:"accept"});
  const abort=new AbortController();
  let delivered="";
  const input=request("sit_live_accepted",{
    requestId:"req_live_interrupted",
  });
  const first=await f.service.encounter(input,{
    signal:abort.signal,
    onLiveEvent(event){
      if(event.type==="speech_delta"&&event.actorId===THREAD_ID){
        delivered+=event.text;
        abort.abort("visitor interrupted");
      }
    },
  });

  assert.equal(first.outcome,"accepted","spoken live speech was not admitted");
  assert.equal(first.completion,"interrupted","spoken interruption was erased");
  assert.equal(f.stories.length,1,"one spoken encounter became multiple objective events");
  assert.equal(f.stories[0].story.beats[1].text,delivered,
    "World history differs from what the visitor heard");
  assert.equal(f.stories[0].story.beats[1].completion,"interrupted",
    "objective speech lost its interrupted ending");
  assert.equal(f.stories[0].story.beats[1].text.includes("changed my mind"),false,
    "unexposed model output became World history");
  assert.equal(f.queued.length,1,"spoken experience was not queued for later consequence");
  assert.equal(f.modelCalls.filter((call)=>
    call.clientRequestId.startsWith("lived-encounter_")).length,0,
    "live expression retriggered complete-response cognition");
  assert.equal(f.streamCalls.length,1,"live path did not use the N7 expression stream");

  const replay=await f.service.encounter({...input,at:"2026-10-06T02:46:00.000Z"});
  assert.deepEqual(replay,first,"retry changed the admitted interrupted speech");
  assert.equal(f.stories.length,1,"retry duplicated what already happened");
  assert.equal(f.queued.length,1,"retry duplicated personal consequence");
  assert.equal(f.streamCalls.length,1,"retry repeated already-exposed expression");
});

test("a broken live listener cannot make unexposed generated speech part of World history",async()=>{
  const f=fixture({decision:"accept"});
  const input=request("sit_live_disconnected",{
    requestId:"req_live_listener_interrupted",
  });
  let delivered="";
  let liveDeltas=0;
  let ending=null;
  await assert.rejects(f.service.encounter(input,{
    onLiveEvent(event){
      if(event.type==="speech_end"&&event.actorId===THREAD_ID){
        ending=event;
      }
      if(event.type!=="speech_delta"||event.actorId!==THREAD_ID)return;
      if(++liveDeltas===2)throw new Error("listener disconnected");
      delivered+=event.text;
    },
  }),/listener disconnected/);
  assert.equal(ending?.text,delivered,
    "live observer was told unexposed speech had been heard");

  assert.equal(f.stories.length,1,"listener failure erased already-spoken history");
  assert.equal(f.stories[0].story.beats[1].text,delivered,
    "unexposed model suffix entered World history");
  assert.equal(f.stories[0].story.beats[1].completion,undefined,
    "completed sentence was rewritten as interrupted after a later disconnect");
  assert.equal(f.queued.length,0,"failed live request prematurely formed a personal Experience");

  const recovered=await f.service.encounter({...input,at:"2026-10-06T02:46:00.000Z"});
  assert.equal(recovered.responseText,delivered,
    "recovery invented a new outward reply");
  assert.equal(recovered.completion,"interrupted",
    "recovery erased the audible interruption");
  assert.equal(f.stories.length,1,"recovery duplicated the outward event");
  assert.equal(f.queued.length,1,"recovery failed to form one personal Experience");
  assert.equal(f.streamCalls.length,1,"recovery re-generated already-exposed speech");
});

test("World movement interrupts live speech without discarding the spoken sentence or leaking the unseen suffix",async()=>{
  const f=fixture({decision:"accept",advanceDuring:"live_speech",batchLiveSpeech:true});
  const events=[];
  const input=request("sit_scene_live",{requestId:"req_scene_live"});
  const result=await f.service.encounter(input,{
    onLiveEvent(event){events.push(event);},
  });

  assert.equal(result.outcome,"accepted","World movement erased real spoken history");
  assert.equal(result.completion,"interrupted","Thread kept speaking after leaving the scene");
  assert.equal(result.currentSituationId,"sit_world_departed",
    "live result lost the real World movement");
  assert.equal(result.responseText,"I was thinking about this.",
    "the abandoned model suffix became outward speech");
  assert.deepEqual(f.stories.map((story)=>story.story.beats.at(-1).text),
    ["I was thinking about this."],
    "the material scene change invented or lost World history");
  assert.equal(f.stories[0].story.beats.at(-1).completion,undefined,
    "fully spoken sentence was rewritten after a later interruption");
  assert.equal(f.queued.length,1,"real interrupted speech lost its one personal Experience");
  assert.equal(events.some((event)=>
    event.type==="scene_changed"
    &&event.currentSituation.situationId==="sit_world_departed"),true,
    "moving World did not interrupt the active live encounter");
  assert.equal(events.some((event)=>
    event.type==="speech_delta"
    &&event.text.includes("changed my mind")),false,
    "live encounter exposed a suffix after World interrupted speech");

  const replay=await f.service.encounter({...input,at:"2026-10-06T02:46:00.000Z"});
  assert.deepEqual(replay,result,"scene-interrupted encounter changed on retry");
  assert.equal(f.stories.length,1,"scene interruption duplicated objective history");
  assert.equal(f.streamCalls.length,1,"retry regenerated a scene-interrupted utterance");
});

test("a compatible situation reissue during private participation preserves the encounter",async()=>{
  const f=fixture({decision:"accept",advanceDuring:"participation_compatible"});
  const result=await f.service.encounter(
    request("sit_private_scene_same",{requestId:"req_private_scene_same"}),
  );
  assert.equal(result.outcome,"accepted",
    "a same-scene World witness cancelled voluntary participation");
  assert.equal(f.stories.length,1,
    "compatible present did not become one real encounter");
});

test("compatible World witness change does not end live participation",async()=>{
  const f=fixture({decision:"accept",advanceDuring:"same_scene_live_speech",batchLiveSpeech:true});
  const result=await f.service.encounter(
    request("sit_same_scene_live",{requestId:"req_same_scene_live"}),
    {onLiveEvent(){}},
  );
  assert.equal(result.outcome,"accepted","compatible new World witness ended speech");
  assert.equal(result.completion,undefined,"same lived scene was treated as an interruption");
  assert.equal(result.responseText,"I was thinking about this. But then I changed my mind.",
    "same-scene conversation lost its spoken continuation");
  assert.equal(f.stories.length,2,"stable speech checkpoints were not preserved");
});

test("live speech commits linked sentence checkpoints before later provider output",async()=>{
  const f=fixture({decision:"accept"});
  const input=request("sit_live_sentences",{requestId:"req_live_sentences"});
  const result=await f.service.encounter(input,{onLiveEvent(){}});
  assert.equal(result.outcome,"accepted");
  assert.equal(f.stories.length,2,"separate exposed sentences were not admitted");
  assert.equal(f.stories[1].story.continuationOfEncounterRef,f.stories[0].encounterId,
    "second sentence lost its first admitted predecessor");
  assert.equal(f.stories[1].story.beats.length,1,
    "second checkpoint repeated already-admitted visitor speech");
  assert.equal(result.responseText,"I was thinking about this. But then I changed my mind.",
    "response did not preserve the linked spoken progression");
  assert.equal(result.encounterStoryId,f.stories[1].encounterId,
    "continuation does not point to the last admitted speech");
  assert.equal(f.queued.length,1,"one speech episode formed multiple personal Experiences");
});

test("an unfinished stream retains its stable World sentence after restart-style retry",async()=>{
  const f=fixture({decision:"accept",failAfterFirstSentence:true});
  const input=request("sit_live_checkpoint",{requestId:"req_live_checkpoint"});
  await assert.rejects(f.service.encounter(input,{onLiveEvent(){}}),
    /stream interrupted after sentence/);
  assert.equal(f.stories.length,1,"an unfinished live utterance lost admitted speech");
  assert.equal(f.queued.length,0,"unfinished live encounter prematurely formed Experience");

  const recovered=await f.service.encounter({
    ...input,at:"2026-10-06T02:46:00.000Z",
  });
  assert.equal(recovered.outcome,"accepted","durable speech was not recovered");
  assert.equal(recovered.completion,"interrupted","lost stream was treated as finished speech");
  assert.equal(recovered.responseText,"I was thinking about this.",
    "recovery invented missing speech after the checkpoint");
  assert.equal(f.stories.length,1,"recovery repeated a committed World event");
  assert.equal(f.queued.length,1,"recovery failed to form one personal Experience");
  assert.equal(f.streamCalls.length,1,"recovery repeated abandoned live inference");
});

test("N6.4 completed retry replays one admitted outcome without repeating private consequence",async()=>{
  const actual=situation("sit_n6_retry_actual");
  const f=fixture({ decision:"accept",actualSituation:actual });
  const firstInput=request("sit_retry_displayed",{
    requestId:"req_n6_retry_once",
  });
  const first=await f.service.encounter(firstInput);
  const callsAfterFirst=f.modelCalls.length;
  const storiesAfterFirst=f.stories.length;

  const retry=await f.service.encounter({
    ...firstInput,
    at:"2026-10-06T02:46:00.000Z",
  });

  assert.deepEqual(retry,first,
    "retry changed the admitted encounter outcome");
  assert.equal(f.modelCalls.length,callsAfterFirst,
    "retry repeated cognition or private consequence");
  assert.equal(f.stories.length,storiesAfterFirst,
    "retry duplicated the Encounter Story");
  assert.equal(f.receipts.size,1,
    "retry created more than one durable receipt");
  assert.equal(f.queued.length,1,
    "completed retry requeued already-admitted experience");
});

test("an interrupted accepted encounter retry cannot repeat outward history or private experience",async()=>{
  const f=fixture({ decision:"accept",failFirstWake:true });
  const input=request("sit_retry_interrupted",{
    requestId:"req_n6_partial_retry",
  });
  await assert.rejects(f.service.encounter(input),/simulated wake interruption/);
  assert.equal(f.stories.length,1,"interruption must preserve the admitted encounter");
  assert.equal(f.queued.length,1,"interruption must preserve the queued experience");

  const retry=await f.service.encounter({
    ...input,
    at:"2026-10-06T02:46:00.000Z",
  });
  assert.equal(retry.outcome,"accepted");
  assert.equal(f.stories.length,1,"retry duplicated an admitted encounter");
  assert.equal(f.queued.length,1,"retry duplicated personal experience");
  assert.equal(f.modelCalls.length,3,"retry repeated cognition after the encounter happened");
});

test("a retry after Story admission resumes the original encounter without repeating speech",async()=>{
  const f=fixture({decision:"accept",failFirstExperience:true});
  const input=request("sit_retry_during_experience",{
    requestId:"req_n6_experience_recovery",
  });
  await assert.rejects(f.service.encounter(input),/simulated experience interruption/);
  assert.equal(f.stories.length,1,"interruption lost the admitted Story");

  const result=await f.service.encounter({...input,at:"2026-10-06T02:46:00.000Z"});
  assert.equal(result.outcome,"accepted");
  assert.equal(f.stories.length,1,"retry repeated the Thread's outward encounter");
  assert.equal(f.queued.length,1,"recovery failed to queue the original lived Experience");
  assert.equal(f.modelCalls.filter((call)=>call.clientRequestId.startsWith("interior_")).length,1,
    "recovery repeated Thread consent");
  assert.equal(f.modelCalls.filter((call)=>call.clientRequestId.startsWith("lived-encounter_")).length,1,
    "recovery repeated outward expression");
});

test("N6.4 request identity cannot be reused for a different encounter",async()=>{
  const f=fixture({ decision:"decline" });
  await f.service.encounter(request("sit_retry_binding",{
    requestId:"req_n6_retry_conflict",
    utterance:"Hello",
  }));

  await assert.rejects(
    f.service.encounter(request("sit_retry_binding",{
      requestId:"req_n6_retry_conflict",
      utterance:"Different words",
    })),
    /conflicts with its existing receipt/,
  );
});
