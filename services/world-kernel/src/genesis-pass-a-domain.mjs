import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { normalizeGenesisWorldSpec } from "./genesis-domain.mjs";

export const GENESIS_PASS_A_INPUT_VERSION = "genesis-pass-a-input-v1";
export const GENESIS_EVENT_STRUCTURE_POLICY_VERSION = "genesis-event-structure-pool-v1";
export const GENESIS_PASS_A_POLICY = Object.freeze({
  version: "genesis-pass-a-policy-v1",
  defaultStructuresPerWindow: 9,
  minimumLowConsequenceFraction: 0.4,
  maxObservableActionBytes: 1200,
  maxGeneratedVersionsPerRecord: 3,
});

const CONSEQUENCE_CLASSES = Object.freeze(["low", "moderate", "formative_capable"]);
const INTERIORITY_FORM_PATTERNS = Object.freeze([
  /\blearned that\b/i,
  /\bfrom then on\b/i,
  /\bwhich made (?:her|him|them)\b/i,
  /\bcame to understand\b/i,
]);
const FORBIDDEN_PASS_A_KEYS = new Set([
  "genome",
  "genomeRef",
  "loci",
  "parentLoci",
  "ancestorLoci",
  "rememberedMeaning",
  "rememberedMeanings",
  "futureRole",
  "futureProfession",
  "futureRequest",
  "benchmark",
  "desiredAdultConclusion",
  "sourceBundleRefs",
  "sourceInstanceIdentity",
  "worldAuthorship",
  "sourcesConsulted",
  "instantiationWitnesses",
  "sourceDerivation",
]);
const PROJECTED_WORLD_KEYS = Object.freeze([
  "worldSpecId",
  "timeFrame",
  "places",
  "householdShape",
  "familyRelations",
  "languages",
  "materialCircumstances",
  "mobilityPattern",
  "schoolingOrCommunityContext",
  "culturalContext",
  "availableInstitutions",
  "intellectualEnvironment",
  "affordedRoles",
]);
const OFFERED_STRUCTURE_KEYS = Object.freeze([
  "structureId",
  "abstractSituation",
  "participatingRoles",
  "developmentalRange",
  "consequenceClass",
]);

export class GenesisPassAValidationError extends Error {
  constructor(gate, message, { record = null } = {}) {
    super(message);
    this.name = "GenesisPassAValidationError";
    this.code = "GENESIS_PASS_A_VALIDATION_ERROR";
    this.gate = gate;
    this.record = record === null ? null : structuredClone(record);
  }
}

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function normalizeRange(name, candidate) {
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["minAge", "maxAge"]);
  assertFiniteNumber(`${name}.minAge`, candidate.minAge, { minimum: 0 });
  assertFiniteNumber(`${name}.maxAge`, candidate.maxAge, { minimum: 0 });
  if (candidate.maxAge < candidate.minAge) throw new TypeError(`${name} moves backwards`);
  return { minAge: candidate.minAge, maxAge: candidate.maxAge };
}

function normalizeInstantiationWitness(candidate, index) {
  const name = `eventStructure.instantiationWitnesses[${index}]`;
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["era", "economy", "culture", "instantiation"]);
  assertNonEmpty(`${name}.era`, candidate.era);
  assertNonEmpty(`${name}.economy`, candidate.economy);
  assertNonEmpty(`${name}.culture`, candidate.culture);
  assertNonEmpty(`${name}.instantiation`, candidate.instantiation);
  return structuredClone(candidate);
}

