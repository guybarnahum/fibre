import {
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  GENESIS_HISTORICAL_ENVELOPE_VERSION,
  GENESIS_SPARSE_HISTORY_NOTICE,
  assertHistoricalEnvelopeRealized,
} from "./genesis-historical-envelope-v1.mjs";
import { assertGenesisEpisodePlaceConsistency } from "./genesis-publication-place-consistency.mjs";

const PLAN_KEYS = Object.freeze([
  "version",
  "threadId",
  "worldSpecId",
  "timeZone",
  "seedDomain",
  "sparseHistoryNotice",
  "envelopes",
  "statistics",
  "digest",
]);
const ENVELOPE_KEYS = Object.freeze([
  "envelopeVersion",
  "ordinal",
  "windowId",
  "occurredAt",
  "ageAtEvent",
  "timeZone",
  "localDate",
  "localTime",
  "localWeekday",
  "daypart",
  "placeRef",
  "placeKind",
  "selectionKind",
  "structureRef",
  "counterpartMode",
  "counterpart",
  "externalCounterpartRequired",
]);
const COUNTERPART_KEYS = Object.freeze([
  "participantId",
  "roleRef",
  "origin",
  "introducedHere",
]);

function fail(ErrorType, message) { throw new ErrorType(message); }
function exactKeys(name, value, keys, ErrorType) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(ErrorType, `${name} must contain exactly: ${expected.join(", ")}`);
  }
}
function nonEmpty(name, value, ErrorType) {
  if (typeof value !== "string" || value.trim() === "") fail(ErrorType, `${name} is required`);
  return value;
}
function iso(name, value, ErrorType) {
  nonEmpty(name, value, ErrorType);
  if (!Number.isFinite(Date.parse(value))) fail(ErrorType, `${name} must be an ISO timestamp`);
  return value;
}
function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
function maximumCount(values) {
  if (values.length === 0) return 0;
  return Math.max(...countBy(values).values());
}

export function genesisHistoricalEnvelopeStatistics(envelopes) {
  const structures = envelopes.map((item) => item.structureRef).filter(Boolean);
  const generatedCounterparts = envelopes.filter((item) => item.counterpart?.origin === "historical_envelope");
  const externalRoles = new Set(generatedCounterparts.map((item) => item.counterpart.roleRef));
  return Object.freeze({
    episodeCount: envelopes.length,
    distinctPlaces: new Set(envelopes.map((item) => item.placeRef)).size,
    maxPlaceUse: maximumCount(envelopes.map((item) => item.placeRef)),
    distinctStructures: new Set(structures).size,
    maxStructureUse: maximumCount(structures),
    worldEmergentCount: envelopes.filter((item) => item.selectionKind === "world_emergent").length,
    externalCounterpartOpportunityCount: generatedCounterparts.length,
    externalRoleVariety: externalRoles.size,
    generatedExternalPersonCount: new Set(generatedCounterparts.map((item) => item.counterpart.participantId)).size,
    maxWeekdayUse: maximumCount(envelopes.map((item) => item.localWeekday)),
    maxDaypartUse: maximumCount(envelopes.map((item) => item.daypart)),
  });
}

export function genesisHistoricalEnvelopePlanDigest({ threadId, worldSpecId, timeZone, seedDomain, envelopes }) {
  return `sha256:${sha256(canonicalJson({ threadId, worldSpecId, timeZone, seedDomain, envelopes }))}`;
}

function normalizeCounterpart(candidate, name, ErrorType) {
  if (candidate === null) return null;
  try { assertPlainObject(name, candidate); }
  catch (error) { fail(ErrorType, error.message); }
  exactKeys(name, candidate, COUNTERPART_KEYS, ErrorType);
  nonEmpty(`${name}.participantId`, candidate.participantId, ErrorType);
  nonEmpty(`${name}.roleRef`, candidate.roleRef, ErrorType);
  if (!["initial_roster", "historical_envelope"].includes(candidate.origin)) {
    fail(ErrorType, `${name}.origin is invalid`);
  }
  if (typeof candidate.introducedHere !== "boolean") fail(ErrorType, `${name}.introducedHere must be boolean`);
  return structuredClone(candidate);
}

