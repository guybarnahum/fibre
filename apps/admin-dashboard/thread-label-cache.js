const labels = new Map();

function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function placeFrom(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const city = clean(value.city ?? value.locality);
    const country = clean(value.country);
    const displayName = clean(value.displayName)
      ?? [city, country].filter(Boolean).join(", ")
      ?? null;
    return Object.freeze({
      displayName:displayName || null,
      city,
      country,
      countryCode:clean(value.countryCode)?.toUpperCase() ?? null,
    });
  }
  const displayName = clean(value);
  return displayName === null
    ? null
    : Object.freeze({ displayName, city:null, country:null, countryCode:null });
}

export function rememberThreadLabel(threadId, {
  name = null,
  birthLocation = null,
  birthPlace = null,
} = {}) {
  const id = clean(threadId);
  if (id === null) return null;
  const previous = labels.get(id) ?? {};
  const place = placeFrom(birthLocation) ?? placeFrom(birthPlace) ?? previous.birthLocation ?? null;
  const next = Object.freeze({
    threadId:id,
    name:clean(name) ?? previous.name ?? null,
    birthLocation:place,
  });
  labels.set(id, next);
  return next;
}

export function rememberPopulationThread(thread) {
  if (!thread?.threadId) return null;
  return rememberThreadLabel(thread.threadId, {
    name:thread.identity?.name,
    birthLocation:thread.identity?.birthLocation,
    birthPlace:thread.identity?.birthPlace,
  });
}

export function rememberPendingBirth(birth) {
  if (!birth?.threadId) return null;
  return rememberThreadLabel(birth.threadId, {
    name:birth.name,
    birthLocation:birth.requestedLocation,
    birthPlace:birth.location,
  });
}

export function knownThreadLabel(threadId) {
  return labels.get(threadId) ?? null;
}

export function countryFlag(countryCode) {
  const code = clean(countryCode)?.toUpperCase();
  if (!/^[A-Z]{2}$/u.test(code ?? "")) return "";
  return [...code].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
}

export function threadBirthplaceText(label) {
  return clean(label?.birthLocation?.displayName);
}
