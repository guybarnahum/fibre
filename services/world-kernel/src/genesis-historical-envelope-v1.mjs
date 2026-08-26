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

function normalizePlaceAffordances(worldSpec, candidates) {
  if (!Array.isArray(candidates) || candidates.length !== worldSpec.places.length) fail(`place-affordance count drift for ${worldSpec.worldSpecId}`);
  const placeIds = new Set(worldSpec.places.map((place) => place.placeId));
  const affordedRoles = new Set(worldSpec.affordedRoles ?? []);
  const seen = new Set();
  return candidates.map((candidate) => {
    if (!candidate || typeof candidate.placeRef !== "string" || !placeIds.has(candidate.placeRef)) fail(`place-affordance ${candidate?.placeRef ?? "unknown"} is not in ${worldSpec.worldSpecId}`);
    if (seen.has(candidate.placeRef)) fail(`duplicate place-affordance ${candidate.placeRef}`);
    seen.add(candidate.placeRef);
    if (typeof candidate.placeKind !== "string" || candidate.placeKind.trim() === "") fail(`place-affordance ${candidate.placeRef} lacks placeKind`);
    if (!Array.isArray(candidate.ordinaryCounterpartRoles)) fail(`place-affordance ${candidate.placeRef} roles must be an array`);
    for (const role of candidate.ordinaryCounterpartRoles) {
      if (!affordedRoles.has(role)) fail(`place-affordance ${candidate.placeRef} uses role ${role} not afforded by ${worldSpec.worldSpecId}`);
    }
    return Object.freeze({
      placeRef: candidate.placeRef,
      placeKind: candidate.placeKind,
      ordinaryCounterpartRoles: Object.freeze([...new Set(candidate.ordinaryCounterpartRoles)]),
    });
  });
}

function structureCandidate(entry, { initialRoles, affordedRoles }) {
  const structure = entry.structure;
  const mode = richCounterpartMode(structure.structureId);
  const roles = structure.participatingRoles.filter((role) => affordedRoles.has(role));
  if (mode === "known_required" && !roles.some((role) => initialRoles.has(role))) return null;
  if (mode === "present_required" && structure.participatingRoles.length > 0 && roles.length === 0) return null;
  const externalRoles = mode === "present_required"
    ? roles.filter((role) => !initialRoles.has(role))
    : [];
  const externalOnly = mode === "present_required" && roles.length > 0 && externalRoles.length === roles.length;
  return { entry, mode, roles, externalRoles, externalOnly };
}

