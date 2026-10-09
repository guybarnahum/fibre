import { formVisitorMeetingStance } from "./lived-meeting-cognition.mjs";
import { respondToLivedEncounter, streamLivedEncounterResponse } from "./lived-encounter-cognition.mjs";
import { createLiveEncounter } from "./live-encounter.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { formThreadEncounterExperience } from "./lived-thread-experience-cognition.mjs";
import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MEMORY_LIMIT = 6;
const CONTINUATION_LIMIT = 6;

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

function recentEncounterStories({
  experienceStore,
  threadId,
  priorEncounterStoryId,
  expectedSituationId,
  at,
}) {
  if (priorEncounterStoryId === null) return [];

  const stories = [];
  const seen = new Set();
  let encounterId = priorEncounterStoryId;
  for (let depth = 0; encounterId !== null && depth < CONTINUATION_LIMIT; depth += 1) {
    if (seen.has(encounterId)) return null;
    seen.add(encounterId);

    const record = experienceStore.getEncounterStory(encounterId, { required:false });
    if (record === null) return null;
    const presence = record.threadPresence.find((item) => item.threadId === threadId);
    if (presence === undefined) return null;
    if (depth === 0 && presence.situationId !== expectedSituationId) return null;
    if (Date.parse(record.occurredAt) > Date.parse(at)) return null;

    stories.push({
      encounterId:record.encounterId,
      occurredAt:record.occurredAt,
      story:{
        storyVersion:record.story.storyVersion,
        ...(record.story.continuationOfEncounterRef === undefined
          ? {}
          : { continuationOfEncounterRef:record.story.continuationOfEncounterRef }),
        beats:structuredClone(record.story.beats),
      },
    });
    encounterId = record.story?.continuationOfEncounterRef ?? null;
  }

  return stories.reverse();
}

function publicEncounterRequestDigest(input) {
  return `sha256:${sha256(canonicalJson({
    threadId:input.threadId,
    expectedSituationId:input.expectedSituationId,
    utterance:input.utterance,
    priorEncounterStoryId:input.priorEncounterStoryId ?? null,
  }))}`;
}