function normalizeEventStructureCore(candidate) {
  assertPlainObject("eventStructure", candidate);
  assertExactKeys("eventStructure", candidate, [
    "structureId",
    "abstractSituation",
    "participatingRoles",
    "developmentalRange",
    "consequenceClass",
    "instantiationWitnesses",
    "sourceDerivation",
  ]);
  assertId("eventStructure.structureId", candidate.structureId);
  assertNonEmpty("eventStructure.abstractSituation", candidate.abstractSituation);
  assertStringArray("eventStructure.participatingRoles", candidate.participatingRoles);
  const developmentalRange = normalizeRange("eventStructure.developmentalRange", candidate.developmentalRange);
  assertEnum("eventStructure.consequenceClass", candidate.consequenceClass, CONSEQUENCE_CLASSES);
  if (!Array.isArray(candidate.instantiationWitnesses) || candidate.instantiationWitnesses.length < 3) {
    throw new TypeError("eventStructure.instantiationWitnesses must contain at least three relocation witnesses");
  }
  const instantiationWitnesses = candidate.instantiationWitnesses.map(normalizeInstantiationWitness);
  for (const field of ["era", "economy", "culture"]) {
    if (new Set(instantiationWitnesses.map((witness) => witness[field])).size < 3) {
      throw new TypeError(`eventStructure.instantiationWitnesses must span at least three distinct ${field} values`);
    }
  }
  assertNonEmpty("eventStructure.sourceDerivation", candidate.sourceDerivation);
  return {
    structureId: candidate.structureId,
    abstractSituation: candidate.abstractSituation,
    participatingRoles: [...candidate.participatingRoles],
    developmentalRange,
    consequenceClass: candidate.consequenceClass,
    instantiationWitnesses,
    sourceDerivation: candidate.sourceDerivation,
  };
}

export function eventStructureDigest(candidate) {
  const source = Object.hasOwn(candidate, "digest") ? (({ digest: _ignored, ...rest }) => rest)(candidate) : candidate;
  return digest(normalizeEventStructureCore(source));
}

export function createEventStructure(candidateWithoutDigest) {
  const core = normalizeEventStructureCore(candidateWithoutDigest);
  return Object.freeze({ ...core, digest: digest(core) });
}

export function normalizeEventStructure(candidate) {
  assertPlainObject("eventStructure", candidate);
  assertExactKeys("eventStructure", candidate, [
    "structureId",
    "abstractSituation",
    "participatingRoles",
    "developmentalRange",
    "consequenceClass",
    "instantiationWitnesses",
    "sourceDerivation",
    "digest",
  ]);
  assertNonEmpty("eventStructure.digest", candidate.digest);
  const core = normalizeEventStructureCore({
    structureId: candidate.structureId,
    abstractSituation: candidate.abstractSituation,
    participatingRoles: candidate.participatingRoles,
    developmentalRange: candidate.developmentalRange,
    consequenceClass: candidate.consequenceClass,
    instantiationWitnesses: candidate.instantiationWitnesses,
    sourceDerivation: candidate.sourceDerivation,
  });
  const expected = digest(core);
  if (candidate.digest !== expected) throw new TypeError(`eventStructure ${candidate.structureId} digest mismatch`);
  return structuredClone({ ...core, digest: expected });
}

export function eventStructurePoolDigest(pool) {
  if (!Array.isArray(pool) || pool.length === 0) throw new TypeError("event structure pool must be non-empty");
  const normalized = pool.map(normalizeEventStructure);
  const ids = normalized.map((item) => item.structureId);
  if (new Set(ids).size !== ids.length) throw new TypeError("event structure pool contains duplicate structure IDs");
  return digest({ policyVersion: GENESIS_EVENT_STRUCTURE_POLICY_VERSION, structures: normalized });
}

function overlapsRange(structure, range) {
  return structure.developmentalRange.minAge <= range.maxAge && structure.developmentalRange.maxAge >= range.minAge;
}

function ranked(seed, structures) {
  return [...structures]
    .map((structure) => ({ structure, rank: sha256(canonicalJson({ seed, structureId: structure.structureId })) }))
    .sort((a, b) => a.rank.localeCompare(b.rank) || a.structure.structureId.localeCompare(b.structure.structureId))
    .map(({ structure }) => structure);
}