function placeCompatibleExternalRoles(candidate, placeRoleSet) {
  return candidate.externalRoles.filter((role) => placeRoleSet.has(role));
}
function chooseStructure(windowPlan, {
  seed,
  structureCounts,
  requireExternal,
  initialRoles,
  affordedRoles,
  placeAffordances,
  placeCounts,
}) {
  const normalized = windowPlan.offeredEntries
    .map((entry) => structureCandidate(entry, { initialRoles, affordedRoles }))
    .filter(Boolean);

  const availablePlaceRoles = new Set(
    placeAffordances
      .filter((item) =>
        count(placeCounts, item.placeRef)
          < GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerPlace)
      .flatMap((item) => item.ordinaryCounterpartRoles),
  );

  let candidates = normalized.filter((item) => {
    if (requireExternal) {
      return placeCompatibleExternalRoles(item, availablePlaceRoles).length > 0;
    }

    if (item.mode === "known_required") {
      return item.roles.some((role) =>
        initialRoles.has(role) && availablePlaceRoles.has(role));
    }

    if (item.mode === "present_required" && item.roles.length > 0) {
      return item.roles.some((role) => availablePlaceRoles.has(role));
    }

    return true;
  });

  if (candidates.length === 0 && requireExternal) {
    fail(`window ${windowPlan.window.windowId} cannot satisfy external-counterpart coverage`);
  }

  candidates = candidates.filter(({ entry }) =>
    count(structureCounts, entry.structure.structureId)
      < GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerStructure);

  if (candidates.length === 0) {
    fail(`window ${windowPlan.window.windowId} exhausted structure repetition cap`);
  }

  const unseen = candidates.filter(({ entry }) =>
    count(structureCounts, entry.structure.structureId) === 0);

  const selected = ranked(
    `${seed}:structure`,
    unseen.length > 0 ? unseen : candidates,
    (item) => item.entry.structure.structureId,
  )[0];

  increment(structureCounts, selected.entry.structure.structureId);

  let counterpartRoles = [];

  if (requireExternal) {
    counterpartRoles =
      placeCompatibleExternalRoles(selected, availablePlaceRoles);
  } else if (selected.mode === "known_required") {
    counterpartRoles = selected.roles.filter((role) =>
      initialRoles.has(role) && availablePlaceRoles.has(role));
  } else if (selected.mode === "present_required") {
    counterpartRoles =
      selected.roles.filter((role) => availablePlaceRoles.has(role));
  }

  const counterpartRole = counterpartRoles.length > 0
    ? ranked(`${seed}:counterpart-role`, counterpartRoles)[0]
    : null;

  return {
    selectionKind: "offered_structure",
    structureRef: selected.entry.structure.structureId,
    counterpartMode: selected.mode,
    counterpartRole,
    externalCounterpartRequired: requireExternal,
  };
}
function bindCounterpart({ subjectId, counterpartRole, counterpartMode, initialRoster, generatedPersonByRole, seed }) {
  if (counterpartRole === null) return null;
  const existing = initialRoster.filter((participant) => (participant.factualRoles ?? []).includes(counterpartRole));
  if (existing.length > 0) {
    const participant = ranked(`${seed}:existing-counterpart`, existing, (item) => item.participantId)[0];
    return Object.freeze({ participantId: participant.participantId, roleRef: counterpartRole, origin: "initial_roster", introducedHere: false });
  }
  if (counterpartMode === "known_required") fail(`known-required role ${counterpartRole} has no initial-roster participant`);
  const already = generatedPersonByRole.get(counterpartRole);
  if (already !== undefined) return Object.freeze({ ...already, introducedHere: false });
  const participantId = `person_env_${hash({ subjectId, counterpartRole, version: GENESIS_HISTORICAL_ENVELOPE_VERSION }).slice(0, 32)}`;
  const created = Object.freeze({ participantId, roleRef: counterpartRole, origin: "historical_envelope", introducedHere: true });
  generatedPersonByRole.set(counterpartRole, Object.freeze({ ...created, introducedHere: false }));
  return created;
}
function choosePlace(worldSpec, placeAffordances, {
  seed, placeCounts, counterpartRole, previouslySelectedPlace,
}) {
  const minimumDistinct = Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length);
  const seen = new Set([...placeCounts.entries()].filter(([, value]) => value > 0).map(([key]) => key));
  const byId = new Map(placeAffordances.map((item) => [item.placeRef, item]));
  let candidates = worldSpec.places.filter((place) => {
    if (count(placeCounts, place.placeId) >= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerPlace) return false;
    if (counterpartRole === null) return true;
    return byId.get(place.placeId)?.ordinaryCounterpartRoles.includes(counterpartRole) === true;
  });
  if (candidates.length === 0) fail(`historical envelope has no place compatible with counterpart role ${counterpartRole ?? "none"}`);
  if (seen.size < minimumDistinct) {
    const unseen = candidates.filter((place) => !seen.has(place.placeId));
    if (unseen.length > 0) candidates = unseen;
  }
  if (candidates.length > 1 && previouslySelectedPlace !== null) {
    const nonRepeat = candidates.filter((place) => place.placeId !== previouslySelectedPlace);
    if (nonRepeat.length > 0) candidates = nonRepeat;
  }
  const selected = ranked(`${seed}:place`, candidates, (place) => place.placeId)[0];
  increment(placeCounts, selected.placeId);
  return Object.freeze({ place: selected, affordance: byId.get(selected.placeId) });
}

