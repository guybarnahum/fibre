export function createSituatedLifeTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS life_relation_records (
      relation_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      related_party_id TEXT NOT NULL,
      relation_kind TEXT NOT NULL,
      genetic_contribution_role TEXT NOT NULL,
      visibility TEXT NOT NULL,
      provenance TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_revision INTEGER,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (relation_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((revision=1 AND supersedes_revision IS NULL) OR (revision>1 AND supersedes_revision=revision-1))
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_life_relations_thread
      ON life_relation_records(thread_id, relation_kind, recorded_at, relation_id, revision);

    CREATE TRIGGER IF NOT EXISTS life_relations_no_update
      BEFORE UPDATE ON life_relation_records
      BEGIN SELECT RAISE(ABORT,'life_relation_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS life_relations_no_delete
      BEFORE DELETE ON life_relation_records
      BEGIN SELECT RAISE(ABORT,'life_relation_records is append-only'); END;

    CREATE TABLE IF NOT EXISTS place_episode_records (
      episode_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      episode_kind TEXT NOT NULL,
      place_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      provenance TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_revision INTEGER,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (episode_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK ((revision=1 AND supersedes_revision IS NULL) OR (revision>1 AND supersedes_revision=revision-1))
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_place_episodes_thread
      ON place_episode_records(thread_id, episode_kind, recorded_at, episode_id, revision);

    CREATE TRIGGER IF NOT EXISTS place_episodes_no_update
      BEFORE UPDATE ON place_episode_records
      BEGIN SELECT RAISE(ABORT,'place_episode_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS place_episodes_no_delete
      BEFORE DELETE ON place_episode_records
      BEGIN SELECT RAISE(ABORT,'place_episode_records is append-only'); END;
  `);
}