export function sampleEventStructures(pool, developmentalRange, {
  seed,
  count = GENESIS_PASS_A_POLICY.defaultStructuresPerWindow,
} = {}) {
  assertNonEmpty("event structure sampling seed", seed);
  const range = normalizeRange("developmentalRange", {
    minAge: developmentalRange.minAge,
    maxAge: developmentalRange.maxAge,
  });
  assertFiniteNumber("event structure sample count", count, { integer: true, minimum: 1 });
  if (count < 8 || count > 10) throw new TypeError("development event-structure sample count must remain within the 8-10 Slice-C default range");
  const eligible = pool.map(normalizeEventStructure).filter((structure) => overlapsRange(structure, range));
  if (eligible.length < count) throw new TypeError(`event structure pool has only ${eligible.length} eligible structures for a ${count}-structure offer`);
  const requiredLow = Math.ceil(count * GENESIS_PASS_A_POLICY.minimumLowConsequenceFraction);
  const low = ranked(`${seed}:low`, eligible.filter((structure) => structure.consequenceClass === "low"));
  if (low.length < requiredLow) throw new TypeError(`event structure pool has only ${low.length} eligible low-consequence structures; ${requiredLow} required`);
  const selected = [...low.slice(0, requiredLow)];
  const selectedIds = new Set(selected.map((structure) => structure.structureId));
  const remainder = ranked(`${seed}:rest`, eligible.filter((structure) => !selectedIds.has(structure.structureId)));
  selected.push(...remainder.slice(0, count - selected.length));
  return selected;
}

function normalizeOfferedStructure(candidate, index = 0) {
  const name = `passA.offeredStructures[${index}]`;
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, OFFERED_STRUCTURE_KEYS);
  assertId(`${name}.structureId`, candidate.structureId);
  assertNonEmpty(`${name}.abstractSituation`, candidate.abstractSituation);
  assertStringArray(`${name}.participatingRoles`, candidate.participatingRoles);
  const developmentalRange = normalizeRange(`${name}.developmentalRange`, candidate.developmentalRange);
  assertEnum(`${name}.consequenceClass`, candidate.consequenceClass, CONSEQUENCE_CLASSES);
  return {
    structureId: candidate.structureId,
    abstractSituation: candidate.abstractSituation,
    participatingRoles: [...candidate.participatingRoles],
    developmentalRange,
    consequenceClass: candidate.consequenceClass,
  };
}

export function projectEventStructureForPassA(candidate) {
  const structure = normalizeEventStructure(candidate);
  return normalizeOfferedStructure({
    structureId: structure.structureId,
    abstractSituation: structure.abstractSituation,
    participatingRoles: structure.participatingRoles,
    developmentalRange: structure.developmentalRange,
    consequenceClass: structure.consequenceClass,
  });
}

function normalizeProjectedWorld(candidate) {
  assertPlainObject("passA.world", candidate);
  assertExactKeys("passA.world", candidate, PROJECTED_WORLD_KEYS);
  assertId("passA.world.worldSpecId", candidate.worldSpecId);
  assertPlainObject("passA.world.timeFrame", candidate.timeFrame);
  assertExactKeys("passA.world.timeFrame", candidate.timeFrame, ["startAt", "endAt"]);
  assertIsoTimestamp("passA.world.timeFrame.startAt", candidate.timeFrame.startAt);
  assertIsoTimestamp("passA.world.timeFrame.endAt", candidate.timeFrame.endAt);
  if (Date.parse(candidate.timeFrame.endAt) < Date.parse(candidate.timeFrame.startAt)) throw new TypeError("passA.world.timeFrame moves backwards");
  if (!Array.isArray(candidate.places) || candidate.places.length === 0) throw new TypeError("passA.world.places must be non-empty");
  const places = candidate.places.map((place, index) => {
    const name = `passA.world.places[${index}]`;
    assertPlainObject(name, place);
    assertExactKeys(name, place, ["placeId", "description"]);
    assertId(`${name}.placeId`, place.placeId);
    assertNonEmpty(`${name}.description`, place.description);
    return structuredClone(place);
  });
  assertNonEmpty("passA.world.householdShape", candidate.householdShape);
  assertStringArray("passA.world.familyRelations", candidate.familyRelations);
  assertStringArray("passA.world.languages", candidate.languages);
  assertNonEmpty("passA.world.materialCircumstances", candidate.materialCircumstances);
  assertNonEmpty("passA.world.mobilityPattern", candidate.mobilityPattern);
  assertNonEmpty("passA.world.schoolingOrCommunityContext", candidate.schoolingOrCommunityContext);
  assertNonEmpty("passA.world.culturalContext", candidate.culturalContext);
  assertStringArray("passA.world.availableInstitutions", candidate.availableInstitutions);
  assertNonEmpty("passA.world.intellectualEnvironment", candidate.intellectualEnvironment);
  assertStringArray("passA.world.affordedRoles", candidate.affordedRoles);
  return structuredClone({ ...candidate, places });
}

