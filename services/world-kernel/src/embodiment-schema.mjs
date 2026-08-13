import { ensureEmbodimentIntegrity } from "./embodiment-integrity.mjs";

export function createEmbodimentTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS embodiment_rights_authorities (
      authority_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      authority_kind TEXT NOT NULL,
      source_party_id TEXT NOT NULL,
      max_visibility TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_embodiment_rights_thread
      ON embodiment_rights_authorities(thread_id, authority_kind, recorded_at, authority_id);

    CREATE TABLE IF NOT EXISTS embodiment_rights_revocations (
      revocation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      authority_id TEXT NOT NULL UNIQUE,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (authority_id) REFERENCES embodiment_rights_authorities(authority_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_embodiment_rights_revocations_thread
      ON embodiment_rights_revocations(thread_id, recorded_at, authority_id);

    CREATE TABLE IF NOT EXISTS embodiment_records (
      embodiment_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      representation_kind TEXT NOT NULL,
      truth_status TEXT NOT NULL,
      rights_basis TEXT NOT NULL,
      visibility TEXT NOT NULL,
      status TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_revision INTEGER,
      specification_digest TEXT NOT NULL CHECK (specification_digest LIKE 'sha256:%'),
      asset_sha256 TEXT,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (embodiment_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((revision=1 AND supersedes_revision IS NULL) OR (revision>1 AND supersedes_revision=revision-1))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS embodiment_lineage_heads (
      embodiment_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      head_digest TEXT NOT NULL CHECK (head_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (embodiment_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_embodiment_thread
      ON embodiment_records(thread_id, kind, recorded_at, embodiment_id, revision);

    CREATE TRIGGER IF NOT EXISTS embodiment_rights_no_update
      BEFORE UPDATE ON embodiment_rights_authorities
      BEGIN SELECT RAISE(ABORT,'embodiment_rights_authorities is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_rights_no_delete
      BEFORE DELETE ON embodiment_rights_authorities
      BEGIN SELECT RAISE(ABORT,'embodiment_rights_authorities is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_rights_revocations_no_update
      BEFORE UPDATE ON embodiment_rights_revocations
      BEGIN SELECT RAISE(ABORT,'embodiment_rights_revocations is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_rights_revocations_no_delete
      BEFORE DELETE ON embodiment_rights_revocations
      BEGIN SELECT RAISE(ABORT,'embodiment_rights_revocations is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_no_update
      BEFORE UPDATE ON embodiment_records
      BEGIN SELECT RAISE(ABORT,'embodiment_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_no_delete
      BEFORE DELETE ON embodiment_records
      BEGIN SELECT RAISE(ABORT,'embodiment_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_heads_no_update
      BEFORE UPDATE ON embodiment_lineage_heads
      BEGIN SELECT RAISE(ABORT,'embodiment_lineage_heads is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_heads_no_delete
      BEFORE DELETE ON embodiment_lineage_heads
      BEGIN SELECT RAISE(ABORT,'embodiment_lineage_heads is append-only'); END;
  `);
  ensureEmbodimentIntegrity(database);
}
