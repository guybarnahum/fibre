export function createSymbolicGenomeTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS symbolic_genomes (
      genome_id TEXT PRIMARY KEY,
      owner_kind TEXT NOT NULL CHECK (owner_kind IN ('thread','synthetic_ancestor')),
      owner_id TEXT NOT NULL,
      genesis_id TEXT NOT NULL,
      origin_kind TEXT NOT NULL CHECK (origin_kind IN ('de_novo','recombined')),
      header_json TEXT NOT NULL CHECK (json_valid(header_json)),
      genome_digest TEXT NOT NULL CHECK (
        length(genome_digest)=71 AND substr(genome_digest,1,7)='sha256:' AND
        substr(genome_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      created_at TEXT NOT NULL,
      UNIQUE (owner_kind, owner_id, genesis_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS symbolic_genome_loci (
      locus_id TEXT PRIMARY KEY,
      genome_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL CHECK (ordinal >= 1),
      value TEXT NOT NULL,
      provenance_kind TEXT NOT NULL CHECK (provenance_kind IN ('de_novo','inherited','mutated')),
      source_genome_ref TEXT,
      source_locus_ref TEXT,
      mutation_ref TEXT,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (
        length(record_digest)=71 AND substr(record_digest,1,7)='sha256:' AND
        substr(record_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      UNIQUE (genome_id, ordinal),
      FOREIGN KEY (genome_id) REFERENCES symbolic_genomes(genome_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS symbolic_genome_mutations (
      mutation_id TEXT PRIMARY KEY,
      genome_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL CHECK (ordinal >= 1),
      operation TEXT NOT NULL CHECK (operation='replace_locus'),
      source_genome_ref TEXT NOT NULL,
      source_locus_ref TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (
        length(record_digest)=71 AND substr(record_digest,1,7)='sha256:' AND
        substr(record_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      created_at TEXT NOT NULL,
      UNIQUE (genome_id, ordinal),
      FOREIGN KEY (genome_id) REFERENCES symbolic_genomes(genome_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_symbolic_genome_owner
      ON symbolic_genomes(owner_kind, owner_id, created_at, genome_id);
    CREATE INDEX IF NOT EXISTS idx_symbolic_genome_loci_order
      ON symbolic_genome_loci(genome_id, ordinal);

    CREATE TRIGGER IF NOT EXISTS symbolic_genomes_no_update
      BEFORE UPDATE ON symbolic_genomes
      BEGIN SELECT RAISE(ABORT,'symbolic_genomes is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS symbolic_genomes_no_delete
      BEFORE DELETE ON symbolic_genomes
      BEGIN SELECT RAISE(ABORT,'symbolic_genomes is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS symbolic_genome_loci_no_update
      BEFORE UPDATE ON symbolic_genome_loci
      BEGIN SELECT RAISE(ABORT,'symbolic_genome_loci is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS symbolic_genome_loci_no_delete
      BEFORE DELETE ON symbolic_genome_loci
      BEGIN SELECT RAISE(ABORT,'symbolic_genome_loci is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS symbolic_genome_mutations_no_update
      BEFORE UPDATE ON symbolic_genome_mutations
      BEGIN SELECT RAISE(ABORT,'symbolic_genome_mutations is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS symbolic_genome_mutations_no_delete
      BEFORE DELETE ON symbolic_genome_mutations
      BEGIN SELECT RAISE(ABORT,'symbolic_genome_mutations is immutable'); END;
  `);
}
