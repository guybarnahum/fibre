import { WORLD_MAP_BOUNDS, WORLD_MAP_PATH } from "./world-map-data.js";
import { solarDriftPixels, worldNightPath } from "./world-daylight.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

const SOLAR_INTERVAL_MS = 15 * 60_000;
const solarMaps = new Set();
let solarTimer = null;
let solarObserver = null;
let clockTimer = null;

// Approximate 15° hour bands. For the Pacific coast, use the browser's
// DST-aware IANA clock instead of treating California as permanent UTC−8.
const pacificHour = new Intl.DateTimeFormat("en-US", {
  timeZone:"America/Los_Angeles", hour:"2-digit", hourCycle:"h23",
});

export function worldClockForLongitude(longitude, instant, localOffsetMinutes = -new Date(instant).getTimezoneOffset(), latitude = null) {
  const at = new Date(instant);
  let bandHours = Math.round(Math.max(-180, Math.min(180, longitude)) / 15);
  if (latitude !== null && latitude >= 31 && latitude <= 49 && longitude >= -125 && longitude <= -114) {
    const hour = Number(pacificHour.format(at));
    bandHours = ((hour - at.getUTCHours() + 36) % 24) - 12;
  }
  const differenceHours = Math.round(bandHours - localOffsetMinutes / 60);
  return Object.freeze({
    time:new Date(at.getTime() + (localOffsetMinutes + differenceHours * 60) * 60_000),
    differenceHours,
  });
}

function showMapClock(map) {
  if (map.longitude === null || document.hidden || !document.hasFocus() || !map.visible) return;
  const now = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  const { time, differenceHours } = worldClockForLongitude(map.longitude, now, -now.getTimezoneOffset(), map.latitude);
  map.clockTime.textContent = time.toISOString().slice(11, 16);
  const hours = Math.abs(differenceHours);
  map.clockOffset.textContent = differenceHours === 0 ? "~same as local"
    : `~${hours} hour${hours === 1 ? "" : "s"} ${differenceHours > 0 ? "after" : "behind"} local`;
  map.clock.hidden = false;
}

function refreshMapClocks() {
  if (clockTimer !== null) window.clearTimeout(clockTimer);
  clockTimer = null;
  const focused = !document.hidden && document.hasFocus();
  for (const map of solarMaps) {
    if (!focused || !map.visible || !map.container.isConnected) {
      map.clock.hidden = true;
      map.longitude = null;
    }
  }
  if (!focused) return;
  const visible = [...solarMaps].filter((map) =>
    map.visible && map.container.isConnected && map.longitude !== null && !map.clock.hidden
  );
  for (const map of visible) showMapClock(map);
  if (visible.length > 0) clockTimer = window.setTimeout(refreshMapClocks, 60_000);
}

// Only one scheduler for all three maps; no work in a blurred tab or
// while every map is offscreen. SVG animates movement without JS frames.
function syncSolarMaps() {
  if (solarTimer !== null) window.clearTimeout(solarTimer);
  solarTimer = null;
  const focused = !document.hidden && document.hasFocus();
  const active = [...solarMaps].filter((map) => focused && map.visible && map.container.isConnected);
  refreshMapClocks();
  for (const map of solarMaps) {
    map.motion?.remove();
    map.motion = null;
    map.group.removeAttribute("transform");
  }
  if (active.length === 0) return;
  const now = Date.now();
  const path = worldNightPath(now);
  const offset = solarDriftPixels(now);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  for (const map of active) {
    for (const night of map.paths) night.setAttribute("d", path);
    if (!reducedMotion) {
      const motion = document.createElementNS(SVG_NS, "animateTransform");
      motion.setAttribute("attributeName", "transform");
      motion.setAttribute("type", "translate");
      motion.setAttribute("from", "0 0");
      motion.setAttribute("to", `${offset.toFixed(3)} 0`);
      motion.setAttribute("dur", "900s");
      motion.setAttribute("calcMode", "linear");
      motion.setAttribute("fill", "freeze");
      motion.setAttribute("begin", "indefinite");
      map.group.append(motion);
      map.motion = motion;
      motion.beginElement();
    }
  }
  solarTimer = window.setTimeout(syncSolarMaps, SOLAR_INTERVAL_MS);
}

function watchSolarMap(map) {
  solarMaps.add(map);
  if (solarObserver === null) {
    solarObserver = new IntersectionObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        for (const current of solarMaps) {
          if (current.container !== entry.target) continue;
          if (current.visible !== entry.isIntersecting) {
            current.visible = entry.isIntersecting;
            changed = true;
          }
          break;
        }
      }
      if (changed) syncSolarMaps();
    });
    document.addEventListener("visibilitychange", syncSolarMaps);
    window.addEventListener("focus", syncSolarMaps);
    window.addEventListener("blur", syncSolarMaps);
  }
  solarObserver.observe(map.container);
}

