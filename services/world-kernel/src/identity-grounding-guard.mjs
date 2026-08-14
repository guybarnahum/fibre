export function createIdentityGroundingGuards(database) {
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS identity_assertions_require_thread_event_witness
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.domain IN ('cultural_formation','language_formation')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.assertion_json, '$.sourceReferences') AS ref
          JOIN thread_events AS event
            ON event.thread_id=NEW.thread_id AND event.event_id=ref.value
        )
      BEGIN
        SELECT RAISE(ABORT,'identity assertion requires a resolved Thread-event witness');
      END;
  `);
}
