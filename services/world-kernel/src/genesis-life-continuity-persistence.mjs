import {
  IntegrityError,
  assertId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const GENESIS_LIFE_CONTINUITY_RECORD_VERSION = "genesis-life-continuity-v1";

function fail(ErrorType, message) {
  throw new ErrorType(message);
}

function digestBundle(bundle) {
  return `sha256:${sha256(canonicalJson(bundle))}`;
}

function uniqueStrings(values, name, ErrorType, { nonEmpty = true } = {}) {
  if (!Array.isArray(values) || (nonEmpty && values.length === 0)) {
    fail(ErrorType, `${name} must be ${nonEmpty ? "a non-empty" : "an"} array`);
  }
  if (values.some((value) => typeof value !== "string" || value.trim() === "")) fail(ErrorType, `${name} must contain non-empty text`);
  if (new Set(values).size !== values.length) fail(ErrorType, `${name} must be unique`);
  return values;
}

export function normalizeGenesisLifeContinuityForPublication(
  candidate,
  {
    threadId,
    worldSpec,
    lifeEpisodes,
    ErrorType = TypeError,
  } = {},
) {
  assertId("Genesis continuity threadId", threadId);
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) fail(ErrorType, "Genesis birth requires a life continuity bundle");
  if (candidate.version !== GENESIS_LIFE_CONTINUITY_RECORD_VERSION) fail(ErrorType, "Genesis life continuity version drift");
  if (candidate.threadId !== threadId) fail(ErrorType, "Genesis life continuity belongs to another Thread");
  if (worldSpec === null || typeof worldSpec !== "object" || Array.isArray(worldSpec)) fail(ErrorType, "Genesis life continuity requires the published WorldSpec");
  if (!Array.isArray(lifeEpisodes) || lifeEpisodes.length === 0) fail(ErrorType, "Genesis life continuity requires admitted life episodes");
  if (!Array.isArray(candidate.people) || !Array.isArray(candidate.places)) fail(ErrorType, "Genesis life continuity people/places must be arrays");
  if (candidate.guarantees === null || typeof candidate.guarantees !== "object" || Array.isArray(candidate.guarantees)) fail(ErrorType, "Genesis life continuity guarantees are required");

  const episodeById = new Map(lifeEpisodes.map((episode) => [episode.episodeId, episode]));
  if (episodeById.size !== lifeEpisodes.length) fail(ErrorType, "Genesis life continuity lifeEpisodes contain duplicate episode IDs");
  const affordedRoles = new Set(worldSpec.affordedRoles ?? []);
  const worldPlaces = new Map((worldSpec.places ?? []).map((place) => [place.placeId, place]));

  const personIds = new Set();
  for (const person of candidate.people) {
    if (person === null || typeof person !== "object" || Array.isArray(person)) fail(ErrorType, "Genesis life continuity person must be an object");
    assertId("Genesis life continuity participantId", person.participantId);
    if (personIds.has(person.participantId)) fail(ErrorType, `duplicate Genesis life continuity person ${person.participantId}`);
    personIds.add(person.participantId);
    uniqueStrings(person.roleRefs, `Genesis life continuity ${person.participantId} roleRefs`, ErrorType);
    for (const roleRef of person.roleRefs) {
      if (!affordedRoles.has(roleRef)) fail(ErrorType, `Genesis life continuity ${person.participantId} roleRef ${roleRef} is not afforded by WorldSpec`);
    }
    if (!Array.isArray(person.relationshipFacts)) fail(ErrorType, `Genesis life continuity ${person.participantId} relationshipFacts must be an array`);
    const refs = uniqueStrings(
      person.episodeRefs,
      `Genesis life continuity ${person.participantId} episodeRefs`,
      ErrorType,
      { nonEmpty: person.origin === "pass_a_introduction" },
    );
    for (const episodeRef of refs) {
      const episode = episodeById.get(episodeRef);
      if (!episode) fail(ErrorType, `Genesis life continuity ${person.participantId} cites unknown episode ${episodeRef}`);
      if (!episode.participantRefs.includes(person.participantId)) fail(ErrorType, `Genesis life continuity ${person.participantId} cites an episode where it does not participate`);
    }

    if (refs.length === 0) {
      if (person.origin !== "initial_roster") fail(ErrorType, `Genesis life continuity introduced participant ${person.participantId} has no episode evidence`);
      if (person.firstObservedAt !== null || person.lastObservedAt !== null) fail(ErrorType, `Genesis life continuity unobserved initial participant ${person.participantId} has observation timestamps`);
    } else {
      const actualTimes = refs.map((ref) => episodeById.get(ref).occurredAt).sort((a, b) => Date.parse(a) - Date.parse(b));
      if (person.firstObservedAt !== actualTimes[0] || person.lastObservedAt !== actualTimes.at(-1)) fail(ErrorType, `Genesis life continuity ${person.participantId} observation bounds drift`);
    }

    if (person.origin === "pass_a_introduction") {
      if (typeof person.introducedAt !== "string") fail(ErrorType, `Genesis life continuity ${person.participantId} introducedAt is required`);
      if (Date.parse(person.firstObservedAt) < Date.parse(person.introducedAt)) fail(ErrorType, `Genesis life continuity ${person.participantId} predates its introduction`);
      const introducingEpisode = refs.map((ref) => episodeById.get(ref)).find((episode) =>
        episode.introducedParticipants.some((intro) => intro.provisionalPersonId === person.participantId && intro.introducedAt === person.introducedAt));
      if (!introducingEpisode) fail(ErrorType, `Genesis life continuity ${person.participantId} introduction is not grounded in an admitted episode`);
    } else if (person.origin === "initial_roster") {
      if (person.introducedAt !== null) fail(ErrorType, `Genesis life continuity initial-roster person ${person.participantId} cannot have introducedAt`);
    } else {
      fail(ErrorType, `Genesis life continuity ${person.participantId} origin is invalid`);
    }
  }

  const placeIds = new Set();
  for (const place of candidate.places) {
    if (place === null || typeof place !== "object" || Array.isArray(place)) fail(ErrorType, "Genesis life continuity place must be an object");
    assertId("Genesis life continuity placeId", place.placeId);
    if (placeIds.has(place.placeId)) fail(ErrorType, `duplicate Genesis life continuity place ${place.placeId}`);
    placeIds.add(place.placeId);
    const worldPlace = worldPlaces.get(place.placeId);
    if (!worldPlace) fail(ErrorType, `Genesis life continuity place ${place.placeId} is not in WorldSpec`);
    if (place.description !== worldPlace.description) fail(ErrorType, `Genesis life continuity place ${place.placeId} description drift`);
    const refs = uniqueStrings(place.episodeRefs, `Genesis life continuity ${place.placeId} episodeRefs`, ErrorType);
    const episodes = refs.map((ref) => {
      const episode = episodeById.get(ref);
      if (!episode) fail(ErrorType, `Genesis life continuity place ${place.placeId} cites unknown episode ${ref}`);
      if (episode.placeRef !== place.placeId) fail(ErrorType, `Genesis life continuity place ${place.placeId} cites episode ${ref} at another place`);
      return episode;
    }).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    if (place.firstObservedAt !== episodes[0].occurredAt || place.lastObservedAt !== episodes.at(-1).occurredAt) fail(ErrorType, `Genesis life continuity place ${place.placeId} observation bounds drift`);
    if (place.occurrenceCount !== episodes.length) fail(ErrorType, `Genesis life continuity place ${place.placeId} occurrence count drift`);
  }

  for (const [name, value] of Object.entries(candidate.guarantees)) {
    if (value !== true) fail(ErrorType, `Genesis life continuity guarantee ${name} is not true`);
  }
  const { digest, ...unsigned } = candidate;
  const expectedDigest = digestBundle(unsigned);
  if (digest !== expectedDigest) fail(ErrorType, "Genesis life continuity digest drift");
  return Object.freeze(structuredClone(candidate));
}

