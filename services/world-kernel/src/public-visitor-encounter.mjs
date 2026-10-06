import { formVisitorMeetingStance } from "./lived-meeting-cognition.mjs";
import { respondToLivedEncounter } from "./lived-encounter-cognition.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { formThreadEncounterExperience } from "./lived-thread-experience-cognition.mjs";
import { internalizeThreadEncounterExperience } from "./lived-thread-experience-aftermath.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

const MEMORY_LIMIT = 6;

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
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
  journalBook = null,
  activityRecorder = null,
}) {
  requireMethod(worldReader, "public visitor worldReader", "getThread");
  requireMethod(livedNow, "public visitor livedNow", "validateDisplayedSituation");
  requireMethod(livedNowStore, "public visitor livedNowStore", "latestPlan");
  requireMethod(identityStore, "public visitor identityStore", "getCurrentIdentityView");
  requireMethod(situatedLifeStore, "public visitor situatedLifeStore", "listCurrentLifeRelations");
  requireMethod(semanticStateStore, "public visitor semanticStateStore", "listCurrentState");
  requireMethod(memoryStore, "public visitor memoryStore", "listCurrentMemories");
  requireMethod(memoryStore, "public visitor memoryStore", "recordMemory");
  requireMethod(experienceStore, "public visitor experienceStore", "recordEncounterStory");
  requireMethod(experienceStore, "public visitor experienceStore", "recordThreadEncounterAttention");
  requireMethod(experienceStore, "public visitor experienceStore", "recordThreadExperienceJournalEntry");
  requireMethod(modelAdapter, "public visitor modelAdapter", "invoke");
  if (journalBook !== null) {
    requireMethod(journalBook, "public visitor journalBook", "getProfile");
    requireMethod(journalBook, "public visitor journalBook", "append");
  }
  if (activityRecorder !== null) requireMethod(activityRecorder, "public visitor activityRecorder", "runStage");

  return Object.freeze({
    async encounter(input) {
      assertPlainObject("public visitor encounter", input);
      assertExactKeys("public visitor encounter", input, [
        "threadId",
        "expectedSituationId",
        "utterance",
        "at",
      ]);
      assertId("public visitor encounter.threadId", input.threadId);
      assertId("public visitor encounter.expectedSituationId", input.expectedSituationId);
      assertNonEmpty("public visitor encounter.utterance", input.utterance);
      assertIsoTimestamp("public visitor encounter.at", input.at);

      const validation = await livedNow.validateDisplayedSituation({
        threadId:input.threadId,
        situationId:input.expectedSituationId,
        at:input.at,
      });
      if (!validation.applies) {
        return Object.freeze({
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
        sourceStores,
        modelAdapter,
      });

      if (stance.decision !== "accept") {
        return Object.freeze({
          outcome:stance.decision,
          situationId:context.situation.situationId,
          expression:stance.expression,
          suggestedAt:stance.suggestedAt,
        });
      }

      const response = await respondToLivedEncounter({
        livedContext:context,
        encounter:{
          utterance:input.utterance,
          occurredAt:input.at,
        },
        modelAdapter,
      });
      const story = {
        storyVersion:"encounter-story-v0.1",
        beats:[
          {
            actorThreadId:null,
            kind:"utterance",
            text:input.utterance,
          },
          {
            actorThreadId:input.threadId,
            kind:"utterance",
            text:response.responseText,
          },
        ],
      };
      const sourceReferences = [...new Set([
        input.expectedSituationId,
        context.situation.situationId,
      ])];
      const encounterStory = experienceStore.recordEncounterStory({
        occurredAt:input.at,
        threadPresence:[{
          threadId:input.threadId,
          situationId:context.situation.situationId,
        }],
        story,
        visualization:createEncounterVisualization({
          occurredAt:input.at,
          story,
          scene:"A website visitor approaches a Thread in the ordinary World-owned life already underway.",
          sourceReferences,
          depictedThreadRefs:[input.threadId],
        }),
      });

      const experienceText = await formThreadEncounterExperience({
        thread:context.thread,
        situation:context.situation,
        encounterStory,
        semanticStates:context.semanticStates,
        memories:context.memories,
        modelAdapter,
      });
      const attention = experienceStore.recordThreadEncounterAttention({
        threadId:input.threadId,
        encounterRef:encounterStory.encounterId,
        situationId:context.situation.situationId,
        occurredAt:input.at,
        outcome:"noticed",
        experienceText,
      });
      await internalizeThreadEncounterExperience({
        livedContext:context,
        encounterStory,
        presentThreadSummaries:[{
          threadId:context.thread.threadId,
          name:context.thread.identity?.name ?? null,
          selfDescription:context.thread.identity?.selfDescription ?? "",
        }],
        experienceRecord:attention.experience,
        experienceStore,
        memoryStore,
        journalBook,
        modelAdapter,
        activityRecorder,
      });

      return Object.freeze({
        outcome:"accepted",
        situationId:context.situation.situationId,
        responseText:response.responseText,
        encounterStoryId:encounterStory.encounterId,
      });
    },
  });
}
