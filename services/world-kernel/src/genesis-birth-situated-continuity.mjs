import { canonicalJson } from "./persistence-common.mjs";
import { normalizeGenesisWorldSpec } from "./genesis-domain.mjs";
import { genesisLifeEpisodeEventId } from "./genesis-life-episode.mjs";
import { deriveGenesisLifeContinuity } from "./genesis-life-continuity-v1.mjs";
import {
  lifeRelationId,
  normalizeLifeRelation,
  normalizePlaceEpisode,
  placeEpisodeId,
} from "./situated-life-domain.mjs";
import {
  appendLifeRelationRevisionInTransaction,
  appendPlaceEpisodeRevisionInTransaction,
} from "./situated-life-persistence.mjs";
import { assertAllSituatedReferencesResolve } from "./situated-identity-grounding.mjs";

function conflict(ErrorType, message) {
  throw new ErrorType(message);
}

function displayNameForRoles(roleRefs) {
  const raw = roleRefs[0] ?? "person";
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ") || "Person";
}

function placeDisplayName(place) {
  return Buffer.byteLength(place.description, "utf8") <= 160
    ? place.description
    : place.placeId;
}

function eventIdMap({ manifest, episodes }) {
  return new Map(episodes.map((episode) => [
    episode.episodeId,
    genesisLifeEpisodeEventId({
      threadId: manifest.threadId,
      genesisId: manifest.genesisId,
      episode,
    }),
  ]));
}

function assertResolvedThreadEvents(database, threadId, references, ErrorType, label) {
  let resolved;
  try {
    resolved = assertAllSituatedReferencesResolve(database, threadId, references);
  } catch (error) {
    conflict(ErrorType, `${label} has unresolved situated-life evidence: ${error.message}`);
  }
  if (!resolved.every((witness) => witness.kind === "thread_event")) {
    conflict(ErrorType, `${label} must be grounded only in canonical Thread-event evidence at birth`);
  }
}

export function deriveGenesisSituatedContinuityRecords({
  manifest,
  worldSpec: worldSpecCandidate,
  initialRoster,
  episodes,
  lifeContinuity,
  seedEventId,
  ErrorType = TypeError,
} = {}) {
  if (!manifest || typeof manifest !== "object") conflict(ErrorType, "Genesis situated continuity requires manifest");
  if (!Array.isArray(initialRoster) || initialRoster.length === 0) conflict(ErrorType, "Genesis situated continuity requires initialRoster");
  if (!Array.isArray(episodes) || episodes.length === 0) conflict(ErrorType, "Genesis situated continuity requires life episodes");
  if (typeof seedEventId !== "string" || seedEventId.trim() === "") conflict(ErrorType, "Genesis situated continuity requires seedEventId");

  const worldSpec = normalizeGenesisWorldSpec(worldSpecCandidate);
  const expected = deriveGenesisLifeContinuity({
    threadId: manifest.threadId,
    worldSpec,
    initialRoster,
    episodes,
  });
  if (canonicalJson(expected) !== canonicalJson(lifeContinuity)) {
    conflict(ErrorType, "Genesis situated continuity bundle does not match continuity derived from admitted life");
  }

  const eventIds = eventIdMap({ manifest, episodes });
  const worldPlaces = new Map(worldSpec.places.map((place) => [place.placeId, place]));
  const lifeRelations = expected.people.map((person) => {
    const sourceReferences = person.origin === "initial_roster"
      ? [seedEventId]
      : person.episodeRefs.map((episodeRef) => {
          const ref = eventIds.get(episodeRef);
          if (ref === undefined) conflict(ErrorType, `continuity person ${person.participantId} cites unknown episode ${episodeRef}`);
          return ref;
        });
    const relationKind = person.roleRefs.includes("sibling") ? "sibling" : "social_contact";
    return normalizeLifeRelation({
      relationId: lifeRelationId({
        threadId: manifest.threadId,
        participantId: person.participantId,
        origin: person.origin,
        roleRefs: person.roleRefs,
      }),
      revision: 1,
      threadId: manifest.threadId,
      relatedParty: {
        partyId: person.participantId,
        kind: "unknown",
        displayName: displayNameForRoles(person.roleRefs),
      },
      relationKind,
      geneticContributionRole: "none",
      factualRoleRefs: [...person.roleRefs],
      relationshipFacts: [...person.relationshipFacts],
      sourceReferences,
      validFrom: person.introducedAt,
      validTo: null,
      visibility: "private",
      provenance: "genesis_created",
      recordedAt: manifest.publication.publishedAt,
    });
  });

  const placeEpisodes = expected.places.map((place) => {
    const worldPlace = worldPlaces.get(place.placeId);
    if (worldPlace === undefined) conflict(ErrorType, `continuity place ${place.placeId} is absent from WorldSpec`);
    const sourceReferences = place.episodeRefs.map((episodeRef) => {
      const ref = eventIds.get(episodeRef);
      if (ref === undefined) conflict(ErrorType, `continuity place ${place.placeId} cites unknown episode ${episodeRef}`);
      return ref;
    });
    return normalizePlaceEpisode({
      episodeId: placeEpisodeId({
        threadId: manifest.threadId,
        genesisId: manifest.genesisId,
        placeId: place.placeId,
      }),
      revision: 1,
      threadId: manifest.threadId,
      episodeKind: "formative_presence",
      place: {
        placeId: place.placeId,
        displayName: placeDisplayName(worldPlace),
        countryCode: null,
        region: null,
        locality: null,
        precision: "unspecified",
      },
      startAt: place.firstObservedAt,
      endAt: place.lastObservedAt,
      sourceReferences,
      visibility: "private",
      provenance: "genesis_created",
      recordedAt: manifest.publication.publishedAt,
    });
  });

  return Object.freeze({
    lifeRelations: Object.freeze(lifeRelations),
    placeEpisodes: Object.freeze(placeEpisodes),
  });
}

export function publishGenesisSituatedContinuityInTransaction(
  database,
  {
    manifest,
    worldSpec,
    initialRoster,
    episodes,
    lifeContinuity,
    seedEventId,
    ErrorType = TypeError,
  } = {},
) {
  const records = deriveGenesisSituatedContinuityRecords({
    manifest,
    worldSpec,
    initialRoster,
    episodes,
    lifeContinuity,
    seedEventId,
    ErrorType,
  });

  for (const relation of records.lifeRelations) {
    const existing = database.prepare(
      "SELECT 1 AS present FROM life_relation_records WHERE relation_id=? AND revision=1",
    ).get(relation.relationId);
    if (existing !== undefined) conflict(ErrorType, `Genesis situated relation ${relation.relationId} already exists`);
    assertResolvedThreadEvents(database, relation.threadId, relation.sourceReferences, ErrorType, `relation ${relation.relationId}`);
    appendLifeRelationRevisionInTransaction(database, relation, { previousDigest: null });
  }

  for (const place of records.placeEpisodes) {
    const existing = database.prepare(
      "SELECT 1 AS present FROM place_episode_records WHERE episode_id=? AND revision=1",
    ).get(place.episodeId);
    if (existing !== undefined) conflict(ErrorType, `Genesis situated place ${place.episodeId} already exists`);
    assertResolvedThreadEvents(database, place.threadId, place.sourceReferences, ErrorType, `place ${place.episodeId}`);
    appendPlaceEpisodeRevisionInTransaction(database, place, { previousDigest: null });
  }

  return records;
}
