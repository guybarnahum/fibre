export function createGenesisTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS genesis_world_specs (
      world_spec_id TEXT PRIMARY KEY,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS genesis_manifests (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      origin_mode TEXT NOT NULL,
      world_spec_id TEXT NOT NULL,
      publication_status TEXT NOT NULL CHECK (publication_status IN ('published','failed')),
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      created_at TEXT NOT NULL,
      FOREIGN KEY (world_spec_id) REFERENCES genesis_world_specs(world_spec_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS genesis_generation_attempts (
      attempt_id TEXT PRIMARY KEY,
      genesis_id TEXT NOT NULL,
      provisional_thread_id TEXT NOT NULL,
      candidate_attempt_number INTEGER NOT NULL CHECK (candidate_attempt_number >= 1),
      scope TEXT NOT NULL CHECK (scope IN ('record_repair','candidate_failure')),
      failed_pass TEXT NOT NULL,
      failed_gate TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS genesis_origin_authorities (
      authority_ref TEXT PRIMARY KEY,
      authority_kind TEXT NOT NULL CHECK (authority_kind IN ('living_source_consent','subject_status_attestation')),
      source_party_id TEXT NOT NULL,
      subject_status TEXT NOT NULL CHECK (subject_status IN ('living','deceased','fictional')),
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      asserted_at TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_genesis_attempts_genesis
      ON genesis_generation_attempts(genesis_id, candidate_attempt_number, recorded_at, attempt_id);
    CREATE INDEX IF NOT EXISTS idx_genesis_origin_authority_source
      ON genesis_origin_authorities(source_party_id, authority_kind, asserted_at, authority_ref);

    CREATE TRIGGER IF NOT EXISTS genesis_world_specs_no_update
      BEFORE UPDATE ON genesis_world_specs
      BEGIN SELECT RAISE(ABORT,'genesis_world_specs is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_world_specs_no_delete
      BEFORE DELETE ON genesis_world_specs
      BEGIN SELECT RAISE(ABORT,'genesis_world_specs is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_manifests_no_update
      BEFORE UPDATE ON genesis_manifests
      BEGIN SELECT RAISE(ABORT,'genesis_manifests is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_manifests_no_delete
      BEFORE DELETE ON genesis_manifests
      BEGIN SELECT RAISE(ABORT,'genesis_manifests is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_generation_attempts_no_update
      BEFORE UPDATE ON genesis_generation_attempts
      BEGIN SELECT RAISE(ABORT,'genesis_generation_attempts is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_generation_attempts_no_delete
      BEFORE DELETE ON genesis_generation_attempts
      BEGIN SELECT RAISE(ABORT,'genesis_generation_attempts is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_origin_authorities_no_update
      BEFORE UPDATE ON genesis_origin_authorities
      BEGIN SELECT RAISE(ABORT,'genesis_origin_authorities is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_origin_authorities_no_delete
      BEFORE DELETE ON genesis_origin_authorities
      BEGIN SELECT RAISE(ABORT,'genesis_origin_authorities is immutable'); END;
  `);
}