// Shared geographic component for population, birth and appearance.
// The map owns land, solar shading, meridians and refresh. Each caller
// supplies only its domain-specific markers/interactions.
export function mountWorldMap(container, { selection = false } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("thread-world-map-svg");
  svg.setAttribute("viewBox", "0 0 1000 500");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const worldPath = document.createElementNS(SVG_NS, "path");
  worldPath.classList.add("thread-world-map-path");
  worldPath.setAttribute("d", WORLD_MAP_PATH);
  const night = document.createElementNS(SVG_NS, "g");
  night.classList.add("thread-world-night-layer");
  const nightPaths = [-WORLD_MAP_BOUNDS.width, 0, WORLD_MAP_BOUNDS.width].map((shift) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.classList.add("thread-world-night-mask");
    path.setAttribute("transform", `translate(${shift} 0)`);
    night.append(path);
    return path;
  });
  const meridians = document.createElementNS(SVG_NS, "g");
  meridians.classList.add("thread-world-timezones");
  renderWorldTimeZoneLines(meridians);
  const markers = document.createElementNS(SVG_NS, "g");
  // Solar shading sits below coastlines so night never erases geography.
  svg.append(night, worldPath, meridians, markers);
  let selectionMarker = null;
  if (selection) {
    selectionMarker = document.createElementNS(SVG_NS, "circle");
    selectionMarker.id = "thread-birth-map-marker";
    selectionMarker.setAttribute("r", "10");
    selectionMarker.setAttribute("hidden", "");
    svg.append(selectionMarker);
  }
  const legend = document.createElement("span");
  legend.className = "thread-world-night-legend";
  legend.textContent = "☾ Solar night · not sleep status";
  legend.setAttribute("aria-hidden", "true");
  const clock = document.createElement("div");
  clock.className = "thread-world-map-clock";
  clock.hidden = true;
  clock.title = "Approximate one-hour longitude bands; not civil time zones.";
  const clockTime = document.createElement("strong");
  clockTime.textContent = "";
  const clockOffset = document.createElement("span");
  clockOffset.textContent = "";
  clock.append(clockTime, clockOffset);
  container.replaceChildren(svg, legend, clock);

  const map = { container, group:night, paths:nightPaths, motion:null,
    visible:false, longitude:null, latitude:null, clock, clockTime, clockOffset };
  svg.addEventListener("pointermove", (event) => {
    // Keep the last geographic reading while examining an interactive marker.
    if (markers.contains(event.target) || event.target === selectionMarker) return;
    if (document.hidden || !document.hasFocus() || !map.visible) return;
    const bounds = svg.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    map.longitude = x * 360 - 180;
    map.latitude = WORLD_MAP_BOUNDS.maxLat - y * (WORLD_MAP_BOUNDS.maxLat - WORLD_MAP_BOUNDS.minLat);
    showMapClock(map);
    if (clockTimer === null) refreshMapClocks();
  });
  // Popovers are siblings of the map inside its shell. Keep the reading
  // while crossing to one, but hide it when the pointer leaves both.
  const popupSelector = ".thread-map-popover, .appearance-map-popover";
  const shell = container.parentElement;
  const onPopup = (element) => Boolean(element?.closest?.(popupSelector));
  const hideClock = () => {
    map.clock.hidden = true;
    refreshMapClocks();
  };
  svg.addEventListener("pointerleave", (event) => {
    if (!onPopup(event.relatedTarget)) hideClock();
  });
  shell.addEventListener("pointerover", (event) => {
    if (onPopup(event.target) && !onPopup(event.relatedTarget)) {
      showMapClock(map);
      if (clockTimer === null) refreshMapClocks();
    }
  });
  shell.addEventListener("pointerout", (event) => {
    if (onPopup(event.target) && !onPopup(event.relatedTarget)
      && !svg.contains(event.relatedTarget)) hideClock();
  });
  watchSolarMap(map);
  return Object.freeze({ svg, markers, selectionMarker });
}


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
  const runtimeExpiresAt = Date.parse(thread?.runtime?.expiresAt ?? "");
  const runtimeActive = thread?.runtime?.state === "active"
    && Number.isFinite(runtimeExpiresAt)
    && runtimeExpiresAt > Date.now();
  const current = thread?.operatorCurrentPlace ?? thread?.currentLocation;
  const situated = current && Number.isFinite(current.lat) && Number.isFinite(current.long);

  if (lifecycle === "retired") {
    return Object.freeze({ kind:"retired", lifecycle, situated:false, active:false });
  }
  if (runtimeActive) {
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

  const current = thread?.operatorCurrentPlace ?? thread?.currentLocation;
  if (state.situated) {
    return Object.freeze({
      ...current,
      mapMode:"situated",
      threadState:state.kind,
    });
  }
  // Known current life without a map coordinate is not a birthplace.
  if(current!==null&&current!==undefined)return null;

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
      countryCode:birth.countryCode ?? null,
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
      countryCode:location.countryCode ?? null,
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
    if (
      location.frozenSituatedCount > 0
      && location.activeCount === 0
      && location.transitionCount === 0
    ) marker.classList.add("frozen-situated");
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
