CREATE TABLE IF NOT EXISTS fibre_activity_log (
  activity_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  environment TEXT NOT NULL,
  service TEXT NOT NULL,
  deployment_git_sha TEXT,
  request_id TEXT,
  genesis_id TEXT,
  thread_id TEXT,
  experience_id TEXT,
  session_id TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  message TEXT,
  error_json TEXT,
  evidence_json TEXT NOT NULL,
  record_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fibre_activity_request_idx
  ON fibre_activity_log(request_id, occurred_at, recorded_at);
CREATE INDEX IF NOT EXISTS fibre_activity_genesis_idx
  ON fibre_activity_log(genesis_id, occurred_at, recorded_at);
CREATE INDEX IF NOT EXISTS fibre_activity_thread_idx
  ON fibre_activity_log(thread_id, occurred_at, recorded_at);
CREATE INDEX IF NOT EXISTS fibre_activity_service_stage_idx
  ON fibre_activity_log(service, stage, status, occurred_at, recorded_at);
