function cleanString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function cleanStrings(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter((entry) => entry !== null)
    : [];
}

export function publicThreadDirectoryEntry({ current = null, catalogRecord }) {
  const threadId = cleanString(catalogRecord?.threadId);
  if (threadId === null) return null;
  if (current !== null && current?.pointer?.threadId !== threadId) return null;

  const projected = catalogRecord?.publicDirectory;
  const presentation = current?.snapshot?.presentation;
  if ((projected === null || typeof projected !== "object")
    && (presentation === null || typeof presentation !== "object")) return null;

  return Object.freeze({
    threadId,
    lifecycleStatus: cleanString(catalogRecord?.lifecycleStatus)
      ?? cleanString(presentation?.manifest?.lifecycleStatus),
    displayName: cleanString(projected?.displayName ?? presentation?.subject?.displayName),
    fibreIdentityNumber: cleanString(projected?.fibreIdentityNumber ?? presentation?.civilIdentity?.fibreIdentityNumber),
    birthDate: cleanString(projected?.birthDate ?? presentation?.subject?.birthDate),
    languages: Object.freeze(cleanStrings(projected?.languages ?? presentation?.subject?.languages)),
    homePlaceRef: cleanString(projected?.homePlaceRef ?? presentation?.subject?.homePlaceRef),
    headline: cleanString(projected?.headline ?? presentation?.introduction?.headline),
    summary: cleanString(projected?.summary ?? presentation?.introduction?.summary),
    visualDescription: cleanString(projected?.visualDescription ?? presentation?.visualIdentity?.subjectDescription),
    snapshotVersion: cleanString(catalogRecord?.latestSnapshotVersion ?? current?.pointer?.snapshotVersion),
    snapshotDigest: cleanString(catalogRecord?.latestSnapshotDigest ?? current?.pointer?.snapshotDigest),
  });
}

function normalized(value) {
  return cleanString(value)?.toLocaleLowerCase("en-US") ?? null;
}

export function matchesThreadDirectoryEntry(entry, {
  query = null,
  fin = null,
  language = null,
} = {}) {
  const wantedFin = normalized(fin);
  if (wantedFin !== null && normalized(entry.fibreIdentityNumber) !== wantedFin) return false;

  const wantedLanguage = normalized(language);
  if (wantedLanguage !== null && !entry.languages.some((value) => normalized(value) === wantedLanguage)) {
    return false;
  }

  const wantedQuery = normalized(query);
  if (wantedQuery === null) return true;
  const searchable = [
    entry.threadId,
    entry.displayName,
    entry.fibreIdentityNumber,
    entry.birthDate,
    ...entry.languages,
    entry.homePlaceRef,
    entry.headline,
    entry.summary,
    entry.visualDescription,
    entry.lifecycleStatus,
  ].filter((value) => value !== null).join("\n").toLocaleLowerCase("en-US");
  return wantedQuery.split(/\s+/).filter(Boolean).every((term) => searchable.includes(term));
}

function seededIndex(seed, length) {
  let hash = 0x811c9dc5;
  for (const character of String(seed)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % length;
}

export function chooseThreadDirectoryEntry(entries, {
  seed = null,
  random = Math.random,
} = {}) {
  if (!Array.isArray(entries)) throw new TypeError("Thread directory entries must be an array");
  if (entries.length === 0) return null;
  const ordered = [...entries].sort((left, right) => left.threadId.localeCompare(right.threadId));
  if (cleanString(seed) !== null) return ordered[seededIndex(seed, ordered.length)];
  if (typeof random !== "function") throw new TypeError("Thread directory random source must be a function");
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new TypeError("Thread directory random source must return a number in [0, 1)");
  }
  return ordered[Math.floor(value * ordered.length)];
}
