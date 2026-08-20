import {
  IntegrityError,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  normalizeLifeRelation,
  situatedLifeRecordIsCurrent,
} from "./situated-life-domain.mjs";
import { lifeRelationRevisionRef } from "./situated-life-evidence.mjs";
import { situatedRecordDigest } from "./situated-life-integrity.mjs";
import { assertAllSituatedReferencesResolve } from "./situated-identity-grounding.mjs";
import {
  normalizeSymbolicGenomeHeader,
  normalizeSymbolicGenomeLocus,
  normalizeSymbolicGenomeMutation,
  replayRecombinationSelection,
  symbolicGenomeDigest,
} from "./symbolic-genome-domain.mjs";

const SYMBOLIC_GENOME_TABLES = Object.freeze([
  "symbolic_genomes",
  "symbolic_genome_loci",
  "symbolic_genome_mutations",
]);

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

function parseRecord(name, json) {
  try { return JSON.parse(json); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function symbolicRecordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function sameOwner(left, right) {
  return left.kind === right.kind && left.ownerId === right.ownerId;
}

function conflict(ErrorType, message) {
  throw new ErrorType(message);
}

export function readBirthSymbolicGenomeInTransaction(
  database,
  genomeId,
  { required = true, ErrorType = TypeError } = {},
) {
  const schemaPresent = SYMBOLIC_GENOME_TABLES.every((tableName) => tableExists(database, tableName));
  if (!schemaPresent) {
    if (!required) return null;
    return conflict(ErrorType, "symbolic genome storage is not present in this world");
  }
  const genomeRow = database.prepare(`
    SELECT header_json,genome_digest FROM symbolic_genomes WHERE genome_id=?
  `).get(genomeId);
  if (genomeRow === undefined) {
    if (!required) return null;
    return conflict(ErrorType, `symbolic genome ${genomeId} was not found`);
  }

  const header = normalizeSymbolicGenomeHeader(
    parseRecord(`symbolic genome ${genomeId}`, genomeRow.header_json),
  );
  const loci = database.prepare(`
    SELECT record_json,record_digest FROM symbolic_genome_loci
    WHERE genome_id=? ORDER BY ordinal
  `).all(genomeId).map((row) => {
    const locus = normalizeSymbolicGenomeLocus(
      parseRecord(`symbolic genome ${genomeId} locus`, row.record_json),
    );
    if (
      symbolicRecordDigest("locus", locus) !== row.record_digest ||
      canonicalJson(locus) !== row.record_json
    ) {
      throw new IntegrityError(
        `symbolic genome locus ${locus.locusId} failed canonical/digest verification`,
      );
    }
    return locus;
  });
  const mutations = database.prepare(`
    SELECT record_json,record_digest FROM symbolic_genome_mutations
    WHERE genome_id=? ORDER BY ordinal
  `).all(genomeId).map((row) => {
    const mutation = normalizeSymbolicGenomeMutation(
      parseRecord(`symbolic genome ${genomeId} mutation`, row.record_json),
    );
    if (
      symbolicRecordDigest("mutation", mutation) !== row.record_digest ||
      canonicalJson(mutation) !== row.record_json
    ) {
      throw new IntegrityError(
        `symbolic genome mutation ${mutation.mutationId} failed canonical/digest verification`,
      );
    }
    return mutation;
  });

  const bundle = { header, loci, mutations, genomeDigest: genomeRow.genome_digest };
  if (
    symbolicGenomeDigest(bundle) !== genomeRow.genome_digest ||
    canonicalJson(header) !== genomeRow.header_json
  ) {
    throw new IntegrityError(`symbolic genome ${genomeId} failed aggregate digest verification`);
  }
  if (loci.length < 2 || loci.some((locus, index) => locus.ordinal !== index + 1)) {
    throw new IntegrityError(`symbolic genome ${genomeId} locus order is not contiguous`);
  }
  return bundle;
}

function assertRecombinedSourcesInTransaction(database, bundle, ErrorType) {
  if (bundle.header.originKind !== "recombined") return [];
  const { sourceEligibility, recombinationWitness } = bundle.header;
  if (
    canonicalJson(sourceEligibility.sourceGenomeRefs) !==
    canonicalJson(recombinationWitness.sourceGenomeRefs)
  ) {
    conflict(ErrorType, "recombination witness and source eligibility disagree");
  }

  const sources = sourceEligibility.sourceGenomeRefs.map((sourceRef, index) => {
    const source = readBirthSymbolicGenomeInTransaction(database, sourceRef, { ErrorType });
    const expectedOwner = sourceEligibility.sourceOwners[index];
    if (!sameOwner(source.header.owner, expectedOwner)) {
      conflict(ErrorType, `source genome ${sourceRef} does not belong to its declared source owner`);
    }
    if (source.header.owner.kind === "thread") {
      const exists = database.prepare(
        "SELECT 1 AS present FROM threads WHERE thread_id=?",
      ).get(source.header.owner.ownerId);
      if (exists === undefined) {
        conflict(
          ErrorType,
          `source Thread ${source.header.owner.ownerId} is not live and cannot contribute through the Thread-owner path`,
        );
      }
    }
    if (source.genomeDigest !== recombinationWitness.sourceGenomeDigests[index]) {
      conflict(ErrorType, `source genome ${sourceRef} digest changed from the recombination witness`);
    }
    return source;
  });

  const selections = replayRecombinationSelection(bundle, sources);
  for (let index = 0; index < bundle.loci.length; index += 1) {
    const locus = bundle.loci[index];
    const selection = selections[index];
    if (
      locus.provenance.sourceGenomeRef !== selection.sourceGenomeRef ||
      locus.provenance.sourceLocusRef !== selection.sourceLocusRef
    ) {
      conflict(ErrorType, `locus ${locus.locusId} does not match deterministic crossover witness`);
    }
    const source = sources.find(
      (candidate) => candidate.header.genomeId === selection.sourceGenomeRef,
    );
    const sourceLocus = source.loci[locus.ordinal - 1];
    if (locus.provenance.kind === "inherited" && locus.value !== sourceLocus.value) {
      conflict(ErrorType, `inherited locus ${locus.locusId} changed source text without a mutation witness`);
    }
    if (locus.provenance.kind === "mutated") {
      const mutation = bundle.mutations.find(
        (item) => item.mutationId === locus.provenance.mutationRef,
      );
      if (mutation === undefined) {
        conflict(ErrorType, `mutated locus ${locus.locusId} has no mutation witness`);
      }
      if (
        mutation.sourceGenomeRef !== selection.sourceGenomeRef ||
        mutation.sourceLocusRef !== selection.sourceLocusRef ||
        mutation.replacementValue !== locus.value ||
        mutation.priorValueDigest !== `sha256:${sha256(sourceLocus.value)}`
      ) {
        conflict(ErrorType, `mutation ${mutation.mutationId} does not explain locus ${locus.locusId}`);
      }
    }
  }
  if (
    bundle.mutations.length !==
    bundle.loci.filter((locus) => locus.provenance.kind === "mutated").length
  ) {
    conflict(ErrorType, "mutation witnesses and mutated loci are not one-to-one");
  }
  return sources;
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

  for (let index = 0; index < relations.length; index += 1) {
    const relation = relations[index];
    const expectedOwner = sourceOwners[index];
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
      relation.relatedParty.partyId !== expectedOwner.ownerId
    ) {
      conflict(
        ErrorType,
        "Genesis parent-genome-source relation does not match the symbolic-genome source owner",
      );
    }
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

  const digest = situatedRecordDigest("life_relation", relation, null);
  database.prepare(`
    INSERT INTO life_relation_records(
      relation_id,revision,thread_id,related_party_id,relation_kind,
      genetic_contribution_role,visibility,provenance,recorded_at,
      supersedes_revision,record_json,record_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    relation.relationId,
    relation.revision,
    relation.threadId,
    relation.relatedParty.partyId,
    relation.relationKind,
    relation.geneticContributionRole,
    relation.visibility,
    relation.provenance,
    relation.recordedAt,
    null,
    canonicalJson(relation),
    digest,
  );
  database.prepare(`
    INSERT INTO situated_life_lineage_heads(
      ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
    ) VALUES ('life_relation',?,?,?,?,?)
  `).run(
    relation.relationId,
    relation.revision,
    relation.threadId,
    digest,
    relation.recordedAt,
  );

  const witnessRef = lifeRelationRevisionRef(relation);
  const witness = database.prepare(`
    SELECT reference,thread_id,witness_kind,source_id,revision,record_digest
    FROM situated_evidence_witnesses WHERE reference=?
  `).get(witnessRef);
  if (
    witness === undefined ||
    witness.thread_id !== relation.threadId ||
    witness.witness_kind !== "life_relation_revision" ||
    witness.source_id !== relation.relationId ||
    Number(witness.revision) !== relation.revision ||
    witness.record_digest !== digest
  ) {
    throw new IntegrityError(
      `Genesis life relation ${relation.relationId} did not publish its canonical #38 evidence witness`,
    );
  }
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

  const bundle = readBirthSymbolicGenomeInTransaction(database, manifest.genomeRef, { ErrorType });
  if (
    bundle.header.owner.kind !== "thread" ||
    bundle.header.owner.ownerId !== manifest.threadId
  ) {
    conflict(ErrorType, "Genesis manifest genome does not belong to the child Thread");
  }
  if (bundle.header.genesisId !== manifest.genesisId) {
    conflict(ErrorType, "Genesis manifest genome belongs to another genesisId");
  }
  const sources = assertRecombinedSourcesInTransaction(database, bundle, ErrorType);

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
