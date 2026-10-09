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

function fixture({ applies=true, decision="decline", actualSituation=situation("sit_actual"), failFirstWake=false, failFirstExperience=false }={}){
  const stories=[];
  const receipts=new Map();
  const admissions=new Map();
  const attentions=new Map();
  const modelCalls=[];
  const queued=[];
  let wakeAttempts=0;
  let experienceAttempts=0;
  const experienceStore={
    recordEncounterStory(candidate,{publicRequest=null}={}){
      const prior=publicRequest===null?null:admissions.get(publicRequest.requestId)??null;
      if(prior!==null){
        assert.equal(prior.requestDigest,publicRequest.requestDigest);
        assert.equal(prior.threadId,publicRequest.threadId);
        return this.getEncounterStory(prior.encounterRef);
      }
      const record={ encounterId:`story_n6_public_${stories.length+1}`,...structuredClone(candidate) };
      stories.push(structuredClone(record));
      if(publicRequest!==null){
        admissions.set(publicRequest.requestId,{...publicRequest,encounterRef:record.encounterId});
      }
      return record;
    },
    getPublicEncounterAdmission(requestId){
      return structuredClone(admissions.get(requestId)??null);
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
    async invoke(call){
      modelCalls.push(structuredClone(call));
      if(call.clientRequestId.startsWith("interior_")){
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
          currentSituation:structuredClone(actualSituation),
        };
      },
    },
    livedNowStore:{
      latestPlan:()=>structuredClone(plan),
      getSituation:()=>structuredClone(actualSituation),
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

  return { service,stories,receipts,modelCalls,queued };
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
