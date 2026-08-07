import { BUILTIN_SEMANTIC_DIMENSIONS } from "./semantic-state.mjs";

export function createSemanticStateTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS semantic_state_dimensions (
      domain TEXT NOT NULL CHECK (domain IN ('emotion','need','relationship_attitude','situation_attitude')),
      dimension TEXT NOT NULL,
      semantics TEXT NOT NULL,
      behavioral_relevance TEXT NOT NULL,
      registered_by TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      PRIMARY KEY (domain, dimension)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS semantic_state_records (
      state_id TEXT PRIMARY KEY CHECK (length(state_id)=68 AND substr(state_id,1,4)='sst_' AND substr(state_id,5) NOT GLOB '*[^0-9a-f]*'),
      thread_id TEXT NOT NULL,
      domain TEXT NOT NULL CHECK (domain IN ('emotion','need','relationship_attitude','situation_attitude')),
      dimension TEXT NOT NULL,
      target_json TEXT CHECK (target_json IS NULL OR json_valid(target_json)),
      state_text TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
      as_of TEXT NOT NULL,
      supersedes_state_id TEXT,
      provenance_json TEXT NOT NULL CHECK (json_valid(provenance_json)),
      visibility TEXT NOT NULL CHECK (visibility='restricted'),
      staleness TEXT NOT NULL CHECK (staleness IN ('current','stale')),
      state_digest TEXT NOT NULL CHECK (length(state_digest)=71 AND substr(state_digest,1,7)='sha256:' AND substr(state_digest,8) NOT GLOB '*[^0-9a-f]*'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (domain, dimension) REFERENCES semantic_state_dimensions(domain, dimension),
      FOREIGN KEY (supersedes_state_id) REFERENCES semantic_state_records(state_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_semantic_state_thread_current
      ON semantic_state_records(thread_id,domain,dimension,as_of,state_id);

    CREATE TRIGGER IF NOT EXISTS semantic_state_dimensions_no_update
      BEFORE UPDATE ON semantic_state_dimensions
      BEGIN SELECT RAISE(ABORT,'semantic_state_dimensions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS semantic_state_dimensions_no_delete
      BEFORE DELETE ON semantic_state_dimensions
      BEGIN SELECT RAISE(ABORT,'semantic_state_dimensions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS semantic_state_records_no_update
      BEFORE UPDATE ON semantic_state_records
      BEGIN SELECT RAISE(ABORT,'semantic_state_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS semantic_state_records_no_delete
      BEFORE DELETE ON semantic_state_records
      BEGIN SELECT RAISE(ABORT,'semantic_state_records is append-only'); END;
  `);

  const insert = database.prepare(`
    INSERT OR IGNORE INTO semantic_state_dimensions(
      domain,dimension,semantics,behavioral_relevance,registered_by,registered_at
    ) VALUES (?,?,?,?,?,?)
  `);
  for (const definition of BUILTIN_SEMANTIC_DIMENSIONS) {
    insert.run(
      definition.domain,
      definition.dimension,
      definition.semantics,
      definition.behavioralRelevance,
      "fibre_builtin_registry_v1",
      "2026-08-07T00:00:00.000Z",
    );
  }
}
