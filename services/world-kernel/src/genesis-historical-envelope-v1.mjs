import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { richCounterpartMode } from "./genesis-rich-participation-policy.mjs";

export const GENESIS_HISTORICAL_ENVELOPE_VERSION = "genesis-historical-envelope-v1";
export const GENESIS_HISTORICAL_ENVELOPE_POLICY = Object.freeze({
  version: GENESIS_HISTORICAL_ENVELOPE_VERSION,
  minimumDistinctPlaces: 4,
  maxEpisodesPerPlace: 4,
  maxEpisodesPerStructure: 2,
  maxEpisodesPerWeekday: 3,
  maxEpisodesPerDaypart: 4,
  worldEmergentEpisodes: 2,
  minimumExternalCounterpartOpportunities: 5,
  minimumExternalRoleVariety: 2,
});

export const GENESIS_SPARSE_HISTORY_NOTICE = "The visible life history is a sparse coverage-oriented sample of concrete episodes, not a frequency sample of the whole life. Repetition in the sample is not evidence that an event type dominated the life, and absence from the sample is not evidence that something never happened.";

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.2425 * DAY_MS;
const DAYPARTS = Object.freeze([
  Object.freeze({ id: "morning", hour: 9, minute: 15 }),
  Object.freeze({ id: "late_morning", hour: 11, minute: 30 }),
  Object.freeze({ id: "afternoon", hour: 14, minute: 30 }),
  Object.freeze({ id: "late_afternoon", hour: 17, minute: 15 }),
  Object.freeze({ id: "evening", hour: 19, minute: 15 }),
]);
const WEEKDAYS = Object.freeze(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

function fail(message) { throw new TypeError(message); }
function hash(value) { return sha256(canonicalJson(value)); }
function ranked(seed, values, key = (value) => value) {
  return [...values].sort((left, right) => {
    const a = hash({ seed, value: key(left) });
    const b = hash({ seed, value: key(right) });
    return a.localeCompare(b) || String(key(left)).localeCompare(String(key(right)));
  });
}
function count(map, key) { return map.get(key) ?? 0; }
function increment(map, key) { map.set(key, count(map, key) + 1); }
function initialRoleSet(initialRoster) {
  return new Set(initialRoster.flatMap((participant) => participant.factualRoles ?? []).filter((role) => role !== "subject"));
}
function validateTimeZone(timeZone) {
  if (typeof timeZone !== "string" || timeZone.trim() === "") fail("historical envelope timeZone is required");
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0)); }
  catch { fail(`historical envelope timeZone ${timeZone} is invalid`); }
  return timeZone;
}
function localParts(instantMs, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "long",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instantMs))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
    weekday: parts.weekday,
  };
}
function zonedLocalToUtc({ year, month, day, hour, minute }, timeZone) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = desired;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const actual = localParts(guess, timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, 0);
    const delta = desired - represented;
    guess += delta;
    if (delta === 0) break;
  }
  const verified = localParts(guess, timeZone);
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== hour || verified.minute !== minute) {
    fail(`cannot represent local civil time ${year}-${month}-${day} ${hour}:${minute} in ${timeZone}`);
  }
  return guess;
}
function measuredAge(bornAt, occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(bornAt)) / YEAR_MS;
}
function localDateLabel(parts) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function localTimeLabel(parts) {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
function chooseInstant(window, { timeZone, seed, weekdayCounts, daypartCounts }) {
  const startMs = Date.parse(window.startAt);
  const endMs = Date.parse(window.endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) fail(`invalid developmental window ${window.windowId}`);
  const margin = Math.min(36 * 60 * 60 * 1000, Math.floor((endMs - startMs) / 10));
  const usableStart = startMs + margin;
  const usableEnd = endMs - margin;
  const spanDays = Math.max(1, Math.floor((usableEnd - usableStart) / DAY_MS));
  const dayparts = ranked(`${seed}:dayparts`, DAYPARTS, (item) => item.id);
  for (let nonce = 0; nonce < 512; nonce += 1) {
    const dayHex = hash({ seed, nonce, kind: "local-day" }).slice(0, 12);
    const dayOffset = Number(BigInt(`0x${dayHex}`) % BigInt(spanDays));
    const anchor = new Date(usableStart + dayOffset * DAY_MS);
    for (const daypart of dayparts) {
      if (count(daypartCounts, daypart.id) >= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerDaypart) continue;
      const instantMs = zonedLocalToUtc({
        year: anchor.getUTCFullYear(), month: anchor.getUTCMonth() + 1, day: anchor.getUTCDate(),
        hour: daypart.hour, minute: daypart.minute,
      }, timeZone);
      if (instantMs < startMs || instantMs > endMs) continue;
      const local = localParts(instantMs, timeZone);
      if (count(weekdayCounts, local.weekday) >= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerWeekday) continue;
      increment(weekdayCounts, local.weekday);
      increment(daypartCounts, daypart.id);
      return { instantMs, daypart, local };
    }
  }
  fail(`could not choose bounded local civil time for ${window.windowId}`);
}
function structureCandidate(entry, { initialRoles, affordedRoles }) {
  const structure = entry.structure;
  const mode = richCounterpartMode(structure.structureId);
  const roles = structure.participatingRoles.filter((role) => affordedRoles.has(role));
  if (mode === "known_required" && !roles.some((role) => initialRoles.has(role))) return null;
  if (mode === "present_required" && structure.participatingRoles.length > 0 && roles.length === 0) return null;
  const externalOnly = mode === "present_required" && roles.length > 0 && roles.every((role) => !initialRoles.has(role));
  return { entry, mode, roles, externalOnly };
}
function chooseStructure(windowPlan, {
  seed, structureCounts, requireExternal, initialRoles, affordedRoles,
}) {
  const normalized = windowPlan.offeredEntries
    .map((entry) => structureCandidate(entry, { initialRoles, affordedRoles }))
    .filter(Boolean);
  let candidates = requireExternal ? normalized.filter((item) => item.externalOnly) : normalized;
  if (candidates.length === 0 && requireExternal) fail(`window ${windowPlan.window.windowId} cannot satisfy external-counterpart coverage`);
  candidates = candidates.filter(({ entry }) => count(structureCounts, entry.structure.structureId) < GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerStructure);
  if (candidates.length === 0) fail(`window ${windowPlan.window.windowId} exhausted structure repetition cap`);
  const unseen = candidates.filter(({ entry }) => count(structureCounts, entry.structure.structureId) === 0);
  const selected = ranked(`${seed}:structure`, unseen.length > 0 ? unseen : candidates, (item) => item.entry.structure.structureId)[0];
  increment(structureCounts, selected.entry.structure.structureId);
  const counterpartRole = selected.mode === "present_required" || selected.mode === "known_required"
    ? ranked(`${seed}:counterpart-role`, selected.roles)[0] ?? null
    : null;
  return {
    selectionKind: "offered_structure",
    structureRef: selected.entry.structure.structureId,
    counterpartMode: selected.mode,
    counterpartRole,
    externalCounterpartRequired: selected.externalOnly,
  };
}
function choosePlace(worldSpec, ordinal, {
  seed, placeCounts, coverageOrdinals, previouslySelectedPlace,
}) {
  const minimumDistinct = Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length);
  const seen = new Set([...placeCounts.entries()].filter(([, value]) => value > 0).map(([key]) => key));
  const needsCoverage = coverageOrdinals.has(ordinal) && seen.size < minimumDistinct;
  let candidates = worldSpec.places.filter((place) => count(placeCounts, place.placeId) < GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerPlace);
  if (needsCoverage) {
    const unseen = candidates.filter((place) => !seen.has(place.placeId));
    if (unseen.length > 0) candidates = unseen;
  }
  if (candidates.length > 1 && previouslySelectedPlace !== null) {
    const nonRepeat = candidates.filter((place) => place.placeId !== previouslySelectedPlace);
    if (nonRepeat.length > 0) candidates = nonRepeat;
  }
  if (candidates.length === 0) fail("historical envelope exhausted place repetition cap");
  const selected = ranked(`${seed}:place`, candidates, (place) => place.placeId)[0];
  increment(placeCounts, selected.placeId);
  return selected;
}

