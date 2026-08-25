import {
  normalizeFibreCivilRegistration,
} from "#packages/domain/src/fibre-civil-identity.mjs";
import {
  WORLD_STORE_SCHEMA_VERSION,
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "./identity-claim-discipline.mjs";
import { AUTOBIOGRAPHICAL_MEMORY_POLICY } from "./autobiographical-memory-domain.mjs";

export const GENESIS_ORIGIN_MODES = Object.freeze([
  "de_novo",
  "synthetic_lineage",
  "thread_parent",
  "echo",
  "homage",
  "fork",
]);

export const GENESIS_ENTRY_STAGES = Object.freeze([
  "newborn",
  "child",
  "adolescent",
  "young_adult",
  "adult",
]);

const DIGEST = /^sha256:[0-9a-f]{64}$/;

function assertDigest(name, value) {
  assertNonEmpty(name, value);
  if (!DIGEST.test(value)) throw new TypeError(`${name} must be a SHA-256 digest`);
}

function assertEnum(name, value, values) {
  if (!values.includes(value)) throw new TypeError(`${name} is invalid`);
}

function normalizeSource(source, index) {
  assertPlainObject(`worldAuthorship.sourcesConsulted[${index}]`, source);
  assertExactKeys(`worldAuthorship.sourcesConsulted[${index}]`, source, ["kind", "citation", "accessedAt"]);
  assertNonEmpty(`worldAuthorship.sourcesConsulted[${index}].kind`, source.kind);
  assertNonEmpty(`worldAuthorship.sourcesConsulted[${index}].citation`, source.citation);
  assertIsoTimestamp(`worldAuthorship.sourcesConsulted[${index}].accessedAt`, source.accessedAt);
  return { kind: source.kind, citation: source.citation, accessedAt: source.accessedAt };
}

export function normalizeWorldAuthorship(candidate) {
  assertPlainObject("worldAuthorship", candidate);
  assertExactKeys("worldAuthorship", candidate, [
    "authorId",
    "sourcesConsulted",
    "abstractionMethod",
    "relocationWitness",
    "familiarityProbe",
    "createdAt",
  ]);
  assertId("worldAuthorship.authorId", candidate.authorId);
  if (!Array.isArray(candidate.sourcesConsulted)) throw new TypeError("worldAuthorship.sourcesConsulted must be an array");
  const sourcesConsulted = candidate.sourcesConsulted.map(normalizeSource);
  assertNonEmpty("worldAuthorship.abstractionMethod", candidate.abstractionMethod);
  assertNonEmpty("worldAuthorship.relocationWitness", candidate.relocationWitness);
  if (candidate.familiarityProbe !== null) {
    assertPlainObject("worldAuthorship.familiarityProbe", candidate.familiarityProbe);
    assertExactKeys("worldAuthorship.familiarityProbe", candidate.familiarityProbe, [
      "probedAt",
      "model",
      "densityScore",
      "comparisonNotes",
    ]);
    assertIsoTimestamp("worldAuthorship.familiarityProbe.probedAt", candidate.familiarityProbe.probedAt);
    assertNonEmpty("worldAuthorship.familiarityProbe.model", candidate.familiarityProbe.model);
    if (candidate.familiarityProbe.densityScore !== undefined) {
      assertFiniteNumber("worldAuthorship.familiarityProbe.densityScore", candidate.familiarityProbe.densityScore);
    }
    assertNonEmpty("worldAuthorship.familiarityProbe.comparisonNotes", candidate.familiarityProbe.comparisonNotes);
  }
  assertIsoTimestamp("worldAuthorship.createdAt", candidate.createdAt);
  return structuredClone({ ...candidate, sourcesConsulted });
}

function normalizePlace(place, index) {
  assertPlainObject(`worldSpec.places[${index}]`, place);
  assertExactKeys(`worldSpec.places[${index}]`, place, ["placeId", "description"]);
  assertId(`worldSpec.places[${index}].placeId`, place.placeId);
  assertNonEmpty(`worldSpec.places[${index}].description`, place.description);
  return { placeId: place.placeId, description: place.description };
}

export function normalizeGenesisWorldSpec(candidate) {
  assertPlainObject("worldSpec", candidate);
  assertExactKeys("worldSpec", candidate, [
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
    "worldAuthorship",
    "createdAt",
  ]);
  assertId("worldSpec.worldSpecId", candidate.worldSpecId);
  assertPlainObject("worldSpec.timeFrame", candidate.timeFrame);
  assertExactKeys("worldSpec.timeFrame", candidate.timeFrame, ["startAt", "endAt"]);
  assertIsoTimestamp("worldSpec.timeFrame.startAt", candidate.timeFrame.startAt);
  assertIsoTimestamp("worldSpec.timeFrame.endAt", candidate.timeFrame.endAt);
  if (Date.parse(candidate.timeFrame.endAt) < Date.parse(candidate.timeFrame.startAt)) {
    throw new TypeError("worldSpec.timeFrame moves backwards");
  }
  if (!Array.isArray(candidate.places) || candidate.places.length === 0) {
    throw new TypeError("worldSpec.places must be a non-empty array");
  }
  const places = candidate.places.map(normalizePlace);
  assertNonEmpty("worldSpec.householdShape", candidate.householdShape);
  assertStringArray("worldSpec.familyRelations", candidate.familyRelations);
  assertStringArray("worldSpec.languages", candidate.languages);
  assertNonEmpty("worldSpec.materialCircumstances", candidate.materialCircumstances);
  assertNonEmpty("worldSpec.mobilityPattern", candidate.mobilityPattern);
  assertNonEmpty("worldSpec.schoolingOrCommunityContext", candidate.schoolingOrCommunityContext);
  assertNonEmpty("worldSpec.culturalContext", candidate.culturalContext);
  assertStringArray("worldSpec.availableInstitutions", candidate.availableInstitutions);
  assertNonEmpty("worldSpec.intellectualEnvironment", candidate.intellectualEnvironment);
  assertStringArray("worldSpec.affordedRoles", candidate.affordedRoles);
  normalizeWorldAuthorship(candidate.worldAuthorship);
  assertIsoTimestamp("worldSpec.createdAt", candidate.createdAt);
  return structuredClone({ ...candidate, places });
}

export function normalizeGenesisEntry(candidate) {
  assertPlainObject("entry", candidate);
  assertExactKeys("entry", candidate, ["stage", "ageAtEntry", "chronologyEndsAt", "justification", "policyRef"]);
  assertEnum("entry.stage", candidate.stage, GENESIS_ENTRY_STAGES);
  assertFiniteNumber("entry.ageAtEntry", candidate.ageAtEntry, { minimum: 0 });
  assertIsoTimestamp("entry.chronologyEndsAt", candidate.chronologyEndsAt);
  assertNonEmpty("entry.justification", candidate.justification);
  assertNonEmpty("entry.policyRef", candidate.policyRef);
  return structuredClone(candidate);
}

function normalizeCognitionSurface(name, candidate) {
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["provider", "modelId", "promptHash", "schemaHash", "sampling"]);
  assertNonEmpty(`${name}.provider`, candidate.provider);
  assertNonEmpty(`${name}.modelId`, candidate.modelId);
  assertDigest(`${name}.promptHash`, candidate.promptHash);
  assertDigest(`${name}.schemaHash`, candidate.schemaHash);
  assertPlainObject(`${name}.sampling`, candidate.sampling);
  assertJsonValue(`${name}.sampling`, candidate.sampling);
  return structuredClone(candidate);
}

