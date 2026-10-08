import { admitEncounterAttention } from "./lived-encounter-attention.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
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
const SHARED_WORLD_FOLLOWUP_DELAY_MS = 30 * 60_000;

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
      ref:live.physicalVenue?.ref??live.ref,
      displayName:live.physicalVenue?.displayName??live.displayName,
      placeKind:live.placeKind ?? null,
      physicalVenue:live.physicalVenue??null,
      location:live.physicalVenue===undefined?null:Object.freeze({
        locality:live.physicalVenue.locality,
        country:live.physicalVenue.country,
      }),
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
  // A shared-place occurrence must not be about the initiating observer's activity.
  if (place.physicalVenue!==null&&place.physicalVenue!==undefined) return `At ${place.displayName}.`;
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
  const place=placeForSituation(threadId, situation, situatedLifeStore, livedNowStore);
  if(place?.physicalVenue!==null&&place?.physicalVenue!==undefined){
    // World authors a local fact, not a personalized stimulus for any observer.
    return Object.freeze({occurredAt:at,place});
  }
  return Object.freeze({
    occurredAt:at,
    currentSituation:Object.freeze({
      situationId:situation.situationId,
      location:structuredClone(situation.location),
      mediatedContext:situation.mediatedContext ?? null,
      activity:situation.activity ?? null,
    }),
    place,
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
    && story.threadPresence.some((presence) =>
      presence.threadId === threadId && presence.situationId === situation.situationId)
    && story.threadPresence.length === 1
    && story.story?.beats?.length === 1
    && story.story.beats[0].actorThreadId === null
    && story.story.beats[0].kind === "occurrence"
  ) ?? null;
}

function sharedObservers(context, at, livedNowStore) {
  const situation=context.situation;
  if(situation.location?.kind!=="place")return null;
  const place=livedNowStore.getWorldPlace(
    context.thread.threadId,situation.location.placeRef,{required:false},
  );
  const venueRef=place?.physicalVenue?.ref;
  if(typeof venueRef!=="string")return null;
  const others=livedNowStore.listCurrentSituations({at,livingOnly:true})
    .filter((other)=>other.threadId!==context.thread.threadId
      && other.location?.kind==="place"
      && livedNowStore.getWorldPlace(
        other.threadId,other.location.placeRef,{required:false},
      )?.physicalVenue?.ref===venueRef);
  return Object.freeze({
    placeRef:venueRef,
    presence:Object.freeze([
      {threadId:context.thread.threadId,situationId:situation.situationId},
      ...others.map((other)=>({threadId:other.threadId,situationId:other.situationId})),
    ].sort((a,b)=>a.threadId.localeCompare(b.threadId))),
    situations:new Map(others.map((other)=>[other.threadId,other])),
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
  modelAdapter,
  onExperienceQueued = null,
  onWorldFollowupQueued = null,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("livedNowStore", livedNowStore, "getWorldPlace");
  requireMethod("livedNowStore", livedNowStore, "listCurrentSituations");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "listEncounterStories");
  requireMethod("experienceStore", experienceStore, "getSharedEnvironmentalStory");
  requireMethod("experienceStore", experienceStore, "nextEnvironmentalFollowupAt");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "queueThreadExperienceConsolidation");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (onExperienceQueued !== null && typeof onExperienceQueued !== "function") {
    throw new TypeError("environmental encounter onExperienceQueued must be a function or null");
  }
  if(onWorldFollowupQueued!==null&&typeof onWorldFollowupQueued!=="function"){
    throw new TypeError("environmental encounter onWorldFollowupQueued must be a function or null");
  }

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

      const shared=sharedObservers(context,input.at,livedNowStore);
      let encounterStory=shared!==null
        ?experienceStore.getSharedEnvironmentalStory({
          occurredAt:input.at,placeRef:shared.placeRef,
        })
        :existingEnvironmentalStory(
          experienceStore,input.threadId,context.situation,input.at,
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
          sourceReferences:shared
            ?[shared.placeRef]
            :[context.situation.situationId,...(context.situation.evidenceRefs??[])],
          depictedThreadRefs:[],
        });
        encounterStory = experienceStore.recordEncounterStory({
          occurredAt:input.at,
          threadPresence:shared?.presence??[{
            threadId:input.threadId,
            situationId:context.situation.situationId,
          }],
          story,
          visualization,
        },{
          uniquePlaceOccurrenceRef:shared?.placeRef??null,
          followupAfterMs:shared!==null&&onWorldFollowupQueued!==null
            ?SHARED_WORLD_FOLLOWUP_DELAY_MS:null,
        });
        reused = false;
      }

      if(shared!==null&&onWorldFollowupQueued!==null){
        // E7.2 earns one delayed World consideration only after an admitted
        // shared occurrence, and re-arms it on retry if scheduling failed.
        const nextDueAt=experienceStore.nextEnvironmentalFollowupAt();
        if(nextDueAt!==null)await onWorldFollowupQueued({dueAt:nextDueAt});
      }

      if(!encounterStory.threadPresence.some((presence)=>
        presence.threadId===input.threadId
        && presence.situationId===context.situation.situationId)){
        // A newly currentized Thread cannot retrospectively insert itself
        // into an already admitted event's historical witness set.
        return Object.freeze({
          outcome:"not_present_in_recorded_scene",
          encounterStory,
          attention:null,
          observers:Object.freeze([]),
          aftermath:null,
          reused:true,
        });
      }
      // The objective story belongs to the World; subjective attention belongs
      // to each present Thread. One trigger appraises a bounded local cohort.
      // Remaining co-present observers can independently encounter the same
      // admitted story later, without regenerating the occurrence.
      const observers=[context];
      if(shared!==null){
        for(const presence of encounterStory.threadPresence){
          if(observers.length>=4)break;
          if(presence.threadId===input.threadId)continue;
          const situation=shared.situations.get(presence.threadId);
          if(situation===undefined||situation.situationId!==presence.situationId)continue;
          const otherThread=worldReader.getThread(presence.threadId,{required:false});
          if(otherThread===null||otherThread.status==="retired")continue;
          observers.push({
            thread:structuredClone(otherThread),
            situation:structuredClone(situation),
            semanticStates:semanticStateStore.listCurrentState(presence.threadId),
            memories:memoryStore.listCurrentMemories(presence.threadId,{
              limit:MEMORY_LIMIT,newestFirst:true,
            }),
          });
        }
      }
      let attention=null;
      const observed=[];
      for(const observer of observers){
        const received=await admitEncounterAttention({
          thread:observer.thread,
          situation:observer.situation,
          encounterStory,
          semanticStates:observer.semanticStates,
          memories:observer.memories,
          experienceStore,
          modelAdapter,
          onExperienceQueued,
        });
        if(observer.thread.threadId===input.threadId)attention=received;
        observed.push({threadId:observer.thread.threadId,outcome:received.outcome});
      }
      return Object.freeze({
        outcome:"encounter",
        encounterStory,
        attention,
        observers:Object.freeze(observed),
        aftermath:null,
        reused,
      });
    },
  });
}
