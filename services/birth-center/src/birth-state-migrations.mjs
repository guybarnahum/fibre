import { openBirthStateDatabase } from "./birth-state-storage.mjs";

export const BIRTH_STATE_SCHEMA_VERSION = 2;

function schemaVersion(session) {
  const row = session.prepare("PRAGMA user_version").get();
  const version = Number(row?.user_version ?? 0);
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error("Birth Center state schema version is invalid");
  }
  return version;
}

function migrateToV1(session) {
  session.exec(`
    CREATE TABLE IF NOT EXISTS provisional_births (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      bundle_digest TEXT NOT NULL,
      bundle_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'published')),
      world_result_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS provisional_births_thread_idx
      ON provisional_births(thread_id);
    CREATE INDEX IF NOT EXISTS provisional_births_status_idx
      ON provisional_births(status, created_at, genesis_id);

    CREATE TABLE IF NOT EXISTS modern_birth_requests (
      request_id TEXT PRIMARY KEY,
      requested_at TEXT NOT NULL,
      requested_location TEXT,
      requested_sex TEXT CHECK (requested_sex IS NULL OR requested_sex IN ('female','male')),
      selected_location TEXT,
      location_source TEXT,
      selected_sex TEXT CHECK (selected_sex IS NULL OR selected_sex IN ('female','male')),
      status TEXT NOT NULL CHECK (status IN ('queued','authoring','developing','publishing','published','failed')),
      thread_id TEXT,
      genesis_id TEXT,
      error_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_modern_birth_requests_status_created
      ON modern_birth_requests(status,created_at DESC,request_id DESC);

    CREATE TABLE IF NOT EXISTS genesis_development_requests (
      request_id TEXT PRIMARY KEY,
      request_digest TEXT NOT NULL,
      plan_digest TEXT NOT NULL,
      genesis_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL UNIQUE,
      plan_json TEXT NOT NULL,
      admission_digest TEXT,
      admission_json TEXT,
      status TEXT NOT NULL CHECK (status IN ('reserved', 'ready', 'submitted')),
      submission_result_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK ((admission_digest IS NULL) = (admission_json IS NULL)),
      CHECK (status = 'reserved' OR admission_json IS NOT NULL),
      CHECK (status != 'submitted' OR submission_result_json IS NOT NULL)
    );
    CREATE TABLE IF NOT EXISTS genesis_development_dispositions (
      request_id TEXT PRIMARY KEY,
      outcome TEXT CHECK (outcome IS NULL OR outcome IN ('born','stillborn')),
      failure_code TEXT,
      failure_message TEXT,
      failure_retryable INTEGER CHECK (failure_retryable IS NULL OR failure_retryable IN (0,1)),
      settled_at TEXT,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS birth_model_invocations (
      client_request_id TEXT PRIMARY KEY,
      request_digest TEXT NOT NULL,
      record_json TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS birth_model_invocations_request_digest_idx
      ON birth_model_invocations(request_digest);
  `);

  const dispositionColumns = new Set(
    session.prepare("PRAGMA table_info(genesis_development_dispositions)").all().map((row) => row.name),
  );
  if (!dispositionColumns.has("failure_retryable")) {
    session.exec(`
      ALTER TABLE genesis_development_dispositions
      ADD COLUMN failure_retryable INTEGER
        CHECK (failure_retryable IS NULL OR failure_retryable IN (0,1));
    `);
  }

  session.exec(`
    UPDATE genesis_development_dispositions
    SET failure_retryable=0
    WHERE outcome IS NULL
      AND failure_retryable IS NULL
      AND (
        failure_code='GENESIS_PASS_A_VALIDATION_ERROR'
        OR (
          instr(failure_message,'Pass-B model output episodeRef ')=1
          AND instr(failure_message,' is not visible history')>0
        )
        OR instr(
          failure_message,
          'observableAction narrates an explicit scene setting incompatible with authoritative placeRef'
        )>0
      );

    INSERT INTO genesis_development_dispositions(
      request_id,outcome,failure_code,failure_message,failure_retryable,settled_at,updated_at
    )
    SELECT request_id,NULL,NULL,NULL,0,NULL,updated_at
    FROM genesis_development_requests
    WHERE thread_id IN (
      'thr_bceb56abf94f52e4caeb9f2830b5c2288cf5d2c8',
      'thr_3609c3953fa371755ddea576e70964a9922e3c27',
      'thr_654122d83fd271e3352d0cdba679f06e548d7d2c',
      'thr_72bde089b036d01d489382cec37c8f99fa240b36'
    )
    ON CONFLICT(request_id) DO UPDATE SET
      failure_code=COALESCE(genesis_development_dispositions.failure_code,excluded.failure_code),
      failure_message=COALESCE(genesis_development_dispositions.failure_message,excluded.failure_message),
      failure_retryable=COALESCE(genesis_development_dispositions.failure_retryable,excluded.failure_retryable),
      updated_at=excluded.updated_at;
  `);
  session.exec("PRAGMA user_version = 1");
}


function migrateToV2(session) {
  session.exec(`
    UPDATE genesis_development_dispositions
    SET failure_code=CASE
          WHEN failure_code IS NULL OR failure_code='ERROR'
            THEN 'GENESIS_COMPILE_VALIDATION_ERROR'
          ELSE failure_code
        END,
        failure_retryable=0
    WHERE outcome IS NULL
      AND failure_retryable IS NULL
      AND instr(failure_message,'Genesis birth place ')=1
      AND instr(failure_message,' is not mappable')>0;
  `);
  session.exec("PRAGMA user_version = 2");
}

export function migrateBirthState(storage) {
  const session = openBirthStateDatabase(storage, { storeName:"Birth Center state migration" });
  try {
    const fromVersion = schemaVersion(session);
    if (fromVersion > BIRTH_STATE_SCHEMA_VERSION) {
      throw new Error(
        `Birth Center state schema ${fromVersion} is newer than runtime schema ${BIRTH_STATE_SCHEMA_VERSION}`,
      );
    }
    const applied = [];
    if (fromVersion < 1) {
      session.transaction(() => migrateToV1(session));
      applied.push(1);
    }
    if (schemaVersion(session) < 2) {
      session.transaction(() => migrateToV2(session));
      applied.push(2);
    }
    const toVersion = schemaVersion(session);
    if (toVersion !== BIRTH_STATE_SCHEMA_VERSION) {
      throw new Error(
        `Birth Center state migration stopped at schema ${toVersion}; expected ${BIRTH_STATE_SCHEMA_VERSION}`,
      );
    }
    return Object.freeze({ fromVersion, toVersion, applied:Object.freeze(applied) });
  } finally {
    session.close();
  }
}

export function requireCurrentBirthState(storage) {
  const session = openBirthStateDatabase(storage, {
    readOnly:true,
    storeName:"Birth Center state schema check",
  });
  try {
    const version = schemaVersion(session);
    if (version !== BIRTH_STATE_SCHEMA_VERSION) {
      throw new Error(
        `Birth Center state schema ${version} is not current; deploy migration ${BIRTH_STATE_SCHEMA_VERSION} before starting runtime`,
      );
    }
    return version;
  } finally {
    session.close();
  }
}
