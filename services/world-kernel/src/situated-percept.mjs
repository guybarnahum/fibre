import {
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { observablePerson } from "./world-observable-person.mjs";
import { socialVenueVisitSince } from "./world-social-opportunity.mjs";

const MAX_RECENT_EVENTS = 8;
const MAX_ENCOUNTER_BEATS = 4;
// Temporary bounded availability for unconsolidated immediate Experience.
// Older episodes need retained autobiographical Memory, not archival recall.
const RECENT_EXPERIENCE_MS = 6 * 60 * 60_000;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function currentPlace(threadId, situation, situatedLifeStore, livedNowStore) {
  if (situation.location?.kind !== "place") return null;
  const episode = situatedLifeStore.listCurrentPlaceEpisodes(threadId)
    .find((candidate) => placeEpisodeRevisionRef(candidate) === situation.location.placeRef) ?? null;
  if (episode !== null) {
    return Object.freeze({
      placeId:episode.place?.placeId ?? null,
      displayName:episode.place?.displayName ?? null,
      authority:"situated_life",
    });
  }
  const worldPlace = livedNowStore?.getWorldPlace?.(
    threadId,
    situation.location.placeRef,
    { required:false },
  ) ?? null;
  if (worldPlace === null) return null;
  return Object.freeze({
    placeId:worldPlace.ref,
    displayName:worldPlace.displayName,
    authority:"shared_world",
    affordances:Object.freeze([...(worldPlace.affordances??[])]),
  });
}

// Recognition is history from before the current encounter, not immediate
// attention masquerading as acquaintance. A continuous shared visit may last
// longer than the six-hour immediate-Experience window.
function familiarityCutoff(situation,counterpartSituation,at,livedNowStore){
  const recentCutoff=Date.parse(at)-RECENT_EXPERIENCE_MS;
  if(situation.location?.kind!=="place"
    ||counterpartSituation.location?.kind!=="place"
    ||typeof livedNowStore?.getWorldPlace!=="function"
    ||typeof livedNowStore?.getPreviousSituation!=="function"){
    return new Date(recentCutoff).toISOString();
  }
  const venue=livedNowStore.getWorldPlace(
    situation.threadId,situation.location.placeRef,{required:false},
  )?.physicalVenue?.ref??null;
  const otherVenue=livedNowStore.getWorldPlace(
    counterpartSituation.threadId,counterpartSituation.location.placeRef,
    {required:false},
  )?.physicalVenue?.ref??null;
  if(venue===null||venue!==otherVenue){
    return new Date(recentCutoff).toISOString();
  }
  const leftSince=socialVenueVisitSince(livedNowStore,situation,venue);
  const rightSince=socialVenueVisitSince(livedNowStore,counterpartSituation,venue);
  // An unproven visit start cannot distinguish older acquaintance from
  // another moment of this same visit.
  if(leftSince===null||rightSince===null)return null;
  const visitCutoff=Math.max(Date.parse(leftSince),Date.parse(rightSince));
  return new Date(Math.min(recentCutoff,visitCutoff)).toISOString();
}

function livedOpportunities(situation, observed) {
  return Object.freeze(observed.map((candidate) => Object.freeze({
    kind:"actor_presence",
    actorRef:candidate.threadId,
    actorKind:candidate.kind,
    subjectRefs:Object.freeze([candidate.threadId]),
    observableCues:Object.freeze([]),
    sourceReferences:Object.freeze([
      situation.situationId,
      candidate.situationRef,
    ]),
  })));
}

function recentEvents(experienceStore, observerThreadId, observedIds, at) {
  const observed = new Set(observedIds);

  const interactions = experienceStore.listSocialInteractions(observerThreadId, {
    limit:12,
    newestFirst:true,
  }).map((record) => {
    const counterpartyThreadId = record.initiatorThreadId === observerThreadId
      ? record.recipientThreadId
      : record.initiatorThreadId;
    if (!observed.has(counterpartyThreadId)) return null;
    return {
      kind:"social_request_response",
      ref:record.interactionId,
      occurredAt:record.occurredAt,
      counterpartyThreadId,
      direction:record.initiatorThreadId === observerThreadId ? "outgoing" : "incoming",
      requestText:record.requestText,
      responseDecision:record.responseDecision,
      responseExpression:record.responseExpression,
      suggestedAt:record.suggestedAt,
    };
  }).filter(Boolean);

  const encounters = experienceStore.listEncounterStories(observerThreadId,{limit:12})
    .filter((story) => {
      const age=Date.parse(at)-Date.parse(story.occurredAt);
      return age>=0&&age<=RECENT_EXPERIENCE_MS
        &&story.threadPresence.some((presence) =>
          presence.threadId!==observerThreadId&&observed.has(presence.threadId));
    })
    .flatMap((story) => {
      const attention=experienceStore.getThreadEncounterAttention?.(
        observerThreadId,story.encounterId,
      );
      // Exterior percept includes only this observer's noticed World facts;
      // private interpretation belongs separately in Interior Cognition.
      if(attention?.outcome!=="noticed"
        ||typeof attention.experience?.experienceText!=="string")return [];
      return [{
        kind:"encounter",
        ref:story.encounterId,
        occurredAt:story.occurredAt,
        counterpartyThreadIds:story.threadPresence
          .map((presence) => presence.threadId)
          .filter((threadId) => threadId!==observerThreadId&&observed.has(threadId)),
        beats:story.story.beats.slice(0,MAX_ENCOUNTER_BEATS).map((beat) => ({
          actorThreadId:beat.actorThreadId,
          kind:beat.kind,
          text:beat.text,
        })),
        // A lived observer noticed a real actor arrival only when the Story
        // contains the arrival action and already-present witness beats.
        noticedArrivalThreadIds:story.story.beats.some(beat=>
          beat.kind==="occurrence"&&beat.actorThreadId===observerThreadId)
          ?story.story.beats.filter(beat=>beat.kind==="action"
            &&observed.has(beat.actorThreadId))
            .map(beat=>beat.actorThreadId)
          :[],
       }];
    })
    .sort((left,right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0,4);

  return [...interactions,...encounters]
    .sort((left,right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) || left.ref.localeCompare(right.ref))
    .slice(0,MAX_RECENT_EVENTS);
}

export function projectSituatedPercept({
  observerThreadId,
  situation,
  at=situation.establishedAt,
  observedThreads = [],
  situatedLifeStore,
  livedNowStore = null,
  embodimentStore = null,
  experienceStore,
}) {
  assertId("Situated Percept observerThreadId", observerThreadId);
  assertPlainObject("Situated Percept situation", situation);
  if (situation.threadId !== observerThreadId) {
    throw new TypeError("Situated Percept situation belongs to another Thread");
  }
  if (!Array.isArray(observedThreads)) {
    throw new TypeError("Situated Percept observedThreads must be an array");
  }
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("experienceStore", experienceStore, "listSocialInteractions");
  requireMethod("experienceStore", experienceStore, "listEncounterStories");

  const observed = observedThreads.map((candidate) => {
    assertPlainObject("Situated Percept observed Thread", candidate);
    assertId("Situated Percept observed Thread.threadId", candidate.threadId);
    assertPlainObject("Situated Percept observed Thread.situation", candidate.situation);
    if (candidate.situation.threadId !== candidate.threadId) {
      throw new TypeError("Situated Percept observed situation belongs to another Thread");
    }
    const before=familiarityCutoff(
      situation,candidate.situation,at,livedNowStore,
    );
    const noticed=before===null?[]
      :experienceStore.listNoticedSharedHistory?.(
        observerThreadId,candidate.threadId,{before,limit:12},
      )??[];
    const remembered=noticed.slice(0,2);
    const placeNames=[...new Set(remembered.map(item=>{
      const location=livedNowStore?.getSituation?.(item.situationId,{
        required:false,
      })?.location;
      return location?.kind==="place"
        ?livedNowStore?.getWorldPlace?.(observerThreadId,location.placeRef,{
          required:false,
        })?.displayName??null:null;
    }).filter(Boolean))];
    const familiarity=noticed.length===0?null:Object.freeze({
      noticedBeforeCount:noticed.length,
      lastNoticedAt:noticed[0].occurredAt,
      placeNames:Object.freeze(placeNames),
      experiences:Object.freeze(remembered.map(item=>Object.freeze({
        encounterRef:item.encounterRef,
        experienceText:item.experienceText,
      }))),
    });
    const person=observablePerson({
      threadId:candidate.threadId,situation:candidate.situation,
      observerThreadId,name:candidate.name??null,at,
      embodimentStore,situatedLifeStore,experienceStore,
    });
    return Object.freeze({
      kind:"thread",
      threadId:candidate.threadId,
      name:person.name,
      familiarity,
      observableDescription:person.observableDescription,
      currentActivity:candidate.situation.activity ?? null,
      situationRef:candidate.situation.situationId,
    });
  });

  const events = recentEvents(
    experienceStore,
    observerThreadId,
    observed.map((candidate) => candidate.threadId),
    at,
  );
  const opportunities = livedOpportunities(situation, observed);
  const sourceReferences = [
    situation.situationId,
    situation.location?.placeRef ?? null,
    ...observed.map((candidate) => candidate.situationRef),
    ...events.map((event) => event.ref),
    ...observed.flatMap(person=>person.familiarity?.experiences
      .map(item=>item.encounterRef)??[]),
  ].filter((value) => typeof value === "string" && value.length > 0);

  return Object.freeze({
    observerThreadId,
    asOf:at,
    situationRef:situation.situationId,
    setting:Object.freeze({
      mode:typeof situation.mediatedContext === "string" && situation.mediatedContext.trim() !== ""
        ? "mediated"
        : "physical",
      mediatedContext:situation.mediatedContext ?? null,
      place:currentPlace(observerThreadId, situation, situatedLifeStore, livedNowStore),
      currentActivity:situation.activity ?? null,
      participantRefs:Object.freeze([...(situation.participantRefs ?? [])]),
    }),
    observed:Object.freeze(observed),
    opportunities,
    recentEvents:Object.freeze(events.map((event) => Object.freeze(structuredClone(event)))),
    sourceReferences:Object.freeze([...new Set(sourceReferences)]),
  });
}
