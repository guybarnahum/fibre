import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_LIFE_CONTINUITY_VERSION = "genesis-life-continuity-v1";

function fail(message) { throw new TypeError(message); }
function unique(values) { return [...new Set(values)]; }
function instant(value, label) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} must be a valid instant`);
  return parsed;
}

function validateRoleRefs(roleRefs, affordedRoles, label) {
  if (!Array.isArray(roleRefs) || roleRefs.length === 0) fail(`${label} must have at least one role authority`);
  const normalized = unique(roleRefs);
  for (const roleRef of normalized) {
    assertId(`${label} roleRef`, roleRef);
    if (!affordedRoles.has(roleRef)) fail(`${label} roleRef ${roleRef} is not afforded by WorldSpec`);
  }
  return normalized;
}

function normalizeEpisodes(episodes) {
  const seenIds = new Set();
  const normalized = episodes.map((episode, index) => {
    assertId(`continuity episode ${index} episodeId`, episode?.episodeId);
    if (seenIds.has(episode.episodeId)) fail(`duplicate continuity episode ${episode.episodeId}`);
    seenIds.add(episode.episodeId);
    const occurredAtMs = instant(episode.occurredAt, `episode ${episode.episodeId} occurredAt`);
    const participantRefs = episode.participantRefs ?? [];
    if (!Array.isArray(participantRefs)) fail(`episode ${episode.episodeId} participantRefs must be an array`);
    if (new Set(participantRefs).size !== participantRefs.length) fail(`episode ${episode.episodeId} contains duplicate participantRefs`);
    return { episode, occurredAtMs };
  });
  normalized.sort((left, right) => left.occurredAtMs - right.occurredAtMs || left.episode.episodeId.localeCompare(right.episode.episodeId));
  return normalized.map((item) => item.episode);
}

function initialPeople(threadId, initialRoster, affordedRoles) {
  const map = new Map();
  for (const participant of initialRoster) {
    assertId("continuity initial participantId", participant?.participantId);
    if (participant.participantId === threadId) continue;
    if (map.has(participant.participantId)) fail(`duplicate initial continuity participant ${participant.participantId}`);
    const roleRefs = validateRoleRefs(participant.factualRoles, affordedRoles, `initial participant ${participant.participantId}`);
    map.set(participant.participantId, {
      participantId: participant.participantId,
      origin: "initial_roster",
      roleRefs,
      relationshipFacts: [...(participant.relationshipFacts ?? [])],
      introducedAt: null,
      firstObservedAt: null,
      lastObservedAt: null,
      episodeRefs: [],
    });
  }
  return map;
}

function registerIntroductions(people, episodes, affordedRoles) {
  for (const episode of episodes) {
    const participantRefs = new Set(episode.participantRefs ?? []);
    for (const introduced of episode.introducedParticipants ?? []) {
      const participantId = introduced.provisionalPersonId ?? introduced.participantId;
      assertId(`episode ${episode.episodeId} introduced participant`, participantId);
      assertId(`episode ${episode.episodeId} introduced roleRef`, introduced.roleRef);
      if (!affordedRoles.has(introduced.roleRef)) fail(`episode ${episode.episodeId} introduced roleRef ${introduced.roleRef} is not afforded by WorldSpec`);
      if (introduced.introducedAt !== episode.occurredAt) fail(`episode ${episode.episodeId} introduction ${participantId} is not grounded to the episode instant`);
      if (!participantRefs.has(participantId)) fail(`episode ${episode.episodeId} introduction ${participantId} is not present in participantRefs`);
      const existing = people.get(participantId);
      if (existing !== undefined) {
        if (existing.origin === "initial_roster") fail(`episode ${episode.episodeId} re-introduces initial-roster participant ${participantId}`);
        fail(`episode ${episode.episodeId} re-introduces participant ${participantId}`);
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
    const occurredAtMs = instant(episode.occurredAt, `episode ${episode.episodeId} occurredAt`);
    for (const participantId of episode.participantRefs ?? []) {
      if (participantId === threadId) continue;
      const person = people.get(participantId);
      if (person === undefined) fail(`episode ${episode.episodeId} would publish opaque participant ${participantId}`);
      if (person.introducedAt !== null && occurredAtMs < instant(person.introducedAt, `participant ${participantId} introducedAt`)) {
        fail(`episode ${episode.episodeId} observes participant ${participantId} before introducedAt`);
      }
      if (person.firstObservedAt === null) person.firstObservedAt = episode.occurredAt;
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
  assertId("continuity threadId", threadId);
  if (!worldSpec || !Array.isArray(worldSpec.places) || worldSpec.places.length === 0) fail("continuity WorldSpec requires places");
  if (!Array.isArray(worldSpec.affordedRoles) || worldSpec.affordedRoles.length === 0) fail("continuity WorldSpec requires affordedRoles");
  if (!Array.isArray(initialRoster) || initialRoster.length === 0) fail("continuity initialRoster is required");
  if (!Array.isArray(episodes) || episodes.length === 0) fail("continuity episodes are required");

  const affordedRoles = new Set(worldSpec.affordedRoles);
  const orderedEpisodes = normalizeEpisodes(episodes);
  const people = initialPeople(threadId, initialRoster, affordedRoles);
  registerIntroductions(people, orderedEpisodes, affordedRoles);
  observePeople(threadId, people, orderedEpisodes);

  const personRecords = [...people.values()]
    .filter((person) => person.episodeRefs.length > 0 || person.origin === "initial_roster")
    .map((person) => Object.freeze({
      ...person,
      roleRefs: Object.freeze([...person.roleRefs]),
      relationshipFacts: Object.freeze([...person.relationshipFacts]),
      episodeRefs: Object.freeze([...person.episodeRefs]),
    }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId));
  const placeRecords = derivePlaces(worldSpec, orderedEpisodes)
    .map((place) => Object.freeze({ ...place, episodeRefs: Object.freeze([...place.episodeRefs]) }));

  const initialById = new Map(initialRoster
    .filter((participant) => participant.participantId !== threadId)
    .map((participant) => [participant.participantId, participant]));
  const worldPlaceIds = new Set(worldSpec.places.map((place) => place.placeId));
  const guarantees = {
    everyPublishedParticipantHasRoleAuthority: personRecords.every((person) => person.roleRefs.length > 0 && person.roleRefs.every((roleRef) => affordedRoles.has(roleRef))),
    initialRosterRelationshipFactsRetained: personRecords
      .filter((person) => person.origin === "initial_roster")
      .every((person) => canonicalJson(person.relationshipFacts) === canonicalJson(initialById.get(person.participantId)?.relationshipFacts ?? [])),
    everyPublishedPlaceResolvesToWorldSpec: placeRecords.every((place) => worldPlaceIds.has(place.placeId)),
    placePresenceRetainsEpisodeEvidence: placeRecords.every((place) => place.occurrenceCount > 0 && place.episodeRefs.length === place.occurrenceCount),
  };
  if (Object.values(guarantees).some((value) => value !== true)) fail("continuity guarantee derivation failed");

  const bundle = {
    version: GENESIS_LIFE_CONTINUITY_VERSION,
    threadId,
    people: personRecords,
    places: placeRecords,
    guarantees,
  };
  return Object.freeze({
    ...bundle,
    people: Object.freeze(personRecords),
    places: Object.freeze(placeRecords),
    guarantees: Object.freeze(guarantees),
    digest: `sha256:${sha256(canonicalJson(bundle))}`,
  });
}