export function projectWorldSpecForPassA(candidate) {
  const world = normalizeGenesisWorldSpec(candidate);
  return normalizeProjectedWorld({
    worldSpecId: world.worldSpecId,
    timeFrame: world.timeFrame,
    places: world.places,
    householdShape: world.householdShape,
    familyRelations: world.familyRelations,
    languages: world.languages,
    materialCircumstances: world.materialCircumstances,
    mobilityPattern: world.mobilityPattern,
    schoolingOrCommunityContext: world.schoolingOrCommunityContext,
    culturalContext: world.culturalContext,
    availableInstitutions: world.availableInstitutions,
    intellectualEnvironment: world.intellectualEnvironment,
    affordedRoles: world.affordedRoles,
  });
}

function normalizeSubject(candidate) {
  assertPlainObject("passA.subject", candidate);
  assertExactKeys("passA.subject", candidate, ["provisionalThreadId", "bornAt"]);
  assertId("passA.subject.provisionalThreadId", candidate.provisionalThreadId);
  assertIsoTimestamp("passA.subject.bornAt", candidate.bornAt);
  return structuredClone(candidate);
}

function normalizeDevelopmentalWindow(candidate) {
  assertPlainObject("passA.developmentalWindow", candidate);
  assertExactKeys("passA.developmentalWindow", candidate, ["windowId", "startAt", "endAt", "minAge", "maxAge"]);
  assertId("passA.developmentalWindow.windowId", candidate.windowId);
  assertIsoTimestamp("passA.developmentalWindow.startAt", candidate.startAt);
  assertIsoTimestamp("passA.developmentalWindow.endAt", candidate.endAt);
  if (Date.parse(candidate.endAt) < Date.parse(candidate.startAt)) throw new TypeError("passA.developmentalWindow moves backwards");
  const range = normalizeRange("passA.developmentalWindow.range", { minAge: candidate.minAge, maxAge: candidate.maxAge });
  return { ...structuredClone(candidate), ...range };
}

function normalizeRosterParticipant(candidate, index) {
  const name = `passA.initialRoster[${index}]`;
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["participantId", "factualRoles", "relationshipFacts"]);
  assertId(`${name}.participantId`, candidate.participantId);
  assertStringArray(`${name}.factualRoles`, candidate.factualRoles);
  assertStringArray(`${name}.relationshipFacts`, candidate.relationshipFacts);
  return structuredClone(candidate);
}

function normalizeIntroducedParticipant(candidate, index, prefix = "passA.previouslyIntroducedParticipants") {
  const name = `${prefix}[${index}]`;
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["provisionalPersonId", "roleRef", "introducedAt"]);
  assertId(`${name}.provisionalPersonId`, candidate.provisionalPersonId);
  assertId(`${name}.roleRef`, candidate.roleRef);
  assertIsoTimestamp(`${name}.introducedAt`, candidate.introducedAt);
  return structuredClone(candidate);
}

function normalizePolicyWitness(candidate) {
  assertPlainObject("passA.policyWitness", candidate);
  assertExactKeys("passA.policyWitness", candidate, ["policyVersion", "eventStructurePoolDigest", "offerSelectionDigest"]);
  assertNonEmpty("passA.policyWitness.policyVersion", candidate.policyVersion);
  assertNonEmpty("passA.policyWitness.eventStructurePoolDigest", candidate.eventStructurePoolDigest);
  assertNonEmpty("passA.policyWitness.offerSelectionDigest", candidate.offerSelectionDigest);
  return structuredClone(candidate);
}