export function publicationValidatorSetWitness() {
  const witness = {
    worldStoreSchemaVersion: WORLD_STORE_SCHEMA_VERSION,
    identityClaimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
    autobiographicalMemoryPolicy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    situatedLifeContract: "situated-life-domain+grounding-guards:current",
  };
  return {
    ...witness,
    digest: `sha256:${sha256(canonicalJson(witness))}`,
  };
}

export function normalizeGenesisCognition(candidate) {
  assertPlainObject("cognition", candidate);
  assertExactKeys("cognition", candidate, [
    "passA",
    "passB",
    "passC",
    "recordRepair",
    "policyVersion",
    "eventStructurePoolDigest",
    "publicationValidatorSetWitness",
  ]);
  const normalized = {
    passA: normalizeCognitionSurface("cognition.passA", candidate.passA),
    passB: normalizeCognitionSurface("cognition.passB", candidate.passB),
    passC: normalizeCognitionSurface("cognition.passC", candidate.passC),
    recordRepair: normalizeCognitionSurface("cognition.recordRepair", candidate.recordRepair),
    policyVersion: candidate.policyVersion,
    eventStructurePoolDigest: candidate.eventStructurePoolDigest,
    publicationValidatorSetWitness: structuredClone(candidate.publicationValidatorSetWitness),
  };
  assertNonEmpty("cognition.policyVersion", normalized.policyVersion);
  assertDigest("cognition.eventStructurePoolDigest", normalized.eventStructurePoolDigest);
  assertPlainObject("cognition.publicationValidatorSetWitness", normalized.publicationValidatorSetWitness);
  assertJsonValue("cognition.publicationValidatorSetWitness", normalized.publicationValidatorSetWitness);
  assertDigest("cognition.publicationValidatorSetWitness.digest", normalized.publicationValidatorSetWitness.digest);
  return normalized;
}

