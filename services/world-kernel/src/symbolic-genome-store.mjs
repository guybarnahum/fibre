
import {
  IntegrityError,
  assertId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import {
  SYMBOLIC_GENOME_POLICY,
  buildDeNovoSymbolicGenome,
  normalizeSymbolicGenomeHeader,
  normalizeSymbolicGenomeLocus,
  normalizeSymbolicGenomeMutation,
  normalizeSymbolicGenomeOwner,
  normalizeSymbolicRuntimeBaselines,
  symbolicGenomeDigest,
} from "./symbolic-genome-domain.mjs";
import {
  assertRecombinedSymbolicGenomeSourcesInTransaction,
  readSymbolicGenomeInTransaction,
} from "./symbolic-genome-persistence.mjs";
import { createSymbolicGenomeTables } from "./symbolic-genome-schema.mjs";

export class SymbolicGenomeConflictError extends Error {}
export class SymbolicGenomeNotFoundError extends Error {}

const LEGACY_SYMBOLIC_GENOME_POLICY = Object.freeze({
  id:"fibre_symbolic_genome",
  version:"1",
});

const SYMBOLIC_GENOMES_UPDATE_GUARD = `
  CREATE TRIGGER IF NOT EXISTS symbolic_genomes_no_update
  BEFORE UPDATE ON symbolic_genomes
  BEGIN SELECT RAISE(ABORT,'symbolic_genomes is immutable'); END;
`;

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

function recordDigest(kind, record) {
  return `sha256:${sha256(canonicalJson({ kind, record }))}`;
}

function parseStoredJson(name, value) {
  try { return JSON.parse(value); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function samePolicy(left, right) {
  return left !== null
    && typeof left === "object"
    && !Array.isArray(left)
    && canonicalJson(left) === canonicalJson({ id:right.id, version:right.version });
}

function threadGenomeRows(database, threadId) {
  if (!tableExists(database, "symbolic_genomes")) return [];
  return database.prepare(`
    SELECT genome_id,header_json,genome_digest
    FROM symbolic_genomes
    WHERE owner_kind='thread' AND owner_id=?
    ORDER BY created_at,genome_id
  `).all(threadId);
}

function migrationInspection(database, threadId) {
  const rows = threadGenomeRows(database, threadId);
  if (rows.length === 0) return Object.freeze({ state:"none", genomeIds:Object.freeze([]) });

  const legacy = [];
  const unsupported = [];
  for (const row of rows) {
    const header = parseStoredJson(`symbolic genome ${row.genome_id}`, row.header_json);
    if (samePolicy(header?.inheritancePolicy, SYMBOLIC_GENOME_POLICY)) continue;
    if (samePolicy(header?.inheritancePolicy, LEGACY_SYMBOLIC_GENOME_POLICY)) {
      legacy.push(Object.freeze({ genomeId:row.genome_id, originKind:header.originKind ?? null }));
      continue;
    }
    unsupported.push(row.genome_id);
  }
  if (unsupported.length > 0) {
    return Object.freeze({
      state:"unsupported",
      genomeIds:Object.freeze(rows.map((row) => row.genome_id)),
      unsupportedGenomeIds:Object.freeze(unsupported),
    });
  }
  if (legacy.length === 0) {
    return Object.freeze({ state:"current", genomeIds:Object.freeze(rows.map((row) => row.genome_id)) });
  }
  return Object.freeze({
    state:legacy.some((entry) => entry.originKind !== "de_novo")
      ? "legacy_v1_recombined"
      : "legacy_v1_de_novo",
    genomeIds:Object.freeze(rows.map((row) => row.genome_id)),
    legacyGenomeIds:Object.freeze(legacy.map((entry) => entry.genomeId)),
  });
}

function legacyV1DeNovoUpgrade(database, row, threadId) {
  const header = parseStoredJson(`symbolic genome ${row.genome_id}`, row.header_json);
  if (!samePolicy(header?.inheritancePolicy, LEGACY_SYMBOLIC_GENOME_POLICY) || header?.originKind !== "de_novo") {
    throw new TypeError("symbolic genome migration supports only v1 de_novo genomes");
  }
  if (header?.owner?.kind !== "thread" || header?.owner?.ownerId !== threadId) {
    throw new IntegrityError(`symbolic genome ${row.genome_id} owner does not match Thread ${threadId}`);
  }

  const loci = database.prepare(`
    SELECT record_json,record_digest
    FROM symbolic_genome_loci
    WHERE genome_id=?
    ORDER BY ordinal
  `).all(row.genome_id).map((stored) => {
    const locus = normalizeSymbolicGenomeLocus(
      parseStoredJson(`symbolic genome ${row.genome_id} locus`, stored.record_json),
    );
    if (canonicalJson(locus) !== stored.record_json || recordDigest("locus", locus) !== stored.record_digest) {
      throw new IntegrityError(`symbolic genome locus ${locus.locusId} failed canonical/digest verification`);
    }
    return locus;
  });
  const mutationRows = database.prepare(`
    SELECT record_json,record_digest
    FROM symbolic_genome_mutations
    WHERE genome_id=?
    ORDER BY ordinal
  `).all(row.genome_id);
  const mutations = mutationRows.map((stored) => {
    const mutation = normalizeSymbolicGenomeMutation(
      parseStoredJson(`symbolic genome ${row.genome_id} mutation`, stored.record_json),
    );
    if (canonicalJson(mutation) !== stored.record_json || recordDigest("mutation", mutation) !== stored.record_digest) {
      throw new IntegrityError(`symbolic genome mutation ${mutation.mutationId} failed canonical/digest verification`);
    }
    return mutation;
  });
  if (mutations.length !== 0) {
    throw new TypeError("v1 de_novo genome migration refuses mutation witnesses");
  }
  const baselineCount = Number(database.prepare(`
    SELECT COUNT(*) AS n FROM symbolic_genome_runtime_baselines WHERE genome_id=?
  `).get(row.genome_id).n);
  if (baselineCount !== 0) {
    throw new IntegrityError(`legacy symbolic genome ${row.genome_id} unexpectedly already has runtime baselines`);
  }

  if (canonicalJson(header) !== row.header_json) {
    throw new IntegrityError(`symbolic genome ${row.genome_id} header is not canonical`);
  }
  const legacyDigest = `sha256:${sha256(canonicalJson({ header, loci, mutations }))}`;
  if (legacyDigest !== row.genome_digest) {
    throw new IntegrityError(`symbolic genome ${row.genome_id} failed v1 aggregate digest verification`);
  }

  const current = buildDeNovoSymbolicGenome({
    threadId,
    genesisId:header.genesisId,
    values:loci.map((locus) => locus.value),
    createdAt:header.createdAt,
  });
  const expectedLegacyHeader = {
    ...current.header,
    inheritancePolicy:{ ...LEGACY_SYMBOLIC_GENOME_POLICY },
  };
  if (
    current.header.genomeId !== row.genome_id
    || canonicalJson(expectedLegacyHeader) !== canonicalJson(header)
    || canonicalJson(current.loci) !== canonicalJson(loci)
  ) {
    throw new IntegrityError(`symbolic genome ${row.genome_id} cannot migrate to v2 without changing symbolic identity`);
  }

  return Object.freeze({
    genomeId:row.genome_id,
    beforeDigest:row.genome_digest,
    current,
  });
}

function canonicalBundle(bundle) {
  return canonicalJson({
    header: bundle.header,
    loci: bundle.loci,
    runtimeBaselines:bundle.runtimeBaselines,
    mutations: bundle.mutations,
    genomeDigest: bundle.genomeDigest,
  });
}

export class SymbolicGenomeStore {
  #database;
  #readOnly;

  constructor(storage, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = openWorldStateDatabase(storage, { readOnly, storeName: "SymbolicGenomeStore" });
    try {
      if (!readOnly) {
        migrateDatabase(this.#database);
        this.#database.transaction(() => {
          createSymbolicGenomeTables(this.#database);
        });
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  queryOnly() {
    return this.#readOnly;
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

  inspectThreadGenomeMigration(threadId) {
    assertId("threadId", threadId);
    return migrationInspection(this.#database, threadId);
  }

  migrateThreadGenomeV1ToV2(threadId) {
    if (this.#readOnly) throw new SymbolicGenomeConflictError("read-only symbolic genome store cannot migrate");
    assertId("threadId", threadId);
    const before = migrationInspection(this.#database, threadId);
    if (before.state === "none" || before.state === "current") {
      return Object.freeze({ migrated:false, before, after:before, genomes:Object.freeze([]) });
    }
    if (before.state === "legacy_v1_recombined") {
      throw new TypeError("v1 recombined genome requires a meaning-preserving lineage migration before v2");
    }
    if (before.state !== "legacy_v1_de_novo") {
      throw new TypeError("symbolic genome policy is not migratable to v2");
    }

    const rows = threadGenomeRows(this.#database, threadId)
      .filter((row) => samePolicy(
        parseStoredJson(`symbolic genome ${row.genome_id}`, row.header_json)?.inheritancePolicy,
        LEGACY_SYMBOLIC_GENOME_POLICY,
      ));
    const upgrades = rows.map((row) => legacyV1DeNovoUpgrade(this.#database, row, threadId));

    this.#database.transaction(() => {
      this.#database.exec("DROP TRIGGER IF EXISTS symbolic_genomes_no_update");
      for (const upgrade of upgrades) {
        const updated = this.#database.prepare(`
          UPDATE symbolic_genomes
          SET header_json=?,genome_digest=?
          WHERE genome_id=? AND genome_digest=?
        `).run(
          canonicalJson(upgrade.current.header),
          upgrade.current.genomeDigest,
          upgrade.genomeId,
          upgrade.beforeDigest,
        );
        if (Number(updated.changes) !== 1) {
          throw new SymbolicGenomeConflictError(`symbolic genome ${upgrade.genomeId} changed during migration`);
        }
        const insert = this.#database.prepare(`
          INSERT INTO symbolic_genome_runtime_baselines(genome_id,baseline_key,value)
          VALUES (?,?,?)
        `);
        for (const [key, value] of Object.entries(upgrade.current.runtimeBaselines)) {
          insert.run(upgrade.genomeId, key, value);
        }
      }
      this.#database.exec(SYMBOLIC_GENOMES_UPDATE_GUARD);
    });

    const after = migrationInspection(this.#database, threadId);
    if (after.state !== "current") throw new SymbolicGenomeConflictError("symbolic genome migration did not converge");
    const genomes = upgrades.map((upgrade) => this.getGenome(upgrade.genomeId));
    return Object.freeze({
      migrated:true,
      before,
      after,
      genomes:Object.freeze(genomes.map((genome) => Object.freeze({
        genomeId:genome.header.genomeId,
        beforeDigest:upgrades.find((item) => item.genomeId === genome.header.genomeId).beforeDigest,
        afterDigest:genome.genomeDigest,
        locusCount:genome.loci.length,
        runtimeBaselines:structuredClone(genome.runtimeBaselines),
      }))),
    });
  }

  recordGenome(candidateBundle) {
    if (this.#readOnly) throw new SymbolicGenomeConflictError("read-only symbolic genome store cannot write");
    const header = normalizeSymbolicGenomeHeader(candidateBundle.header);
    const loci = candidateBundle.loci.map(normalizeSymbolicGenomeLocus).sort((a, b) => a.ordinal - b.ordinal);
    const runtimeBaselines = normalizeSymbolicRuntimeBaselines(candidateBundle.runtimeBaselines);
    const mutations = (candidateBundle.mutations ?? []).map(normalizeSymbolicGenomeMutation).sort((a, b) => a.ordinal - b.ordinal);
    const bundle = { header, loci, runtimeBaselines, mutations, genomeDigest: candidateBundle.genomeDigest };
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
      this.#database.transaction(() => {
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
        const baselineInsert = this.#database.prepare(`
          INSERT INTO symbolic_genome_runtime_baselines(genome_id,baseline_key,value)
          VALUES (?,?,?)
        `);
        for (const [key, value] of Object.entries(runtimeBaselines)) {
          baselineInsert.run(header.genomeId, key, value);
        }
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
      });
    } catch (error) {
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
