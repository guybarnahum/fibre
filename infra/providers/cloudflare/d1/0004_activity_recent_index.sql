CREATE INDEX IF NOT EXISTS fibre_activity_environment_time_idx
  ON fibre_activity_log(environment, occurred_at, recorded_at, activity_id);
