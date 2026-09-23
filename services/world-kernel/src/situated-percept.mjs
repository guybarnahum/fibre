import {
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

const MAX_RECENT_EVENTS = 8;
const MAX_ENCOUNTER_BEATS = 4;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function currentPlace(threadId, situation, situatedLifeStore) {
  if (situation.location?.kind !== "place") return null;
  const episode = situatedLifeStore.listCurrentPlaceEpisodes(threadId)
    .find((candidate) => placeEpisodeRevisionRef(candidate) === situation.location.placeRef) ?? null;
  if (episode === null) return null;
  return Object.freeze({
    placeId:episode.place?.placeId ?? null,
    displayName:episode.place?.displayName ?? null,
  });
}

function livedOpportunities(situation, observed) {
  if (observed.length === 0) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    kind:"co_present_threads",
    subjectRefs:Object.freeze(observed.map((candidate) => candidate.threadId)),
    observableCues:Object.freeze([]),
    sourceReferences:Object.freeze([
      situation.situationId,
      ...observed.map((candidate) => candidate.situationRef),
    ]),
  })]);
}

function recentEvents(experienceStore, observerThreadId, observedIds) {
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

  const encounters = experienceStore.listEncounterStories(observerThreadId)
    .filter((story) => story.threadPresence.some((presence) =>
      presence.threadId !== observerThreadId && observed.has(presence.threadId)))
    .sort((left,right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0,4)
    .map((story) => ({
      kind:"encounter",
      ref:story.encounterId,
      occurredAt:story.occurredAt,
      counterpartyThreadIds:story.threadPresence
        .map((presence) => presence.threadId)
        .filter((threadId) => threadId !== observerThreadId && observed.has(threadId)),
      beats:story.story.beats.slice(0,MAX_ENCOUNTER_BEATS).map((beat) => ({
        actorThreadId:beat.actorThreadId,
        kind:beat.kind,
        text:beat.text,
      })),
    }));

  return [...interactions,...encounters]
    .sort((left,right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) || left.ref.localeCompare(right.ref))
    .slice(0,MAX_RECENT_EVENTS);
}

export function projectSituatedPercept({
  observerThreadId,
  situation,
  observedThreads = [],
  situatedLifeStore,
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
    return Object.freeze({
      kind:"thread",
      threadId:candidate.threadId,
      name:candidate.name ?? null,
      currentActivity:candidate.situation.activity ?? null,
      situationRef:candidate.situation.situationId,
    });
  });

  const events = recentEvents(
    experienceStore,
    observerThreadId,
    observed.map((candidate) => candidate.threadId),
  );
  const opportunities = livedOpportunities(situation, observed);
  const sourceReferences = [
    situation.situationId,
    situation.location?.placeRef ?? null,
    ...observed.map((candidate) => candidate.situationRef),
    ...events.map((event) => event.ref),
  ].filter((value) => typeof value === "string" && value.length > 0);

  return Object.freeze({
    observerThreadId,
    asOf:situation.establishedAt,
    situationRef:situation.situationId,
    setting:Object.freeze({
      mode:typeof situation.mediatedContext === "string" && situation.mediatedContext.trim() !== ""
        ? "mediated"
        : "physical",
      mediatedContext:situation.mediatedContext ?? null,
      place:currentPlace(observerThreadId, situation, situatedLifeStore),
      currentActivity:situation.activity ?? null,
      participantRefs:Object.freeze([...(situation.participantRefs ?? [])]),
    }),
    observed:Object.freeze(observed),
    opportunities,
    recentEvents:Object.freeze(events.map((event) => Object.freeze(structuredClone(event)))),
    sourceReferences:Object.freeze([...new Set(sourceReferences)]),
  });
}
