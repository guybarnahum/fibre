export function createAutobiographicalMemoryTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS autobiographical_memory_records (
      memory_id TEXT NOT NULL CHECK (
        length(memory_id)=68 AND substr(memory_id,1,4)='mem_' AND
        substr(memory_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('current','disputed','corrected','retracted')),
      visibility TEXT NOT NULL CHECK (visibility IN ('public','restricted','private')),
      remembered_at TEXT NOT NULL,
      as_of TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_revision INTEGER,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (
        length(record_digest)=71 AND substr(record_digest,1,7)='sha256:' AND
        substr(record_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      PRIMARY KEY (memory_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((revision=1 AND supersedes_revision IS NULL) OR
             (revision>1 AND supersedes_revision=revision-1))
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_autobiographical_memory_thread
      ON autobiographical_memory_records(thread_id,memory_id,revision);

    CREATE TABLE IF NOT EXISTS autobiographical_memory_lineage_heads (
      memory_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      head_digest TEXT NOT NULL CHECK (
        length(head_digest)=71 AND substr(head_digest,1,7)='sha256:' AND
        substr(head_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (memory_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS autobiographical_memory_no_update
      BEFORE UPDATE ON autobiographical_memory_records
      BEGIN SELECT RAISE(ABORT,'autobiographical_memory_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS autobiographical_memory_no_delete
      BEFORE DELETE ON autobiographical_memory_records
      BEGIN SELECT RAISE(ABORT,'autobiographical_memory_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS autobiographical_memory_heads_no_update
      BEFORE UPDATE ON autobiographical_memory_lineage_heads
      BEGIN SELECT RAISE(ABORT,'autobiographical_memory_lineage_heads is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS autobiographical_memory_heads_no_delete
      BEFORE DELETE ON autobiographical_memory_lineage_heads
      BEGIN SELECT RAISE(ABORT,'autobiographical_memory_lineage_heads is append-only'); END;
  `);
}