function livedContext({ threadId, situation, worldReader, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  return Object.freeze({
    thread:structuredClone(thread),
    situation:structuredClone(situation),
    semanticStates:Object.freeze(
      semanticStateStore.listCurrentState(threadId).map((state) => structuredClone(state)),
    ),
    memories:Object.freeze(
      memoryStore.listCurrentMemories(threadId, {
        limit:MEMORY_LIMIT,
        newestFirst:true,
      }).map((memory) => structuredClone(memory)),
    ),
  });
}

export function createPublicVisitorEncounterService({
  worldReader,
  livedNow,
  livedNowStore,
  identityStore,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  modelAdapter,
  onExperienceQueued = null,
  now = () => new Date().toISOString(),
}) {
  requireMethod(worldReader, "public visitor worldReader", "getThread");
  requireMethod(livedNow, "public visitor livedNow", "validateDisplayedSituation");
  requireMethod(livedNowStore, "public visitor livedNowStore", "latestPlan");
  requireMethod(livedNowStore, "public visitor livedNowStore", "getSituation");
  requireMethod(livedNowStore, "public visitor livedNowStore", "getCurrentSituation");
  requireMethod(identityStore, "public visitor identityStore", "getCurrentIdentityView");
  requireMethod(situatedLifeStore, "public visitor situatedLifeStore", "listCurrentLifeRelations");
  requireMethod(semanticStateStore, "public visitor semanticStateStore", "listCurrentState");
  requireMethod(memoryStore, "public visitor memoryStore", "listCurrentMemories");
  requireMethod(experienceStore, "public visitor experienceStore", "recordEncounterStory");
  requireMethod(experienceStore, "public visitor experienceStore", "getEncounterStory");
  requireMethod(experienceStore, "public visitor experienceStore", "getPublicEncounterReceipt");
  requireMethod(experienceStore, "public visitor experienceStore", "getPublicEncounterAdmission");
  requireMethod(experienceStore, "public visitor experienceStore", "getThreadEncounterAttention");
  requireMethod(experienceStore, "public visitor experienceStore", "recordPublicEncounterReceipt");
  requireMethod(experienceStore, "public visitor experienceStore", "recordThreadEncounterAttention");
  requireMethod(experienceStore, "public visitor experienceStore", "queueThreadExperienceConsolidation");
  requireMethod(modelAdapter, "public visitor modelAdapter", "invoke");
  if(typeof now!=="function")throw new TypeError("public visitor now must be a function");
  if (onExperienceQueued !== null && typeof onExperienceQueued !== "function") {
    throw new TypeError("public visitor onExperienceQueued must be a function or null");
  }

  return Object.freeze({
    async encounter(input,{onLiveEvent=null,signal=null}={}) {
      if(onLiveEvent!==null&&typeof onLiveEvent!=="function")throw new TypeError("live event observer must be a function");
      if(signal!==null&&onLiveEvent===null)throw new TypeError("live cancellation needs an event observer");
      assertPlainObject("public visitor encounter", input);
      const keys = Object.hasOwn(input, "priorEncounterStoryId")
        ? ["requestId", "threadId", "expectedSituationId", "utterance", "priorEncounterStoryId", "at"]
        : ["requestId", "threadId", "expectedSituationId", "utterance", "at"];
      assertExactKeys("public visitor encounter", input, keys);
      assertId("public visitor encounter.requestId", input.requestId);
      assertId("public visitor encounter.threadId", input.threadId);
      assertId("public visitor encounter.expectedSituationId", input.expectedSituationId);
      assertNonEmpty("public visitor encounter.utterance", input.utterance);
      if (Object.hasOwn(input, "priorEncounterStoryId")) {
        assertId("public visitor encounter.priorEncounterStoryId", input.priorEncounterStoryId);
      }
      assertIsoTimestamp("public visitor encounter.at", input.at);

      const requestDigest=publicEncounterRequestDigest(input);
      const priorReceipt=experienceStore.getPublicEncounterReceipt(input.requestId);
      if(priorReceipt!==null){
        if(priorReceipt.threadId!==input.threadId||priorReceipt.requestDigest!==requestDigest){
          throw new TypeError(`public encounter request ${input.requestId} conflicts with its existing receipt`);
        }
        return Object.freeze(structuredClone(priorReceipt.result));
      }
      const complete=(result)=>{
        const frozen=Object.freeze(structuredClone(result));
        experienceStore.recordPublicEncounterReceipt({
          requestId:input.requestId,
          threadId:input.threadId,
          requestDigest,
          result:frozen,
          recordedAt:input.at,
        });
        return frozen;
      };


      const finishAccepted=async(encounterStory,priorContext=null)=>{
        const situationId=encounterStory.threadPresence.find((item)=>item.threadId===input.threadId)?.situationId;
        if(!situationId)throw new TypeError("admitted encounter has no participating Thread");
        let attention=experienceStore.getThreadEncounterAttention(input.threadId,encounterStory.encounterId);
        if(attention===null){
          const originalSituation=priorContext?.situation ?? livedNowStore.getSituation(situationId);
          const context=priorContext ?? livedContext({
            threadId:input.threadId,
            situation:originalSituation,
            worldReader,
            semanticStateStore,
            memoryStore,
          });
          const experienceText=await formThreadEncounterExperience({
            thread:context.thread,
            situation:context.situation,
            encounterStory,
            semanticStates:context.semanticStates,
            memories:context.memories,
            modelAdapter,
          });
          attention=experienceStore.recordThreadEncounterAttention({
            threadId:input.threadId,
            encounterRef:encounterStory.encounterId,
            situationId,
            occurredAt:encounterStory.occurredAt,
            outcome:"noticed",
            experienceText,
          });
        }
        await queueThreadExperienceConsolidation({
          experienceStore,
          experienceRecord:attention.experience,
          queuedAt:encounterStory.occurredAt,
          onQueued:onExperienceQueued,
        });
        const responseText=encounterStory.story.beats.findLast((beat)=>beat.actorThreadId===input.threadId)?.text;
        if(!responseText)throw new TypeError("admitted encounter is missing outward expression");
        return complete({
          outcome:"accepted",
          situationId,
          responseText,
          encounterStoryId:encounterStory.encounterId,
          ...(encounterStory.story.beats.some((beat)=>beat.completion==="interrupted")?{completion:"interrupted"}:{}),
        });
      };

      const sceneChangeSince=(situationId)=>{
        const current=livedNowStore.getCurrentSituation(input.threadId);
        if(current===null)throw new TypeError("public encounter lost its World situation");
        return current.situationId===situationId?null:complete({
          outcome:"scene_changed",
          currentSituationId:current.situationId,
        });
      };

      const admission=experienceStore.getPublicEncounterAdmission(input.requestId);
      if(admission!==null){
        if(admission.threadId!==input.threadId||admission.requestDigest!==requestDigest){
          throw new TypeError(`public encounter request ${input.requestId} conflicts with its existing admission`);
        }
        return finishAccepted(experienceStore.getEncounterStory(admission.encounterRef));
      }

      const validation = await livedNow.validateDisplayedSituation({
        threadId:input.threadId,
        situationId:input.expectedSituationId,
        at:input.at,
      });
      if (!validation.applies) {
        return complete({
          outcome:"scene_changed",
          currentSituationId:validation.currentSituation.situationId,
        });
      }

      const immediateHistory = recentEncounterStories({
        experienceStore,
        threadId:input.threadId,
        priorEncounterStoryId:input.priorEncounterStoryId ?? null,
        expectedSituationId:input.expectedSituationId,
        at:input.at,
      });
      if (immediateHistory === null) {
        return complete({
          outcome:"scene_changed",
          currentSituationId:validation.currentSituation.situationId,
        });
      }

      const context = livedContext({
        threadId:input.threadId,
        situation:validation.currentSituation,
        worldReader,
        semanticStateStore,
        memoryStore,
      });
      const plan = livedNowStore.latestPlan(input.threadId, "personal", { at:input.at });
      const sourceStores = {
        worldStore:worldReader,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
      };
      const stance = await formVisitorMeetingStance({
        threadId:input.threadId,
        at:input.at,
        plan,
        situation:context.situation,
        requestText:input.utterance,
        recentEncounterStories:immediateHistory,
        sourceStores,
        modelAdapter,
      });

      const afterStance=sceneChangeSince(context.situation.situationId);
      if(afterStance!==null)return afterStance;

      if (stance.decision !== "accept") {
        return complete({
          outcome:stance.decision,
          situationId:context.situation.situationId,
          expression:stance.expression,
          suggestedAt:stance.suggestedAt,
        });
      }

      const admitSpeech=(response,{occurredAt=input.at}={})=>{
        const story={
          storyVersion:"encounter-story-v0.1",
          ...(input.priorEncounterStoryId===undefined
            ?{}
            :{continuationOfEncounterRef:input.priorEncounterStoryId}),
          beats:[
            {actorThreadId:null,kind:"utterance",text:input.utterance},
            {
              actorThreadId:input.threadId,
              kind:"utterance",
              text:response.responseText,
              ...(response.completion==="interrupted"?{completion:"interrupted"}:{}),
            },
          ],
        };
        const sourceReferences=[...new Set([
          input.expectedSituationId,
          context.situation.situationId,
          ...(input.priorEncounterStoryId===undefined?[]:[input.priorEncounterStoryId]),
        ])];
        return experienceStore.recordEncounterStory({
          occurredAt,
          threadPresence:[{
            threadId:input.threadId,
            situationId:context.situation.situationId,
          }],
          story,
          visualization:createEncounterVisualization({
            occurredAt,
            story,
            scene:"A website visitor approaches a Thread in the ordinary World-owned life already underway.",
            sourceReferences,
            depictedThreadRefs:[input.threadId],
          }),
        },{publicRequest:{
          requestId:input.requestId,
          threadId:input.threadId,
          requestDigest,
        }});
      };

      if(onLiveEvent!==null){
        const visitorId=`visitor_${input.requestId}`;
        const live=createLiveEncounter({participantIds:[visitorId,input.threadId]});
        let admitted=null;
        const unsubscribe=live.subscribe(visitorId,(event)=>{
          onLiveEvent(event);
          if(event.type==="speech_end"
            &&event.actorId===input.threadId
            &&typeof event.text==="string"
            &&event.text.trim()!==""){
            admitted=admitSpeech({
              responseText:event.text,
              completion:event.completion,
            },{occurredAt:now()});
          }
        });
        try{
          live.pushSpeechDelta({actorId:visitorId,text:input.utterance});
          live.endSpeech({actorId:visitorId});
          await streamLivedEncounterResponse({
            livedContext:context,
            encounter:{utterance:input.utterance,occurredAt:input.at},
            recentEncounterStories:immediateHistory,
            liveEncounter:live,
            participantId:input.threadId,
            modelAdapter,
            signal,
          });
        }finally{
          unsubscribe();
        }
        if(admitted===null){
          return complete({
            outcome:"interrupted",
            situationId:context.situation.situationId,
          });
        }
        return finishAccepted(admitted,context);
      }

      const response=await respondToLivedEncounter({
        livedContext:context,
        encounter:{utterance:input.utterance,occurredAt:input.at},
        recentEncounterStories:immediateHistory,
        modelAdapter,
      });
      const afterResponse=sceneChangeSince(context.situation.situationId);
      if(afterResponse!==null)return afterResponse;

      const encounterStory=admitSpeech(response);
      return finishAccepted(encounterStory,context);
    },
  });
}
