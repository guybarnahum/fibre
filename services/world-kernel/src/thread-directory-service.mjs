function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function entryFor(thread, registration) {
  return Object.freeze({
    threadId: thread.threadId,
    fibreIdentityNumber: registration?.fibreIdentityNumber ?? null,
    displayName: clean(thread.identity?.name),
    status: clean(thread.status),
    originOrientation: clean(thread.identity?.originOrientation),
    culture: Object.freeze(Array.isArray(thread.identity?.culture) ? [...thread.identity.culture] : []),
    summary: clean(thread.identity?.selfDescription),
  });
}

function searchable(thread, registration) {
  return [
    thread.threadId,
    registration?.fibreIdentityNumber,
    thread.identity?.name,
    thread.identity?.originOrientation,
    thread.identity?.selfDescription,
    ...(Array.isArray(thread.identity?.culture) ? thread.identity.culture : []),
    ...Object.values(thread.genome?.textualTraits ?? {}),
  ].filter((value) => typeof value === "string").join("\n").toLocaleLowerCase("en-US");
}

export function createThreadDirectoryService({
  worldReader,
  civilRegistry,
  directoryStore,
}) {
  if (!worldReader || typeof worldReader.getThread !== "function") {
    throw new TypeError("Thread directory requires worldReader.getThread");
  }
  if (!civilRegistry || typeof civilRegistry.getCivilRegistrationByThreadId !== "function" || typeof civilRegistry.getCivilRegistrationByFin !== "function") {
    throw new TypeError("Thread directory requires Civil Registry read methods");
  }
  if (!directoryStore || typeof directoryStore.listThreadIds !== "function") {
    throw new TypeError("Thread directory requires directoryStore.listThreadIds");
  }

  function readEntry(threadId) {
    const thread = worldReader.getThread(threadId, { required: false });
    if (thread === null) return null;
    const registration = civilRegistry.getCivilRegistrationByThreadId(threadId, { required: false });
    return { thread, registration, entry: entryFor(thread, registration) };
  }

  return Object.freeze({
    search({ query = null, fin = null, limit = 50 } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
        throw new TypeError("Thread directory search limit must be between 1 and 200");
      }
      const normalizedFin = clean(fin);
      if (normalizedFin !== null) {
        const registration = civilRegistry.getCivilRegistrationByFin(normalizedFin, { required: false });
        if (registration === null) return { threads: [] };
        const resolved = readEntry(registration.threadId);
        if (resolved === null) return { threads: [] };
        const wanted = clean(query)?.toLocaleLowerCase("en-US") ?? null;
        if (wanted !== null && !searchable(resolved.thread, resolved.registration).includes(wanted)) {
          return { threads: [] };
        }
        return { threads: [resolved.entry] };
      }

      const wanted = clean(query)?.toLocaleLowerCase("en-US") ?? null;
      const threads = [];
      for (const threadId of directoryStore.listThreadIds()) {
        const resolved = readEntry(threadId);
        if (resolved === null) continue;
        if (wanted !== null && !searchable(resolved.thread, resolved.registration).includes(wanted)) continue;
        threads.push(resolved.entry);
        if (threads.length >= limit) break;
      }
      return { threads };
    },
  });
}