function normalizePublication(candidate) {
  assertPlainObject("publication", candidate);
  if (candidate.status === "published") {
    assertExactKeys("publication", candidate, ["status", "publishedAt", "resultingThreadVersion", "civilRegistration"]);
    assertIsoTimestamp("publication.publishedAt", candidate.publishedAt);
    assertFiniteNumber("publication.resultingThreadVersion", candidate.resultingThreadVersion, { integer: true, minimum: 1 });
    return {
      status: candidate.status,
      publishedAt: candidate.publishedAt,
      resultingThreadVersion: candidate.resultingThreadVersion,
      civilRegistration: normalizeFibreCivilRegistration(candidate.civilRegistration),
    };
  }
  if (candidate.status === "failed") {
    assertExactKeys("publication", candidate, ["status", "failedAt", "failureReason"]);
    assertIsoTimestamp("publication.failedAt", candidate.failedAt);
    assertNonEmpty("publication.failureReason", candidate.failureReason);
    return structuredClone(candidate);
  }
  throw new TypeError("publication.status is invalid");
}

export function normalizeGenesisManifest(candidate) {
  assertPlainObject("manifest", candidate);
  assertExactKeys("manifest", candidate, [
    "genesisId",
    "threadId",
    "originMode",
    "entry",
    "worldSpecRef",
    "sourceBundleRefs",
    "parentOrAncestorRefs",
    "genomeRef",
    "cognition",
    "publication",
    "createdAt",
  ]);
  assertId("manifest.genesisId", candidate.genesisId);
  assertId("manifest.threadId", candidate.threadId);
  assertEnum("manifest.originMode", candidate.originMode, GENESIS_ORIGIN_MODES);
  normalizeGenesisEntry(candidate.entry);
  assertId("manifest.worldSpecRef", candidate.worldSpecRef);
  assertStringArray("manifest.sourceBundleRefs", candidate.sourceBundleRefs);
  assertStringArray("manifest.parentOrAncestorRefs", candidate.parentOrAncestorRefs);
  if (candidate.genomeRef !== null) assertId("manifest.genomeRef", candidate.genomeRef);
  normalizeGenesisCognition(candidate.cognition);
  const publication = normalizePublication(candidate.publication);
  if (publication.status === "published") {
    const registration = publication.civilRegistration;
    if (registration.threadId !== candidate.threadId) {
      throw new TypeError("published Genesis registration belongs to another Thread");
    }
    if (registration.worldRef !== candidate.worldSpecRef) {
      throw new TypeError("published Genesis registration names another World");
    }
    if (registration.registeredAt !== publication.publishedAt) {
      throw new TypeError("published Genesis registration time must equal publication time");
    }
  }
  assertIsoTimestamp("manifest.createdAt", candidate.createdAt);
  return structuredClone({ ...candidate, publication });
}

export function normalizeGenerationAttempt(candidate) {
  assertPlainObject("generationAttempt", candidate);
  assertExactKeys("generationAttempt", candidate, [
    "attemptId",
    "genesisId",
    "provisionalThreadId",
    "candidateAttemptNumber",
    "scope",
    "recordKind",
    "failedPass",
    "failedGate",
    "recordRepairOrdinal",
    "rejectedContentDigest",
    "rejectedContent",
    "inputDigest",
    "outputDigest",
    "recordedAt",
  ]);
  assertId("generationAttempt.attemptId", candidate.attemptId);
  assertId("generationAttempt.genesisId", candidate.genesisId);
  assertId("generationAttempt.provisionalThreadId", candidate.provisionalThreadId);
  assertFiniteNumber("generationAttempt.candidateAttemptNumber", candidate.candidateAttemptNumber, { integer: true, minimum: 1 });
  assertEnum("generationAttempt.scope", candidate.scope, ["record_repair", "candidate_failure"]);
  if (candidate.recordKind !== null) assertNonEmpty("generationAttempt.recordKind", candidate.recordKind);
  assertNonEmpty("generationAttempt.failedPass", candidate.failedPass);
  assertNonEmpty("generationAttempt.failedGate", candidate.failedGate);
  if (candidate.recordRepairOrdinal !== null) {
    assertFiniteNumber("generationAttempt.recordRepairOrdinal", candidate.recordRepairOrdinal, { integer: true, minimum: 1 });
  }
  assertDigest("generationAttempt.rejectedContentDigest", candidate.rejectedContentDigest);
  if (candidate.rejectedContent !== null) assertJsonValue("generationAttempt.rejectedContent", candidate.rejectedContent);
  assertDigest("generationAttempt.inputDigest", candidate.inputDigest);
  assertDigest("generationAttempt.outputDigest", candidate.outputDigest);
  assertIsoTimestamp("generationAttempt.recordedAt", candidate.recordedAt);
  return structuredClone(candidate);
}

export function genesisRecordDigest(kind, record) {
  assertNonEmpty("kind", kind);
  assertJsonValue("record", record);
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}
