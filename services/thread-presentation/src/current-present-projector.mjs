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
// v0.3 (ADR-0040): where a Thread is, in public, is only what the public knows
// of it, by the Thread's own disclosure.
export const THREAD_PUBLIC_PRESENT_VERSION = "thread-public-present-v0.3";
export const PRIOR_PUBLIC_PRESENT_VERSION = "thread-public-present-v0.1";

const NOW_RANK = Object.freeze({ city:0, venue:1 });
const HOME_RANK = Object.freeze({ country:0, city:1, area:2, exact:3 });
const WITHHELD = Object.freeze({ kind:"withheld" });
const countryOf = (place) => Object.freeze({ displayName:place.displayName.split(",").at(-1).trim(), region:null });

// The public's knowledge as World hands it to Presentation: for each item,
// the version known (or none) and the form of the telling that set it.
export function normalizePublicWhereabouts(value) {
  if (value === null || value === undefined) return null;
  const item = (name, ranks) => {
    const known = value?.[name];
    const level = known?.level ?? null;
    const form = known?.form ?? null;
    if (level !== null && !(level in ranks)) throw new TypeError(`public whereabouts ${name} level is invalid`);
    if (form !== null ? !["transparent", "opaque"].includes(form) : level === null) {
      throw new TypeError(`withheld public whereabouts ${name} must be transparent or opaque`);
    }
    return Object.freeze({ level, form });
  };
  return Object.freeze({ home:item("home", HOME_RANK), now:item("now", NOW_RANK) });
}

// One public place within what the public knows. A place with a region is a
// named venue (its region is its city); one without is a city or country,
// such as a home's, governed by both where it lives and where it is now.
// A place shown at less than it is carries the form of the telling that
// reduced it, so an open partial disclosure can say so.
function knownPlace(place, { now, home }) {
  if (now.level === null) return { withheld:now.form };
  if (place === null) return { place:null };
  if (place.region !== null) {
    return NOW_RANK[now.level] >= NOW_RANK.venue ? { place }
      : { place:Object.freeze({ displayName:place.region, region:null }), reducedBy:now.form };
  }
  if (home.level === null) return { withheld:home.form };
  return HOME_RANK[home.level] >= HOME_RANK.city ? { place } : { place:countryOf(place), reducedBy:home.form };
}

// A public location within the public's knowledge of where the Thread lives
// and where it is now (ADR-0040). The same reading serves what World publishes
// now and every present stored before a disclosure changed. Withheld openly,
// the location says so; by omission, it shows no place, as when World knows
// none. Shown openly in part, it says detail is withheld; by omission, the
// lesser place stands as if it were all.
export function withinPublicKnowledge(location, knowledge) {
  if (knowledge === null || knowledge === undefined || location.kind === "withheld") return location;
  const parts = location.kind === "place" ? [knownPlace(location.place, knowledge)]
    : [knownPlace(location.from, knowledge), knownPlace(location.to, knowledge)];
  if (parts.some((part) => part.withheld === "transparent")) return WITHHELD;
  const place = (part) => part.withheld ? null : part.place;
  const open = parts.some((part) => part.reducedBy === "transparent") ? { detailWithheld:true } : {};
  return location.kind === "place"
    ? Object.freeze({ kind:"place", place:place(parts[0]), ...open })
    : Object.freeze({ kind:"transit", from:place(parts[0]), to:place(parts[1]), progress:location.progress, ...open });
}

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
  publicWhereabouts = null,
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
    location: withinPublicKnowledge(publicLocation(situation.location, places, coarsePlace, publicVenue),
      normalizePublicWhereabouts(publicWhereabouts)),
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
// private intention it carried, and none shows more of where the Thread was
// than the public knows now. History is kept; only its reading is public.
export function publicPresentPayload(payload, publicWhereabouts = null) {
  if (payload === null || payload === undefined) return payload;
  const { activity, ...rest } = payload;
  const read = payload.presentVersion === PRIOR_PUBLIC_PRESENT_VERSION
    ? { ...rest, outwardActivity:null } : payload;
  if (publicWhereabouts === null || read.location === undefined) return Object.freeze({ ...read });
  return Object.freeze({ ...read, location:withinPublicKnowledge(read.location, publicWhereabouts) });
}
