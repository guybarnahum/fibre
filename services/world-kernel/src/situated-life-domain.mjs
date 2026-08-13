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

export const RELATED_PARTY_KINDS = Object.freeze([
  "thread",
  "human_source",
  "synthetic_ancestor",
  "historical_or_literary_source",
  "unknown",
]);

export const LIFE_RELATION_KINDS = Object.freeze([
  "biological_parent",
  "adoptive_parent",
  "social_parent",
  "child",
  "sibling",
  "ancestor",
  "sponsor",
  "echo_source",
  "source_person",
]);

export const GENETIC_CONTRIBUTION_ROLES = Object.freeze([
  "parent_genome_source",
  "none",
  "unknown",
]);

export const PLACE_EPISODE_KINDS = Object.freeze([
  "birth",
  "residence",
  "study",
  "work",
  "migration",
  "formative_presence",
]);

export const PLACE_PRECISIONS = Object.freeze(["locality", "region", "country", "unspecified"]);
export const SITUATED_LIFE_VISIBILITIES = Object.freeze(["public", "restricted", "private"]);
export const SITUATED_LIFE_PROVENANCE = Object.freeze([
  "genesis_created",
  "world_recorded",
  "human_source",
  "thread_history",
  "admin_correction",
]);

function assertEnum(name, value, values) {
  if (!values.includes(value)) throw new TypeError(`${name} is invalid`);
}

function normalizeOptionalTimestamp(name, value) {
  if (value === null) return null;
  assertIsoTimestamp(name, value);
  return value;
}

