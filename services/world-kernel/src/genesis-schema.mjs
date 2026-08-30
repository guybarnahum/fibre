import { createCivilRegistryTables } from "./civil-registry-store.mjs";

export function createGenesisTables(database) {
  createCivilRegistryTables(database);
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

    CREATE TABLE IF NOT EXISTS genesis_presentation_outbox (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
      publication_digest TEXT NOT NULL CHECK (publication_digest LIKE 'sha256:%'),
      published_at TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','delivered')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      last_attempt_at TEXT,
      last_error_json TEXT CHECK (last_error_json IS NULL OR json_valid(last_error_json)),
      delivered_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS genesis_historical_envelope_plans (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      world_spec_id TEXT NOT NULL,
      plan_digest TEXT NOT NULL UNIQUE CHECK (plan_digest LIKE 'sha256:%'),
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
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
    CREATE INDEX IF NOT EXISTS idx_genesis_presentation_outbox_pending
      ON genesis_presentation_outbox(state, published_at, genesis_id);

    DROP TRIGGER IF EXISTS genesis_manifests_require_historical_envelope;
    CREATE TRIGGER genesis_manifests_require_historical_envelope
      BEFORE INSERT ON genesis_manifests
      WHEN NEW.publication_status='published'
      BEGIN
        SELECT CASE WHEN (
          EXISTS (
            SELECT 1 FROM thread_events
            WHERE thread_id=NEW.thread_id AND event_type='THREAD_LIFE_EPISODE_RECORDED'
          ) AND NOT EXISTS (
            SELECT 1 FROM genesis_historical_envelope_plans
            WHERE genesis_id=NEW.genesis_id
              AND thread_id=NEW.thread_id
              AND world_spec_id=NEW.world_spec_id
          )
        ) THEN RAISE(ABORT,'published Genesis prior life lacks historical-envelope authority') END;
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM genesis_historical_envelope_plans
          WHERE genesis_id=NEW.genesis_id
            AND thread_id=NEW.thread_id
            AND world_spec_id=NEW.world_spec_id
            AND json_array_length(record_json,'$.envelopes') <>
              (SELECT COUNT(*) FROM thread_events
               WHERE thread_id=NEW.thread_id AND event_type='THREAD_LIFE_EPISODE_RECORDED')
        ) THEN RAISE(ABORT,'published Genesis historical-envelope episode count mismatch') END;
      END;

    DROP TRIGGER IF EXISTS genesis_manifests_publish_fin_registration;
    CREATE TRIGGER genesis_manifests_publish_fin_registration
      AFTER INSERT ON genesis_manifests
      WHEN NEW.publication_status='published'
      BEGIN
        SELECT CASE WHEN (
          json_extract(NEW.record_json,'$.publication.civilRegistration.threadId') IS NULL OR
          json_extract(NEW.record_json,'$.publication.civilRegistration.threadId') <> NEW.thread_id
        ) THEN RAISE(ABORT,'published Genesis FIN registration Thread mismatch') END;
        SELECT CASE WHEN (
          json_extract(NEW.record_json,'$.publication.civilRegistration.worldRef') IS NULL OR
          json_extract(NEW.record_json,'$.publication.civilRegistration.worldRef') <> NEW.world_spec_id
        ) THEN RAISE(ABORT,'published Genesis FIN registration World mismatch') END;
        SELECT CASE WHEN (
          json_extract(NEW.record_json,'$.publication.civilRegistration.registeredAt') IS NULL OR
          json_extract(NEW.record_json,'$.publication.civilRegistration.registeredAt') <>
            json_extract(NEW.record_json,'$.publication.publishedAt')
        ) THEN RAISE(ABORT,'published Genesis FIN registration time mismatch') END;
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1 FROM thread_events
          WHERE event_id=json_extract(NEW.record_json,'$.publication.civilRegistration.birthEventRef')
            AND thread_id=NEW.thread_id
            AND event_type='THREAD_SEEDED'
        ) THEN RAISE(ABORT,'published Genesis FIN registration lacks canonical seed event') END;

        INSERT INTO fibre_civil_registrations(
          registration_id,thread_id,fibre_identity_number,birth_event_ref,world_ref,
          registered_at,issuer,fin_policy_ref,record_json,record_digest
        ) VALUES (
          json_extract(NEW.record_json,'$.publication.civilRegistration.registrationId'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.threadId'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.fibreIdentityNumber'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.birthEventRef'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.worldRef'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.registeredAt'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.issuer'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.finPolicyRef'),
          json_extract(NEW.record_json,'$.publication.civilRegistration'),
          json_extract(NEW.record_json,'$.publication.civilRegistration.registrationDigest')
        );
      END;

    DROP TRIGGER IF EXISTS genesis_manifests_enqueue_presentation;
    CREATE TRIGGER genesis_manifests_enqueue_presentation
      AFTER INSERT ON genesis_manifests
      WHEN NEW.publication_status='published'
      BEGIN
        INSERT OR IGNORE INTO genesis_presentation_outbox(
          genesis_id,thread_id,manifest_json,publication_digest,published_at
        ) VALUES (
          NEW.genesis_id,
          NEW.thread_id,
          NEW.record_json,
          NEW.record_digest,
          json_extract(NEW.record_json,'$.publication.publishedAt')
        );
      END;

    INSERT OR IGNORE INTO genesis_presentation_outbox(
      genesis_id,thread_id,manifest_json,publication_digest,published_at
    )
    SELECT
      genesis_id,
      thread_id,
      record_json,
      record_digest,
      json_extract(record_json,'$.publication.publishedAt')
    FROM genesis_manifests
    WHERE publication_status='published';

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
    CREATE TRIGGER IF NOT EXISTS genesis_historical_envelope_plans_no_update
      BEFORE UPDATE ON genesis_historical_envelope_plans
      BEGIN SELECT RAISE(ABORT,'genesis_historical_envelope_plans is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS genesis_historical_envelope_plans_no_delete
      BEFORE DELETE ON genesis_historical_envelope_plans
      BEGIN SELECT RAISE(ABORT,'genesis_historical_envelope_plans is immutable'); END;
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
