import {
  FIBRE_LOCALITY_GEOGRAPHY,
  countryCodeForCountry,
  resolveLocalityGeography,
  resolveMentionedLocalityGeography,
} from "#core/src/locality-geography.mjs";
import {placeEpisodeRevisionRef} from "./situated-life-evidence.mjs";

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const degrees=value=>value*Math.PI/180;
function distanceKm(left,right){
  const latitude=degrees(right.lat-left.lat);
  const longitude=degrees(right.long-left.long);
  const arc=Math.sin(latitude/2)**2+
    Math.cos(degrees(left.lat))*Math.cos(degrees(right.lat))*
    Math.sin(longitude/2)**2;
  return 6371*2*Math.asin(Math.sqrt(arc));
}

function coordinateBirthplace(birth){
  if(!text(birth?.city)||!text(birth?.country)
    ||!Number.isFinite(birth.lat)||!Number.isFinite(birth.long)
    ||Math.abs(birth.lat)>90||Math.abs(birth.long)>180)return null;
  const nearby=FIBRE_LOCALITY_GEOGRAPHY
    .filter(place=>place.country===birth.country)
    .map(place=>({place,distance:distanceKm(birth,place)}))
    .filter(candidate=>candidate.distance<=30)
    .sort((a,b)=>a.distance-b.distance)[0]?.place??null;
  if(nearby)return nearby;
  const countryCode=text(birth.countryCode)?.toUpperCase()
    ??countryCodeForCountry(birth.country);
  return countryCode?{
    city:birth.city,country:birth.country,countryCode,
  }:null;
}

// A home-location decision attests the present from admitted World evidence;
// neither the operator nor First Life invents a journey or a residence.
export function planThreadLocation(thread, livedNow) {
  const current = livedNow?.currentSituation;
  if (thread.currentLocation?.kind === "place" || livedNow?.privatelyKnownCurrentPlace) {
    return { state:"already_located" };
  }
  if (!current) return { state:"awaiting_first_life" };
  if (current.phase !== "at_place" || current.location?.kind !== "place") {
    return { state:"not_at_place" };
  }
  const placeRef = current.location.placeRef;
  const legacyContext=(livedNow.worldPlaces??[]).find(place=>place.ref===placeRef
    &&place.authority==="live-world-place-admission-v1"
    &&!place.physicalVenue)??null;
  const episode = (livedNow.placeEpisodes ?? [])
    .find(item => placeEpisodeRevisionRef(item) === placeRef);
  if(!episode&&!legacyContext){
    return {state:placeRef.startsWith("per:")
      ?"missing_situated_place":"unresolved_shared_world_place",placeRef};
  }

  const birth = thread.birthLocation;
  const known = episode?.place??{
    displayName:legacyContext.displayName,
    locality:null,countryCode:null,
  };
  const catalogBirthplace=text(birth?.city)&&text(birth?.country)
    ?resolveLocalityGeography(`${birth.country}/${birth.city}`)
      ??resolveMentionedLocalityGeography(birth.displayName):null;
  const birthplace=catalogBirthplace??coordinateBirthplace(birth);
  const birthEvidence=catalogBirthplace===null&&birthplace!==null;
  const mentioned = resolveMentionedLocalityGeography(known.displayName);
  const locality = text(known.locality);
  const code = text(known.countryCode)?.toUpperCase() ?? null;
  const explicit = locality === null ? null
    : resolveLocalityGeography(locality)
      ?? (text(birth?.city) === locality && birth?.countryCode === code ? birthplace : null);

  // An attested named locality outranks birthplace. Contradictory named
  // localities never silently fall back to the person's birthplace.
  if (locality !== null && !explicit) {
    return { state:"review_locality", placeRef, locality };
  }
  const grounded = explicit ?? mentioned;
  const fallback = grounded === null;
  if (fallback && (birthplace === null || text(birth?.countryCode) !== birthplace.countryCode)) {
    return { state:"review_birthplace", placeRef };
  }
  const location = grounded ?? birthplace;
  if (code !== null && code !== location.countryCode) {
    return { state:"conflicting_country", placeRef };
  }
  if (grounded !== null && birthplace !== null
      && grounded.countryCode !== birthplace.countryCode) {
    // Genesis World time zones cannot be projected into another country.
    return { state:"review_time_zone", placeRef };
  }
  const timeZone = text(livedNow.worldContext?.timeZone);
  if (!timeZone) return { state:"missing_time_zone", placeRef };

  return {
    state:"ready",
    threadId:thread.threadId,
    name:thread.displayName,
    currentPlaceRef:placeRef,
    basis:fallback
      ?birthEvidence?"birth_place_world_evidence":"birth_city_operator_default"
      :"situated_place_evidence",
    place:{
      threadId:thread.threadId,placeRef,
      specificPlace:legacyContext
        ?`Genesis ${legacyContext.placeKind} context`
        :known.displayName,
      streetAddress:null,locality:location.city,
      country:location.country,countryCode:location.countryCode,
      lat:null,long:null,timeZone,
      evidenceRef:fallback
        ?`${birthEvidence?"birth_place_world_evidence":"operator_birth_city_default"}:${thread.threadId}`
        :placeRef,
      publicGranularity:"city",
    },
  };
}