function normalizeReferences(name, value) {
  assertStringArray(name, value);
  if (value.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must be unique`);
  value.forEach((item, index) => assertId(`${name}[${index}]`, item));
  return [...value];
}

function normalizeRevisionFields(name, value) {
  assertFiniteNumber(`${name}.revision`, value.revision, { integer: true, minimum: 1 });
  if (value.revision === 1) {
    if (value.supersedesRevision !== undefined) {
      throw new TypeError(`${name} revision 1 cannot supersede a prior revision`);
    }
    return {};
  }
  assertFiniteNumber(`${name}.supersedesRevision`, value.supersedesRevision, {
    integer: true,
    minimum: 1,
  });
  if (value.supersedesRevision !== value.revision - 1) {
    throw new TypeError(`${name}.supersedesRevision must equal revision - 1`);
  }
  return { supersedesRevision: value.supersedesRevision };
}

function normalizeRelatedParty(value) {
  assertPlainObject("life relation.relatedParty", value);
  assertExactKeys("life relation.relatedParty", value, ["partyId", "kind", "displayName"]);
  assertId("life relation.relatedParty.partyId", value.partyId);
  assertEnum("life relation.relatedParty.kind", value.kind, RELATED_PARTY_KINDS);
  assertNonEmpty("life relation.relatedParty.displayName", value.displayName);
  return { partyId: value.partyId, kind: value.kind, displayName: value.displayName };
}

export function lifeRelationId(seed) {
  return `lrel_${sha256(canonicalJson(seed))}`;
}

export function placeEpisodeId(seed) {
  return `plce_${sha256(canonicalJson(seed))}`;
}

export function normalizeLifeRelation(value) {
  assertPlainObject("life relation", value);
  assertExactKeys("life relation", value, [
    "relationId",
    "revision",
    "threadId",
    "relatedParty",
    "relationKind",
    "geneticContributionRole",
    "sourceReferences",
    "validFrom",
    "validTo",
    "visibility",
    "provenance",
    "recordedAt",
    "supersedesRevision",
  ]);
  assertId("life relation.relationId", value.relationId);
  assertId("life relation.threadId", value.threadId);
  const revision = normalizeRevisionFields("life relation", value);
  const relatedParty = normalizeRelatedParty(value.relatedParty);
  assertEnum("life relation.relationKind", value.relationKind, LIFE_RELATION_KINDS);
  assertEnum(
    "life relation.geneticContributionRole",
    value.geneticContributionRole,
    GENETIC_CONTRIBUTION_ROLES,
  );
  if (
    value.geneticContributionRole === "parent_genome_source" &&
    value.relationKind !== "biological_parent"
  ) {
    throw new TypeError("only a biological_parent relation may be a parent_genome_source");
  }
  const sourceReferences = normalizeReferences("life relation.sourceReferences", value.sourceReferences);
  const validFrom = normalizeOptionalTimestamp("life relation.validFrom", value.validFrom);
  const validTo = normalizeOptionalTimestamp("life relation.validTo", value.validTo);
  if (validFrom !== null && validTo !== null && Date.parse(validTo) < Date.parse(validFrom)) {
    throw new TypeError("life relation.validTo cannot precede validFrom");
  }
  assertEnum("life relation.visibility", value.visibility, SITUATED_LIFE_VISIBILITIES);
  assertEnum("life relation.provenance", value.provenance, SITUATED_LIFE_PROVENANCE);
  assertIsoTimestamp("life relation.recordedAt", value.recordedAt);
  return {
    relationId: value.relationId,
    revision: value.revision,
    threadId: value.threadId,
    relatedParty,
    relationKind: value.relationKind,
    geneticContributionRole: value.geneticContributionRole,
    sourceReferences,
    validFrom,
    validTo,
    visibility: value.visibility,
    provenance: value.provenance,
    recordedAt: value.recordedAt,
    ...revision,
  };
}

function normalizePlace(value) {
  assertPlainObject("place episode.place", value);
  assertExactKeys("place episode.place", value, [
    "placeId",
    "displayName",
    "countryCode",
    "region",
    "locality",
    "precision",
  ]);
  assertId("place episode.place.placeId", value.placeId);
  assertNonEmpty("place episode.place.displayName", value.displayName);
  if (value.countryCode !== null) assertNonEmpty("place episode.place.countryCode", value.countryCode);
  if (value.region !== null) assertNonEmpty("place episode.place.region", value.region);
  if (value.locality !== null) assertNonEmpty("place episode.place.locality", value.locality);
  assertEnum("place episode.place.precision", value.precision, PLACE_PRECISIONS);
  return {
    placeId: value.placeId,
    displayName: value.displayName,
    countryCode: value.countryCode,
    region: value.region,
    locality: value.locality,
    precision: value.precision,
  };
}

export function normalizePlaceEpisode(value) {
  assertPlainObject("place episode", value);
  assertExactKeys("place episode", value, [
    "episodeId",
    "revision",
    "threadId",
    "episodeKind",
    "place",
    "startAt",
    "endAt",
    "sourceReferences",
    "visibility",
    "provenance",
    "recordedAt",
    "supersedesRevision",
  ]);
  assertId("place episode.episodeId", value.episodeId);
  assertId("place episode.threadId", value.threadId);
  const revision = normalizeRevisionFields("place episode", value);
  assertEnum("place episode.episodeKind", value.episodeKind, PLACE_EPISODE_KINDS);
  const place = normalizePlace(value.place);
  const startAt = normalizeOptionalTimestamp("place episode.startAt", value.startAt);
  const endAt = normalizeOptionalTimestamp("place episode.endAt", value.endAt);
  if (startAt !== null && endAt !== null && Date.parse(endAt) < Date.parse(startAt)) {
    throw new TypeError("place episode.endAt cannot precede startAt");
  }
  if (value.episodeKind === "birth" && endAt !== null) {
    throw new TypeError("birth place episode cannot have an endAt");
  }
  const sourceReferences = normalizeReferences("place episode.sourceReferences", value.sourceReferences);
  assertEnum("place episode.visibility", value.visibility, SITUATED_LIFE_VISIBILITIES);
  assertEnum("place episode.provenance", value.provenance, SITUATED_LIFE_PROVENANCE);
  assertIsoTimestamp("place episode.recordedAt", value.recordedAt);
  return {
    episodeId: value.episodeId,
    revision: value.revision,
    threadId: value.threadId,
    episodeKind: value.episodeKind,
    place,
    startAt,
    endAt,
    sourceReferences,
    visibility: value.visibility,
    provenance: value.provenance,
    recordedAt: value.recordedAt,
    ...revision,
  };
}