export function buildHistoricalEnvelopePlan({
  subject,
  worldSpec,
  windows,
  offersByWindow,
  initialRoster,
  timeZone,
  seedDomain,
}) {
  if (!subject || typeof subject.provisionalThreadId !== "string" || typeof subject.bornAt !== "string") fail("historical envelope subject is invalid");
  if (!worldSpec || !Array.isArray(worldSpec.places) || worldSpec.places.length === 0) fail("historical envelope WorldSpec requires places");
  if (!Array.isArray(windows) || windows.length < 10) fail("historical envelope requires at least ten windows");
  if (!(offersByWindow instanceof Map)) fail("historical envelope offersByWindow must be a Map");
  if (!Array.isArray(initialRoster) || initialRoster.length === 0) fail("historical envelope initialRoster is required");
  validateTimeZone(timeZone);
  if (typeof seedDomain !== "string" || seedDomain.trim() === "") fail("historical envelope seedDomain is required");

  const plans = windows.map((window) => {
    const offeredEntries = offersByWindow.get(window.windowId);
    if (!Array.isArray(offeredEntries) || offeredEntries.length < 8) fail(`historical envelope lacks offers for ${window.windowId}`);
    return { window, offeredEntries };
  });
  const initialRoles = initialRoleSet(initialRoster);
  const affordedRoles = new Set(worldSpec.affordedRoles ?? []);
  const externalCapable = plans.filter(({ offeredEntries }) => offeredEntries
    .map((entry) => structureCandidate(entry, { initialRoles, affordedRoles }))
    .some((candidate) => candidate?.externalOnly === true));
  if (externalCapable.length < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities) {
    fail(`only ${externalCapable.length} windows can force an external counterpart`);
  }
  const externalOrdinals = new Set(ranked(`${seedDomain}:external-coverage`, externalCapable, (item) => item.window.ordinal)
    .slice(0, GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities)
    .map((item) => item.window.ordinal));
  const worldEmergentEligible = plans.filter((item) => !externalOrdinals.has(item.window.ordinal));
  if (worldEmergentEligible.length < GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes) fail("not enough windows remain for world-emergent coverage");
  const worldEmergentOrdinals = new Set(ranked(`${seedDomain}:world-emergent`, worldEmergentEligible, (item) => item.window.ordinal)
    .slice(0, GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes)
    .map((item) => item.window.ordinal));
  const minimumDistinct = Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length);
  const coverageOrdinals = new Set(ranked(`${seedDomain}:place-coverage`, plans, (item) => item.window.ordinal)
    .slice(0, minimumDistinct)
    .map((item) => item.window.ordinal));

  const placeCounts = new Map();
  const structureCounts = new Map();
  const weekdayCounts = new Map();
  const daypartCounts = new Map();
  let previousPlace = null;
  const envelopes = [];
  for (const plan of plans) {
    const seed = `${seedDomain}:thread:${subject.provisionalThreadId}:window:${plan.window.windowId}`;
    const place = choosePlace(worldSpec, plan.window.ordinal, { seed, placeCounts, coverageOrdinals, previouslySelectedPlace: previousPlace });
    previousPlace = place.placeId;
    const time = chooseInstant(plan.window, { timeZone, seed, weekdayCounts, daypartCounts });
    const occurredAt = new Date(time.instantMs).toISOString();
    const local = time.local;
    const opportunity = worldEmergentOrdinals.has(plan.window.ordinal)
      ? { selectionKind: "world_emergent", structureRef: null, counterpartMode: null, counterpartRole: null, externalCounterpartRequired: false }
      : chooseStructure(plan, { seed, structureCounts, requireExternal: externalOrdinals.has(plan.window.ordinal), initialRoles, affordedRoles });
    envelopes.push(Object.freeze({
      envelopeVersion: GENESIS_HISTORICAL_ENVELOPE_VERSION,
      ordinal: plan.window.ordinal,
      windowId: plan.window.windowId,
      occurredAt,
      ageAtEvent: Number(measuredAge(subject.bornAt, occurredAt).toFixed(4)),
      timeZone,
      localDate: localDateLabel(local),
      localTime: localTimeLabel(local),
      localWeekday: local.weekday,
      daypart: time.daypart.id,
      placeRef: place.placeId,
      selectionKind: opportunity.selectionKind,
      structureRef: opportunity.structureRef,
      counterpartMode: opportunity.counterpartMode,
      counterpartRole: opportunity.counterpartRole,
      externalCounterpartRequired: opportunity.externalCounterpartRequired,
    }));
  }

  const distinctPlaces = new Set(envelopes.map((item) => item.placeRef));
  const externalRoles = new Set(envelopes.filter((item) => item.externalCounterpartRequired && item.counterpartRole !== null).map((item) => item.counterpartRole));
  const statistics = Object.freeze({
    episodeCount: envelopes.length,
    distinctPlaces: distinctPlaces.size,
    maxPlaceUse: Math.max(...placeCounts.values()),
    distinctStructures: new Set(envelopes.map((item) => item.structureRef).filter(Boolean)).size,
    maxStructureUse: structureCounts.size === 0 ? 0 : Math.max(...structureCounts.values()),
    worldEmergentCount: envelopes.filter((item) => item.selectionKind === "world_emergent").length,
    externalCounterpartOpportunityCount: envelopes.filter((item) => item.externalCounterpartRequired).length,
    externalRoleVariety: externalRoles.size,
    maxWeekdayUse: Math.max(...weekdayCounts.values()),
    maxDaypartUse: Math.max(...daypartCounts.values()),
  });
  if (statistics.distinctPlaces < minimumDistinct) fail("historical envelope place coverage below policy");
  if (statistics.maxPlaceUse > GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerPlace) fail("historical envelope place repetition exceeds policy");
  if (statistics.maxStructureUse > GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerStructure) fail("historical envelope structure repetition exceeds policy");
  if (statistics.worldEmergentCount !== GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes) fail("historical envelope world-emergent count drift");
  if (statistics.externalCounterpartOpportunityCount < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities) fail("historical envelope external social coverage below policy");
  if (statistics.externalRoleVariety < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalRoleVariety) fail("historical envelope external role variety below policy");
  if (statistics.maxWeekdayUse > GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerWeekday) fail("historical envelope weekday repetition exceeds policy");
  if (statistics.maxDaypartUse > GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerDaypart) fail("historical envelope daypart repetition exceeds policy");

  return Object.freeze({
    version: GENESIS_HISTORICAL_ENVELOPE_VERSION,
    threadId: subject.provisionalThreadId,
    worldSpecId: worldSpec.worldSpecId,
    timeZone,
    seedDomain,
    sparseHistoryNotice: GENESIS_SPARSE_HISTORY_NOTICE,
    envelopes: Object.freeze(envelopes),
    statistics,
    digest: `sha256:${sha256(canonicalJson({ threadId: subject.provisionalThreadId, worldSpecId: worldSpec.worldSpecId, timeZone, seedDomain, envelopes }))}`,
  });
}

