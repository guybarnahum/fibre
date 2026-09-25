import { resolveLocalityGeography } from "#core/src/locality-geography.mjs";
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
  return null;
}

function fallbackGeography(entry) {
  if (finiteCoordinates(entry?.birthLocation)) return entry.birthLocation;
  return resolveLocalityGeography(entry?.birthPlace);
}

function resolvedPlace(reference, { worldPlaces, placeEpisodes, fallback }) {
  const shared = worldPlaces.find((place) => place.ref === reference) ?? null;
  if (shared !== null) {
    return Object.freeze({
      ref:reference,
      displayName:shared.displayName,
      geography:fallback,
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
  });
}

export function projectCurrentThreadLocation({
  entry,
  currentSituation,
  worldPlaces = [],
  placeEpisodes = [],
} = {}) {
  const fallback = fallbackGeography(entry);
  if (currentSituation === null || currentSituation === undefined) return null;

  const location = currentSituation.location;
  if (location?.kind === "place") {
    const place = resolvedPlace(location.placeRef, { worldPlaces, placeEpisodes, fallback });
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
    const from = resolvedPlace(location.fromPlaceRef, { worldPlaces, placeEpisodes, fallback });
    const to = resolvedPlace(location.toPlaceRef, { worldPlaces, placeEpisodes, fallback });
    const fromPoint = projectedPoint(from);
    const toPoint = projectedPoint(to);
    if (fromPoint === null && toPoint === null) return null;
    const start = fromPoint ?? toPoint;
    const end = toPoint ?? fromPoint;
    const progress = Number.isFinite(location.progress) ? Math.max(0, Math.min(1, location.progress)) : 0.5;
    const sameLocality = start.locality !== null && start.locality === end.locality;
    const sameCountry = start.country !== null && start.country === end.country;
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
      lat:start.lat + ((end.lat - start.lat) * progress),
      long:start.long + ((end.long - start.long) * progress),
      authority:"current_situation",
    });
  }

  return null;
}
