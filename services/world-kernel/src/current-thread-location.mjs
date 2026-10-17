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

// One authored modern Genesis WorldSpec has distinct private places and
// legacy learning contexts. Their source place IDs, not names or birthplace,
// establish whether they belong to the same local context.
function modernGenesisSeed(placeId){
  return /^place_modern_([0-9a-f]{12})_(home|school|transit|learning|commerce)$/u
    .exec(placeId??"")?.[1]??null;
}

function modernGenesisContext(episode){
  return episode?.provenance==="genesis_created"
    ?modernGenesisSeed(episode.place?.placeId):null;
}

export function isModernGenesisPlace(episode){
  return modernGenesisContext(episode)!==null;
}

export function isModernGenesisWorldPlace(place){
  return place?.authority==="live-world-place-admission-v1"
    &&place.physicalVenue==null
    &&typeof place.sourceWorldRef==="string"
    &&modernGenesisSeed(place.sourcePlaceId)!==null;
}

export function genesisContextLocations(placeEpisodes, locatedContexts,{
  privatePerspective=false,worldPlaces=[],threadId=null,
}={}){
  const known=new Map();
  for(const {placeEpisode,privatePlace} of locatedContexts){
    const context=modernGenesisContext(placeEpisode);
    if(context===null||privatePlace?.threadId!==placeEpisode.threadId
      ||(!privatePerspective&&privatePlace?.publicGranularity!=="city")
      ||privatePlace.placeRef!==placeEpisodeRevisionRef(placeEpisode))continue;
    const geo=resolveLocalityGeography(`${privatePlace.country}/${privatePlace.locality}`);
    if(!geo||geo.countryCode!==privatePlace.countryCode)continue;
    const key=`${placeEpisode.threadId}/${context}`;
    const prior=known.get(key);
    if(prior===undefined)known.set(key,geo);
    else if(prior!==null&&(
      prior.countryCode!==geo.countryCode||prior.city!==geo.city
    ))known.set(key,null);
  }
  const situated=placeEpisodes.flatMap(episode=>{
    const context=modernGenesisContext(episode);
    const geography=context===null?null:known.get(`${episode.threadId}/${context}`);
    return geography?[{
      placeRef:placeEpisodeRevisionRef(episode),geography,
    }]:[];
  });
  // A legacy wpl_* can be an authored learning place in the same WorldSpec
  // as an independently located Genesis home. This gives it a *city*, not
  // a real-world venue identity or evidence of co-presence.
  if(threadId===null)return situated;
  return [...situated,...worldPlaces.flatMap(place=>{
    if(!isModernGenesisWorldPlace(place))return [];
    const geography=known.get(`${threadId}/${modernGenesisSeed(place.sourcePlaceId)}`);
    return geography?[{placeRef:place.ref,geography}]:[];
  })];
}

