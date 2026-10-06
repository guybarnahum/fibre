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

function fixture({ applies=true, decision="decline", actualSituation=situation("sit_actual") }={}){
  const stories=[];
  const modelCalls=[];
  const experienceStore={
    recordEncounterStory(candidate){
      const record={ encounterId:"story_n6_public",...structuredClone(candidate) };
      stories.push(structuredClone(record));
      return record;
    },
    recordThreadEncounterAttention(candidate){
      return {
        threadId:candidate.threadId,
        encounterRef:candidate.encounterRef,
        situationId:candidate.situationId,
        occurredAt:candidate.occurredAt,
        outcome:candidate.outcome,
        experience:{
          experienceId:"exp_n6_public",
          threadId:candidate.threadId,
          encounterRef:candidate.encounterRef,
          situationId:candidate.situationId,
          occurredAt:candidate.occurredAt,
          experienceText:candidate.experienceText,
        },
      };
    },
    recordThreadExperienceJournalEntry(candidate){
      return { journalEntryId:"journal_n6_public",...structuredClone(candidate) };
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
          output:{ responseText:"Sure — what did you want to ask?" },
          provenance:{
            provider:"fixture",
            modelId:"fixture-n6-public",
            providerRequestId:"req_n6_response",
          },
        };
      }
      if(call.clientRequestId.startsWith("encounter-experience_")){
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
    livedNowStore:{ latestPlan:()=>structuredClone(plan) },
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
  });

  return { service,stories,modelCalls };
}

function request(expectedSituationId="sit_displayed"){
  return {
    threadId:THREAD_ID,
    expectedSituationId,
    utterance:"Hi — do you have a minute?",
    at:AT,
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
});
