export function createLivedExperienceTables(database) {
  const needsStoryTimeline=database.prepare(`
    SELECT 1 FROM sqlite_master WHERE type='table'
      AND name='thread_encounter_story_timeline'
  `).get()===undefined;
  const needsPendingWork=database.prepare(`
    SELECT 1 FROM sqlite_master WHERE type='table'
      AND name='thread_experience_pending_work'
  `).get()===undefined;
  database.exec(`
    CREATE TABLE IF NOT EXISTS lived_encounter_records (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      visitor_utterance TEXT NOT NULL,
      response_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS encounter_story_records (
      encounter_id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      story_json TEXT NOT NULL CHECK (json_valid(story_json)),
      visualization_prompt TEXT NOT NULL,
      visualization_prompt_digest TEXT NOT NULL CHECK (visualization_prompt_digest LIKE 'sha256:%'),
      visualization_source_refs_json TEXT NOT NULL CHECK (json_valid(visualization_source_refs_json)),
      depicted_thread_refs_json TEXT NOT NULL CHECK (json_valid(depicted_thread_refs_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%')
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_encounter_story_occurred_at
      ON encounter_story_records(occurred_at);

    CREATE TABLE IF NOT EXISTS world_environment_opportunities (
      situation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      decision_json TEXT CHECK (decision_json IS NULL OR json_valid(decision_json)),
      result_encounter_ref TEXT,
      completed_at TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_world_environment_opportunities_due
      ON world_environment_opportunities(due_at)
      WHERE completed_at IS NULL;

    -- A second, one-shot chance during a genuinely long enacted stay.
    -- Separate from arrival so deployed arrival authority/digests stay intact.
    CREATE TABLE IF NOT EXISTS world_environment_stay_opportunities (
      situation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      decision_json TEXT CHECK (decision_json IS NULL OR json_valid(decision_json)),
      result_encounter_ref TEXT,
      completed_at TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_world_environment_stay_due
      ON world_environment_stay_opportunities(due_at)
      WHERE completed_at IS NULL;

    -- A single speculative ambient consideration per grounded active scene.
    -- Completed scenes can rearm on later enacted activity, not a timer tick.
    CREATE TABLE IF NOT EXISTS world_ambient_scene_frontier (
      scene_ref TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      decision_json TEXT CHECK (decision_json IS NULL OR json_valid(decision_json)),
      result_encounter_ref TEXT,
      completed_at TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_world_ambient_scene_due
      ON world_ambient_scene_frontier(due_at)
      WHERE completed_at IS NULL;


    -- An enacted physical arrival can become perceptible to people already
    -- there. Preserve the event-time witness set for delayed sparse processing.
    -- The objective arrival remains CurrentSituation, not this work row.
    CREATE TABLE IF NOT EXISTS world_arrival_perception_work (
      situation_id TEXT PRIMARY KEY,
      venue_ref TEXT NOT NULL,
      due_at TEXT NOT NULL,
      witness_situations_json TEXT NOT NULL CHECK (json_valid(witness_situations_json)),
      result_encounter_ref TEXT,
      completed_at TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_world_arrival_perception_due
      ON world_arrival_perception_work(due_at) WHERE completed_at IS NULL;

    -- Enacted co-presence may earn one bounded social consideration.
    -- Starting an attempt is durable: interrupted cognition is not silently rerolled.
    CREATE TABLE IF NOT EXISTS world_social_opportunities (
      situation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      outcome TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_world_social_opportunities_due
      ON world_social_opportunities(due_at)
      WHERE started_at IS NULL;

    -- A witnessed actor arrival can matter after a prior, separate
    -- arrival-based social chance has already been spent. One observation,
    -- one witnessed person, one durable chance to choose freely.
    CREATE TABLE IF NOT EXISTS world_observed_social_opportunities (
      encounter_ref TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      counterparty_thread_id TEXT NOT NULL,
      venue_ref TEXT NOT NULL,
      due_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      outcome TEXT,
      PRIMARY KEY(encounter_ref,thread_id),
      FOREIGN KEY(encounter_ref) REFERENCES encounter_story_records(encounter_id),
      FOREIGN KEY(thread_id) REFERENCES threads(thread_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_world_observed_social_due
      ON world_observed_social_opportunities(due_at)
      WHERE started_at IS NULL;

    CREATE TABLE IF NOT EXISTS world_environment_followups (
      source_encounter_ref TEXT PRIMARY KEY,
      place_ref TEXT NOT NULL,
      due_at TEXT NOT NULL,
      decision_json TEXT CHECK (decision_json IS NULL OR json_valid(decision_json)),
      result_encounter_ref TEXT,
      completed_at TEXT,
      FOREIGN KEY (source_encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_world_environment_followups_due
      ON world_environment_followups(due_at)
      WHERE completed_at IS NULL;

    CREATE TABLE IF NOT EXISTS encounter_story_thread_presence (
      encounter_ref TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      PRIMARY KEY (encounter_ref, thread_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    -- An indexed time dimension for participant-owned story browsing.
    CREATE TABLE IF NOT EXISTS thread_encounter_story_timeline (
      thread_id TEXT NOT NULL,
      encounter_ref TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      PRIMARY KEY(thread_id,occurred_at,encounter_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS encounter_presence_update_timeline
      AFTER INSERT ON encounter_story_thread_presence
      BEGIN
        INSERT INTO thread_encounter_story_timeline(thread_id,encounter_ref,occurred_at)
        SELECT NEW.thread_id,NEW.encounter_ref,occurred_at
        FROM encounter_story_records WHERE encounter_id=NEW.encounter_ref;
      END;

    CREATE TABLE IF NOT EXISTS public_encounter_admissions (
      request_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      request_digest TEXT NOT NULL CHECK (request_digest LIKE 'sha256:%'),
      encounter_ref TEXT NOT NULL UNIQUE,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS public_encounter_checkpoints (
      request_id TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      encounter_ref TEXT NOT NULL UNIQUE,
      PRIMARY KEY (request_id,position),
      FOREIGN KEY (request_id) REFERENCES public_encounter_admissions(request_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS public_encounter_receipts (
      request_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      request_digest TEXT NOT NULL CHECK (request_digest LIKE 'sha256:%'),
      result_json TEXT NOT NULL CHECK (json_valid(result_json)),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS social_interaction_records (
      interaction_id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      initiator_thread_id TEXT NOT NULL,
      recipient_thread_id TEXT NOT NULL,
      initiator_situation_id TEXT NOT NULL,
      recipient_situation_id TEXT NOT NULL,
      request_text TEXT NOT NULL,
      response_decision TEXT NOT NULL CHECK (response_decision IN ('accept','decline','defer')),
      response_expression TEXT,
      suggested_at TEXT,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (initiator_thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (recipient_thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_encounter_attention (
      thread_id TEXT NOT NULL,
      encounter_ref TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK (outcome IN ('noticed','not_noticed')),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (thread_id, encounter_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_encounter_experiences (
      experience_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      encounter_ref TEXT NOT NULL,
      situation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      experience_text TEXT,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (thread_id, encounter_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (encounter_ref) REFERENCES encounter_story_records(encounter_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_encounter_journal_entries (
      journal_entry_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      about_experience_ref TEXT NOT NULL,
      written_at TEXT NOT NULL,
      entry_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (thread_id, about_experience_ref),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (about_experience_ref) REFERENCES thread_encounter_experiences(experience_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_experience_consolidation_queue (
      experience_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (experience_id) REFERENCES thread_encounter_experiences(experience_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_experience_consolidations (
      consolidation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      experience_refs_json TEXT NOT NULL CHECK (json_valid(experience_refs_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_experience_consolidation_stages (
      consolidation_id TEXT NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN ('decision','complete')),
      recorded_at TEXT NOT NULL,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      PRIMARY KEY (consolidation_id, stage),
      FOREIGN KEY (consolidation_id) REFERENCES thread_experience_consolidations(consolidation_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_experience_consolidation_members (
      experience_id TEXT PRIMARY KEY,
      consolidation_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
      FOREIGN KEY (experience_id) REFERENCES thread_encounter_experiences(experience_id),
      FOREIGN KEY (consolidation_id) REFERENCES thread_experience_consolidations(consolidation_id),
      UNIQUE (consolidation_id, ordinal)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS thread_experience_consolidation_journal_entries (
      journal_entry_id TEXT PRIMARY KEY,
      consolidation_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      written_at TEXT NOT NULL,
      entry_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (consolidation_id) REFERENCES thread_experience_consolidations(consolidation_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_consolidation_journal_thread_time
      ON thread_experience_consolidation_journal_entries(thread_id,written_at,journal_entry_id);

    CREATE TABLE IF NOT EXISTS thread_journal_entries (
      journal_entry_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      about_event_ref TEXT NOT NULL,
      written_at TEXT NOT NULL,
      entry_text TEXT NOT NULL,
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (about_event_ref) REFERENCES lived_encounter_records(event_id),
      UNIQUE (thread_id, about_event_ref)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_lived_encounter_thread_time
      ON lived_encounter_records(thread_id, occurred_at, event_id);
    CREATE INDEX IF NOT EXISTS idx_thread_journal_thread_time
      ON thread_journal_entries(thread_id, written_at, journal_entry_id);
    CREATE INDEX IF NOT EXISTS idx_encounter_story_time
      ON encounter_story_records(occurred_at, encounter_id);
    CREATE INDEX IF NOT EXISTS idx_encounter_story_presence
      ON encounter_story_thread_presence(thread_id, encounter_ref);
    CREATE INDEX IF NOT EXISTS idx_public_encounter_admission_thread
      ON public_encounter_admissions(thread_id, encounter_ref);
    CREATE INDEX IF NOT EXISTS idx_public_encounter_receipt_thread
      ON public_encounter_receipts(thread_id, request_id);
    CREATE INDEX IF NOT EXISTS idx_social_interaction_initiator_time
      ON social_interaction_records(initiator_thread_id, occurred_at, interaction_id);
    CREATE INDEX IF NOT EXISTS idx_social_interaction_recipient_time
      ON social_interaction_records(recipient_thread_id, occurred_at, interaction_id);
    CREATE INDEX IF NOT EXISTS idx_thread_attention_time
      ON thread_encounter_attention(thread_id, occurred_at, encounter_ref);
    CREATE INDEX IF NOT EXISTS idx_thread_experience_time
      ON thread_encounter_experiences(thread_id, occurred_at, experience_id);
    CREATE INDEX IF NOT EXISTS idx_encounter_journal_time
      ON thread_encounter_journal_entries(thread_id, written_at, journal_entry_id);

    CREATE INDEX IF NOT EXISTS idx_experience_consolidation_queue_thread
      ON thread_experience_consolidation_queue(thread_id, queued_at, experience_id);
    CREATE INDEX IF NOT EXISTS idx_experience_consolidation_thread
      ON thread_experience_consolidations(thread_id, started_at, consolidation_id);
    CREATE INDEX IF NOT EXISTS idx_experience_consolidation_stage
      ON thread_experience_consolidation_stages(stage, recorded_at, consolidation_id);

    CREATE INDEX IF NOT EXISTS idx_experience_consolidation_members
      ON thread_experience_consolidation_members(consolidation_id, ordinal);

    -- Mutable, strictly derived queue frontier. Historical experience,
    -- consolidation, and completion authorities remain append-only.
    CREATE TABLE IF NOT EXISTS thread_experience_pending_work (
      kind TEXT NOT NULL CHECK (kind IN ('unclaimed','consolidation')),
      reference TEXT NOT NULL,
      due_at TEXT NOT NULL,
      PRIMARY KEY(kind,reference)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_thread_experience_pending_due
      ON thread_experience_pending_work(kind,due_at,reference);

    CREATE TRIGGER IF NOT EXISTS thread_experience_pending_queued
      AFTER INSERT ON thread_experience_consolidation_queue BEGIN
        INSERT INTO thread_experience_pending_work(kind,reference,due_at)
        SELECT 'unclaimed',NEW.experience_id,occurred_at
        FROM thread_encounter_experiences WHERE experience_id=NEW.experience_id;
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_pending_claimed
      AFTER INSERT ON thread_experience_consolidation_members BEGIN
        DELETE FROM thread_experience_pending_work
        WHERE kind='unclaimed' AND reference=NEW.experience_id;
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_pending_consolidation
      AFTER INSERT ON thread_experience_consolidations BEGIN
        INSERT INTO thread_experience_pending_work(kind,reference,due_at)
        VALUES ('consolidation',NEW.consolidation_id,NEW.started_at);
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_pending_completed
      AFTER INSERT ON thread_experience_consolidation_stages
      WHEN NEW.stage='complete' BEGIN
        DELETE FROM thread_experience_pending_work
        WHERE kind='consolidation' AND reference=NEW.consolidation_id;
      END;

    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_update
      BEFORE UPDATE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS lived_encounter_records_no_delete
      BEFORE DELETE ON lived_encounter_records BEGIN
        SELECT RAISE(ABORT, 'lived_encounter_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS encounter_story_records_no_update
      BEFORE UPDATE ON encounter_story_records BEGIN
        SELECT RAISE(ABORT, 'encounter_story_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS encounter_story_records_no_delete
      BEFORE DELETE ON encounter_story_records BEGIN
        SELECT RAISE(ABORT, 'encounter_story_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS encounter_story_thread_presence_no_update
      BEFORE UPDATE ON encounter_story_thread_presence BEGIN
        SELECT RAISE(ABORT, 'encounter_story_thread_presence is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS encounter_story_thread_presence_no_delete
      BEFORE DELETE ON encounter_story_thread_presence BEGIN
        SELECT RAISE(ABORT, 'encounter_story_thread_presence is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_admissions_no_update
      BEFORE UPDATE ON public_encounter_admissions BEGIN
        SELECT RAISE(ABORT, 'public_encounter_admissions is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_admissions_no_delete
      BEFORE DELETE ON public_encounter_admissions BEGIN
        SELECT RAISE(ABORT, 'public_encounter_admissions is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_checkpoints_no_update
      BEFORE UPDATE ON public_encounter_checkpoints BEGIN
        SELECT RAISE(ABORT, 'public_encounter_checkpoints is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_checkpoints_no_delete
      BEFORE DELETE ON public_encounter_checkpoints BEGIN
        SELECT RAISE(ABORT, 'public_encounter_checkpoints is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_receipts_no_update
      BEFORE UPDATE ON public_encounter_receipts BEGIN
        SELECT RAISE(ABORT, 'public_encounter_receipts is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS public_encounter_receipts_no_delete
      BEFORE DELETE ON public_encounter_receipts BEGIN
        SELECT RAISE(ABORT, 'public_encounter_receipts is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS social_interaction_records_no_update
      BEFORE UPDATE ON social_interaction_records BEGIN
        SELECT RAISE(ABORT, 'social_interaction_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS social_interaction_records_no_delete
      BEFORE DELETE ON social_interaction_records BEGIN
        SELECT RAISE(ABORT, 'social_interaction_records is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_attention_no_update
      BEFORE UPDATE ON thread_encounter_attention BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_attention is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_attention_no_delete
      BEFORE DELETE ON thread_encounter_attention BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_attention is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_experiences_no_update
      BEFORE UPDATE ON thread_encounter_experiences BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_experiences is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_experiences_no_delete
      BEFORE DELETE ON thread_encounter_experiences BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_experiences is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_journal_entries_no_update
      BEFORE UPDATE ON thread_encounter_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_encounter_journal_entries_no_delete
      BEFORE DELETE ON thread_encounter_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_encounter_journal_entries is append-only');
      END;

    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_queue_no_update
      BEFORE UPDATE ON thread_experience_consolidation_queue BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_queue is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_queue_no_delete
      BEFORE DELETE ON thread_experience_consolidation_queue BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_queue is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidations_no_update
      BEFORE UPDATE ON thread_experience_consolidations BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidations is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidations_no_delete
      BEFORE DELETE ON thread_experience_consolidations BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidations is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_stages_no_update
      BEFORE UPDATE ON thread_experience_consolidation_stages BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_stages is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_stages_no_delete
      BEFORE DELETE ON thread_experience_consolidation_stages BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_stages is append-only');
      END;

    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_members_no_update
      BEFORE UPDATE ON thread_experience_consolidation_members BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_members is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_members_no_delete
      BEFORE DELETE ON thread_experience_consolidation_members BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_members is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_journal_entries_no_update
      BEFORE UPDATE ON thread_experience_consolidation_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_experience_consolidation_journal_entries_no_delete
      BEFORE DELETE ON thread_experience_consolidation_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_experience_consolidation_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_journal_entries_no_update
      BEFORE UPDATE ON thread_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_journal_entries is append-only');
      END;
    CREATE TRIGGER IF NOT EXISTS thread_journal_entries_no_delete
      BEFORE DELETE ON thread_journal_entries BEGIN
        SELECT RAISE(ABORT, 'thread_journal_entries is append-only');
      END;
  `);
  if(needsStoryTimeline){
    database.exec(`
      INSERT INTO thread_encounter_story_timeline(thread_id,encounter_ref,occurred_at)
      SELECT p.thread_id,p.encounter_ref,e.occurred_at
      FROM encounter_story_thread_presence p
      JOIN encounter_story_records e ON e.encounter_id=p.encounter_ref
    `);
  }

  // One-time migration of genuinely unfinished work; never rescan history
  // on a normal wake or a later schema installation.
  if(needsPendingWork){
    database.exec(`
      INSERT INTO thread_experience_pending_work(kind,reference,due_at)
      SELECT 'unclaimed',q.experience_id,e.occurred_at
      FROM thread_experience_consolidation_queue q
      JOIN thread_encounter_experiences e ON e.experience_id=q.experience_id
      LEFT JOIN thread_experience_consolidation_members m
        ON m.experience_id=q.experience_id
      WHERE m.experience_id IS NULL;

      INSERT INTO thread_experience_pending_work(kind,reference,due_at)
      SELECT 'consolidation',c.consolidation_id,c.started_at
      FROM thread_experience_consolidations c
      LEFT JOIN thread_experience_consolidation_stages s
        ON s.consolidation_id=c.consolidation_id AND s.stage='complete'
      WHERE s.consolidation_id IS NULL;
    `);
  }
}