function utf8Bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function interiorityPattern(value) {
  return INTERIORITY_FORM_PATTERNS.find((pattern) => pattern.test(value)) ?? null;
}

function normalizePassAEpisodeShape(candidate) {
  assertPlainObject("passA.episode", candidate);
  assertExactKeys("passA.episode", candidate, [
    "episodeId",
    "occurredAt",
    "ageAtEvent",
    "placeRef",
    "participantRefs",
    "observableAction",
    "structureRef",
    "introducedParticipants",
  ]);
  assertId("passA.episode.episodeId", candidate.episodeId);
  assertIsoTimestamp("passA.episode.occurredAt", candidate.occurredAt);
  assertFiniteNumber("passA.episode.ageAtEvent", candidate.ageAtEvent, { minimum: 0 });
  assertId("passA.episode.placeRef", candidate.placeRef);
  assertStringArray("passA.episode.participantRefs", candidate.participantRefs);
  assertNonEmpty("passA.episode.observableAction", candidate.observableAction);
  if (candidate.structureRef !== null) assertId("passA.episode.structureRef", candidate.structureRef);
  if (!Array.isArray(candidate.introducedParticipants)) throw new TypeError("passA.episode.introducedParticipants must be an array");
  const introducedParticipants = candidate.introducedParticipants.map((item, index) => normalizeIntroducedParticipant(item, index, "passA.episode.introducedParticipants"));
  return structuredClone({ ...candidate, participantRefs: [...candidate.participantRefs], introducedParticipants });
}

export function normalizePassAEpisode(candidate, { enforceObservableForm = true } = {}) {
  let episode;
  try {
    episode = normalizePassAEpisodeShape(candidate);
  } catch (error) {
    throw new GenesisPassAValidationError("pass_a_output_schema", error.message, { record: candidate });
  }
  if (!enforceObservableForm) return episode;
  if (utf8Bytes(episode.observableAction) > GENESIS_PASS_A_POLICY.maxObservableActionBytes) {
    throw new GenesisPassAValidationError(
      "pass_a_observable_action_bounds",
      `observableAction exceeds ${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes`,
      { record: episode },
    );
  }
  const pattern = interiorityPattern(episode.observableAction);
  if (pattern !== null) {
    throw new GenesisPassAValidationError(
      "pass_a_interiority_form",
      `observableAction contains forbidden Pass-A interpretation form ${pattern}`,
      { record: episode },
    );
  }
  return episode;
}

function assertNoForbiddenKeys(value, path = "passA.input") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_PASS_A_KEYS.has(key)) {
      throw new GenesisPassAValidationError("pass_a_forbidden_input", `${path}.${key} is structurally forbidden from Pass A`);
    }
    assertNoForbiddenKeys(item, `${path}.${key}`);
  }
}

function assertTimeBoundary({ subject, world, developmentalWindow, chronologyEndsAt }) {
  assertIsoTimestamp("passA.chronologyEndsAt", chronologyEndsAt);
  const chronologyMs = Date.parse(chronologyEndsAt);
  if (chronologyMs < Date.parse(developmentalWindow.startAt)) throw new TypeError("passA.chronologyEndsAt predates developmental window");
  if (chronologyMs > Date.parse(developmentalWindow.endAt)) throw new TypeError("passA.chronologyEndsAt exceeds developmental window");
  if (chronologyMs > Date.parse(world.timeFrame.endAt)) throw new TypeError("passA.chronologyEndsAt exceeds WorldSpec timeframe");
  if (Date.parse(developmentalWindow.startAt) < Date.parse(world.timeFrame.startAt)) throw new TypeError("passA developmental window predates WorldSpec timeframe");
  if (Date.parse(subject.bornAt) > Date.parse(developmentalWindow.startAt)) throw new TypeError("passA developmental window starts before the subject is born");
}

