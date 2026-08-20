import { DatabaseSync } from "node:sqlite";

import {
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
  normalizeSymbolicGenomeOwner,
  symbolicGenomeDigest,
} from "./symbolic-genome-domain.mjs";
import {
  assertRecombinedSymbolicGenomeSourcesInTransaction,
  readSymbolicGenomeInTransaction,
} from "./symbolic-genome-persistence.mjs";
import { createSymbolicGenomeTables } from "./symbolic-genome-schema.mjs";

export class SymbolicGenomeConflictError extends Error {}
export class SymbolicGenomeNotFoundError extends Error {}

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
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

  #readBundle(genomeId, { required = true } = {}) {
    assertId("genomeId", genomeId);
    return readSymbolicGenomeInTransaction(this.#database, genomeId, {
      required,
      ErrorType: SymbolicGenomeNotFoundError,
    });
  }

  getGenome(genomeId, { required = true } = {}) {
    const bundle = this.#readBundle(genomeId, { required });
    return bundle === null ? null : structuredClone(bundle);
  }

  listOwnerGenomes(ownerCandidate) {
    const owner = normalizeSymbolicGenomeOwner(ownerCandidate);
    if (!tableExists(this.#database, "symbolic_genomes")) return [];
    return this.#database.prepare(`
      SELECT genome_id FROM symbolic_genomes
      WHERE owner_kind=? AND owner_id=? ORDER BY created_at,genome_id
    `).all(owner.kind, owner.ownerId).map(({ genome_id: genomeId }) => this.getGenome(genomeId));
  }

  listThreadGenomes(threadId) {
    assertId("threadId", threadId);
    return this.listOwnerGenomes({ kind: "thread", ownerId: threadId });
  }

  recordGenome(candidateBundle) {
    if (this.#readOnly) throw new SymbolicGenomeConflictError("read-only symbolic genome store cannot write");
    const header = normalizeSymbolicGenomeHeader(candidateBundle.header);
    const loci = candidateBundle.loci.map(normalizeSymbolicGenomeLocus).sort((a, b) => a.ordinal - b.ordinal);
    const mutations = (candidateBundle.mutations ?? []).map(normalizeSymbolicGenomeMutation).sort((a, b) => a.ordinal - b.ordinal);
    const bundle = { header, loci, mutations, genomeDigest: candidateBundle.genomeDigest };
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
      assertRecombinedSymbolicGenomeSourcesInTransaction(this.#database, bundle, {
        ErrorType: SymbolicGenomeConflictError,
      });
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
          genome_id,owner_kind,owner_id,genesis_id,origin_kind,header_json,genome_digest,created_at
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        header.genomeId,
        header.owner.kind,
        header.owner.ownerId,
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
            owner: source.header.owner,
            genomeDigest: source.genomeDigest,
            locusCount: source.loci.length,
          };
        })
      : [];
    return { genomeId, genome: bundle, sources };
  }
}
