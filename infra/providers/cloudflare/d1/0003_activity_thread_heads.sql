CREATE TABLE IF NOT EXISTS fibre_activity_thread_heads (
  environment TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  PRIMARY KEY (environment, thread_id)
);

INSERT INTO fibre_activity_thread_heads(environment, thread_id, last_activity_at)
SELECT environment, thread_id, MAX(occurred_at)
FROM fibre_activity_log
WHERE thread_id IS NOT NULL
GROUP BY environment, thread_id
ON CONFLICT(environment, thread_id) DO UPDATE SET
  last_activity_at = excluded.last_activity_at
WHERE excluded.last_activity_at > fibre_activity_thread_heads.last_activity_at;

CREATE TRIGGER IF NOT EXISTS fibre_activity_thread_head_insert
AFTER INSERT ON fibre_activity_log
WHEN NEW.thread_id IS NOT NULL
BEGIN
  INSERT INTO fibre_activity_thread_heads(environment, thread_id, last_activity_at)
  VALUES (NEW.environment, NEW.thread_id, NEW.occurred_at)
  ON CONFLICT(environment, thread_id) DO UPDATE SET
    last_activity_at = excluded.last_activity_at
  WHERE excluded.last_activity_at > fibre_activity_thread_heads.last_activity_at;
END;
