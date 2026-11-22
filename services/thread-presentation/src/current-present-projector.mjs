import {
  normalizeCurrentSituation,
  normalizeLifeRelation,
  normalizePlaceEpisode,
  placeEpisodeRevisionRef,
  situatedLifeRecordIsCurrent,
} from "fibre/world-kernel/lived-now-contracts";

// v0.2 (November 22, 2026): a Thread's activity in public is only what can be
// seen of it (its outward activity), never its private intention, and a real
// public venue is named. v0.1 presents carried the private intention; they are
// read back without it.
export const THREAD_PUBLIC_PRESENT_VERSION = "thread-public-present-v0.2";
export const PRIOR_PUBLIC_PRESENT_VERSION = "thread-public-present-v0.1";

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

function publicLocation(location, places, coarsePlace, publicVenue) {
  if (location.kind === "place") {
    return Object.freeze({
      kind: "place",
      place:publicVenue
        ?Object.freeze({ displayName:publicVenue.displayName, region:publicVenue.locality ?? null })
        :coarsePlace===undefined
          ?places.get(location.placeRef)??null
          :coarsePlace,
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
  coarsePlace = undefined,
  publicVenue = null,
}) {
  const situation = normalizeCurrentSituation(currentSituation);
  if (!Array.isArray(placeEpisodes)) throw new TypeError("placeEpisodes must be an array");
  if (!Array.isArray(lifeRelations)) throw new TypeError("lifeRelations must be an array");
  if(coarsePlace!==undefined&&coarsePlace!==null&&(
    typeof coarsePlace?.displayName!=="string"||!coarsePlace.displayName.trim()
    ||coarsePlace.region!==null
  ))throw new TypeError("public coarse place must contain only locality and country");
  const places = publicPlaces(placeEpisodes);

  return Object.freeze({
    presentVersion: THREAD_PUBLIC_PRESENT_VERSION,
    situationId: situation.situationId,
    establishedAt: situation.establishedAt,
    phase: situation.phase,
    location: publicLocation(situation.location, places, coarsePlace, publicVenue),
    // World knows these enacted details, but their text is not itself a public
    // disclosure decision. Keep them closed until Fibre has admitted public context.
    mediatedContext: null,
    // What anyone there could see it doing; its intention stays private.
    outwardActivity: situation.outwardActivity ?? null,
    reason: null,
    participants: Object.freeze(publicParticipantNames(lifeRelations, situation.participantRefs)),
    depictionMediaId: `media_present_${situation.situationId}`,
  });
}

// A public present as it may be read: one recorded before v0.2 loses the
// private intention it carried. History is kept; only its reading is public.
export function publicPresentPayload(payload) {
  if (payload?.presentVersion !== PRIOR_PUBLIC_PRESENT_VERSION) return payload;
  const { activity, ...rest } = payload;
  return Object.freeze({ ...rest, presentVersion: PRIOR_PUBLIC_PRESENT_VERSION, outwardActivity: null });
}