export function buildHistoricalEnvelopePlan({
  subject,
  worldSpec,
  windows,
  offersByWindow,
  initialRoster,
  placeAffordances,
  timeZone,
  seedDomain,
}) {
  if (!subject || typeof subject.provisionalThreadId !== "string" || typeof subject.bornAt !== "string") fail("historical envelope subject is invalid");
  if (!worldSpec || !Array.isArray(worldSpec.places) || worldSpec.places.length === 0) fail("historical envelope WorldSpec requires places");
  if (!Array.isArray(windows) || windows.length < 10) fail("historical envelope requires at least ten windows");
  if (!(offersByWindow instanceof Map)) fail("historical envelope offersByWindow must be a Map");
  if (!Array.isArray(initialRoster) || initialRoster.length === 0) fail("historical envelope initialRoster is required");
  const normalizedPlaceAffordances = normalizePlaceAffordances(worldSpec, placeAffordances);
  validateTimeZone(timeZone);
  if (typeof seedDomain !== "string" || seedDomain.trim() === "") fail("historical envelope seedDomain is required");

  const plans = windows.map((window) => {
    const offeredEntries = offersByWindow.get(window.windowId);
    if (!Array.isArray(offeredEntries) || offeredEntries.length < 8) fail(`historical envelope lacks offers for ${window.windowId}`);
    return { window, offeredEntries };
  });
  const initialRoles = initialRoleSet(initialRoster);
  const affordedRoles = new Set(worldSpec.affordedRoles ?? []);
  const placeRoleSet = new Set(normalizedPlaceAffordances.flatMap((item) => item.ordinaryCounterpartRoles));
  const externalCapable = plans.filter(({ offeredEntries }) => offeredEntries
    .map((entry) => structureCandidate(entry, { initialRoles, affordedRoles }))
    .some((candidate) =>
      candidate !== null
      && placeCompatibleExternalRoles(candidate, placeRoleSet).length > 0));
  if (externalCapable.length < GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities) {
    fail(`only ${externalCapable.length} windows can force a place-compatible external counterpart`);
  }
  const externalOrdinals = new Set(ranked(`${seedDomain}:external-coverage`, externalCapable, (item) => item.window.ordinal)
    .slice(0, GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities)
    .map((item) => item.window.ordinal));
  const worldEmergentEligible = plans.filter((item) => !externalOrdinals.has(item.window.ordinal));
  if (worldEmergentEligible.length < GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes) fail("not enough windows remain for world-emergent coverage");
  const worldEmergentOrdinals = new Set(ranked(`${seedDomain}:world-emergent`, worldEmergentEligible, (item) => item.window.ordinal)
    .slice(0, GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes)
    .map((item) => item.window.ordinal));

  const placeCounts = new Map();
  const structureCounts = new Map();
  const weekdayCounts = new Map();
  const daypartCounts = new Map();
  const generatedPersonByRole = new Map();
  let previousPlace = null;
  const envelopes = [];
  for (const plan of plans) {
    const seed = `${seedDomain}:thread:${subject.provisionalThreadId}:window:${plan.window.windowId}`;
    const opportunity = worldEmergentOrdinals.has(plan.window.ordinal)
      ? { selectionKind: "world_emergent", structureRef: null, counterpartMode: null, counterpartRole: null, externalCounterpartRequired: false }
      : chooseStructure(plan, {
        seed,
        structureCounts,
        requireExternal: externalOrdinals.has(plan.window.ordinal),
        initialRoles,
        affordedRoles,
        placeAffordances: normalizedPlaceAffordances,
        placeCounts,
      });
    const counterpart = bindCounterpart({
      subjectId: subject.provisionalThreadId,
      counterpartRole: opportunity.counterpartRole,
      counterpartMode: opportunity.counterpartMode,
      initialRoster,
      generatedPersonByRole,
      seed,
    });
    const placeSelection = choosePlace(worldSpec, normalizedPlaceAffordances, {
      seed,
      placeCounts,
      counterpartRole: counterpart?.roleRef ?? null,
      previouslySelectedPlace: previousPlace,
    });
    previousPlace = placeSelection.place.placeId;
    const time = chooseInstant(plan.window, { timeZone, seed, weekdayCounts, daypartCounts });
    const occurredAt = new Date(time.instantMs).toISOString();
    const local = time.local;
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
      placeRef: placeSelection.place.placeId,
      placeKind: placeSelection.affordance.placeKind,
      selectionKind: opportunity.selectionKind,
      structureRef: opportunity.structureRef,
      counterpartMode: opportunity.counterpartMode,
      counterpart: counterpart === null ? null : structuredClone(counterpart),
      externalCounterpartRequired: opportunity.externalCounterpartRequired,
    }));
  }

  const distinctPlaces = new Set(envelopes.map((item) => item.placeRef));
  const generatedCounterparts = envelopes.filter((item) => item.counterpart?.origin === "historical_envelope");
  const externalRoles = new Set(generatedCounterparts.map((item) => item.counterpart.roleRef));
  const statistics = Object.freeze({
    episodeCount: envelopes.length,
    distinctPlaces: distinctPlaces.size,
    maxPlaceUse: Math.max(...placeCounts.values()),
    distinctStructures: new Set(envelopes.map((item) => item.structureRef).filter(Boolean)).size,
    maxStructureUse: structureCounts.size === 0 ? 0 : Math.max(...structureCounts.values()),
    worldEmergentCount: envelopes.filter((item) => item.selectionKind === "world_emergent").length,
    externalCounterpartOpportunityCount: generatedCounterparts.length,
    externalRoleVariety: externalRoles.size,
    generatedExternalPersonCount: new Set(generatedCounterparts.map((item) => item.counterpart.participantId)).size,
    maxWeekdayUse: Math.max(...weekdayCounts.values()),
    maxDaypartUse: Math.max(...daypartCounts.values()),
  });
  const minimumDistinct = Math.min(GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, worldSpec.places.length);
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
  const localAuthority = `For this episode only, the frozen local civil-time authority is ${envelope.localWeekday} ${envelope.localDate} at ${envelope.localTime} in IANA zone ${envelope.timeZone}. The frozen place is ${place.description} Do not narrate a conflicting weekday, daypart, or location.`;
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
  if (envelope.counterpart !== null && !episode.participantRefs.includes(envelope.counterpart.participantId)) fail(`episode ${episode.episodeId} omitted frozen historical-envelope counterpart`);
  if (envelope.counterpart?.introducedHere === true) {
    const introduction = episode.introducedParticipants.find((item) => item.provisionalPersonId === envelope.counterpart.participantId);
    if (!introduction || introduction.roleRef !== envelope.counterpart.roleRef || introduction.introducedAt !== envelope.occurredAt) {
      fail(`episode ${episode.episodeId} did not materialize frozen historical-envelope counterpart introduction`);
    }
  }
  const weekdays = mentionedWeekdays(episode.observableAction);
  if (weekdays.some((weekday) => weekday !== envelope.localWeekday)) fail(`episode ${episode.episodeId} narrates a weekday inconsistent with local civil time`);
  const allowed = allowedNarrativeDayparts(envelope.daypart);
  const dayparts = mentionedDayparts(episode.observableAction);
  if (dayparts.some((part) => !allowed.has(part))) fail(`episode ${episode.episodeId} narrates a daypart inconsistent with local civil time`);
  return episode;
}
