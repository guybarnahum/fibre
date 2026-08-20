import {
  IntegrityError,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
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

function recordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function sameOwner(left, right) {
  return left.kind === right.kind && left.ownerId === right.ownerId;
}

function conflict(ErrorType, message) {
  throw new ErrorType(message);
}

export function readSymbolicGenomeInTransaction(
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
    if (recordDigest("locus", locus) !== row.record_digest || canonicalJson(locus) !== row.record_json) {
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
      recordDigest("mutation", mutation) !== row.record_digest ||
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

export function assertRecombinedSymbolicGenomeSourcesInTransaction(
  database,
  bundle,
  { ErrorType = TypeError } = {},
) {
  if (bundle.header.originKind !== "recombined") return [];
  const { sourceEligibility, recombinationWitness } = bundle.header;
  if (
    canonicalJson(sourceEligibility.sourceGenomeRefs) !==
    canonicalJson(recombinationWitness.sourceGenomeRefs)
  ) {
    conflict(ErrorType, "recombination witness and source eligibility disagree");
  }

  const sources = sourceEligibility.sourceGenomeRefs.map((sourceRef, index) => {
    const source = readSymbolicGenomeInTransaction(database, sourceRef, { ErrorType });
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