export function assertPassAInputBoundary(candidate) {
  assertPlainObject("passA.input", candidate);
  assertExactKeys("passA.input", candidate, [
    "inputVersion",
    "subject",
    "world",
    "developmentalWindow",
    "chronologyEndsAt",
    "initialRoster",
    "priorEpisodes",
    "previouslyIntroducedParticipants",
    "offeredStructures",
    "policyWitness",
  ]);
  if (candidate.inputVersion !== GENESIS_PASS_A_INPUT_VERSION) throw new TypeError("passA.inputVersion is invalid");
  assertNoForbiddenKeys(candidate);
  const subject = normalizeSubject(candidate.subject);
  const world = normalizeProjectedWorld(candidate.world);
  const developmentalWindow = normalizeDevelopmentalWindow(candidate.developmentalWindow);
  assertTimeBoundary({ subject, world, developmentalWindow, chronologyEndsAt: candidate.chronologyEndsAt });
  if (!Array.isArray(candidate.initialRoster) || candidate.initialRoster.length === 0) throw new TypeError("passA.initialRoster must be a non-empty array");
  const initialRoster = candidate.initialRoster.map(normalizeRosterParticipant);
  const rosterIds = initialRoster.map(({ participantId }) => participantId);
  if (new Set(rosterIds).size !== rosterIds.length) throw new TypeError("passA.initialRoster contains duplicate participant IDs");
  if (!rosterIds.includes(subject.provisionalThreadId)) throw new TypeError("passA.initialRoster must contain the provisional Thread as a participant");
  if (!Array.isArray(candidate.priorEpisodes)) throw new TypeError("passA.priorEpisodes must be an array");
  const priorEpisodes = candidate.priorEpisodes.map((episode) => normalizePassAEpisode(episode));
  for (let index = 1; index < priorEpisodes.length; index += 1) {
    if (Date.parse(priorEpisodes[index].occurredAt) <= Date.parse(priorEpisodes[index - 1].occurredAt)) throw new TypeError("passA.priorEpisodes must be strictly chronological");
  }
  if (!Array.isArray(candidate.previouslyIntroducedParticipants)) throw new TypeError("passA.previouslyIntroducedParticipants must be an array");
  const previouslyIntroducedParticipants = candidate.previouslyIntroducedParticipants.map(normalizeIntroducedParticipant);
  const previousIds = previouslyIntroducedParticipants.map(({ provisionalPersonId }) => provisionalPersonId);
  if (new Set(previousIds).size !== previousIds.length) throw new TypeError("passA.previouslyIntroducedParticipants contains duplicate IDs");
  if (previousIds.some((id) => rosterIds.includes(id))) throw new TypeError("passA previously introduced participant collides with initial roster");
  if (!Array.isArray(candidate.offeredStructures) || candidate.offeredStructures.length < 8 || candidate.offeredStructures.length > 10) {
    throw new TypeError("passA.offeredStructures must contain 8-10 structures in Slice C");
  }
  const offeredStructures = candidate.offeredStructures.map(normalizeOfferedStructure);
  const offeredIds = offeredStructures.map(({ structureId }) => structureId);
  if (new Set(offeredIds).size !== offeredIds.length) throw new TypeError("passA.offeredStructures contains duplicate IDs");
  const lowCount = offeredStructures.filter(({ consequenceClass }) => consequenceClass === "low").length;
  if (lowCount / offeredStructures.length < GENESIS_PASS_A_POLICY.minimumLowConsequenceFraction) throw new TypeError("passA offered structure distribution falls below the 40% low-consequence floor");
  const policyWitness = normalizePolicyWitness(candidate.policyWitness);
  return structuredClone({
    inputVersion: candidate.inputVersion,
    subject,
    world,
    developmentalWindow,
    chronologyEndsAt: candidate.chronologyEndsAt,
    initialRoster,
    priorEpisodes,
    previouslyIntroducedParticipants,
    offeredStructures,
    policyWitness,
  });
}

export function passAInputDigest(candidate) {
  return digest(assertPassAInputBoundary(candidate));
}

