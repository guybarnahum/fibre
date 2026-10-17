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
  const countryCode = typeof entry.countryCode === "string" && /^[A-Za-z]{2}$/u.test(entry.countryCode.trim())
    ? entry.countryCode.trim().toUpperCase()
    : null;
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
    countryCode,
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


// Used only for a Thread-selected destination absent from known World locality
// evidence. Accept exact, unambiguous populated places; never a nearby city.
export async function resolveGeoNamesLocality({
  city,country,username,fetchImpl=globalThis.fetch,
}={}){
  const requestedCity=nonEmpty("destination city",city);
  const requestedCountry=nonEmpty("destination country",country);
  const results=await searchGeoNamesPlaces({
    query:`${requestedCity}, ${requestedCountry}`,
    username,maxRows:12,fetchImpl,
  });
  const exact=results.filter(place=>
    normalize(place.city)===normalize(requestedCity)
    &&normalize(place.country)===normalize(requestedCountry));
  if(exact.length!==1)return null;
  const place=exact[0];
  const url=new URL("/timezoneJSON",GEONAMES_BASE_URL);
  url.searchParams.set("lat",String(place.lat));
  url.searchParams.set("lng",String(place.long));
  url.searchParams.set("username",nonEmpty("GEONAMES_USERNAME",username));
  const response=await fetchImpl(url,{headers:{Accept:"application/json"}});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data===null||data.status)throw new Error("GeoNames timezone lookup failed");
  const timeZone=nonEmpty("destination timezone",data.timezoneId);
  try{new Intl.DateTimeFormat("en",{timeZone});}
  catch{throw new TypeError("GeoNames returned an invalid timezone");}
  return Object.freeze({
    locality:place.city,country:place.country,countryCode:place.countryCode,
    lat:place.lat,long:place.long,timeZone,
    evidenceRef:`geonames:${place.countryCode}/${place.city}/${place.lat},${place.long}`,
  });
}
