export function ensureSituatedWitnessPublication(database) {
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS life_relation_publish_witness
      AFTER INSERT ON life_relation_records
      BEGIN
        INSERT INTO situated_evidence_witnesses(
          reference,thread_id,witness_kind,source_id,revision,record_digest,recorded_at
        ) VALUES (
          'lrr:' || NEW.relation_id || ':' || NEW.revision,
          NEW.thread_id,'life_relation_revision',NEW.relation_id,NEW.revision,
          NEW.record_digest,NEW.recorded_at
        );
      END;

    CREATE TRIGGER IF NOT EXISTS place_episode_publish_witness
      AFTER INSERT ON place_episode_records
      BEGIN
        INSERT INTO situated_evidence_witnesses(
          reference,thread_id,witness_kind,source_id,revision,record_digest,recorded_at
        ) VALUES (
          'per:' || NEW.episode_id || ':' || NEW.revision,
          NEW.thread_id,'place_episode_revision',NEW.episode_id,NEW.revision,
          NEW.record_digest,NEW.recorded_at
        );
      END;
  `);
}
