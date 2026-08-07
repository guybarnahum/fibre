export function createExpressionTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS disclosure_strategies (
      strategy_id TEXT PRIMARY KEY CHECK (
        length(strategy_id)=68 AND substr(strategy_id,1,4)='dsc_' AND
        substr(strategy_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      operation_id TEXT NOT NULL UNIQUE,
      operation_json TEXT NOT NULL CHECK (json_valid(operation_json)),
      operation_digest TEXT NOT NULL CHECK (
        length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:' AND
        substr(operation_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (
        length(thread_state_hash)=71 AND substr(thread_state_hash,1,7)='sha256:' AND
        substr(thread_state_hash,8) NOT GLOB '*[^0-9a-f]*'
      ),
      request_fingerprint TEXT NOT NULL CHECK (
        length(request_fingerprint)=71 AND substr(request_fingerprint,1,7)='sha256:' AND
        substr(request_fingerprint,8) NOT GLOB '*[^0-9a-f]*'
      ),
      appraisal_id TEXT NOT NULL,
      stance_id TEXT NOT NULL,
      authorization_id TEXT NOT NULL UNIQUE,
      strategy_json TEXT NOT NULL CHECK (json_valid(strategy_json)),
      strategy_digest TEXT NOT NULL CHECK (
        length(strategy_digest)=71 AND substr(strategy_digest,1,7)='sha256:' AND
        substr(strategy_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      recorded_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      UNIQUE (thread_id, request_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id),
      FOREIGN KEY (appraisal_id) REFERENCES request_appraisals(appraisal_id),
      FOREIGN KEY (stance_id) REFERENCES private_participation_stances(stance_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS audience_participation_responses (
      response_id TEXT PRIMARY KEY CHECK (
        length(response_id)=68 AND substr(response_id,1,4)='rsp_' AND
        substr(response_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      operation_id TEXT NOT NULL UNIQUE,
      operation_json TEXT NOT NULL CHECK (json_valid(operation_json)),
      operation_digest TEXT NOT NULL CHECK (
        length(operation_digest)=71 AND substr(operation_digest,1,7)='sha256:' AND
        substr(operation_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      strategy_id TEXT NOT NULL UNIQUE,
      authorization_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      response_json TEXT NOT NULL CHECK (json_valid(response_json)),
      response_digest TEXT NOT NULL CHECK (
        length(response_digest)=71 AND substr(response_digest,1,7)='sha256:' AND
        substr(response_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      recorded_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      UNIQUE (thread_id, request_id),
      FOREIGN KEY (strategy_id) REFERENCES disclosure_strategies(strategy_id),
      FOREIGN KEY (authorization_id) REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_disclosure_strategies_thread_time
      ON disclosure_strategies(thread_id, recorded_at, strategy_id);
    CREATE INDEX IF NOT EXISTS idx_audience_responses_thread_time
      ON audience_participation_responses(thread_id, recorded_at, response_id);

    CREATE TRIGGER IF NOT EXISTS disclosure_strategies_no_update
      BEFORE UPDATE ON disclosure_strategies
      BEGIN SELECT RAISE(ABORT,'disclosure_strategies is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS disclosure_strategies_no_delete
      BEFORE DELETE ON disclosure_strategies
      BEGIN SELECT RAISE(ABORT,'disclosure_strategies is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS audience_participation_responses_no_update
      BEFORE UPDATE ON audience_participation_responses
      BEGIN SELECT RAISE(ABORT,'audience_participation_responses is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS audience_participation_responses_no_delete
      BEFORE DELETE ON audience_participation_responses
      BEGIN SELECT RAISE(ABORT,'audience_participation_responses is append-only'); END;
  `);
}