export function buildPassAInput({
  worldSpec,
  subject,
  developmentalWindow,
  chronologyEndsAt,
  initialRoster,
  priorEpisodes = [],
  previouslyIntroducedParticipants = [],
  eventStructurePool,
  offeredStructures,
}) {
  const world = projectWorldSpecForPassA(worldSpec);
  const normalizedOffered = offeredStructures.map(normalizeEventStructure);
  const poolDigest = eventStructurePoolDigest(eventStructurePool);
  const poolIds = new Set(eventStructurePool.map((item) => normalizeEventStructure(item).structureId));
  for (const structure of normalizedOffered) {
    if (!poolIds.has(structure.structureId)) throw new TypeError(`offered structure ${structure.structureId} is not in the EventStructurePool`);
    if (!overlapsRange(structure, developmentalWindow)) throw new TypeError(`offered structure ${structure.structureId} is outside the developmental window`);
  }
  const offeredProjection = normalizedOffered.map(projectEventStructureForPassA);
  const input = {
    inputVersion: GENESIS_PASS_A_INPUT_VERSION,
    subject: structuredClone(subject),
    world,
    developmentalWindow: structuredClone(developmentalWindow),
    chronologyEndsAt,
    initialRoster: structuredClone(initialRoster),
    priorEpisodes: structuredClone(priorEpisodes),
    previouslyIntroducedParticipants: structuredClone(previouslyIntroducedParticipants),
    offeredStructures: offeredProjection,
    policyWitness: {
      policyVersion: GENESIS_PASS_A_POLICY.version,
      eventStructurePoolDigest: poolDigest,
      offerSelectionDigest: digest(offeredProjection),
    },
  };
  return assertPassAInputBoundary(input);
}

function knownParticipantIds(input, episode) {
  return new Set([
    ...input.initialRoster.map((item) => item.participantId),
    ...input.previouslyIntroducedParticipants.map((item) => item.provisionalPersonId),
    ...episode.introducedParticipants.map((item) => item.provisionalPersonId),
  ]);
}

export function validatePassAEpisode(candidate, inputCandidate) {
  const input = assertPassAInputBoundary(inputCandidate);
  const episode = normalizePassAEpisode(candidate);
  const occurredMs = Date.parse(episode.occurredAt);
  const window = input.developmentalWindow;
  if (occurredMs < Date.parse(window.startAt) || occurredMs > Date.parse(window.endAt) || occurredMs > Date.parse(input.chronologyEndsAt)) {
    throw new GenesisPassAValidationError("pass_a_chronology", "episode falls outside the admitted developmental chronology", { record: episode });
  }
  if (episode.ageAtEvent < window.minAge || episode.ageAtEvent > window.maxAge) {
    throw new GenesisPassAValidationError("pass_a_chronology", "episode age falls outside the developmental window", { record: episode });
  }
  const priorLatest = input.priorEpisodes.at(-1);
  if (priorLatest !== undefined && occurredMs <= Date.parse(priorLatest.occurredAt)) {
    throw new GenesisPassAValidationError("pass_a_chronology", "episode does not advance candidate chronology", { record: episode });
  }
  const placeIds = new Set(input.world.places.map((place) => place.placeId));
  if (!placeIds.has(episode.placeRef)) {
    throw new GenesisPassAValidationError("pass_a_place_ref", `episode place ${episode.placeRef} is not afforded by the WorldSpec`, { record: episode });
  }
  const known = knownParticipantIds(input, episode);
  for (const participantRef of episode.participantRefs) {
    if (!known.has(participantRef)) {
      throw new GenesisPassAValidationError("pass_a_participant_ref", `participant ${participantRef} is neither pre-existing nor validly introduced`, { record: episode });
    }
  }
  const existing = new Set([
    ...input.initialRoster.map((item) => item.participantId),
    ...input.previouslyIntroducedParticipants.map((item) => item.provisionalPersonId),
  ]);
  const introducedIds = new Set();
  const affordedRoles = new Set(input.world.affordedRoles);
  for (const introduced of episode.introducedParticipants) {
    if (existing.has(introduced.provisionalPersonId) || introducedIds.has(introduced.provisionalPersonId)) {
      throw new GenesisPassAValidationError("pass_a_participant_introduction", `introduced participant ${introduced.provisionalPersonId} is not new`, { record: episode });
    }
    introducedIds.add(introduced.provisionalPersonId);
    if (!affordedRoles.has(introduced.roleRef)) {
      throw new GenesisPassAValidationError("pass_a_participant_introduction", `role ${introduced.roleRef} is not afforded by the WorldSpec`, { record: episode });
    }
    if (introduced.introducedAt !== episode.occurredAt) {
      throw new GenesisPassAValidationError("pass_a_participant_introduction", "same-episode participant introduction must use the episode occurredAt", { record: episode });
    }
    if (!episode.participantRefs.includes(introduced.provisionalPersonId)) {
      throw new GenesisPassAValidationError("pass_a_participant_introduction", `introduced participant ${introduced.provisionalPersonId} is not used by the episode`, { record: episode });
    }
  }
  if (episode.structureRef !== null) {
    const offered = input.offeredStructures.find((structure) => structure.structureId === episode.structureRef);
    if (offered === undefined) {
      throw new GenesisPassAValidationError("pass_a_structure_ref", `episode structure ${episode.structureRef} was not offered to Pass A`, { record: episode });
    }
    if (episode.ageAtEvent < offered.developmentalRange.minAge || episode.ageAtEvent > offered.developmentalRange.maxAge) {
      throw new GenesisPassAValidationError("pass_a_structure_ref", `episode structure ${episode.structureRef} is outside its developmental range`, { record: episode });
    }
  }
  return episode;
}

