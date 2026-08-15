import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  normalizeSymbolicGenomeHeader,
  normalizeSymbolicGenomeLocus,
  normalizeSymbolicGenomeMutation,
  replayRecombinationSelection,
  symbolicGenomeDigest,
} from "./symbolic-genome-domain.mjs";
import { createSymbolicGenomeTables } from "./symbolic-genome-schema.mjs";

export class SymbolicGenomeConflictError extends Error {}
export class SymbolicGenomeNotFoundError extends Error {}

const GENOME_TABLES = Object.freeze([
  "symbolic_genomes",
  "symbolic_genome_loci",
  "symbolic_genome_mutations",
]);

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

function schemaPresent(database) {
  return GENOME_TABLES.every((tableName) => tableExists(database, tableName));
}

function parseRecord(name, json) {
  try { return JSON.parse(json); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function recordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function canonicalBundle(bundle) {
  return canonicalJson({
    header: bundle.header,
    loci: bundle.loci,
    mutations: bundle.mutations,
    genomeDigest: bundle.genomeDigest,
  });
}

export class SymbolicGenomeStore {
  #database;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    try {
      if (readOnly) {
        this.#database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      } else {
        this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        migrateDatabase(this.#database);
        this.#database.exec("BEGIN IMMEDIATE");
        createSymbolicGenomeTables(this.#database);
        this.#database.exec("COMMIT");
      }
    } catch (error) {
      safeRollback(this.#database);
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  queryOnly() {
    return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1;
  }

  #threadExists(threadId) {
    return tableExists(this.#database, "threads") && this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(threadId) !== undefined;
  }

  #readBundle(genomeId, { required = true } = {}) {
    assertId("genomeId", genomeId);
    if (!schemaPresent(this.#database)) {
      if (!required) return null;
      throw new SymbolicGenomeNotFoundError("symbolic genome storage is not present in this world");
    }
    const genomeRow = this.#database.prepare(`
      SELECT header_json,genome_digest FROM symbolic_genomes WHERE genome_id=?
    `).get(genomeId);
    if (genomeRow === undefined) {
      if (!required) return null;
      throw new SymbolicGenomeNotFoundError(`symbolic genome ${genomeId} was not found`);
    }
    const header = normalizeSymbolicGenomeHeader(parseRecord(`symbolic genome ${genomeId}`, genomeRow.header_json));
    const loci = this.#database.prepare(`
      SELECT record_json,record_digest FROM symbolic_genome_loci
      WHERE genome_id=? ORDER BY ordinal
    `).all(genomeId).map((row) => {
      const locus = normalizeSymbolicGenomeLocus(parseRecord(`symbolic genome ${genomeId} locus`, row.record_json));
      if (recordDigest("locus", locus) !== row.record_digest || canonicalJson(locus) !== row.record_json) {
        throw new IntegrityError(`symbolic genome locus ${locus.locusId} failed canonical/digest verification`);
      }
      return locus;
    });
    const mutations = this.#database.prepare(`
      SELECT record_json,record_digest FROM symbolic_genome_mutations
      WHERE genome_id=? ORDER BY ordinal
    `).all(genomeId).map((row) => {
      const mutation = normalizeSymbolicGenomeMutation(parseRecord(`symbolic genome ${genomeId} mutation`, row.record_json));
      if (recordDigest("mutation", mutation) !== row.record_digest || canonicalJson(mutation) !== row.record_json) {
        throw new IntegrityError(`symbolic genome mutation ${mutation.mutationId} failed canonical/digest verification`);
      }
      return mutation;
    });
    const bundle = { header, loci, mutations, genomeDigest: genomeRow.genome_digest };
    const actualDigest = symbolicGenomeDigest(bundle);
    if (actualDigest !== genomeRow.genome_digest || canonicalJson(header) !== genomeRow.header_json) {
      throw new IntegrityError(`symbolic genome ${genomeId} failed aggregate digest verification`);
    }
    if (loci.length < 2 || loci.some((locus, index) => locus.ordinal !== index + 1)) {
      throw new IntegrityError(`symbolic genome ${genomeId} locus order is not contiguous`);
    }
    return bundle;
  }

  getGenome(genomeId, { required = true } = {}) {
    const bundle = this.#readBundle(genomeId, { required });
    return bundle === null ? null : structuredClone(bundle);
  }

  listThreadGenomes(threadId) {
    assertId("threadId", threadId);
    if (!tableExists(this.#database, "symbolic_genomes")) return [];
    return this.#database.prepare(`
      SELECT genome_id FROM symbolic_genomes WHERE thread_id=? ORDER BY created_at,genome_id
    `).all(threadId).map(({ genome_id: genomeId }) => this.getGenome(genomeId));
  }

  #validateRecombinedSources(bundle) {
    const header = bundle.header;
    if (header.originKind !== "recombined") return [];
    const sourceRefs = header.sourceEligibility.sourceGenomeRefs;
    if (canonicalJson(sourceRefs) !== canonicalJson(header.recombinationWitness.sourceGenomeRefs)) {
      throw new SymbolicGenomeConflictError("recombination witness and source eligibility disagree");
    }
    const sources = sourceRefs.map((sourceRef, index) => {
      const source = this.#readBundle(sourceRef);
      if (source.header.threadId !== header.sourceEligibility.sourceThreadRefs[index]) {
        throw new SymbolicGenomeConflictError(`source genome ${sourceRef} does not belong to its declared source Thread`);
      }
      if (!this.#threadExists(source.header.threadId)) {
        throw new SymbolicGenomeConflictError(`source Thread ${source.header.threadId} is not live and cannot contribute a v1 genome`);
      }
      if (source.genomeDigest !== header.recombinationWitness.sourceGenomeDigests[index]) {
        throw new SymbolicGenomeConflictError(`source genome ${sourceRef} digest changed from the recombination witness`);
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
        throw new SymbolicGenomeConflictError(`locus ${locus.locusId} does not match deterministic crossover witness`);
      }
      const source = sources.find((candidate) => candidate.header.genomeId === selection.sourceGenomeRef);
      const sourceLocus = source.loci[locus.ordinal - 1];
      if (locus.provenance.kind === "inherited" && locus.value !== sourceLocus.value) {
        throw new SymbolicGenomeConflictError(`inherited locus ${locus.locusId} changed source text without a mutation witness`);
      }
      if (locus.provenance.kind === "mutated") {
        const mutation = bundle.mutations.find((item) => item.mutationId === locus.provenance.mutationRef);
        if (mutation === undefined) throw new SymbolicGenomeConflictError(`mutated locus ${locus.locusId} has no mutation witness`);
        if (
          mutation.sourceGenomeRef !== selection.sourceGenomeRef ||
          mutation.sourceLocusRef !== selection.sourceLocusRef ||
          mutation.replacementValue !== locus.value ||
          mutation.priorValueDigest !== `sha256:${sha256(sourceLocus.value)}`
        ) {
          throw new SymbolicGenomeConflictError(`mutation ${mutation.mutationId} does not explain locus ${locus.locusId}`);
        }
      }
    }
    if (bundle.mutations.length !== bundle.loci.filter((locus) => locus.provenance.kind === "mutated").length) {
      throw new SymbolicGenomeConflictError("mutation witnesses and mutated loci are not one-to-one");
    }
    return sources;
  }

  recordGenome(candidateBundle) {
    if (this.#readOnly) throw new SymbolicGenomeConflictError("read-only symbolic genome store cannot write");
    const header = normalizeSymbolicGenomeHeader(candidateBundle.header);
    const loci = candidateBundle.loci.map(normalizeSymbolicGenomeLocus).sort((a, b) => a.ordinal - b.ordinal);
    const mutations = (candidateBundle.mutations ?? []).map(normalizeSymbolicGenomeMutation).sort((a, b) => a.ordinal - b.ordinal);
    const bundle = {
      header,
      loci,
      mutations,
      genomeDigest: candidateBundle.genomeDigest,
    };
    if (loci.some((locus) => locus.genomeId !== header.genomeId) || mutations.some((mutation) => mutation.genomeId !== header.genomeId)) {
      throw new SymbolicGenomeConflictError("locus/mutation belongs to another genome");
    }
    if (loci.length < 2 || loci.some((locus, index) => locus.ordinal !== index + 1)) {
      throw new SymbolicGenomeConflictError("symbolic genome loci must be contiguous from ordinal 1");
    }
    const expectedDigest = symbolicGenomeDigest(bundle);
    if (bundle.genomeDigest !== expectedDigest) {
      throw new SymbolicGenomeConflictError("symbolic genome digest does not match content");
    }
    if (header.originKind === "de_novo") {
      if (loci.some((locus) => locus.provenance.kind !== "de_novo") || mutations.length !== 0) {
        throw new SymbolicGenomeConflictError("de_novo genome may contain only de_novo loci");
      }
    } else {
      this.#validateRecombinedSources(bundle);
    }

    const existing = this.#readBundle(header.genomeId, { required: false });
    if (existing !== null) {
      if (canonicalBundle(existing) !== canonicalBundle(bundle)) {
        throw new SymbolicGenomeConflictError(`symbolic genome ${header.genomeId} already exists with different content`);
      }
      return { ...structuredClone(existing), idempotent: true };
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO symbolic_genomes(
          genome_id,thread_id,genesis_id,origin_kind,header_json,genome_digest,created_at
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        header.genomeId,
        header.threadId,
        header.genesisId,
        header.originKind,
        canonicalJson(header),
        bundle.genomeDigest,
        header.createdAt,
      );
      const locusInsert = this.#database.prepare(`
        INSERT INTO symbolic_genome_loci(
          locus_id,genome_id,ordinal,value,provenance_kind,source_genome_ref,
          source_locus_ref,mutation_ref,record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `);
      for (const locus of loci) {
        locusInsert.run(
          locus.locusId,
          locus.genomeId,
          locus.ordinal,
          locus.value,
          locus.provenance.kind,
          locus.provenance.sourceGenomeRef,
          locus.provenance.sourceLocusRef,
          locus.provenance.mutationRef,
          canonicalJson(locus),
          recordDigest("locus", locus),
        );
      }
      const mutationInsert = this.#database.prepare(`
        INSERT INTO symbolic_genome_mutations(
          mutation_id,genome_id,ordinal,operation,source_genome_ref,source_locus_ref,
          record_json,record_digest,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?)
      `);
      for (const mutation of mutations) {
        mutationInsert.run(
          mutation.mutationId,
          mutation.genomeId,
          mutation.ordinal,
          mutation.operation,
          mutation.sourceGenomeRef,
          mutation.sourceLocusRef,
          canonicalJson(mutation),
          recordDigest("mutation", mutation),
          mutation.createdAt,
        );
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { ...structuredClone(bundle), idempotent: false };
  }

  inspectGenome(genomeId) {
    const bundle = this.#readBundle(genomeId, { required: false });
    if (bundle === null) return { genomeId, genome: null, sources: [] };
    const sources = bundle.header.originKind === "recombined"
      ? bundle.header.sourceEligibility.sourceGenomeRefs.map((sourceRef) => {
          const source = this.#readBundle(sourceRef);
          return {
            genomeId: source.header.genomeId,
            threadId: source.header.threadId,
            genomeDigest: source.genomeDigest,
            locusCount: source.loci.length,
          };
        })
      : [];
    return { genomeId, genome: bundle, sources };
  }
}
