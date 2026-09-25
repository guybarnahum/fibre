function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function queryTerms(value) {
  const query = clean(value)?.toLocaleLowerCase("en-US") ?? null;
  return query === null ? [] : query.split(/\s+/).filter(Boolean);
}

function searchable(entry) {
  return [
    entry.threadId,
    entry.fibreIdentityNumber,
    entry.displayName,
    entry.sex,
    entry.status,
    entry.originOrientation,
    entry.birthDate,
    entry.birthPlace,
    entry.summary,
    ...(entry.culture ?? []),
    ...(entry.languages ?? []),
    entry.raisedAs?.culturalContext,
    entry.raisedAs?.schoolingOrCommunityContext,
    ...(entry.raisedAs?.languages ?? []),
  ].filter((value) => typeof value === "string").join("\n").toLocaleLowerCase("en-US");
}

function matchesQuery(entry, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return true;
  const haystack = searchable(entry);
  return terms.every((term) => haystack.includes(term));
}

export function createThreadDirectoryService({ directoryStore }) {
  if (!directoryStore || typeof directoryStore.listEntries !== "function") {
    throw new TypeError("Thread directory requires directoryStore.listEntries");
  }

  return Object.freeze({
    get(threadId) {
      if (typeof directoryStore.getEntry !== "function") throw new TypeError("Thread directory store must expose getEntry()");
      return directoryStore.getEntry(threadId);
    },
    search({ query = null, fin = null, limit = 50 } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5000) {
        throw new TypeError("Thread directory search limit must be between 1 and 5000");
      }
      const normalizedFin = clean(fin);
      const entries = directoryStore.listEntries({
        limit: normalizedFin === null ? 5000 : 1,
        fin: normalizedFin,
      });
      const threads = [];
      for (const entry of entries) {
        if (!matchesQuery(entry, query)) continue;
        threads.push(entry);
        if (threads.length >= limit) break;
      }
      return { threads };
    },
  });
}
