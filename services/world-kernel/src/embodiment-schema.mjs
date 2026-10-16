export function createEmbodimentTables(database) {
  const needsReferenceIndex=database.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='embodiment_reference_index'
  `).get()===undefined;
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

    CREATE TABLE IF NOT EXISTS embodiment_current_heads (
      embodiment_id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      head_digest TEXT NOT NULL CHECK (head_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_embodiment_thread
      ON embodiment_records(thread_id, kind, recorded_at, embodiment_id, revision);
    CREATE INDEX IF NOT EXISTS idx_embodiment_current_thread
      ON embodiment_current_heads(thread_id,embodiment_id);

    CREATE TRIGGER IF NOT EXISTS embodiment_current_head_on_insert
      AFTER INSERT ON embodiment_lineage_heads
      BEGIN
        INSERT INTO embodiment_current_heads(
          embodiment_id,revision,thread_id,record_digest,head_digest,recorded_at
        ) VALUES (
          NEW.embodiment_id,
          NEW.revision,
          NEW.thread_id,
          (SELECT record_digest FROM embodiment_records
            WHERE embodiment_id=NEW.embodiment_id AND revision=NEW.revision),
          NEW.head_digest,
          NEW.recorded_at
        )
        ON CONFLICT(embodiment_id) DO UPDATE SET
          revision=excluded.revision,
          thread_id=excluded.thread_id,
          record_digest=excluded.record_digest,
          head_digest=excluded.head_digest,
          recorded_at=excluded.recorded_at
        WHERE excluded.revision > embodiment_current_heads.revision;
      END;

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

    -- Embodiment source and permission references are many-to-many. A
    -- separate indexed projection keeps arbitrary historical references
    -- resolvable without replaying every embodiment at each life boundary.
    CREATE TABLE IF NOT EXISTS embodiment_reference_index (
      thread_id TEXT NOT NULL,
      reference TEXT NOT NULL,
      embodiment_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      PRIMARY KEY(thread_id,reference,embodiment_id,revision)
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS embodiment_references_on_insert
      AFTER INSERT ON embodiment_records
      BEGIN
        INSERT OR IGNORE INTO embodiment_reference_index(
          thread_id,reference,embodiment_id,revision
        )
        SELECT NEW.thread_id,NEW.embodiment_id,NEW.embodiment_id,NEW.revision
        UNION ALL
        SELECT NEW.thread_id,value,NEW.embodiment_id,NEW.revision
          FROM json_each(NEW.record_json,'$.sourceReferences') WHERE type='text'
        UNION ALL
        SELECT NEW.thread_id,value,NEW.embodiment_id,NEW.revision
          FROM json_each(NEW.record_json,'$.permissionReferences') WHERE type='text';
      END;
  `);
  // The existing append-only records remain authoritative. Projection
  // backfill happens only when installing the new index, not during alarms.
  if(needsReferenceIndex){
    database.exec(`
      INSERT OR IGNORE INTO embodiment_reference_index(
        thread_id,reference,embodiment_id,revision
      )
      SELECT thread_id,embodiment_id,embodiment_id,revision FROM embodiment_records
      UNION ALL
      SELECT b.thread_id,j.value,b.embodiment_id,b.revision
        FROM embodiment_records b,json_each(b.record_json,'$.sourceReferences') j
        WHERE j.type='text'
      UNION ALL
      SELECT b.thread_id,j.value,b.embodiment_id,b.revision
        FROM embodiment_records b,json_each(b.record_json,'$.permissionReferences') j
        WHERE j.type='text';
    `);
  }
}
