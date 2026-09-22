import {
  formSocialEncounterRequest,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import {
  continueSocialEncounterStory,
} from "./lived-social-encounter-cognition.mjs";
import { appraiseEncounterAttention } from "./lived-encounter-attention.mjs";
import { internalizeThreadEncounterExperience } from "./lived-thread-experience-aftermath.mjs";
import { formThreadEncounterExperience } from "./lived-thread-experience-cognition.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
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
  if (situation === null) throw new TypeError("social meeting requires LivedNow");
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

export function createSocialMeetingService({
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
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadExperienceJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  return Object.freeze({
    async meet(input) {
      assertPlainObject("social meeting input", input);
      assertId("social meeting initiatorThreadId", input.initiatorThreadId);
      assertIsoTimestamp("social meeting at", input.at);
      if (!Array.isArray(input.participantThreadIds)
        || input.participantThreadIds.length < 2
        || input.participantThreadIds.length > MAX_PRESENT_THREADS) {
        throw new TypeError(`social meeting requires 2-${MAX_PRESENT_THREADS} participating Threads`);
      }
      const witnessThreadIds = input.witnessThreadIds ?? [];
      if (!Array.isArray(witnessThreadIds)) {
        throw new TypeError("social meeting witnessThreadIds must be an array");
      }

      const participantThreadIds = [...input.participantThreadIds];
      const threadIds = [...participantThreadIds, ...witnessThreadIds];
      if (threadIds.length > MAX_PRESENT_THREADS) {
        throw new TypeError(`social meeting supports at most ${MAX_PRESENT_THREADS} present Threads`);
      }
      if (new Set(threadIds).size !== threadIds.length) {
        throw new TypeError("social meeting Threads must be unique");
      }
      for (const threadId of participantThreadIds) assertId("social meeting participantThreadId", threadId);
      for (const threadId of witnessThreadIds) assertId("social meeting witnessThreadId", threadId);
      if (!participantThreadIds.includes(input.initiatorThreadId)) {
        throw new TypeError("social meeting initiator must participate");
      }

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
      const participantIds = new Set(participantThreadIds);
      const participantContexts = contexts.filter((context) => participantIds.has(context.thread.threadId));
      const witnessContexts = contexts.filter((context) => !participantIds.has(context.thread.threadId));

      if (!groupCompatible(contexts, situatedLifeStore)) {
        return Object.freeze({
          outcome:"incompatible",
          compatible:false,
          stances:Object.freeze({}),
          encounterStory:null,
          aftermath:null,
        });
      }

      const initiator = byId.get(input.initiatorThreadId);
      const invitees = participantContexts.filter((context) => context.thread.threadId !== input.initiatorThreadId);
      const initiation = await formSocialEncounterRequest({
        thread:initiator.thread,
        situation:initiator.situation,
        plan:livedNowStore.latestPlan(initiator.thread.threadId, "personal", { at:input.at }),
        counterparties:invitees.map((context) => context.thread),
        relationships:situatedLifeStore.listCurrentLifeRelations(initiator.thread.threadId),
        semanticStates:initiator.semanticStates,
        memories:initiator.memories,
        modelAdapter,
      });

      if (initiation.decision !== "initiate") {
        return Object.freeze({
          outcome:"not_met",
          compatible:true,
          initiation,
          request:null,
          stances:Object.freeze({}),
          encounterStory:null,
          aftermath:null,
        });
      }

      const request = Object.freeze({
        initiatorThreadId:initiator.thread.threadId,
        text:initiation.requestText,
      });
      const stances = {};
      for (const context of invitees) {
        const counterparties = participantContexts
          .filter((candidate) => candidate.thread.threadId !== context.thread.threadId)
          .map((candidate) => candidate.thread);
        stances[context.thread.threadId] = await formMeetingStance({
          thread:context.thread,
          situation:context.situation,
          plan:livedNowStore.latestPlan(context.thread.threadId, "personal", { at:input.at }),
          request,
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
          initiation,
          request,
          stances:Object.freeze(stances),
          encounterStory:null,
          aftermath:null,
        });
      }

      const story = {
        storyVersion:"encounter-story-v0.1",
        beats:[{
          actorThreadId:initiator.thread.threadId,
          kind:"utterance",
          text:request.text,
        }],
      };

      for (const context of invitees) {
        const beat = await continueSocialEncounterStory({
          thread:context.thread,
          situation:context.situation,
          counterparties:participantContexts
            .filter((candidate) => candidate.thread.threadId !== context.thread.threadId)
            .map((candidate) => candidate.thread),
          story,
          modelAdapter,
        });
        if (beat !== null) story.beats.push(beat);
      }

      const closingBeat = await continueSocialEncounterStory({
        thread:initiator.thread,
        situation:initiator.situation,
        counterparties:invitees.map((context) => context.thread),
        story,
        modelAdapter,
      });
      if (closingBeat !== null) story.beats.push(closingBeat);

      const threadPresence = contexts.map((context) => ({
        threadId:context.thread.threadId,
        situationId:context.situation.situationId,
      }));
      const depictedThreadRefs = [...new Set(
        story.beats.map((beat) => beat.actorThreadId).filter((threadId) => threadId !== null),
      )];
      const encounterStory = experienceStore.recordEncounterStory({
        occurredAt:input.at,
        threadPresence,
        story,
        visualization:createEncounterVisualization({
          occurredAt:input.at,
          story,
          scene:"A small social encounter among Threads whose independent World-owned current situations establish compatible presence.",
          sourceReferences:threadPresence.map((presence) => presence.situationId),
          depictedThreadRefs,
        }),
      });

      const presentThreadSummaries = contexts.map(participantSummary);
      const aftermath = {};
      for (const context of participantContexts) {
        const experienceText = await formThreadEncounterExperience({
          thread:context.thread,
          situation:context.situation,
          encounterStory,
          semanticStates:context.semanticStates,
          memories:context.memories,
          modelAdapter,
        });
        const attention = experienceStore.recordThreadEncounterAttention({
          threadId:context.thread.threadId,
          encounterRef:encounterStory.encounterId,
          situationId:context.situation.situationId,
          occurredAt:encounterStory.occurredAt,
          outcome:"noticed",
          experienceText,
        });
        aftermath[context.thread.threadId] = await internalizeThreadEncounterExperience({
          livedContext:context,
          encounterStory,
          presentThreadSummaries,
          experienceRecord:attention.experience,
          experienceStore,
          memoryStore,
          journalBook,
          modelAdapter,
          activityRecorder,
        });
      }

      for (const context of witnessContexts) {
        const existing = experienceStore.getThreadEncounterAttention(
          context.thread.threadId,
          encounterStory.encounterId,
        );
        if (existing !== null) {
          aftermath[context.thread.threadId] = null;
          continue;
        }

        const appraisal = await appraiseEncounterAttention({
          thread:context.thread,
          situation:context.situation,
          encounterStory,
          semanticStates:context.semanticStates,
          memories:context.memories,
          modelAdapter,
        });
        const attention = experienceStore.recordThreadEncounterAttention({
          threadId:context.thread.threadId,
          encounterRef:encounterStory.encounterId,
          situationId:context.situation.situationId,
          occurredAt:encounterStory.occurredAt,
          outcome:appraisal.outcome,
          experienceText:appraisal.experienceText,
        });
        aftermath[context.thread.threadId] = attention.outcome === "noticed"
          ? await internalizeThreadEncounterExperience({
              livedContext:context,
              encounterStory,
              presentThreadSummaries,
              experienceRecord:attention.experience,
              experienceStore,
              memoryStore,
              journalBook,
              modelAdapter,
              activityRecorder,
            })
          : null;
      }

      return Object.freeze({
        outcome:"met",
        compatible:true,
        initiation,
        request,
        stances:Object.freeze(stances),
        encounterStory,
        aftermath:Object.freeze(aftermath),
      });
    },
  });
}