function normalizeEnvelope(candidate, index, planTimeZone, ErrorType) {
  const name = `historicalEnvelopePlan.envelopes[${index}]`;
  try { assertPlainObject(name, candidate); }
  catch (error) { fail(ErrorType, error.message); }
  exactKeys(name, candidate, ENVELOPE_KEYS, ErrorType);
  if (candidate.envelopeVersion !== GENESIS_HISTORICAL_ENVELOPE_VERSION) {
    fail(ErrorType, `${name}.envelopeVersion is not current`);
  }
  if (!Number.isInteger(candidate.ordinal) || candidate.ordinal !== index + 1) {
    fail(ErrorType, `${name}.ordinal must equal ${index + 1}`);
  }
  nonEmpty(`${name}.windowId`, candidate.windowId, ErrorType);
  iso(`${name}.occurredAt`, candidate.occurredAt, ErrorType);
  if (!Number.isFinite(candidate.ageAtEvent) || candidate.ageAtEvent < 0) fail(ErrorType, `${name}.ageAtEvent is invalid`);
  if (candidate.timeZone !== planTimeZone) fail(ErrorType, `${name}.timeZone differs from plan timeZone`);
  nonEmpty(`${name}.localDate`, candidate.localDate, ErrorType);
  nonEmpty(`${name}.localTime`, candidate.localTime, ErrorType);
  nonEmpty(`${name}.localWeekday`, candidate.localWeekday, ErrorType);
  nonEmpty(`${name}.daypart`, candidate.daypart, ErrorType);
  nonEmpty(`${name}.placeRef`, candidate.placeRef, ErrorType);
  nonEmpty(`${name}.placeKind`, candidate.placeKind, ErrorType);
  if (!["offered_structure", "world_emergent"].includes(candidate.selectionKind)) {
    fail(ErrorType, `${name}.selectionKind is invalid`);
  }
  if (candidate.structureRef !== null) nonEmpty(`${name}.structureRef`, candidate.structureRef, ErrorType);
  if (candidate.counterpartMode !== null && !["present_required", "present_optional", "known_required"].includes(candidate.counterpartMode)) {
    fail(ErrorType, `${name}.counterpartMode is invalid`);
  }
  const counterpart = normalizeCounterpart(candidate.counterpart, `${name}.counterpart`, ErrorType);
  if (typeof candidate.externalCounterpartRequired !== "boolean") {
    fail(ErrorType, `${name}.externalCounterpartRequired must be boolean`);
  }
  if (candidate.selectionKind === "world_emergent" && candidate.structureRef !== null) {
    fail(ErrorType, `${name} world-emergent envelope cannot name a structure`);
  }
  return Object.freeze({ ...structuredClone(candidate), counterpart });
}

export function normalizeGenesisHistoricalEnvelopePlan(candidate, ErrorType = TypeError) {
  const name = "historicalEnvelopePlan";
  try { assertPlainObject(name, candidate); }
  catch (error) { fail(ErrorType, error.message); }
  exactKeys(name, candidate, PLAN_KEYS, ErrorType);
  if (candidate.version !== GENESIS_HISTORICAL_ENVELOPE_VERSION) fail(ErrorType, `${name}.version is not current`);
  nonEmpty(`${name}.threadId`, candidate.threadId, ErrorType);
  nonEmpty(`${name}.worldSpecId`, candidate.worldSpecId, ErrorType);
  nonEmpty(`${name}.timeZone`, candidate.timeZone, ErrorType);
  nonEmpty(`${name}.seedDomain`, candidate.seedDomain, ErrorType);
  if (candidate.sparseHistoryNotice !== GENESIS_SPARSE_HISTORY_NOTICE) {
    fail(ErrorType, `${name}.sparseHistoryNotice is not current`);
  }
  if (!Array.isArray(candidate.envelopes) || candidate.envelopes.length === 0) {
    fail(ErrorType, `${name}.envelopes must be non-empty`);
  }
  const envelopes = candidate.envelopes.map((envelope, index) =>
    normalizeEnvelope(envelope, index, candidate.timeZone, ErrorType));
  for (let index = 1; index < envelopes.length; index += 1) {
    if (Date.parse(envelopes[index].occurredAt) <= Date.parse(envelopes[index - 1].occurredAt)) {
      fail(ErrorType, `${name}.envelopes must advance chronology`);
    }
  }
  const statistics = genesisHistoricalEnvelopeStatistics(envelopes);
  if (canonicalJson(candidate.statistics) !== canonicalJson(statistics)) {
    fail(ErrorType, `${name}.statistics do not match envelopes`);
  }
  const digest = genesisHistoricalEnvelopePlanDigest({
    threadId: candidate.threadId,
    worldSpecId: candidate.worldSpecId,
    timeZone: candidate.timeZone,
    seedDomain: candidate.seedDomain,
    envelopes,
  });
  if (candidate.digest !== digest) fail(ErrorType, `${name}.digest does not match its deterministic envelope content`);
  return Object.freeze({
    version: candidate.version,
    threadId: candidate.threadId,
    worldSpecId: candidate.worldSpecId,
    timeZone: candidate.timeZone,
    seedDomain: candidate.seedDomain,
    sparseHistoryNotice: candidate.sparseHistoryNotice,
    envelopes: Object.freeze(envelopes),
    statistics,
    digest,
  });
}

export function assertGenesisHistoricalEnvelopePublication({
  manifest,
  episodes,
  historicalEnvelopePlan,
  ErrorType = TypeError,
} = {}) {
  if (!manifest || typeof manifest !== "object") fail(ErrorType, "historical-envelope publication requires manifest");
  if (!Array.isArray(episodes) || episodes.length === 0) fail(ErrorType, "historical-envelope publication requires life episodes");
  const plan = normalizeGenesisHistoricalEnvelopePlan(historicalEnvelopePlan, ErrorType);
  if (plan.threadId !== manifest.threadId) fail(ErrorType, "historical-envelope plan belongs to another Thread");
  if (plan.worldSpecId !== manifest.worldSpecRef) fail(ErrorType, "historical-envelope plan belongs to another WorldSpec");
  if (plan.envelopes.length !== episodes.length) fail(ErrorType, "historical-envelope plan does not align one-to-one with published episodes");
  for (let index = 0; index < episodes.length; index += 1) {
    const episode = episodes[index];
    const envelope = plan.envelopes[index];
    try { assertHistoricalEnvelopeRealized(episode, envelope); }
    catch (error) { fail(ErrorType, error.message); }
    assertGenesisEpisodePlaceConsistency({ episode, envelope, ErrorType });
  }
  return plan;
}
