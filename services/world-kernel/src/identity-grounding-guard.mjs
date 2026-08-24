import { THREAD_LIFE_EPISODE_RECORDED } from "./genesis-life-episode.mjs";

export function createIdentityGroundingGuards(database) {
  database.exec(`
    DROP TRIGGER IF EXISTS identity_assertions_require_thread_event_witness;
    CREATE TRIGGER identity_assertions_require_thread_event_witness
      BEFORE INSERT ON identity_assertion_records
      WHEN NEW.domain IN ('cultural_formation','language_formation')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.assertion_json, '$.sourceReferences') AS ref
          JOIN thread_events AS event
            ON event.thread_id=NEW.thread_id
           AND event.event_id=ref.value
           AND event.event_type='${THREAD_LIFE_EPISODE_RECORDED}'
        )
      BEGIN
        SELECT RAISE(ABORT,'identity assertion requires a resolved lived Thread-event witness');
      END;
  `);
}
