export function createEmbodimentTables(database) {
  database.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_embodiment_thread
      ON embodiment_records(thread_id, kind, recorded_at, embodiment_id, revision);

    CREATE TRIGGER IF NOT EXISTS embodiment_no_update
      BEFORE UPDATE ON embodiment_records
      BEGIN SELECT RAISE(ABORT,'embodiment_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS embodiment_no_delete
      BEFORE DELETE ON embodiment_records
      BEGIN SELECT RAISE(ABORT,'embodiment_records is append-only'); END;
  `);
}
