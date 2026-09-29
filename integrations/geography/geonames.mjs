const GEONAMES_BASE_URL = "https://secure.geonames.org";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US");
}

function integer(name, value, { min = 1, max = 20 } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new TypeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return number;
}

function coordinate(name, value, { min, max }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new TypeError(`${name} is invalid`);
  return number;
}

function canonicalPlace(entry) {
  if (!entry || typeof entry !== "object" || (entry.fcl && entry.fcl !== "P")) return null;
  const country = typeof entry.countryName === "string" ? entry.countryName.trim() : "";
  const city = typeof entry.name === "string"
    ? entry.name.trim()
    : typeof entry.toponymName === "string" ? entry.toponymName.trim() : "";
  const lat = Number(entry.lat);
  const long = Number(entry.lng);
  if (!country || !city || !Number.isFinite(lat) || !Number.isFinite(long)) return null;

  const parts = [city];
  const admin = typeof entry.adminName1 === "string" ? entry.adminName1.trim() : "";
  if (admin && normalize(admin) !== normalize(city) && normalize(admin) !== normalize(country)) parts.push(admin);
  parts.push(country);

  return Object.freeze({
    country,
    city,
    displayName:parts.join(", "),
    lat,
    long,
  });
}

async function geonames(path, params, { username, fetchImpl }) {
  const user = nonEmpty("GEONAMES_USERNAME", username);
  if (typeof fetchImpl !== "function") throw new TypeError("GeoNames fetch implementation is required");
  const url = new URL(path, GEONAMES_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  url.searchParams.set("username", user);

  const response = await fetchImpl(url, { headers:{ Accept:"application/json" } });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) throw new Error(`GeoNames request failed: HTTP ${response.status}`);
  if (payload.status) throw new Error(`GeoNames request failed: ${payload.status.message ?? payload.status.value ?? "unknown error"}`);
  if (!Array.isArray(payload.geonames)) throw new Error("GeoNames response is missing geonames");
  return payload.geonames;
}

function uniquePlaces(entries) {
  const places = entries.map(canonicalPlace).filter(Boolean);
  return Object.freeze([...new Map(places.map((place) => [
    [normalize(place.country), normalize(place.city), place.lat, place.long].join("|"),
    place,
  ])).values()]);
}

export async function searchGeoNamesPlaces({
  query,
  username,
  maxRows = 8,
  fetchImpl = globalThis.fetch,
} = {}) {
  const q = nonEmpty("GeoNames query", query);
  if (q.length < 2) return Object.freeze([]);
  const rows = integer("GeoNames maxRows", maxRows);
  const entries = await geonames("/searchJSON", {
    q,
    maxRows:rows,
    featureClass:"P",
    lang:"en",
    style:"FULL",
  }, { username, fetchImpl });
  return uniquePlaces(entries);
}

export async function reverseGeoNamesPlace({
  lat,
  long,
  username,
  fetchImpl = globalThis.fetch,
} = {}) {
  const latitude = coordinate("GeoNames latitude", lat, { min:-90, max:90 });
  const longitude = coordinate("GeoNames longitude", long, { min:-180, max:180 });
  const entries = await geonames("/findNearbyPlaceNameJSON", {
    lat:latitude,
    lng:longitude,
    maxRows:1,
    lang:"en",
    style:"FULL",
  }, { username, fetchImpl });
  return uniquePlaces(entries)[0] ?? null;
}

export async function resolveGeoNamesPlace({
  country,
  city,
  username,
  fetchImpl = globalThis.fetch,
} = {}) {
  const requestedCountry = nonEmpty("GeoNames country", country);
  const requestedCity = nonEmpty("GeoNames city", city);
  const [baseCity, ...qualifierParts] = requestedCity.split(",").map((part) => part.trim()).filter(Boolean);
  const qualifier = qualifierParts.join(", ");

  const places = await searchGeoNamesPlaces({
    query:`${requestedCity}, ${requestedCountry}`,
    username,
    maxRows:12,
    fetchImpl,
  });
  const countryMatches = places.filter((place) => normalize(place.country) === normalize(requestedCountry));
  const exact = countryMatches.find((place) => normalize(place.city) === normalize(requestedCity))
    ?? countryMatches.find((place) => (
      normalize(place.city) === normalize(baseCity)
      && (qualifier === "" || normalize(place.displayName).includes(normalize(qualifier)))
    ))
    ?? countryMatches.find((place) => normalize(place.city) === normalize(baseCity))
    ?? countryMatches[0]
    ?? null;
  if (exact === null) throw new Error(`GeoNames could not resolve ${requestedCity}, ${requestedCountry}`);
  return exact;
}