export function appendGenesisLifeContinuityInTransaction(
  database,
  candidate,
  {
    threadId,
    worldSpec,
    lifeEpisodes,
    recordedAt,
    ErrorType = TypeError,
  } = {},
) {
  const record = normalizeGenesisLifeContinuityForPublication(candidate, {
    threadId,
    worldSpec,
    lifeEpisodes,
    ErrorType,
  });
  const existing = database.prepare(
    "SELECT record_json,record_digest FROM genesis_life_continuity WHERE thread_id=?",
  ).get(threadId);
  if (existing !== undefined) fail(ErrorType, `Genesis life continuity already exists for ${threadId}`);
  database.prepare(`
    INSERT INTO genesis_life_continuity(
      thread_id,world_spec_id,record_json,record_digest,recorded_at
    ) VALUES (?,?,?,?,?)
  `).run(
    threadId,
    worldSpec.worldSpecId,
    canonicalJson(record),
    record.digest,
    recordedAt,
  );
  return record;
}

export function decodeGenesisLifeContinuityRow(row, { ErrorType = IntegrityError } = {}) {
  if (row === undefined || row === null) return null;
  let record;
  try { record = JSON.parse(row.record_json); }
  catch (error) { fail(ErrorType, `Genesis life continuity is not valid JSON: ${error.message}`); }
  const { digest, ...unsigned } = record;
  const expectedDigest = digestBundle(unsigned);
  if (digest !== expectedDigest || row.record_digest !== digest || row.record_json !== canonicalJson(record)) {
    fail(ErrorType, "Genesis life continuity failed canonical/digest verification");
  }
  return record;
}
