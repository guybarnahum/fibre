import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  normalizeLifeRelation,
  situatedLifeRecordIsCurrent,
} from "./situated-life-domain.mjs";
import { appendLifeRelationRevisionInTransaction } from "./situated-life-persistence.mjs";
import { assertAllSituatedReferencesResolve } from "./situated-identity-grounding.mjs";
import {
  assertRecombinedSymbolicGenomeSourcesInTransaction,
  readSymbolicGenomeInTransaction,
} from "./symbolic-genome-persistence.mjs";

function conflict(ErrorType, message) {
  throw new ErrorType(message);
}

function normalizeSyntheticLineageRelations(
  candidates,
  { manifest, sourceOwners, seedEventId, ErrorType },
) {
  if (!Array.isArray(candidates)) {
    conflict(ErrorType, "publishBirth lifeRelations must be an array");
  }
  if (candidates.length !== sourceOwners.length) {
    conflict(
      ErrorType,
      `synthetic_lineage birth requires exactly ${sourceOwners.length} parent-genome-source life relations`,
    );
  }
  const relations = candidates.map((candidate) => normalizeLifeRelation(candidate));
  const relationIds = new Set();
  const relatedPartyIds = new Set();
  const sourceOwnerIds = new Set(sourceOwners.map((owner) => owner.ownerId));

  for (const relation of relations) {
    if (relationIds.has(relation.relationId)) {
      conflict(ErrorType, `duplicate Genesis life relation ${relation.relationId}`);
    }
    relationIds.add(relation.relationId);
    if (relation.revision !== 1) {
      conflict(ErrorType, "Genesis parent-genome-source life relations must begin at revision 1");
    }
    if (relation.threadId !== manifest.threadId) {
      conflict(ErrorType, "Genesis parent-genome-source relation belongs to another Thread");
    }
    if (
      relation.relatedParty.kind !== "synthetic_ancestor" ||
      !sourceOwnerIds.has(relation.relatedParty.partyId)
    ) {
      conflict(
        ErrorType,
        "Genesis parent-genome-source relation does not match a symbolic-genome source owner",
      );
    }
    if (relatedPartyIds.has(relation.relatedParty.partyId)) {
      conflict(
        ErrorType,
        `duplicate Genesis parent-genome-source relation for ${relation.relatedParty.partyId}`,
      );
    }
    relatedPartyIds.add(relation.relatedParty.partyId);
    if (
      relation.relationKind !== "biological_parent" ||
      relation.geneticContributionRole !== "parent_genome_source"
    ) {
      conflict(
        ErrorType,
        "synthetic_lineage genome sources require biological_parent + parent_genome_source relations",
      );
    }
    if (relation.provenance !== "genesis_created") {
      conflict(ErrorType, "Genesis parent-genome-source relation must use genesis_created provenance");
    }
    if (!situatedLifeRecordIsCurrent(relation)) {
      conflict(ErrorType, "Genesis parent-genome-source relation must be current at birth");
    }
    if (relation.recordedAt !== manifest.publication.publishedAt) {
      conflict(ErrorType, "Genesis parent-genome-source relation recordedAt must equal birth publication time");
    }
    if (!relation.sourceReferences.includes(seedEventId)) {
      conflict(ErrorType, "Genesis parent-genome-source relation must cite the birth seed event");
    }
  }
  return relations;
}

function publishInitialLifeRelationInTransaction(database, relation, ErrorType) {
  const existing = database.prepare(
    "SELECT 1 AS present FROM life_relation_records WHERE thread_id=? AND relation_id=?",
  ).get(relation.threadId, relation.relationId);
  if (existing !== undefined) {
    conflict(ErrorType, `life relation ${relation.relationId} already exists during Genesis birth`);
  }

  const resolved = assertAllSituatedReferencesResolve(
    database,
    relation.threadId,
    relation.sourceReferences,
  );
  if (!resolved.some((witness) => witness.kind === "thread_event")) {
    conflict(ErrorType, "Genesis parent-genome-source relation requires a resolved Thread-event witness");
  }

  appendLifeRelationRevisionInTransaction(database, relation, { previousDigest: null });
  return relation;
}

export function bindBirthGenomeAndLineageInTransaction(
  database,
  {
    manifest,
    lifeRelationCandidates = [],
    seedEventId,
    ErrorType = TypeError,
  },
) {
  if (!Array.isArray(lifeRelationCandidates)) {
    conflict(ErrorType, "publishBirth lifeRelations must be an array");
  }

  if (manifest.genomeRef === null) {
    if (manifest.originMode === "synthetic_lineage") {
      conflict(ErrorType, "synthetic_lineage birth requires a persisted symbolic genome");
    }
    if (lifeRelationCandidates.length !== 0) {
      conflict(ErrorType, "birth lifeRelations are reserved for synthetic_lineage genome binding");
    }
    return null;
  }

  const bundle = readSymbolicGenomeInTransaction(database, manifest.genomeRef, { ErrorType });
  if (
    bundle.header.owner.kind !== "thread" ||
    bundle.header.owner.ownerId !== manifest.threadId
  ) {
    conflict(ErrorType, "Genesis manifest genome does not belong to the child Thread");
  }
  if (bundle.header.genesisId !== manifest.genesisId) {
    conflict(ErrorType, "Genesis manifest genome belongs to another genesisId");
  }
  const sources = assertRecombinedSymbolicGenomeSourcesInTransaction(database, bundle, {
    ErrorType,
  });

  if (manifest.originMode !== "synthetic_lineage") {
    if (lifeRelationCandidates.length !== 0) {
      conflict(ErrorType, "birth lifeRelations are reserved for synthetic_lineage genome binding");
    }
    if (manifest.originMode === "de_novo" && bundle.header.originKind !== "de_novo") {
      conflict(ErrorType, "de_novo birth cannot publish a recombined symbolic genome");
    }
    return bundle;
  }

  if (bundle.header.originKind !== "recombined") {
    conflict(ErrorType, "synthetic_lineage birth requires a recombined symbolic genome");
  }
  const sourceOwners = bundle.header.sourceEligibility.sourceOwners;
  if (sourceOwners.some((owner) => owner.kind !== "synthetic_ancestor")) {
    conflict(ErrorType, "synthetic_lineage birth requires synthetic-ancestor genome sources");
  }
  const sourceOwnerIds = sourceOwners.map((owner) => owner.ownerId);
  if (canonicalJson(sourceOwnerIds) !== canonicalJson(manifest.parentOrAncestorRefs)) {
    conflict(
      ErrorType,
      "manifest.parentOrAncestorRefs do not exactly match symbolic-genome source owners",
    );
  }
  if (sources.length !== sourceOwners.length) {
    throw new IntegrityError("symbolic-genome source verification returned the wrong source count");
  }

  const existingParentSources = database.prepare(`
    SELECT COUNT(*) AS count FROM life_relation_records
    WHERE thread_id=? AND genetic_contribution_role='parent_genome_source'
  `).get(manifest.threadId);
  if (Number(existingParentSources.count) !== 0) {
    conflict(ErrorType, "new synthetic_lineage Thread already has parent_genome_source relations");
  }

  const relations = normalizeSyntheticLineageRelations(lifeRelationCandidates, {
    manifest,
    sourceOwners,
    seedEventId,
    ErrorType,
  });
  for (const relation of relations) {
    publishInitialLifeRelationInTransaction(database, relation, ErrorType);
  }
  return bundle;
}
