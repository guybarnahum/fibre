// fibre-test-support: test-only
// Builds a minimal deterministic envelope witness for narrow publication fixtures.

import {
  GENESIS_HISTORICAL_ENVELOPE_VERSION,
  GENESIS_SPARSE_HISTORY_NOTICE,
} from "../../src/genesis-historical-envelope-v1.mjs";
import {
  genesisHistoricalEnvelopePlanDigest,
  genesisHistoricalEnvelopeStatistics,
  normalizeGenesisHistoricalEnvelopePlan,
} from "../../src/genesis-historical-envelope-authority.mjs";

const WEEKDAYS = Object.freeze(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

function inferPlaceKind(place) {
  const text = `${place.placeId} ${place.description}`.toLowerCase();
  if (/\bhome\b|house|apartment|flat|kitchen|bedroom|living room/.test(text)) return "home";
  if (/school|classroom|campus/.test(text)) return "school";
  if (/library|reading room|study room|learning cent/.test(text)) return "library_or_learning";
  if (/bus|tram|train|station|transit|platform/.test(text)) return "transit";
  if (/market|shop|store|stall|supermarket|grocery|commerce/.test(text)) return "market_or_commerce";
  if (/beach|shore|seafront|ocean|riverbank|waterfront|harbou?r/.test(text)) return "waterfront";
  if (/park|playground|garden|sports field|outdoor/.test(text)) return "park_or_outdoors";
  if (/clinic|hospital|doctor|health cent/.test(text)) return "health_or_clinic";
  if (/office|workplace|workshop|job site/.test(text)) return "work_or_workplace";
  if (/church|mosque|synagogue|temple|museum|gallery|theat/.test(text)) return "religious_or_cultural";
  return "outdoors";
}

function localParts(occurredAt) {
  const value = new Date(occurredAt);
  const hour = value.getUTCHours();
  const daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return {
    localDate: value.toISOString().slice(0, 10),
    localTime: value.toISOString().slice(11, 16),
    localWeekday: WEEKDAYS[value.getUTCDay()],
    daypart,
  };
}

export function buildTestHistoricalEnvelopePlan({ threadId, worldSpec, episodes }) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new TypeError("test historical envelope requires life episodes");
  }
  const places = new Map(worldSpec.places.map((place) => [place.placeId, place]));
  const timeZone = "UTC";
  const seedDomain = `fibre-test-only:${threadId}:${worldSpec.worldSpecId}`;
  const envelopes = episodes.map((episode, index) => {
    const place = places.get(episode.placeRef);
    if (!place) throw new TypeError(`test episode ${episode.episodeId} names an unknown place`);
    return Object.freeze({
      envelopeVersion: GENESIS_HISTORICAL_ENVELOPE_VERSION,
      ordinal: index + 1,
      windowId: `test_window_${String(index + 1).padStart(2, "0")}`,
      occurredAt: episode.occurredAt,
      ageAtEvent: episode.ageAtEvent,
      timeZone,
      ...localParts(episode.occurredAt),
      placeRef: episode.placeRef,
      placeKind: inferPlaceKind(place),
      selectionKind: episode.structureRef === null ? "world_emergent" : "offered_structure",
      structureRef: episode.structureRef,
      counterpartMode: null,
      counterpart: null,
      externalCounterpartRequired: false,
    });
  });
  const plan = {
    version: GENESIS_HISTORICAL_ENVELOPE_VERSION,
    threadId,
    worldSpecId: worldSpec.worldSpecId,
    timeZone,
    seedDomain,
    sparseHistoryNotice: GENESIS_SPARSE_HISTORY_NOTICE,
    envelopes,
    statistics: genesisHistoricalEnvelopeStatistics(envelopes),
    digest: genesisHistoricalEnvelopePlanDigest({
      threadId,
      worldSpecId: worldSpec.worldSpecId,
      timeZone,
      seedDomain,
      envelopes,
    }),
  };
  return normalizeGenesisHistoricalEnvelopePlan(plan);
}