export function constrainPassAContextToHistoricalEnvelope({ worldSpec, envelope }) {
  const place = worldSpec.places.find((item) => item.placeId === envelope.placeRef);
  if (!place) fail(`historical envelope place ${envelope.placeRef} is not in WorldSpec`);
  const localAuthority = `For this episode only, the frozen local civil-time authority is ${envelope.localWeekday} ${envelope.localDate} at ${envelope.localTime} in IANA zone ${envelope.timeZone}. Do not state a conflicting weekday or daypart.`;
  const constrainedWorldSpec = structuredClone({
    ...worldSpec,
    places: [structuredClone(place)],
    culturalContext: `${worldSpec.culturalContext} ${localAuthority}`,
  });
  const developmentalWindow = Object.freeze({
    windowId: envelope.windowId,
    startAt: envelope.occurredAt,
    endAt: envelope.occurredAt,
    minAge: envelope.ageAtEvent,
    maxAge: envelope.ageAtEvent,
  });
  const selectedOpportunity = Object.freeze({
    selectionKind: envelope.selectionKind,
    structureRef: envelope.structureRef,
  });
  return Object.freeze({
    worldSpec: constrainedWorldSpec,
    developmentalWindow,
    chronologyEndsAt: envelope.occurredAt,
    selectedOpportunity,
  });
}

