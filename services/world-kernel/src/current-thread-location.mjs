import {
  resolveLocalityGeography,
  resolveMentionedLocalityGeography,
} from "#core/src/locality-geography.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

function finiteCoordinates(value) {
  return value
    && Number.isFinite(value.lat)
    && Number.isFinite(value.long)
    && value.lat >= -90 && value.lat <= 90
    && value.long >= -180 && value.long <= 180;
}

function localityGeography(place) {
  for (const candidate of [
    place?.locality && place?.region ? `${place.locality}, ${place.region}` : null,
    place?.locality ?? null,
    place?.displayName ?? null,
  ]) {
    const resolved = resolveLocalityGeography(candidate);
    if (resolved !== null) return resolved;
  }
  return resolveMentionedLocalityGeography(place?.displayName);
}

// Modern Genesis authors one coherent local WorldSpec with distinct private
// home/school/transit/learning/commerce places. Their shared seed, not their
// prose or the person's birthplace, identifies sibling contexts.
function modernGenesisContext(episode){
  if(episode?.provenance!=="genesis_created")return null;
  const match=/^place_modern_([0-9a-f]{12})_(home|school|transit|learning|commerce)$/u
    .exec(episode.place?.placeId??"");
  return match?.[1]??null;
}

export function genesisContextLocations(placeEpisodes, locatedContexts){
  const known=new Map();
  for(const {placeEpisode,privatePlace} of locatedContexts){
    const context=modernGenesisContext(placeEpisode);
    if(context===null||privatePlace?.publicGranularity!=="city"
      ||privatePlace.placeRef!==placeEpisodeRevisionRef(placeEpisode))continue;
    const geo=resolveLocalityGeography(`${privatePlace.country}/${privatePlace.locality}`);
    if(!geo||geo.countryCode!==privatePlace.countryCode)continue;
    const prior=known.get(context);
    if(prior===undefined)known.set(context,geo);
    else if(prior!==null&&(
      prior.countryCode!==geo.countryCode||prior.city!==geo.city
    ))known.set(context,null);
  }
  return placeEpisodes.flatMap(episode=>{
    const context=modernGenesisContext(episode);
    const geography=context===null?null:known.get(context);
    return geography?[{
      placeRef:placeEpisodeRevisionRef(episode),geography,
    }]:[];
  });
}

function resolvedPlace(reference, { worldPlaces, placeEpisodes, privatePlace, contextLocations }) {
  // A World-attested private place is mapped only at city precision; its
  // street address or precise residence coordinates never enter the map.
  if (privatePlace?.placeRef === reference && privatePlace.publicGranularity === "city") {
    const city = resolveLocalityGeography(`${privatePlace.country}/${privatePlace.locality}`);
    if (city?.countryCode === privatePlace.countryCode) {
      return Object.freeze({
        ref:reference,
        displayName:`${city.city}, ${city.country}`,
        geography:{lat:city.lat,long:city.long,city:city.city,
          country:city.country,countryCode:city.countryCode},
        authority:"world_private_place_locality",
      });
    }
  }
  const contextual=contextLocations.find(item=>item.placeRef===reference)??null;
  if(contextual){
    const city=contextual.geography;
    return Object.freeze({
      ref:reference,displayName:`${city.city}, ${city.country}`,
      geography:{lat:city.lat,long:city.long,city:city.city,
        country:city.country,countryCode:city.countryCode},
      authority:"genesis_context_locality",
    });
  }
  const shared = worldPlaces.find((place) => place.ref === reference) ?? null;
  if (shared !== null) {
    return Object.freeze({
      ref:reference,
      displayName:shared.displayName,
      // A historical World context is not positioned at the Thread's birthplace.
      geography:finiteCoordinates(shared)
        ?{lat:shared.lat,long:shared.long,city:shared.locality,
          country:shared.country,countryCode:shared.countryCode}
        :null,
      authority:"live_world_place",
    });
  }

  const episode = placeEpisodes.find((place) => placeEpisodeRevisionRef(place) === reference) ?? null;
  if (episode !== null) {
    return Object.freeze({
      ref:reference,
      displayName:episode.place.displayName,
      geography:localityGeography(episode.place),
      authority:"situated_life",
    });
  }

  return Object.freeze({
    ref:reference,
    displayName:null,
    geography:null,
    authority:"unresolved_place_ref",
  });
}

function projectedPoint(place) {
  if (!finiteCoordinates(place?.geography)) return null;
  return Object.freeze({
    lat:place.geography.lat,
    long:place.geography.long,
    locality:place.geography.city ?? null,
    country:place.geography.country ?? null,
    countryCode:place.geography.countryCode ?? null,
  });
}

export function projectCurrentThreadLocation({
  currentSituation,
  worldPlaces = [],
  placeEpisodes = [],
  privatePlace = null,
  contextLocations = [],
} = {}) {
  if (currentSituation === null || currentSituation === undefined) return null;

  const location = currentSituation.location;
  if (location?.kind === "place") {
    const place = resolvedPlace(location.placeRef, { worldPlaces, placeEpisodes, privatePlace, contextLocations });
    const point = projectedPoint(place);
    if (point === null) return null;
    return Object.freeze({
      kind:"place",
      current:true,
      establishedAt:currentSituation.establishedAt,
      placeRef:location.placeRef,
      displayName:place.displayName ?? point.locality,
      ...point,
      authority:place.authority,
    });
  }

  if (location?.kind === "transit") {
    const from = resolvedPlace(location.fromPlaceRef, { worldPlaces, placeEpisodes, privatePlace, contextLocations });
    const to = resolvedPlace(location.toPlaceRef, { worldPlaces, placeEpisodes, privatePlace, contextLocations });
    const fromPoint = projectedPoint(from);
    const toPoint = projectedPoint(to);
    if (fromPoint === null && toPoint === null) return null;
    const start = fromPoint ?? toPoint;
    const end = toPoint ?? fromPoint;
    const progress = Number.isFinite(location.progress) ? Math.max(0, Math.min(1, location.progress)) : 0.5;
    const sameLocality = start.locality !== null && start.locality === end.locality;
    const sameCountry = start.country !== null && start.country === end.country;
    const sameCountryCode = start.countryCode !== null && start.countryCode === end.countryCode;
    return Object.freeze({
      kind:"transit",
      current:true,
      establishedAt:currentSituation.establishedAt,
      fromPlaceRef:location.fromPlaceRef,
      toPlaceRef:location.toPlaceRef,
      progress,
      displayName:`In transit · ${from.displayName ?? start.locality ?? "place"} → ${to.displayName ?? end.locality ?? "place"}`,
      locality:sameLocality ? start.locality : "In transit",
      country:sameCountry ? start.country : null,
      countryCode:sameCountryCode ? start.countryCode : null,
      lat:start.lat + ((end.lat - start.lat) * progress),
      long:start.long + ((end.long - start.long) * progress),
      authority:"current_situation",
    });
  }

  return null;
}
