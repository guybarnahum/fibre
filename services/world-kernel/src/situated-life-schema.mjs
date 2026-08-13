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

    CREATE TABLE IF NOT EXISTS situated_life_lineage_heads (
      ledger_kind TEXT NOT NULL CHECK (ledger_kind IN ('life_relation','place_episode')),
      lineage_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      head_digest TEXT NOT NULL CHECK (head_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (ledger_kind,lineage_id,revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_situated_life_heads_thread
      ON situated_life_lineage_heads(thread_id,ledger_kind,lineage_id,revision);

    CREATE TRIGGER IF NOT EXISTS situated_life_heads_no_update
      BEFORE UPDATE ON situated_life_lineage_heads
      BEGIN SELECT RAISE(ABORT,'situated_life_lineage_heads is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS situated_life_heads_no_delete
      BEFORE DELETE ON situated_life_lineage_heads
      BEGIN SELECT RAISE(ABORT,'situated_life_lineage_heads is append-only'); END;

    CREATE TABLE IF NOT EXISTS situated_evidence_witnesses (
      reference TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      witness_kind TEXT NOT NULL CHECK (
        witness_kind IN ('life_relation_revision','place_episode_revision','embodiment_revision')
      ),
      source_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_situated_evidence_witness_thread
      ON situated_evidence_witnesses(thread_id,witness_kind,source_id,revision);

    CREATE TRIGGER IF NOT EXISTS situated_evidence_witnesses_no_update
      BEFORE UPDATE ON situated_evidence_witnesses
      BEGIN SELECT RAISE(ABORT,'situated_evidence_witnesses is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS situated_evidence_witnesses_no_delete
      BEFORE DELETE ON situated_evidence_witnesses
      BEGIN SELECT RAISE(ABORT,'situated_evidence_witnesses is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS identity_situated_context_only_guard
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.registry_version='2'
        AND NEW.domain IN (
          'lineage_relation','family_role','ancestral_origin',
          'cultural_formation','language_formation',
          'geography_residence','geography_work','place_meaning'
        )
        AND NEW.behavioral_status <> 'context_only'
      BEGIN SELECT RAISE(ABORT,'situated identity domains are context_only until causal standing'); END;

    CREATE TRIGGER IF NOT EXISTS identity_lived_event_witness_guard
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.registry_version='2'
        AND NEW.domain IN ('cultural_formation','language_formation')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.assertion_json,'$.sourceReferences') refs
          JOIN thread_events events
            ON events.event_id=refs.value AND events.thread_id=NEW.thread_id
        )
      BEGIN SELECT RAISE(ABORT,'cultural/language formation requires a resolved Thread-event witness'); END;

    CREATE TRIGGER IF NOT EXISTS identity_lineage_revision_witness_guard
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.registry_version='2'
        AND NEW.domain IN ('lineage_relation','family_role','ancestral_origin')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.assertion_json,'$.sourceReferences') refs
          JOIN situated_evidence_witnesses witnesses
            ON witnesses.reference=refs.value
           AND witnesses.thread_id=NEW.thread_id
           AND witnesses.witness_kind='life_relation_revision'
        )
      BEGIN SELECT RAISE(ABORT,'lineage identity requires a resolved relation-revision witness'); END;

    CREATE TRIGGER IF NOT EXISTS identity_place_revision_witness_guard
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.registry_version='2'
        AND NEW.domain IN ('geography_residence','geography_work','place_meaning')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.assertion_json,'$.sourceReferences') refs
          JOIN situated_evidence_witnesses witnesses
            ON witnesses.reference=refs.value
           AND witnesses.thread_id=NEW.thread_id
           AND witnesses.witness_kind='place_episode_revision'
        )
      BEGIN SELECT RAISE(ABORT,'geography identity requires a resolved place-revision witness'); END;
  `);
}
