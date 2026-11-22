// The society now, for the public (K1, November 22, 2026): where each living
// public Thread is and what can be seen of it, from its own public present;
// who rests, counted only; and who met whom at a public venue lately, without
// a word of what was said. No model call on read. Shape agreed with the site
// in docs/investment/claude-handoff-k1-k4.md.
export const PUBLIC_SOCIETY_NOW_VERSION = "fibre-public-society-now-v1";

function person(thread, payload) {
  return {
    threadId: thread.threadId,
    displayName: thread.displayName ?? null,
    portraitObjectRef: thread.portraitThumbnailObjectRef ?? null,
    situationId: payload.situationId,
    phase: payload.phase,
    outwardActivity: payload.outwardActivity ?? null,
    establishedAt: payload.establishedAt,
  };
}

// A named public venue has its locality as region; a place with no region is
// only the city a Thread is in (its home, an unnamed stop), never a venue.
const cityOf = (place) => place === null ? null
  : place.region ?? place.displayName.split(",")[0].trim();

// Born and not retired. "active" is only the moment a Thread is thinking;
// between moments a living Thread is frozen or dormant.
const NOT_IN_THE_WORLD = new Set(["genesis_candidate", "retired"]);
export const bornThreads = (threads) => threads.filter((thread) => !NOT_IN_THE_WORLD.has(thread.lifecycleStatus));

export function composeSocietyNow({ threads, world, asOf, environment = null }) {
  const resting = new Set(world?.resting ?? []);
  const born = bornThreads(threads);
  const living = born.filter((thread) => !resting.has(thread.threadId) && thread.currentPresent?.payload);
  const cities = new Map();
  const city = (locality) => {
    if (!cities.has(locality)) cities.set(locality, { locality, venues: new Map(), inTransitThreads: [], unnamedPlaceThreads: [] });
    return cities.get(locality);
  };
  for (const thread of living) {
    const payload = thread.currentPresent.payload;
    if (payload.phase === "in_transit") {
      const to = payload.location?.to ?? null, from = payload.location?.from ?? null;
      city(cityOf(to) ?? cityOf(from)).inTransitThreads.push(person(thread, payload));
      continue;
    }
    const place = payload.location?.place ?? null;
    if (place === null || place.region === null || place.region === undefined) {
      city(cityOf(place)).unnamedPlaceThreads.push(person(thread, payload));
      continue;
    }
    const venues = city(cityOf(place)).venues;
    if (!venues.has(place.displayName)) venues.set(place.displayName, { displayName: place.displayName, presentThreads: [] });
    venues.get(place.displayName).presentThreads.push(person(thread, payload));
  }
  const nameOf = new Map(threads.map((thread) => [thread.threadId, thread.displayName ?? null]));
  return Object.freeze({
    contract: PUBLIC_SOCIETY_NOW_VERSION,
    asOf,
    environment,
    population: { livingPublicCount: living.length, restingCount: born.filter((thread) => resting.has(thread.threadId)).length },
    cities: [...cities.values()].map((entry) => ({ locality: entry.locality,
      venues: [...entry.venues.values()].map((venue) => ({ ...venue,
        presentThreads: venue.presentThreads.map((item) => ({ ...item,
          coPresentThreadIds: venue.presentThreads.map((other) => other.threadId).filter((id) => id !== item.threadId) })) })),
      inTransitThreads: entry.inTransitThreads, unnamedPlaceThreads: entry.unnamedPlaceThreads })),
    recentPublicEncounters: (world?.meetings ?? []).map((meeting) => ({
      encounterStoryId: meeting.encounterStoryId,
      occurredAt: meeting.occurredAt,
      locality: meeting.place?.locality ?? null,
      placeDisplayName: meeting.place?.displayName ?? null,
      participantThreadIds: meeting.threadIds,
      participantNames: meeting.threadIds.map((id) => nameOf.get(id) ?? null),
    })),
  });
}

// GET /api/society/now: the public Threads and their presents from the
// catalog, what World adds, composed. Browsers always ask again; the edge
// keeps one shared copy briefly (the worker's own cache).
export function createPublicSocietyApi({ listPublicThreads, readWorldSociety, viewerOrigin = null, environment = null }) {
  if (typeof listPublicThreads !== "function" || typeof readWorldSociety !== "function") {
    throw new TypeError("public society API requires listPublicThreads and readWorldSociety");
  }
  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/api/society/now") return null;
      const origin = request.headers.get("Origin");
      if (origin !== null && origin !== viewerOrigin) return Response.json({ error: "origin_not_allowed" }, { status: 403 });
      const cors = origin === null ? {} : { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, OPTIONS", Vary: "Origin" };
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "GET") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: cors });
      if ([...url.searchParams.keys()].length > 0) return Response.json({ error: "invalid_request" }, { status: 400, headers: cors });
      const threads = await listPublicThreads();
      const world = await readWorldSociety(bornThreads(threads).map((thread) => thread.threadId));
      return Response.json(composeSocietyNow({ threads, world, asOf: world?.asOf ?? new Date().toISOString(), environment }), {
        headers: { ...cors, "Cache-Control": "no-cache" },
      });
    },
  });
}
