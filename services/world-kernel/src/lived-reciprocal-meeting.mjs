import { respondToLivedEncounter } from "./lived-encounter-cognition.mjs";
import { formLivedEncounterMemory } from "./lived-encounter-memory.mjs";
import { internalizeLivedEncounter } from "./lived-encounter-reflection.mjs";
import {
  formMeetingOpening,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";

const MEMORY_LIMIT = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function contextFor({ threadId, worldReader, livedNowStore, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  const situation = livedNowStore.getCurrentSituation(threadId);
  if (situation === null) throw new TypeError("reciprocal meeting requires LivedNow");
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

async function privateAftermath({
  livedContext,
  encounter,
  encounterResult,
  sharedEventRef,
  experienceStore,
  memoryStore,
  journalBook,
  modelAdapter,
  activityRecorder,
}) {
  const internalized = await internalizeLivedEncounter({
    livedContext,
    encounter,
    encounterResult,
    experienceStore,
    modelAdapter,
    activityRecorder,
    journalBook,
    sharedEventRef,
  });
  let memory = { outcome:"not_attempted", memory:null };
  if (internalized.privateAftermathComplete) {
    try {
      memory = await (activityRecorder === null
        ? formLivedEncounterMemory({
            livedContext,
            historyEvent:internalized.historyEvent,
            journalEntry:internalized.journalEntry,
            memoryStore,
            modelAdapter,
          })
        : activityRecorder.runStage({
            threadId:livedContext.thread.threadId,
            correlationId:sharedEventRef,
            stage:"meeting.memory.retain",
            evidence:{ eventId:internalized.historyEvent.eventId, sharedEventRef },
          }, () => formLivedEncounterMemory({
            livedContext,
            historyEvent:internalized.historyEvent,
            journalEntry:internalized.journalEntry,
            memoryStore,
            modelAdapter,
          })));
    } catch {
      memory = { outcome:"incomplete", memory:null };
    }
  }
  return Object.freeze({
    historyEvent:internalized.historyEvent,
    journalEntry:internalized.journalEntry,
    journalBookRecord:internalized.journalBookRecord,
    memory,
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
  requireMethod("experienceStore", experienceStore, "recordSharedMeeting");
  requireMethod("experienceStore", experienceStore, "recordEncounter");
  requireMethod("experienceStore", experienceStore, "recordJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

  return Object.freeze({
    async meet(input) {
      assertPlainObject("reciprocal meeting input", input);
      assertId("reciprocal meeting initiatorThreadId", input.initiatorThreadId);
      assertId("reciprocal meeting responderThreadId", input.responderThreadId);
      if (input.initiatorThreadId === input.responderThreadId) {
        throw new TypeError("reciprocal meeting requires two different Threads");
      }
      assertIsoTimestamp("reciprocal meeting at", input.at);

      await livedNow.ensure({ threadId:input.initiatorThreadId, at:input.at });
      await livedNow.ensure({ threadId:input.responderThreadId, at:input.at });

      const left = contextFor({
        threadId:input.initiatorThreadId,
        worldReader,livedNowStore,semanticStateStore,memoryStore,
      });
      const right = contextFor({
        threadId:input.responderThreadId,
        worldReader,livedNowStore,semanticStateStore,memoryStore,
      });
      const leftPlan = livedNowStore.latestPlan(left.thread.threadId, "personal", { at:input.at });
      const rightPlan = livedNowStore.latestPlan(right.thread.threadId, "personal", { at:input.at });

      const leftStance = await formMeetingStance({
        thread:left.thread,
        situation:left.situation,
        plan:leftPlan,
        requester:right.thread,
        relationships:situatedLifeStore.listCurrentLifeRelations(left.thread.threadId),
        semanticStates:left.semanticStates,
        memories:left.memories,
        modelAdapter,
      });
      const rightStance = await formMeetingStance({
        thread:right.thread,
        situation:right.situation,
        plan:rightPlan,
        requester:left.thread,
        relationships:situatedLifeStore.listCurrentLifeRelations(right.thread.threadId),
        semanticStates:right.semanticStates,
        memories:right.memories,
        modelAdapter,
      });

      const compatible = meetingPresenceCompatible(left.situation, right.situation, {
        leftPlaceEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(left.thread.threadId),
        rightPlaceEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(right.thread.threadId),
      });
      if (!compatible || leftStance.decision !== "accept" || rightStance.decision !== "accept") {
        return Object.freeze({
          outcome:compatible ? "not_met" : "incompatible",
          compatible,
          stances:Object.freeze({
            [left.thread.threadId]:leftStance,
            [right.thread.threadId]:rightStance,
          }),
          sharedEvent:null,
          aftermath:null,
        });
      }

      const openingText = await formMeetingOpening({
        thread:left.thread,
        situation:left.situation,
        counterparty:right.thread,
        modelAdapter,
      });
      const rightResponse = await respondToLivedEncounter({
        livedContext:right,
        encounter:{ utterance:openingText, occurredAt:input.at },
        modelAdapter,
      });
      const leftFollowup = await respondToLivedEncounter({
        livedContext:left,
        encounter:{ utterance:rightResponse.responseText, occurredAt:input.at },
        modelAdapter,
      });

      const sharedEvent = experienceStore.recordSharedMeeting({
        occurredAt:input.at,
        initiatorThreadId:left.thread.threadId,
        responderThreadId:right.thread.threadId,
        initiatorSituationId:left.situation.situationId,
        responderSituationId:right.situation.situationId,
        openingText,
        responseText:rightResponse.responseText,
        followupText:leftFollowup.responseText,
      });

      const [leftAftermath, rightAftermath] = await Promise.all([
        privateAftermath({
          livedContext:left,
          encounter:{ utterance:rightResponse.responseText, occurredAt:input.at },
          encounterResult:leftFollowup,
          sharedEventRef:sharedEvent.sharedEventId,
          experienceStore,memoryStore,journalBook,modelAdapter,activityRecorder,
        }),
        privateAftermath({
          livedContext:right,
          encounter:{ utterance:openingText, occurredAt:input.at },
          encounterResult:rightResponse,
          sharedEventRef:sharedEvent.sharedEventId,
          experienceStore,memoryStore,journalBook,modelAdapter,activityRecorder,
        }),
      ]);

      return Object.freeze({
        outcome:"met",
        compatible:true,
        stances:Object.freeze({
          [left.thread.threadId]:leftStance,
          [right.thread.threadId]:rightStance,
        }),
        sharedEvent,
        aftermath:Object.freeze({
          [left.thread.threadId]:leftAftermath,
          [right.thread.threadId]:rightAftermath,
        }),
      });
    },
  });
}
