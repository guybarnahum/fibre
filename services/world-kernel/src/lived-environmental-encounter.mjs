import { appraiseEncounterAttention } from "./lived-encounter-attention.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { internalizeThreadEncounterExperience } from "./lived-thread-experience-aftermath.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

const MEMORY_LIMIT = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function placeForSituation(threadId, situation, situatedLifeStore) {
  if (situation.location?.kind !== "place") return null;
  return situatedLifeStore
    .listCurrentPlaceEpisodes(threadId)
    .find((episode) => placeEpisodeRevisionRef(episode) === situation.location.placeRef)
    ?.place ?? null;
}

function sceneDescription(threadId, situation, situatedLifeStore) {
  const activity = situation.activity ? ` while the Thread is ${situation.activity}` : "";
  if (situation.location?.kind === "transit") {
    return `The Thread is physically in transit between two admitted places${activity}.`;
  }
  const place = placeForSituation(threadId, situation, situatedLifeStore);
  if (place === null) return `The Thread is at the current admitted physical place${activity}.`;
  const locality = [place.locality, place.region].filter(Boolean).join(", ");
  return `At ${place.displayName}${locality ? ` in ${locality}` : ""}${activity}.`;
}

function livedContext({ threadId, worldReader, livedNowStore, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  const situation = livedNowStore.getCurrentSituation(threadId);
  if (situation === null) throw new TypeError("environmental encounter requires LivedNow");
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

export function createEnvironmentalEncounterService({
  worldReader,
  livedNow,
  livedNowStore,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  journalBook = null,
  modelAdapter,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadExperienceJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");

  return Object.freeze({
    async encounter(input) {
      assertPlainObject("environmental encounter input", input);
      assertId("environmental encounter threadId", input.threadId);
      assertIsoTimestamp("environmental encounter at", input.at);
      assertPlainObject("environmental occurrence", input.occurrence);
      assertId("environmental occurrence.occurrenceRef", input.occurrence.occurrenceRef);
      assertNonEmpty("environmental occurrence.description", input.occurrence.description);

      await livedNow.ensure({ threadId:input.threadId, at:input.at });
      const context = livedContext({
        threadId:input.threadId,
        worldReader,
        livedNowStore,
        semanticStateStore,
        memoryStore,
      });

      const story = {
        storyVersion:"encounter-story-v0.1",
        beats:[{
          actorThreadId:null,
          kind:"occurrence",
          text:input.occurrence.description,
        }],
      };
      const visualization = createEncounterVisualization({
        occurredAt:input.at,
        story,
        scene:sceneDescription(input.threadId, context.situation, situatedLifeStore),
        sourceReferences:[
          input.occurrence.occurrenceRef,
          context.situation.situationId,
          ...(context.situation.evidenceRefs ?? []),
        ],
        depictedThreadRefs:[],
      });
      const encounterStory = experienceStore.recordEncounterStory({
        occurredAt:input.at,
        threadPresence:[{
          threadId:input.threadId,
          situationId:context.situation.situationId,
        }],
        story,
        visualization,
      });

      const existing = experienceStore.getThreadEncounterAttention(
        input.threadId,
        encounterStory.encounterId,
      );
      if (existing !== null) {
        return Object.freeze({
          encounterStory,
          attention:existing,
          aftermath:null,
          reused:true,
        });
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
        threadId:input.threadId,
        encounterRef:encounterStory.encounterId,
        situationId:context.situation.situationId,
        occurredAt:input.at,
        outcome:appraisal.outcome,
        experienceText:appraisal.experienceText,
      });

      if (attention.outcome === "not_noticed") {
        return Object.freeze({
          encounterStory,
          attention,
          aftermath:null,
          reused:false,
        });
      }

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
      });

      return Object.freeze({
        encounterStory,
        attention,
        aftermath,
        reused:false,
      });
    },
  });
}
