import {
  normalizeCurrentSituation,
  normalizeLifeRelation,
  normalizePlaceEpisode,
  placeEpisodeRevisionRef,
  situatedLifeRecordIsCurrent,
} from "fibre/world-kernel/lived-now-contracts";

export const THREAD_PUBLIC_PRESENT_VERSION = "thread-public-present-v0.1";

function publicPlace(record) {
  if (!situatedLifeRecordIsCurrent(record) || record.visibility !== "public") return null;
  return Object.freeze({
    displayName: record.place.displayName,
    region: record.place.region,
  });
}

function publicPlaces(records) {
  const result = new Map();
  for (const candidate of records) {
    const record = normalizePlaceEpisode(candidate);
    const place = publicPlace(record);
    if (place !== null) result.set(placeEpisodeRevisionRef(record), place);
  }
  return result;
}

function publicParticipantNames(records, participantRefs) {
  const wanted = new Set(participantRefs);
  const names = [];
  for (const candidate of records) {
    const record = normalizeLifeRelation(candidate);
    if (
      !situatedLifeRecordIsCurrent(record) ||
      record.visibility !== "public" ||
      !wanted.has(record.relatedParty.partyId) ||
      names.includes(record.relatedParty.displayName)
    ) continue;
    names.push(record.relatedParty.displayName);
  }
  return names;
}

function publicLocation(location, places) {
  if (location.kind === "place") {
    return Object.freeze({
      kind: "place",
      place: places.get(location.placeRef) ?? null,
    });
  }
  return Object.freeze({
    kind: "transit",
    from: places.get(location.fromPlaceRef) ?? null,
    to: places.get(location.toPlaceRef) ?? null,
    progress: location.progress,
  });
}

export function projectCurrentSituationPresent({
  currentSituation,
  placeEpisodes = [],
  lifeRelations = [],
}) {
  const situation = normalizeCurrentSituation(currentSituation);
  if (!Array.isArray(placeEpisodes)) throw new TypeError("placeEpisodes must be an array");
  if (!Array.isArray(lifeRelations)) throw new TypeError("lifeRelations must be an array");
  const places = publicPlaces(placeEpisodes);

  return Object.freeze({
    presentVersion: THREAD_PUBLIC_PRESENT_VERSION,
    situationId: situation.situationId,
    establishedAt: situation.establishedAt,
    phase: situation.phase,
    location: publicLocation(situation.location, places),
    // World knows these enacted details, but their text is not itself a public
    // disclosure decision. Keep them closed until Fibre has admitted public context.
    mediatedContext: null,
    activity: situation.activity,
    reason: null,
    participants: Object.freeze(publicParticipantNames(lifeRelations, situation.participantRefs)),
    depictionMediaId: `media_present_${situation.situationId}`,
  });
}