function mentionedWeekdays(text) {
  return WEEKDAYS.filter((weekday) => new RegExp(`\\b${weekday}\\b`, "i").test(text));
}
function mentionedDayparts(text) {
  const matches = [];
  if (/\bmorning\b/i.test(text)) matches.push("morning");
  if (/\bafternoon\b/i.test(text)) matches.push("afternoon");
  if (/\bevening\b|\bnight\b/i.test(text)) matches.push("evening");
  if (/\bnoon\b/i.test(text)) matches.push("noon");
  return matches;
}
function allowedNarrativeDayparts(daypart) {
  if (daypart === "morning" || daypart === "late_morning") return new Set(["morning"]);
  if (daypart === "afternoon" || daypart === "late_afternoon") return new Set(["afternoon"]);
  return new Set(["evening"]);
}

export function assertHistoricalEnvelopeRealized(episode, envelope) {
  if (episode.occurredAt !== envelope.occurredAt) fail(`episode ${episode.episodeId} changed frozen historical-envelope occurredAt`);
  if (episode.placeRef !== envelope.placeRef) fail(`episode ${episode.episodeId} changed frozen historical-envelope place`);
  const expectedStructure = envelope.selectionKind === "world_emergent" ? null : envelope.structureRef;
  if (episode.structureRef !== expectedStructure) fail(`episode ${episode.episodeId} changed frozen historical-envelope structure`);
  const weekdays = mentionedWeekdays(episode.observableAction);
  if (weekdays.some((weekday) => weekday !== envelope.localWeekday)) fail(`episode ${episode.episodeId} narrates a weekday inconsistent with local civil time`);
  const allowed = allowedNarrativeDayparts(envelope.daypart);
  const dayparts = mentionedDayparts(episode.observableAction);
  if (dayparts.some((part) => !allowed.has(part))) fail(`episode ${episode.episodeId} narrates a daypart inconsistent with local civil time`);
  return episode;
}
