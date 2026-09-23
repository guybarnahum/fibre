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

function livedContext({ threadId, worldReader, livedNowStore, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  const situation = livedNowStore.getCurrentSituation(threadId);
  if (situation === null) throw new TypeError("Inside Fibre meeting requires LivedNow");
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

export function createInsideFibreVisitorMeetingService({
  availability,
  worldReader,
  livedNowStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  workStore,
  fibreCreditStore,
  modelAdapter,
  journalBook = null,
  activityRecorder = null,
}) {
  requireMethod(availability, "Inside Fibre availability", "current");
  requireMethod(availability, "Inside Fibre availability", "currentFromSituation");
  requireMethod(worldReader, "Inside Fibre worldReader", "getThread");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "getCurrentSituation");
  requireMethod(semanticStateStore, "Inside Fibre semanticStateStore", "listCurrentState");
  requireMethod(memoryStore, "Inside Fibre memoryStore", "listCurrentMemories");
  requireMethod(memoryStore, "Inside Fibre memoryStore", "recordMemory");
  requireMethod(experienceStore, "Inside Fibre experienceStore", "recordEncounterStory");
  requireMethod(experienceStore, "Inside Fibre experienceStore", "getThreadEncounterAttention");
  requireMethod(experienceStore, "Inside Fibre experienceStore", "recordThreadEncounterAttention");
  requireMethod(experienceStore, "Inside Fibre experienceStore", "recordThreadExperienceJournalEntry");
  requireMethod(workStore, "Inside Fibre workStore", "getCommitment");
  requireMethod(fibreCreditStore, "Inside Fibre fibreCreditStore", "recordWorkCompensation");
  requireMethod(modelAdapter, "Inside Fibre modelAdapter", "invoke");
  if (journalBook !== null) {
    requireMethod(journalBook, "Inside Fibre journalBook", "getProfile");
    requireMethod(journalBook, "Inside Fibre journalBook", "append");
  }
  if (activityRecorder !== null) requireMethod(activityRecorder, "Inside Fibre activityRecorder", "runStage");

  return Object.freeze({
    async enter({ threadId, at }) {
      assertId("Inside Fibre meeting threadId", threadId);
      assertIsoTimestamp("Inside Fibre meeting at", at);
      const currentAvailability = await availability.current({ threadId, at });
      if (currentAvailability === null) return null;
      const situation = livedNowStore.getCurrentSituation(threadId);
      if (situation?.situationId !== currentAvailability.situationId) return null;
      return Object.freeze({
        availability:currentAvailability,
        situation:structuredClone(situation),
      });
    },

    async encounter(input) {
      assertPlainObject("Inside Fibre visitor encounter", input);
      assertExactKeys("Inside Fibre visitor encounter", input, [
        "threadId",
        "expectedSituationId",
        "utterance",
        "at",
      ]);
      assertId("Inside Fibre visitor encounter.threadId", input.threadId);
      assertId("Inside Fibre visitor encounter.expectedSituationId", input.expectedSituationId);
      assertNonEmpty("Inside Fibre visitor encounter.utterance", input.utterance);
      assertIsoTimestamp("Inside Fibre visitor encounter.at", input.at);

      const currentAvailability = availability.currentFromSituation({
        threadId:input.threadId,
        expectedSituationId:input.expectedSituationId,
        at:input.at,
      });
      if (currentAvailability === null) return null;

      const context = livedContext({
        threadId:input.threadId,
        worldReader,
        livedNowStore,
        semanticStateStore,
        memoryStore,
      });
      if (context.situation.situationId !== input.expectedSituationId) return null;

      const response = await respondToLivedEncounter({
        livedContext:context,
        encounter:{
          utterance:input.utterance,
          occurredAt:input.at,
        },
        modelAdapter,
      });
      if (response.grounding.situationId !== input.expectedSituationId) return null;

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
          scene:"A website visitor speaks with a Thread during the Thread's already-accepted Inside Fibre mediated visitor-work window.",
          sourceReferences:[
            currentAvailability.commitmentId,
            context.situation.situationId,
          ],
          depictedThreadRefs:[input.threadId],
        }),
      });

      const commitment = workStore.getCommitment(currentAvailability.commitmentId);
      if (commitment.threadId !== input.threadId) {
        throw new TypeError("Inside Fibre work commitment belongs to another Thread");
      }
      const settle = () => fibreCreditStore.recordWorkCompensation({
        threadId:input.threadId,
        commitmentId:commitment.commitmentId,
        encounterStoryId:encounterStory.encounterId,
        occurredAt:input.at,
        amount:commitment.compensation.fibreCredits,
      });

      const existing = experienceStore.getThreadEncounterAttention(
        input.threadId,
        encounterStory.encounterId,
      );
      if (existing !== null) {
        return Object.freeze({
          availability:currentAvailability,
          situationId:context.situation.situationId,
          responseText:response.responseText,
          encounterStory,
          attention:existing,
          aftermath:null,
          settlement:settle(),
          reused:true,
        });
      }

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
      const settlement = settle();
      const aftermath = await internalizeThreadEncounterExperience({
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
        availability:currentAvailability,
        situationId:context.situation.situationId,
        responseText:response.responseText,
        encounterStory,
        attention,
        aftermath,
        settlement,
        reused:false,
      });
    },
  });
}
