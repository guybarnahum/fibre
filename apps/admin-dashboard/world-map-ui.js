import { WORLD_MAP_BOUNDS } from "./world-map-data.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

export function worldMapPoint(latitude, longitude) {
  const x = ((longitude + 180) / 360) * WORLD_MAP_BOUNDS.width;
  const clamped = Math.max(WORLD_MAP_BOUNDS.minLat, Math.min(WORLD_MAP_BOUNDS.maxLat, latitude));
  const y = ((WORLD_MAP_BOUNDS.maxLat - clamped)
    / (WORLD_MAP_BOUNDS.maxLat - WORLD_MAP_BOUNDS.minLat)) * WORLD_MAP_BOUNDS.height;
  return Object.freeze({ x, y });
}

export function renderWorldTimeZoneLines(group) {
  group.replaceChildren();
  for (let longitude = -165; longitude <= 165; longitude += 15) {
    const line = document.createElementNS(SVG_NS, "line");
    const x = worldMapPoint(0, longitude).x.toFixed(1);
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", "0");
    line.setAttribute("y2", String(WORLD_MAP_BOUNDS.height));
    if (longitude === 0 || longitude % 60 === 0) line.classList.add("major");
    group.append(line);
  }
}

function normalized(value) {
  return typeof value === "string"
    ? value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ")
    : "";
}

function placeIdentity(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return null;
  if (text.includes("/")) {
    const [country, ...cityParts] = text.split("/");
    const city = cityParts.join("/").trim();
    if (country.trim() === "" || city === "") return null;
    return Object.freeze({ country:normalized(country), city:normalized(city) });
  }
  const comma = text.lastIndexOf(",");
  if (comma < 0) return Object.freeze({ country:null, city:normalized(text) });
  const city = text.slice(0, comma).trim();
  const country = text.slice(comma + 1).trim();
  if (city === "" || country === "") return null;
  return Object.freeze({ country:normalized(country), city:normalized(city) });
}

export function catalogPlaceForLocation(catalog, location) {
  if (!Array.isArray(catalog)) return null;
  const identity = placeIdentity(location);
  if (identity === null) return null;
  if (identity.country !== null) {
    return catalog.find((place) => (
      normalized(place?.country) === identity.country
      && normalized(place?.city) === identity.city
    )) ?? null;
  }
  const cityMatches = catalog.filter((place) => normalized(place?.city) === identity.city);
  return cityMatches.length === 1 ? cityMatches[0] : null;
}

export function threadMapState(thread) {
  const lifecycle = thread?.identity?.lifecycleStatus ?? "dormant";
  const current = thread?.currentLocation;
  const situated = current && Number.isFinite(current.lat) && Number.isFinite(current.long);

  if (lifecycle === "retired") {
    return Object.freeze({ kind:"retired", lifecycle, situated:false, active:false });
  }
  if (lifecycle === "active") {
    return Object.freeze({
      kind:situated ? "active" : "active_unsituated",
      lifecycle,
      situated:Boolean(situated),
      active:true,
    });
  }
  if (lifecycle === "thawing" || lifecycle === "freezing") {
    return Object.freeze({
      kind:situated ? "transition" : "transition_unsituated",
      lifecycle,
      situated:Boolean(situated),
      active:false,
    });
  }
  return Object.freeze({
    kind:situated ? "frozen_situated" : "awaiting_lived_now",
    lifecycle,
    situated:Boolean(situated),
    active:false,
  });
}

function mappableLocation(thread, state = threadMapState(thread)) {
  if (state.kind === "retired") return null;

  const current = thread?.currentLocation;
  if (state.situated) {
    return Object.freeze({
      ...current,
      mapMode:"situated",
      threadState:state.kind,
    });
  }

  const birth = thread?.identity?.birthLocation;
  if (birth && Number.isFinite(birth.lat) && Number.isFinite(birth.long)) {
    return Object.freeze({
      current:false,
      awaitingLivedNow:true,
      mapMode:"placeholder",
      threadState:state.kind,
      displayName:birth.displayName ?? thread?.identity?.birthPlace ?? birth.city ?? "Birthplace",
      locality:birth.city ?? birth.displayName ?? "Birthplace",
      country:birth.country ?? "",
      lat:birth.lat,
      long:birth.long,
      authority:"birthplace_placeholder",
    });
  }
  return null;
}

