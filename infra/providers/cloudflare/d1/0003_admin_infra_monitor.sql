CREATE TABLE IF NOT EXISTS fibre_admin_infra_monitor (
  environment TEXT PRIMARY KEY,
  sampled_at TEXT,
  sample_json TEXT,
  sampling_started_at TEXT
);
