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

export function groupThreadsByBirthplace(threads, catalog) {
  const groups = new Map();
  let unmapped = 0;
  for (const thread of Array.isArray(threads) ? threads : []) {
    const place = catalogPlaceForLocation(catalog, thread?.identity?.birthPlace);
    if (place === null) {
      unmapped += 1;
      continue;
    }
    const current = groups.get(place.place) ?? { place, threadIds:[] };
    current.threadIds.push(thread.threadId);
    groups.set(place.place, current);
  }
  const locations = [...groups.values()]
    .map(({ place, threadIds }) => Object.freeze({
      place,
      count:threadIds.length,
      threadIds:Object.freeze([...threadIds]),
    }))
    .sort((left, right) => right.count - left.count || left.place.place.localeCompare(right.place.place));
  return Object.freeze({
    locations:Object.freeze(locations),
    mapped:locations.reduce((sum, location) => sum + location.count, 0),
    unmapped,
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

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", location.count > 1 ? "13" : "6");
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
    title.textContent = `${location.place.city}, ${location.place.country} · ${location.count} Thread${location.count === 1 ? "" : "s"}`;
    marker.append(title);
    group.append(marker);
    rendered.push(Object.freeze({ marker, location }));
  }
  return Object.freeze(rendered);
}
