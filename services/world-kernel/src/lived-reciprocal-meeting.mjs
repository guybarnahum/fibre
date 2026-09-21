import {
  continueMeetingStory,
  formMeetingOpening,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import { internalizeSharedEncounterExperience } from "./lived-shared-encounter-aftermath.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";

const MEMORY_LIMIT = 6;
const MAX_PRESENT_THREADS = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function contextFor({ threadId, worldReader, livedNowStore, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  const situation = livedNowStore.getCurrentSituation(threadId);
  if (situation === null) throw new TypeError("shared encounter requires LivedNow");
  return Object.freeze({
    thread:structuredClone(thread),
    situation:structuredClone(situation),
    semanticStates:Object.freeze(semanticStateStore.listCurrentState(threadId).map((state) => structuredClone(state))),
    memories:Object.freeze(memoryStore.listCurrentMemories(threadId, {
      limit:MEMORY_LIMIT,
      newestFirst:true,
    }).map((memory) => structuredClone(memory))),
  });
}

function groupCompatible(contexts, situatedLifeStore) {
  const [first, ...rest] = contexts;
  const firstEpisodes = situatedLifeStore.listCurrentPlaceEpisodes(first.thread.threadId);
  return rest.every((context) => meetingPresenceCompatible(first.situation, context.situation, {
    leftPlaceEpisodes:firstEpisodes,
    rightPlaceEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(context.thread.threadId),
  }));
}

function participantSummary(context) {
  return Object.freeze({
    threadId:context.thread.threadId,
    name:context.thread.identity?.name ?? null,
    selfDescription:context.thread.identity?.selfDescription ?? "",
  });
}

export function createReciprocalMeetingService({
  worldReader,
  livedNow,
  livedNowStore,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  journalBook = null,
  modelAdapter,
  activityRecorder = null,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("livedNowStore", livedNowStore, "latestPlan");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentLifeRelations");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("experienceStore", experienceStore, "recordSharedEncounter");
  requireMethod("experienceStore", experienceStore, "recordSharedEncounterExperience");
  requireMethod("experienceStore", experienceStore, "recordSharedEncounterJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  return Object.freeze({
    async meet(input) {
      assertPlainObject("shared meeting input", input);
      assertId("shared meeting initiatorThreadId", input.initiatorThreadId);
      assertIsoTimestamp("shared meeting at", input.at);
      if (!Array.isArray(input.participantThreadIds)
        || input.participantThreadIds.length < 2
        || input.participantThreadIds.length > MAX_PRESENT_THREADS) {
        throw new TypeError(`shared meeting requires 2-${MAX_PRESENT_THREADS} present Threads`);
      }
      const threadIds = [...input.participantThreadIds];
      if (new Set(threadIds).size !== threadIds.length) throw new TypeError("shared meeting Threads must be unique");
      for (const threadId of threadIds) assertId("shared meeting participantThreadId", threadId);
      if (!threadIds.includes(input.initiatorThreadId)) throw new TypeError("shared meeting initiator must be present");

      for (const threadId of threadIds) {
        await livedNow.ensure({ threadId, at:input.at });
      }

      const contexts = threadIds.map((threadId) => contextFor({
        threadId,
        worldReader,
        livedNowStore,
        semanticStateStore,
        memoryStore,
      }));
      const byId = new Map(contexts.map((context) => [context.thread.threadId, context]));

      const compatible = groupCompatible(contexts, situatedLifeStore);
      if (!compatible) {
        return Object.freeze({
          outcome:"incompatible",
          compatible:false,
          stances:Object.freeze({}),
          sharedEvent:null,
          aftermath:null,
        });
      }

      const stances = {};
      for (const context of contexts) {
        const counterparties = contexts
          .filter((candidate) => candidate.thread.threadId !== context.thread.threadId)
          .map((candidate) => candidate.thread);
        stances[context.thread.threadId] = await formMeetingStance({
          thread:context.thread,
          situation:context.situation,
          plan:livedNowStore.latestPlan(context.thread.threadId, "personal", { at:input.at }),
          counterparties,
          relationships:situatedLifeStore.listCurrentLifeRelations(context.thread.threadId),
          semanticStates:context.semanticStates,
          memories:context.memories,
          modelAdapter,
        });
      }

      if (Object.values(stances).some((stance) => stance.decision !== "accept")) {
        return Object.freeze({
          outcome:"not_met",
          compatible:true,
          stances:Object.freeze(stances),
          sharedEvent:null,
          aftermath:null,
        });
      }

      const initiator = byId.get(input.initiatorThreadId);
      const otherContexts = contexts.filter((context) => context.thread.threadId !== input.initiatorThreadId);
      const openingText = await formMeetingOpening({
        thread:initiator.thread,
        situation:initiator.situation,
        counterparties:otherContexts.map((context) => context.thread),
        modelAdapter,
      });
      const story = {
        storyVersion:"shared-encounter-story-v0.1",
        beats:[{
          actorThreadId:initiator.thread.threadId,
          kind:"utterance",
          text:openingText,
        }],
      };

      for (const context of otherContexts) {
        const beat = await continueMeetingStory({
          thread:context.thread,
          situation:context.situation,
          counterparties:contexts
            .filter((candidate) => candidate.thread.threadId !== context.thread.threadId)
            .map((candidate) => candidate.thread),
          story,
          modelAdapter,
        });
        if (beat !== null) story.beats.push(beat);
      }

      const closingBeat = await continueMeetingStory({
        thread:initiator.thread,
        situation:initiator.situation,
        counterparties:otherContexts.map((context) => context.thread),
        story,
        modelAdapter,
      });
      if (closingBeat !== null) story.beats.push(closingBeat);

      const sharedEvent = experienceStore.recordSharedEncounter({
        occurredAt:input.at,
        initiatorThreadId:input.initiatorThreadId,
        participants:contexts.map((context) => ({
          threadId:context.thread.threadId,
          situationId:context.situation.situationId,
        })),
        story,
      });

      const participantSummaries = contexts.map(participantSummary);
      const aftermath = {};
      for (const context of contexts) {
        aftermath[context.thread.threadId] = await internalizeSharedEncounterExperience({
          livedContext:context,
          sharedEncounter:sharedEvent,
          participantSummaries,
          experienceStore,
          memoryStore,
          journalBook,
          modelAdapter,
          activityRecorder,
        });
      }

      return Object.freeze({
        outcome:"met",
        compatible:true,
        stances:Object.freeze(stances),
        sharedEvent,
        aftermath:Object.freeze(aftermath),
      });
    },
  });
}