export function passAEpisodeOutputDigest(candidate) {
  return digest(normalizePassAEpisode(candidate));
}

export function assertRepairPreservesEpisodeFacts(previousCandidate, repairedCandidate) {
  const previous = normalizePassAEpisode(previousCandidate, { enforceObservableForm: false });
  const repaired = normalizePassAEpisode(repairedCandidate, { enforceObservableForm: false });
  const facts = (episode) => ({
    episodeId: episode.episodeId,
    occurredAt: episode.occurredAt,
    ageAtEvent: episode.ageAtEvent,
    placeRef: episode.placeRef,
    participantRefs: episode.participantRefs,
    structureRef: episode.structureRef,
    introducedParticipants: episode.introducedParticipants,
  });
  if (canonicalJson(facts(previous)) !== canonicalJson(facts(repaired))) {
    throw new GenesisPassAValidationError("pass_a_record_repair_changed_facts", "Pass-A form repair changed event facts instead of repairing only observableAction", { record: repaired });
  }
  return repaired;
}

export const GENESIS_PASS_A_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["episode"],
  properties: {
    episode: {
      type: "object",
      additionalProperties: false,
      required: [
        "episodeId",
        "occurredAt",
        "ageAtEvent",
        "placeRef",
        "participantRefs",
        "observableAction",
        "structureRef",
        "introducedParticipants",
      ],
      properties: {
        episodeId: { type: "string" },
        occurredAt: { type: "string" },
        ageAtEvent: { type: "number" },
        placeRef: { type: "string" },
        participantRefs: { type: "array", items: { type: "string" } },
        observableAction: { type: "string" },
        structureRef: { type: ["string", "null"] },
        introducedParticipants: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["provisionalPersonId", "roleRef", "introducedAt"],
            properties: {
              provisionalPersonId: { type: "string" },
              roleRef: { type: "string" },
              introducedAt: { type: "string" },
            },
          },
        },
      },
    },
  },
});

export function passAFunnelMetrics(episodes, offeredStructures) {
  const normalizedEpisodes = episodes.map(normalizePassAEpisode);
  const offeredIds = offeredStructures.map((item) => item.structureId);
  const instantiated = [...new Set(normalizedEpisodes.map((episode) => episode.structureRef).filter((value) => value !== null))];
  return {
    historicalEvents: normalizedEpisodes.length,
    structuresOffered: offeredIds.length,
    structuresInstantiated: instantiated.length,
    episodesStructureGrounded: normalizedEpisodes.filter((episode) => episode.structureRef !== null).length,
    episodesWorldEmergent: normalizedEpisodes.filter((episode) => episode.structureRef === null).length,
  };
}
