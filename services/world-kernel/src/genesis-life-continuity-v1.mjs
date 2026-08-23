import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_LIFE_CONTINUITY_VERSION = "genesis-life-continuity-v1";

function fail(message) { throw new TypeError(message); }
function unique(values) { return [...new Set(values)]; }

function initialPeople(threadId, initialRoster) {
  const map = new Map();
  for (const participant of initialRoster) {
    if (participant.participantId === threadId) continue;
    if (map.has(participant.participantId)) fail(`duplicate initial continuity participant ${participant.participantId}`);
    map.set(participant.participantId, {
      participantId: participant.participantId,
      origin: "initial_roster",
      roleRefs: unique(participant.factualRoles ?? []),
      relationshipFacts: [...(participant.relationshipFacts ?? [])],
      introducedAt: null,
      firstObservedAt: null,
      lastObservedAt: null,
      episodeRefs: [],
    });
  }
  return map;
}

function registerIntroductions(people, episodes) {
  for (const episode of episodes) {
    for (const introduced of episode.introducedParticipants ?? []) {
      const participantId = introduced.provisionalPersonId ?? introduced.participantId;
      if (typeof participantId !== "string" || participantId.length === 0) fail(`episode ${episode.episodeId} has invalid introduced participant`);
      const existing = people.get(participantId);
      if (existing !== undefined) {
        if (existing.origin === "initial_roster") fail(`episode ${episode.episodeId} re-introduces initial-roster participant ${participantId}`);
        if (existing.introducedAt !== introduced.introducedAt || !existing.roleRefs.includes(introduced.roleRef)) fail(`participant ${participantId} has inconsistent introduction facts`);
        continue;
      }
      people.set(participantId, {
        participantId,
        origin: "pass_a_introduction",
        roleRefs: [introduced.roleRef],
        relationshipFacts: [],
        introducedAt: introduced.introducedAt,
        firstObservedAt: null,
        lastObservedAt: null,
        episodeRefs: [],
      });
    }
  }
}

function observePeople(threadId, people, episodes) {
  for (const episode of episodes) {
    for (const participantId of episode.participantRefs ?? []) {
      if (participantId === threadId) continue;
      const person = people.get(participantId);
      if (person === undefined) fail(`episode ${episode.episodeId} would publish opaque participant ${participantId}`);
      person.firstObservedAt ??= episode.occurredAt;
      person.lastObservedAt = episode.occurredAt;
      person.episodeRefs.push(episode.episodeId);
    }
  }
}

function derivePlaces(worldSpec, episodes) {
  const worldPlaces = new Map(worldSpec.places.map((place) => [place.placeId, place]));
  const places = new Map();
  for (const episode of episodes) {
    const worldPlace = worldPlaces.get(episode.placeRef);
    if (worldPlace === undefined) fail(`episode ${episode.episodeId} would publish opaque place ${episode.placeRef}`);
    const current = places.get(episode.placeRef) ?? {
      placeId: episode.placeRef,
      description: worldPlace.description,
      firstObservedAt: episode.occurredAt,
      lastObservedAt: episode.occurredAt,
      occurrenceCount: 0,
      episodeRefs: [],
    };
    current.lastObservedAt = episode.occurredAt;
    current.occurrenceCount += 1;
    current.episodeRefs.push(episode.episodeId);
    places.set(episode.placeRef, current);
  }
  return [...places.values()].sort((left, right) => left.placeId.localeCompare(right.placeId));
}

export function deriveGenesisLifeContinuity({ threadId, worldSpec, initialRoster, episodes }) {
  if (typeof threadId !== "string" || threadId.length === 0) fail("continuity threadId is required");
  if (!worldSpec || !Array.isArray(worldSpec.places) || worldSpec.places.length === 0) fail("continuity WorldSpec requires places");
  if (!Array.isArray(initialRoster) || initialRoster.length === 0) fail("continuity initialRoster is required");
  if (!Array.isArray(episodes) || episodes.length === 0) fail("continuity episodes are required");
  const people = initialPeople(threadId, initialRoster);
  registerIntroductions(people, episodes);
  observePeople(threadId, people, episodes);
  const personRecords = [...people.values()]
    .filter((person) => person.episodeRefs.length > 0 || person.origin === "initial_roster")
    .map((person) => Object.freeze({ ...person, roleRefs: Object.freeze([...person.roleRefs]), relationshipFacts: Object.freeze([...person.relationshipFacts]), episodeRefs: Object.freeze([...person.episodeRefs]) }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId));
  const placeRecords = derivePlaces(worldSpec, episodes).map((place) => Object.freeze({ ...place, episodeRefs: Object.freeze([...place.episodeRefs]) }));
  const bundle = {
    version: GENESIS_LIFE_CONTINUITY_VERSION,
    threadId,
    people: personRecords,
    places: placeRecords,
    guarantees: {
      everyPublishedParticipantHasRoleAuthority: true,
      initialRosterRelationshipFactsRetained: true,
      everyPublishedPlaceResolvesToWorldSpec: true,
      placePresenceRetainsEpisodeEvidence: true,
    },
  };
  return Object.freeze({
    ...bundle,
    people: Object.freeze(personRecords),
    places: Object.freeze(placeRecords),
    guarantees: Object.freeze(bundle.guarantees),
    digest: `sha256:${sha256(canonicalJson(bundle))}`,
  });
}