export function groupThreadsByCurrentLocation(threads) {
  const groups = new Map();
  let unmapped = 0;
  let retired = 0;
  let situated = 0;
  let active = 0;
  let frozenSituated = 0;
  let transitioning = 0;
  let awaitingLivedNow = 0;
  let activeUnsituated = 0;

  for (const thread of Array.isArray(threads) ? threads : []) {
    const state = threadMapState(thread);
    if (state.kind === "retired") {
      retired += 1;
      continue;
    }

    const location = mappableLocation(thread, state);
    if (location === null) {
      unmapped += 1;
      continue;
    }

    if (state.situated) situated += 1;
    if (state.kind === "active") active += 1;
    if (state.kind === "frozen_situated") frozenSituated += 1;
    if (state.kind === "transition" || state.kind === "transition_unsituated") transitioning += 1;
    if (state.kind === "awaiting_lived_now") awaitingLivedNow += 1;
    if (state.kind === "active_unsituated") {
      active += 1;
      activeUnsituated += 1;
      awaitingLivedNow += 1;
    }
    if (state.kind === "transition_unsituated") awaitingLivedNow += 1;

    const locality = location.locality ?? location.displayName ?? "Location";
    const country = location.country ?? "";
    const key = `${location.lat.toFixed(4)}:${location.long.toFixed(4)}:${normalized(locality)}:${normalized(country)}`;
    const place = Object.freeze({
      place:key,
      country,
      city:locality,
      displayName:location.displayName ?? locality,
      lat:location.lat,
      long:location.long,
    });
    const group = groups.get(key) ?? {
      place,
      threadIds:[],
      situatedCount:0,
      activeCount:0,
      frozenSituatedCount:0,
      transitionCount:0,
      awaitingLivedNowCount:0,
      activeUnsituatedCount:0,
    };
    group.threadIds.push(thread.threadId);
    if (state.situated) group.situatedCount += 1;
    if (state.kind === "active") group.activeCount += 1;
    if (state.kind === "frozen_situated") group.frozenSituatedCount += 1;
    if (state.kind === "transition" || state.kind === "transition_unsituated") group.transitionCount += 1;
    if (state.kind === "awaiting_lived_now" || state.kind === "transition_unsituated") {
      group.awaitingLivedNowCount += 1;
    }
    if (state.kind === "active_unsituated") {
      group.activeCount += 1;
      group.activeUnsituatedCount += 1;
      group.awaitingLivedNowCount += 1;
    }
    groups.set(key, group);
  }

  const locations = [...groups.values()]
    .map((group) => Object.freeze({
      place:group.place,
      count:group.threadIds.length,
      situatedCount:group.situatedCount,
      activeCount:group.activeCount,
      frozenSituatedCount:group.frozenSituatedCount,
      transitionCount:group.transitionCount,
      awaitingLivedNowCount:group.awaitingLivedNowCount,
      activeUnsituatedCount:group.activeUnsituatedCount,
      threadIds:Object.freeze([...group.threadIds]),
    }))
    .sort((left, right) => right.count - left.count || left.place.place.localeCompare(right.place.place));

  return Object.freeze({
    locations:Object.freeze(locations),
    mapped:locations.reduce((sum, location) => sum + location.count, 0),
    situated,
    active,
    frozenSituated,
    transitioning,
    awaitingLivedNow,
    activeUnsituated,
    unmapped,
    retired,
  });
}

export function renderWorldCountMarkers(group, locations, { className = "thread-world-count-marker" } = {}) {
  group.replaceChildren();
  const rendered = [];
  for (const location of locations) {
    const point = worldMapPoint(location.place.lat, location.place.long);
    const marker = document.createElementNS(SVG_NS, "g");
    marker.classList.add(className);
    marker.setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);

    if (location.activeCount > 0) marker.classList.add("active");
    if (location.activeUnsituatedCount > 0) marker.classList.add("active-unsituated");
    if (location.transitionCount > 0) marker.classList.add("transition");
    if (location.awaitingLivedNowCount > 0 && location.situatedCount === 0) {
      marker.classList.add("awaiting-lived-now");
    } else if (location.awaitingLivedNowCount > 0) {
      marker.classList.add("mixed-presence");
    }

    const radius = location.count > 1 ? 13 : 6;
    if (location.activeCount > 0) {
      const halo = document.createElementNS(SVG_NS, "circle");
      halo.classList.add("thread-world-active-halo");
      halo.setAttribute("r", String(radius + 2));
      marker.append(halo);
    }

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.classList.add("thread-world-marker-core");
    circle.setAttribute("r", String(radius));
    marker.append(circle);

    if (location.count > 1) {
      const count = document.createElementNS(SVG_NS, "text");
      count.classList.add("thread-world-count");
      count.setAttribute("text-anchor", "middle");
      count.setAttribute("dominant-baseline", "central");
      count.textContent = location.count > 99 ? "99+" : String(location.count);
      marker.append(count);
    }

    const city = document.createElementNS(SVG_NS, "text");
    city.classList.add("thread-world-city-label");
    city.setAttribute("x", location.count > 1 ? "18" : "11");
    city.setAttribute("y", "4");
    city.textContent = location.place.city;
    marker.append(city);

    const title = document.createElementNS(SVG_NS, "title");
    const placeLabel = [location.place.city, location.place.country].filter(Boolean).join(", ");
    const states = [
      location.activeCount > 0 ? `${location.activeCount} active` : null,
      location.frozenSituatedCount > 0 ? `${location.frozenSituatedCount} frozen · situated` : null,
      location.transitionCount > 0 ? `${location.transitionCount} transitioning` : null,
      location.awaitingLivedNowCount > 0 ? `${location.awaitingLivedNowCount} awaiting LivedNow` : null,
    ].filter(Boolean).join(" · ");
    title.textContent = `${placeLabel} · ${location.count} Thread${location.count === 1 ? "" : "s"}${states ? ` · ${states}` : ""}`;
    marker.append(title);
    group.append(marker);
    rendered.push(Object.freeze({ marker, location }));
  }
  return Object.freeze(rendered);
}
