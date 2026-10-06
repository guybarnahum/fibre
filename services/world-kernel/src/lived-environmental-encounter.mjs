import { appraiseEncounterAttention } from "./lived-encounter-attention.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { internalizeThreadEncounterExperience } from "./lived-thread-experience-aftermath.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

const MEMORY_LIMIT = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function placeForSituation(threadId, situation, situatedLifeStore, livedNowStore) {
  if (situation.location?.kind !== "place") return null;
  const live = livedNowStore.getWorldPlace(
    threadId,
    situation.location.placeRef,
    { required:false },
  );
  if (live !== null) {
    return Object.freeze({
      ref:live.ref,
      displayName:live.displayName,
      placeKind:live.placeKind ?? null,
      location:null,
    });
  }
  const episode = situatedLifeStore
    .listCurrentPlaceEpisodes(threadId)
    .find((candidate) => placeEpisodeRevisionRef(candidate) === situation.location.placeRef);
  if (episode === undefined) return null;
  return Object.freeze({
    ref:placeEpisodeRevisionRef(episode),
    displayName:episode.place.displayName,
    placeKind:episode.episodeKind ?? null,
    location:Object.freeze({
      countryCode:episode.place.countryCode ?? null,
      region:episode.place.region ?? null,
      locality:episode.place.locality ?? null,
    }),
  });
}

function sceneDescription(threadId, situation, situatedLifeStore, livedNowStore) {
  const activity = situation.activity ? ` while the Thread is ${situation.activity}` : "";
  if (situation.location?.kind === "transit") {
    return `The Thread is physically in transit between two admitted places${activity}.`;
  }
  const place = placeForSituation(threadId, situation, situatedLifeStore, livedNowStore);
  if (place === null) return `The Thread is at the current admitted physical place${activity}.`;
  const locality = [place.location?.locality, place.location?.region].filter(Boolean).join(", ");
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

function occurrenceInput({ threadId, at, situation, situatedLifeStore, livedNowStore }) {
  return Object.freeze({
    occurredAt:at,
    currentSituation:Object.freeze({
      situationId:situation.situationId,
      location:structuredClone(situation.location),
      mediatedContext:situation.mediatedContext ?? null,
      activity:situation.activity ?? null,
    }),
    place:placeForSituation(threadId, situation, situatedLifeStore, livedNowStore),
  });
}

async function authorOccurrence({ threadId, at, situation, situatedLifeStore, livedNowStore, modelAdapter }) {
  const input = occurrenceInput({ threadId, at, situation, situatedLifeStore, livedNowStore });
  const invocation = await modelAdapter.invoke({
    systemPrompt:`You author one bounded observable occurrence in Fibre's World.
Use only the supplied exterior scene. Do not use or infer the Thread's private thoughts, personality, memories, needs, preferences or future goals.
Return one concise externally observable occurrence that could naturally happen in this scene at this time.
The occurrence may involve environment, weather, sound, an animal, an object, an anonymous person's observable action, or another ordinary local happening.
Do not turn it into a conversation with the Thread, do not make it important or interesting on purpose, and do not describe what the Thread notices, thinks or feels.
Write observable World fact only.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["occurrenceText"],
      properties:{
        occurrenceText:{ type:"string", minLength:1, maxLength:800 },
      },
    },
    clientRequestId:`world-occurrence_${sha256(canonicalJson(input))}`,
  });
  assertPlainObject("environmental occurrence output", invocation.output);
  assertExactKeys("environmental occurrence output", invocation.output, ["occurrenceText"]);
  assertNonEmpty("environmental occurrence text", invocation.output.occurrenceText);
  return invocation.output.occurrenceText.trim();
}

function existingEnvironmentalStory(experienceStore, threadId, situation, at) {
  return experienceStore.listEncounterStories(threadId).find((story) =>
    story.occurredAt === at
    && story.threadPresence.length === 1
    && story.threadPresence[0].threadId === threadId
    && story.threadPresence[0].situationId === situation.situationId
    && story.story?.beats?.length === 1
    && story.story.beats[0].actorThreadId === null
    && story.story.beats[0].kind === "occurrence"
  ) ?? null;
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
  requireMethod("livedNowStore", livedNowStore, "getWorldPlace");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "listEncounterStories");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadExperienceJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");

  return Object.freeze({
    async encounter(input) {
      assertPlainObject("environmental encounter input", input);
      assertExactKeys("environmental encounter input", input, ["threadId","at"]);
      assertId("environmental encounter threadId", input.threadId);
      assertIsoTimestamp("environmental encounter at", input.at);

      await livedNow.ensure({ threadId:input.threadId, at:input.at });
      const context = livedContext({
        threadId:input.threadId,
        worldReader,
        livedNowStore,
        semanticStateStore,
        memoryStore,
      });

      let encounterStory = existingEnvironmentalStory(
        experienceStore,
        input.threadId,
        context.situation,
        input.at,
      );
      let reused = encounterStory !== null;

      if (encounterStory === null) {
        const occurrenceText = await authorOccurrence({
          threadId:input.threadId,
          at:input.at,
          situation:context.situation,
          situatedLifeStore,
          livedNowStore,
          modelAdapter,
        });
        const story = {
          storyVersion:"encounter-story-v0.1",
          beats:[{
            actorThreadId:null,
            kind:"occurrence",
            text:occurrenceText,
          }],
        };
        const visualization = createEncounterVisualization({
          occurredAt:input.at,
          story,
          scene:sceneDescription(
            input.threadId,
            context.situation,
            situatedLifeStore,
            livedNowStore,
          ),
          sourceReferences:[
            context.situation.situationId,
            ...(context.situation.evidenceRefs ?? []),
          ],
          depictedThreadRefs:[],
        });
        encounterStory = experienceStore.recordEncounterStory({
          occurredAt:input.at,
          threadPresence:[{
            threadId:input.threadId,
            situationId:context.situation.situationId,
          }],
          story,
          visualization,
        });
        reused = false;
      }

      const existing = experienceStore.getThreadEncounterAttention(
        input.threadId,
        encounterStory.encounterId,
      );
      if (existing !== null) {
        return Object.freeze({
          outcome:"encounter",
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
          outcome:"encounter",
          encounterStory,
          attention,
          aftermath:null,
          reused,
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
        outcome:"encounter",
        encounterStory,
        attention,
        aftermath,
        reused,
      });
    },
  });
}