function resolvedPlace(reference, { worldPlaces, placeEpisodes, privatePlace, contextLocations }) {
  // A World-attested private place is mapped only at city precision; its
  // street address or precise residence coordinates never enter the map.
  if (privatePlace?.placeRef === reference && privatePlace.publicGranularity === "city") {
    const world=worldPlaces.find(item=>item.ref===reference);
    const city=finiteCoordinates(world)?{
      city:world.locality,country:world.country,countryCode:world.countryCode,
      lat:world.lat,long:world.long,
    }:resolveLocalityGeography(`${privatePlace.country}/${privatePlace.locality}`);
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
  if(privatePlace?.placeRef===reference){
    // Explicit World granularity cannot be broadened by a sibling location.
    return Object.freeze({ref:reference,displayName:null,geography:null,
      authority:"world_private_place_hidden"});
  }
  const shared = worldPlaces.find((place) => place.ref === reference) ?? null;
  if (shared !== null) {
    const attested=finiteCoordinates(shared)
      ?{lat:shared.lat,long:shared.long,city:shared.locality,
        country:shared.country,countryCode:shared.countryCode}
      :null;
    const venue=shared.physicalVenue;
    const venueGeography=venue?.locality&&venue?.country
      ?resolveLocalityGeography(`${venue.country}/${venue.locality}`)
      :null;
    const contextual=attested===null&&venueGeography===null
      ?contextLocations.find(item=>item.placeRef===reference)?.geography??null
      :null;
    return Object.freeze({
      ref:reference,
      displayName:venue?.displayName??shared.displayName,
      // Independently bound venue authority outranks Genesis context locality.
      geography:attested??venueGeography??contextual,
      authority:attested!==null?"live_world_place"
        :venueGeography!==null?"world_venue_locality"
          :contextual!==null?"genesis_context_locality":"live_world_place",
    });
  }

  const episode = placeEpisodes.find((place) => placeEpisodeRevisionRef(place) === reference) ?? null;
  if (episode !== null) {
    const grounded=localityGeography(episode.place);
    const context=grounded===null
      ?contextLocations.find(item=>item.placeRef===reference)?.geography??null
      :null;
    return Object.freeze({
      ref:reference,
      displayName:context===null?episode.place.displayName
        :`${context.city}, ${context.country}`,
      geography:grounded??context,
      authority:context===null?"situated_life":"genesis_context_locality",
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

// God's view uses actual attested private-place evidence; public disclosure
// never determines whether World itself knows a Thread's current location.
export function projectOperatorCurrentPlace({
  currentSituation,privatePlace,placeEpisodes=[],worldPlaces=[],
  privateContextLocations=[],
}={}){
  if(currentSituation?.location?.kind!=="place"
    ||privatePlace?.placeRef!==currentSituation.location.placeRef){
    const shared=worldPlaces.find(place=>place.ref===currentSituation?.location?.placeRef);
    if(shared?.authority==="world-place-v1"){
      const situated=projectCurrentThreadLocation({currentSituation,worldPlaces});
      return situated===null?null:Object.freeze({
        ...situated,specificPlace:shared.displayName,streetAddress:null,
        mapPrecision:finiteCoordinates(shared)?"city":null,
      });
    }
    if(privateContextLocations.length===0)return null;
    const situated=projectCurrentThreadLocation({
      currentSituation,placeEpisodes,worldPlaces,
      contextLocations:privateContextLocations,
    });
    if(situated===null)return null;
    const activeRef=currentSituation?.location?.kind==="place"
      ?currentSituation.location.placeRef:null;
    const activeEpisode=placeEpisodes.find(episode=>
      placeEpisodeRevisionRef(episode)===activeRef);
    const activeWorld=worldPlaces.find(place=>place.ref===activeRef);
    return Object.freeze({
      ...situated,
      specificPlace:activeEpisode?.place?.displayName
        ??activeWorld?.displayName??null,
      streetAddress:null,mapPrecision:"city",
    });
  }
  const city=resolveLocalityGeography(`${privatePlace.country}/${privatePlace.locality}`);
  const known=worldPlaces.find(place=>place.ref===privatePlace.placeRef);
  const point=finiteCoordinates(known)&&known.countryCode===privatePlace.countryCode
    ?known:city?.countryCode===privatePlace.countryCode?city:null;
  const precise=finiteCoordinates(privatePlace);
  return Object.freeze({
    kind:"place",current:true,establishedAt:currentSituation.establishedAt,
    placeRef:privatePlace.placeRef,specificPlace:privatePlace.specificPlace,
    streetAddress:privatePlace.streetAddress,
    locality:privatePlace.locality,country:privatePlace.country,
    countryCode:privatePlace.countryCode,
    lat:precise?privatePlace.lat:point?.lat??null,
    long:precise?privatePlace.long:point?.long??null,
    mapPrecision:precise?"address":point?"city":null,
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
    // Without both endpoints World cannot infer a position along a route.
    // In particular, never plot an unknown departure at the destination.
    if (fromPoint === null || toPoint === null) return null;
    const start = fromPoint;
    const end = toPoint;
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
