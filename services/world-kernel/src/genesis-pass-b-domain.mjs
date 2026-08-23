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

export const GENESIS_PASS_B_INPUT_VERSION = "genesis-pass-b-input-v1";
export const GENESIS_PASS_B_POLICY = Object.freeze({
  version: "genesis-pass-b-policy-v1",
  maxRememberedContentBytes: 2048,
  maxUncertaintyItems: 8,
  maxUncertaintyItemBytes: 512,
});

export const PASS_B_FORMATION_MODES = Object.freeze(["life_only", "life_plus_genome"]);
export const PASS_B_ANALYSIS_STRATA = Object.freeze([
  "life_only_unexposed",
  "life_only_exposed",
  "life_plus_genome",
]);
export const PASS_B_GENOME_EXPOSURE_KINDS = Object.freeze(["whole_genome", "ordinal_first_k"]);

const WORLD_KEYS = Object.freeze([
  "worldSpecId", "timeFrame", "places", "householdShape", "familyRelations", "languages",
  "materialCircumstances", "mobilityPattern", "schoolingOrCommunityContext", "culturalContext",
  "availableInstitutions", "intellectualEnvironment", "affordedRoles",
]);
const HISTORY_EPISODE_KEYS = Object.freeze([
  "episodeId", "occurredAt", "ageAtEvent", "placeRef", "participantRefs",
  "observableAction", "introducedParticipants",
]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const utf8Bytes = (value) => Buffer.byteLength(value, "utf8");

function assertBoolean(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
}
function assertNullableId(name, value) {
  if (value !== null) assertId(name, value);
}

function normalizeTimeFrame(candidate) {
  assertPlainObject("passB.world.timeFrame", candidate);
  assertExactKeys("passB.world.timeFrame", candidate, ["startAt", "endAt"]);
  assertIsoTimestamp("passB.world.timeFrame.startAt", candidate.startAt);
  assertIsoTimestamp("passB.world.timeFrame.endAt", candidate.endAt);
  if (Date.parse(candidate.endAt) < Date.parse(candidate.startAt)) throw new TypeError("passB.world.timeFrame ends before it starts");
  return structuredClone(candidate);
}

function normalizePlace(candidate, index) {
  const path = `passB.world.places[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["placeId", "description"]);
  assertId(`${path}.placeId`, candidate.placeId);
  assertNonEmpty(`${path}.description`, candidate.description);
  return structuredClone(candidate);
}

export function normalizePassBWorld(candidate) {
  assertPlainObject("passB.world", candidate);
  assertExactKeys("passB.world", candidate, WORLD_KEYS);
  assertId("passB.world.worldSpecId", candidate.worldSpecId);
  if (!Array.isArray(candidate.places) || candidate.places.length === 0) throw new TypeError("passB.world.places must be a non-empty array");
  const places = candidate.places.map(normalizePlace);
  for (const key of ["householdShape", "materialCircumstances", "mobilityPattern", "schoolingOrCommunityContext", "culturalContext", "intellectualEnvironment"]) {
    assertNonEmpty(`passB.world.${key}`, candidate[key]);
  }
  for (const key of ["familyRelations", "languages", "availableInstitutions", "affordedRoles"]) assertStringArray(`passB.world.${key}`, candidate[key]);
  return structuredClone({ ...candidate, timeFrame: normalizeTimeFrame(candidate.timeFrame), places });
}

function normalizeIntroducedParticipant(candidate, path) {
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["participantId", "roleRef", "introducedAt"]);
  assertId(`${path}.participantId`, candidate.participantId);
  assertId(`${path}.roleRef`, candidate.roleRef);
  assertIsoTimestamp(`${path}.introducedAt`, candidate.introducedAt);
  return structuredClone(candidate);
}

export function normalizePassBHistoryEpisode(candidate, index = 0) {
  const path = `passB.history[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, HISTORY_EPISODE_KEYS);
  assertId(`${path}.episodeId`, candidate.episodeId);
  assertIsoTimestamp(`${path}.occurredAt`, candidate.occurredAt);
  assertFiniteNumber(`${path}.ageAtEvent`, candidate.ageAtEvent, { minimum: 0 });
  assertId(`${path}.placeRef`, candidate.placeRef);
  assertStringArray(`${path}.participantRefs`, candidate.participantRefs);
  assertNonEmpty(`${path}.observableAction`, candidate.observableAction);
  if (!Array.isArray(candidate.introducedParticipants)) throw new TypeError(`${path}.introducedParticipants must be an array`);
  return structuredClone({
    ...candidate,
    participantRefs: [...candidate.participantRefs],
    introducedParticipants: candidate.introducedParticipants.map((item, participantIndex) =>
      normalizeIntroducedParticipant(item, `${path}.introducedParticipants[${participantIndex}]`)),
  });
}

function normalizeCurrentUncertainty(candidate, path) {
  if (!Array.isArray(candidate)) throw new TypeError(`${path} must be an array`);
  if (candidate.length > GENESIS_PASS_B_POLICY.maxUncertaintyItems) throw new TypeError(`${path} exceeds ${GENESIS_PASS_B_POLICY.maxUncertaintyItems} items`);
  return candidate.map((item, index) => {
    assertNonEmpty(`${path}[${index}]`, item);
    if (utf8Bytes(item) > GENESIS_PASS_B_POLICY.maxUncertaintyItemBytes) throw new TypeError(`${path}[${index}] exceeds ${GENESIS_PASS_B_POLICY.maxUncertaintyItemBytes} UTF-8 bytes`);
    return item;
  });
}

function normalizePriorUncertainty(candidate, path) {
  if (!Array.isArray(candidate)) throw new TypeError(`${path} must be an array`);
  return candidate.map((item, index) => {
    assertNonEmpty(`${path}[${index}]`, item);
    return item;
  });
}

function normalizePriorMemory(candidate, index) {
  const path = `passB.priorMemories[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["memoryRef", "episodeRefs", "rememberedContent", "uncertainty", "formationMode"]);
  assertId(`${path}.memoryRef`, candidate.memoryRef);
  assertStringArray(`${path}.episodeRefs`, candidate.episodeRefs);
  if (candidate.episodeRefs.length === 0) throw new TypeError(`${path}.episodeRefs must not be empty`);
  // Prior candidate memory was already admitted by its writer. Re-check shape, not today's form policy.
  assertNonEmpty(`${path}.rememberedContent`, candidate.rememberedContent);
  if (!PASS_B_FORMATION_MODES.includes(candidate.formationMode)) throw new TypeError(`${path}.formationMode is invalid`);
  return structuredClone({
    ...candidate,
    episodeRefs: [...candidate.episodeRefs],
    uncertainty: normalizePriorUncertainty(candidate.uncertainty, `${path}.uncertainty`),
  });
}

function normalizeAssignment(candidate) {
  assertPlainObject("passB.assignment", candidate);
  assertExactKeys("passB.assignment", candidate, ["formationMode", "priorTreatmentMemoryExposure", "analysisStratum"]);
  if (!PASS_B_FORMATION_MODES.includes(candidate.formationMode)) throw new TypeError("passB.assignment.formationMode is invalid");
  assertBoolean("passB.assignment.priorTreatmentMemoryExposure", candidate.priorTreatmentMemoryExposure);
  if (!PASS_B_ANALYSIS_STRATA.includes(candidate.analysisStratum)) throw new TypeError("passB.assignment.analysisStratum is invalid");
  const expectedStratum = candidate.formationMode === "life_plus_genome"
    ? "life_plus_genome"
    : candidate.priorTreatmentMemoryExposure ? "life_only_exposed" : "life_only_unexposed";
  if (candidate.analysisStratum !== expectedStratum) throw new TypeError(`passB.assignment.analysisStratum must be ${expectedStratum}`);
  return structuredClone(candidate);
}

function normalizeExposurePolicy(candidate) {
  assertPlainObject("passB.genomeExposure.policy", candidate);
  assertExactKeys("passB.genomeExposure.policy", candidate, ["kind", "k"]);
  if (!PASS_B_GENOME_EXPOSURE_KINDS.includes(candidate.kind)) throw new TypeError("passB.genomeExposure.policy.kind is invalid");
  if (candidate.kind === "whole_genome") {
    if (candidate.k !== null) throw new TypeError("whole_genome exposure policy must use k=null");
  } else assertFiniteNumber("passB.genomeExposure.policy.k", candidate.k, { integer: true, minimum: 1 });
  return structuredClone(candidate);
}

function normalizeExposedLocus(candidate, index) {
  const path = `passB.genomeExposure.loci[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["locusId", "ordinal", "value"]);
  assertId(`${path}.locusId`, candidate.locusId);
  assertFiniteNumber(`${path}.ordinal`, candidate.ordinal, { integer: true, minimum: 1 });
  assertNonEmpty(`${path}.value`, candidate.value);
  return structuredClone(candidate);
}

export function normalizePassBGenomeExposure(candidate) {
  assertPlainObject("passB.genomeExposure", candidate);
  assertExactKeys("passB.genomeExposure", candidate, ["policy", "genomeRef", "genomeDigest", "totalLoci", "loci"]);
  const policy = normalizeExposurePolicy(candidate.policy);
  assertId("passB.genomeExposure.genomeRef", candidate.genomeRef);
  assertNonEmpty("passB.genomeExposure.genomeDigest", candidate.genomeDigest);
  if (!/^sha256:[0-9a-f]{64}$/.test(candidate.genomeDigest)) throw new TypeError("passB.genomeExposure.genomeDigest must be a SHA-256 digest");
  assertFiniteNumber("passB.genomeExposure.totalLoci", candidate.totalLoci, { integer: true, minimum: 2 });
  if (!Array.isArray(candidate.loci) || candidate.loci.length === 0) throw new TypeError("passB.genomeExposure.loci must be a non-empty array");
  const loci = candidate.loci.map(normalizeExposedLocus).sort((a, b) => a.ordinal - b.ordinal);
  loci.forEach((locus, index) => {
    if (locus.ordinal !== index + 1) throw new TypeError("Pass-B genome exposure must be ordinal-prefix deterministic, never relevance-selected");
  });
  const expectedCount = policy.kind === "whole_genome" ? candidate.totalLoci : policy.k;
  if (loci.length !== expectedCount) throw new TypeError(`Pass-B genome exposure must contain exactly ${expectedCount} loci under its frozen policy`);
  if (loci.length > candidate.totalLoci) throw new TypeError("Pass-B genome exposure exceeds total locus count");
  return structuredClone({ ...candidate, policy, loci });
}

function normalizePolicyWitness(candidate) {
  assertPlainObject("passB.policyWitness", candidate);
  assertExactKeys("passB.policyWitness", candidate, ["policyVersion", "assignmentRef", "genomeExposurePolicyRef"]);
  if (candidate.policyVersion !== GENESIS_PASS_B_POLICY.version) throw new TypeError("passB.policyWitness.policyVersion is not supported");
  assertId("passB.policyWitness.assignmentRef", candidate.assignmentRef);
  assertNullableId("passB.policyWitness.genomeExposurePolicyRef", candidate.genomeExposurePolicyRef);
  return structuredClone(candidate);
}

export function normalizePassBInput(candidate) {
  assertPlainObject("passB.input", candidate);
  assertExactKeys("passB.input", candidate, [
    "inputVersion", "subject", "world", "rememberingAt", "ageAtRemembering", "chronologyEndsAt",
    "history", "priorMemories", "assignment", "genomeExposure", "policyWitness",
  ]);
  if (candidate.inputVersion !== GENESIS_PASS_B_INPUT_VERSION) throw new TypeError("passB.inputVersion is not supported");
  assertPlainObject("passB.subject", candidate.subject);
  assertExactKeys("passB.subject", candidate.subject, ["provisionalThreadId", "bornAt"]);
  assertId("passB.subject.provisionalThreadId", candidate.subject.provisionalThreadId);
  assertIsoTimestamp("passB.subject.bornAt", candidate.subject.bornAt);
  const world = normalizePassBWorld(candidate.world);
  assertIsoTimestamp("passB.rememberingAt", candidate.rememberingAt);
  assertFiniteNumber("passB.ageAtRemembering", candidate.ageAtRemembering, { minimum: 0 });
  assertIsoTimestamp("passB.chronologyEndsAt", candidate.chronologyEndsAt);
  if (Date.parse(candidate.rememberingAt) > Date.parse(candidate.chronologyEndsAt)) throw new TypeError("Pass-B remembering moment exceeds chronologyEndsAt");
  if (!Array.isArray(candidate.history) || candidate.history.length === 0) throw new TypeError("passB.history must be a non-empty array");
  const history = candidate.history.map(normalizePassBHistoryEpisode);
  let priorTime = Number.NEGATIVE_INFINITY;
  for (const episode of history) {
    const occurredAt = Date.parse(episode.occurredAt);
    if (occurredAt < priorTime) throw new TypeError("passB.history must be chronological");
    if (occurredAt > Date.parse(candidate.rememberingAt)) throw new TypeError("Pass B cannot see history after the remembering moment");
    priorTime = occurredAt;
  }
  if (!Array.isArray(candidate.priorMemories)) throw new TypeError("passB.priorMemories must be an array");
  const priorMemories = candidate.priorMemories.map(normalizePriorMemory);
  const assignment = normalizeAssignment(candidate.assignment);
  const observedPriorTreatment = priorMemories.some((memory) => memory.formationMode === "life_plus_genome");
  if (assignment.priorTreatmentMemoryExposure !== observedPriorTreatment) throw new TypeError("passB.assignment.priorTreatmentMemoryExposure does not match visible prior remembered memory history");
  const genomeExposure = candidate.genomeExposure === null ? null : normalizePassBGenomeExposure(candidate.genomeExposure);
  if (assignment.formationMode === "life_only" && genomeExposure !== null) throw new TypeError("life_only Pass-B cognition must not receive a genome exposure");
  if (assignment.formationMode === "life_plus_genome" && genomeExposure === null) throw new TypeError("life_plus_genome Pass-B cognition requires the frozen genome exposure");
  const policyWitness = normalizePolicyWitness(candidate.policyWitness);
  if (assignment.formationMode === "life_only" && policyWitness.genomeExposurePolicyRef !== null) throw new TypeError("life_only Pass-B call must not carry a genome exposure policy ref");
  if (assignment.formationMode === "life_plus_genome" && policyWitness.genomeExposurePolicyRef === null) throw new TypeError("life_plus_genome Pass-B call requires a genome exposure policy ref");
  return structuredClone({ ...candidate, world, history, priorMemories, assignment, genomeExposure, policyWitness });
}

function normalizeRememberedContent(value) {
  assertNonEmpty("MemoryFormation.rememberedContent", value);
  if (utf8Bytes(value) < 12) throw new TypeError("MemoryFormation.rememberedContent is too trivial");
  if (utf8Bytes(value) > GENESIS_PASS_B_POLICY.maxRememberedContentBytes) throw new TypeError(`MemoryFormation.rememberedContent exceeds ${GENESIS_PASS_B_POLICY.maxRememberedContentBytes} UTF-8 bytes`);
  return value;
}

export function assertUniquePassBEpisodeRefs(episodeRefs) {
  if (!Array.isArray(episodeRefs)) throw new TypeError("Pass-B model output.episodeRefs must be an array");
  if (new Set(episodeRefs).size !== episodeRefs.length) {
    throw new TypeError("Pass-B model output.episodeRefs must contain unique references");
  }
  return episodeRefs;
}

export function normalizePassBModelOutput(candidate, inputCandidate) {
  const input = normalizePassBInput(inputCandidate);
  assertPlainObject("Pass-B model output", candidate);
  assertExactKeys("Pass-B model output", candidate, ["outcome", "episodeRefs", "rememberedContent", "uncertainty"]);
  if (!["remembered", "not_remembered"].includes(candidate.outcome)) throw new TypeError("Pass-B model output outcome is invalid");
  assertStringArray("Pass-B model output.episodeRefs", candidate.episodeRefs);
  assertUniquePassBEpisodeRefs(candidate.episodeRefs);
  const uncertainty = normalizeCurrentUncertainty(candidate.uncertainty, "Pass-B model output.uncertainty");
  const historyRefs = new Set(input.history.map((episode) => episode.episodeId));
  for (const ref of candidate.episodeRefs) if (!historyRefs.has(ref)) throw new TypeError(`Pass-B model output episodeRef ${ref} is not visible history`);
  let rememberedContent = null;
  if (candidate.outcome === "remembered") {
    if (candidate.episodeRefs.length === 0) throw new TypeError("remembered Pass-B output requires at least one episodeRef");
    rememberedContent = normalizeRememberedContent(candidate.rememberedContent);
  } else {
    if (candidate.episodeRefs.length !== 0) throw new TypeError("not_remembered Pass-B output must not cite remembered episodes");
    if (candidate.rememberedContent !== null) throw new TypeError("not_remembered Pass-B output must use rememberedContent=null");
    if (uncertainty.length !== 0) throw new TypeError("not_remembered Pass-B output must not author memory uncertainty");
  }
  return Object.freeze({
    outcome: candidate.outcome,
    episodeRefs: [...candidate.episodeRefs],
    rememberedContent,
    uncertainty,
    formationMode: input.assignment.formationMode,
    priorTreatmentMemoryExposure: input.assignment.priorTreatmentMemoryExposure,
    analysisStratum: input.assignment.analysisStratum,
  });
}

export function passBInputDigest(candidate) { return digest(normalizePassBInput(candidate)); }
export function passBMemoryFormationDigest(candidate) { return digest(candidate); }
