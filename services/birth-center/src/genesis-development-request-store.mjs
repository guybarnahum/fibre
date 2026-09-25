import { openBirthStateDatabase } from "./birth-state-storage.mjs";
import { canonicalDigest, canonicalJson } from "./state-codec.mjs";

export const GENESIS_DEVELOPMENT_REQUEST_STORE_VERSION = "fibre-genesis-development-request-store-v2";

export class GenesisDevelopmentRequestConflictError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function parseJson(name, value) {
  try { return JSON.parse(value); }
  catch (error) { throw new Error(`${name} contains invalid JSON: ${error.message}`); }
}

function migrate(session) {
  session.exec(`
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
  `);

  const columns = new Set(
    session.prepare("PRAGMA table_info(genesis_development_dispositions)").all().map((row) => row.name),
  );
  if (!columns.has("failure_retryable")) {
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
        OR failure_message LIKE 'Pass-B model output episodeRef % is not visible history'
        OR failure_message LIKE '%observableAction narrates an explicit scene setting incompatible with authoritative placeRef%'
      );

    -- Four retained staging attempts predate durable retryability capture. Their
    -- retained Activity was manually adjudicated as terminal; preserve any
    -- original failure text/code if present and add only the missing terminal bit.
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
}

function normalize(row) {
  if (row === undefined) return null;
  return Object.freeze({
    requestId: row.request_id,
    requestDigest: row.request_digest,
    planDigest: row.plan_digest,
    genesisId: row.genesis_id,
    threadId: row.thread_id,
    plan: parseJson("Genesis development plan", row.plan_json),
    admissionDigest: row.admission_digest,
    admission: row.admission_json === null ? null : parseJson("Genesis development admission", row.admission_json),
    status: row.status,
    submissionResult: row.submission_result_json === null
      ? null
      : parseJson("Genesis development submission result", row.submission_result_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function planIdentity(plan) {
  plain("Genesis development plan", plan);
  return Object.freeze({
    requestId: nonEmpty("Genesis development plan requestId", plan.requestId),
    requestDigest: nonEmpty("Genesis development plan requestDigest", plan.requestDigest),
    genesisId: nonEmpty("Genesis development plan genesisId", plan.genesisId),
    threadId: nonEmpty("Genesis development plan threadId", plan.threadId),
  });
}

function admissionIdentity(admission) {
  plain("Genesis development admission", admission);
  plain("Genesis development admission.manifest", admission.manifest);
  return Object.freeze({
    genesisId: nonEmpty("Genesis development admission.manifest.genesisId", admission.manifest.genesisId),
    threadId: nonEmpty("Genesis development admission.manifest.threadId", admission.manifest.threadId),
  });
}

export function createGenesisDevelopmentRequestStore(storage, {
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof now !== "function") throw new TypeError("Genesis development request store now must be a function");
  const session = openBirthStateDatabase(storage, { storeName: "Birth Center Genesis development request store" });
  migrate(session);

  const selectByRequest = session.prepare(`
    SELECT request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
           admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    FROM genesis_development_requests WHERE request_id=?
  `);
  const selectByGenesis = session.prepare(`
    SELECT request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
           admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    FROM genesis_development_requests WHERE genesis_id=?
  `);
  const selectByIdentity = session.prepare(`
    SELECT request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
           admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    FROM genesis_development_requests WHERE genesis_id=? OR thread_id=? LIMIT 1
  `);
  const selectRecent = session.prepare(`
    SELECT request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
           admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    FROM genesis_development_requests
    ORDER BY created_at DESC,request_id DESC
    LIMIT ?
  `);
  const insertReservation = session.prepare(`
    INSERT INTO genesis_development_requests (
      request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
      admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,NULL,NULL,'reserved',NULL,?,?)
  `);
  const updateAdmission = session.prepare(`
    UPDATE genesis_development_requests
    SET admission_digest=?, admission_json=?, status='ready', updated_at=?
    WHERE request_id=? AND status='reserved'
  `);
  const updateSubmitted = session.prepare(`
    UPDATE genesis_development_requests
    SET status='submitted', submission_result_json=?, updated_at=?
    WHERE request_id=? AND status IN ('ready','submitted')
  `);
  const selectDisposition = session.prepare(`
    SELECT request_id,outcome,failure_code,failure_message,failure_retryable,settled_at,updated_at
    FROM genesis_development_dispositions WHERE request_id=?
  `);
  const upsertFailure = session.prepare(`
    INSERT INTO genesis_development_dispositions(
      request_id,outcome,failure_code,failure_message,failure_retryable,settled_at,updated_at
    ) VALUES (?,NULL,?,?,?,NULL,?)
    ON CONFLICT(request_id) DO UPDATE SET
      failure_code=excluded.failure_code,
      failure_message=excluded.failure_message,
      failure_retryable=excluded.failure_retryable,
      updated_at=excluded.updated_at
  `);
  const upsertOutcome = session.prepare(`
    INSERT INTO genesis_development_dispositions(
      request_id,outcome,failure_code,failure_message,failure_retryable,settled_at,updated_at
    ) VALUES (?,?,NULL,NULL,NULL,?,?)
    ON CONFLICT(request_id) DO UPDATE SET
      outcome=excluded.outcome,
      settled_at=excluded.settled_at,
      updated_at=excluded.updated_at
  `);

  function get(requestId) {
    return normalize(selectByRequest.get(nonEmpty("Genesis development requestId", requestId)));
  }

  function getByGenesisId(genesisId) {
    return normalize(selectByGenesis.get(nonEmpty("Genesis development genesisId", genesisId)));
  }

  function recent({ limit = 32 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
      throw new TypeError("Genesis development recent limit must be an integer from 1 through 256");
    }
    return selectRecent.all(limit).map(normalize);
  }

  function reserve({ requestId, requestDigest, plan } = {}) {
    const identity = planIdentity(plan);
    const id = nonEmpty("Genesis development reservation requestId", requestId);
    const requestHash = nonEmpty("Genesis development reservation requestDigest", requestDigest);
    if (identity.requestId !== id || identity.requestDigest !== requestHash) {
      throw new TypeError("Genesis development reservation does not match its plan request identity");
    }
    const planDigest = canonicalDigest(plan);
    const planJson = canonicalJson(plan);
    return session.transaction(() => {
      const existing = get(id);
      if (existing !== null) {
        if (
          existing.requestDigest !== requestHash ||
          existing.planDigest !== planDigest ||
          existing.genesisId !== identity.genesisId ||
          existing.threadId !== identity.threadId
        ) {
          throw new GenesisDevelopmentRequestConflictError(
            `Genesis development request ${id} already exists for different development material`,
          );
        }
        return Object.freeze({ ...existing, idempotent: true });
      }
      const collision = normalize(selectByIdentity.get(identity.genesisId, identity.threadId));
      if (collision !== null) {
        throw new GenesisDevelopmentRequestConflictError(
          `Genesis development identity ${identity.genesisId}/${identity.threadId} is already reserved by ${collision.requestId}`,
        );
      }
      const timestamp = now();
      insertReservation.run(
        id,
        requestHash,
        planDigest,
        identity.genesisId,
        identity.threadId,
        planJson,
        timestamp,
        timestamp,
      );
      return Object.freeze({ ...get(id), idempotent: false });
    });
  }

  function saveAdmission(requestId, admission) {
    const id = nonEmpty("Genesis development requestId", requestId);
    const identity = admissionIdentity(admission);
    const admissionDigest = canonicalDigest(admission);
    const admissionJson = canonicalJson(admission);
    return session.transaction(() => {
      const existing = get(id);
      if (existing === null) throw new Error(`Genesis development request ${id} does not exist`);
      if (existing.genesisId !== identity.genesisId || existing.threadId !== identity.threadId) {
        throw new GenesisDevelopmentRequestConflictError(
          `Genesis development admission for ${id} belongs to another identity`,
        );
      }
      if (existing.admission !== null) {
        if (existing.admissionDigest !== admissionDigest) {
          throw new GenesisDevelopmentRequestConflictError(
            `Genesis development request ${id} already has different admission material`,
          );
        }
        return Object.freeze({ ...existing, idempotent: true });
      }
      updateAdmission.run(admissionDigest, admissionJson, now(), id);
      return Object.freeze({ ...get(id), idempotent: false });
    });
  }

  function markSubmitted(requestId, result) {
    const id = nonEmpty("Genesis development requestId", requestId);
    plain("Genesis development submission result", result);
    const resultJson = canonicalJson(result);
    return session.transaction(() => {
      const existing = get(id);
      if (existing === null) throw new Error(`Genesis development request ${id} does not exist`);
      if (existing.admission === null) throw new Error(`Genesis development request ${id} has no ready admission package`);
      if (existing.status === "submitted") {
        if (canonicalJson(existing.submissionResult) !== resultJson) {
          throw new GenesisDevelopmentRequestConflictError(
            `Genesis development request ${id} already has a different submission result`,
          );
        }
        return Object.freeze({ ...existing, idempotent: true });
      }
      updateSubmitted.run(resultJson, now(), id);
      return Object.freeze({ ...get(id), idempotent: false });
    });
  }

  function getDisposition(requestId) {
    const id = nonEmpty("Genesis development requestId", requestId);
    const row = selectDisposition.get(id);
    if (row === undefined) return null;
    return Object.freeze({
      requestId:row.request_id,
      outcome:row.outcome,
      failureCode:row.failure_code,
      failureMessage:row.failure_message,
      failureRetryable:row.failure_retryable === null ? null : row.failure_retryable === 1,
      settledAt:row.settled_at,
      updatedAt:row.updated_at,
    });
  }

  function recordFailure(requestId, error) {
    const id = nonEmpty("Genesis development requestId", requestId);
    if (get(id) === null) throw new Error(`Genesis development request ${id} does not exist`);
    const code = typeof error?.code === "string" && error.code.trim() !== "" ? error.code.trim() : null;
    const message = error instanceof Error ? error.message : String(error);
    const retryable = error?.retryable === true
      ? 1
      : error?.retryable === false
        ? 0
        : null;
    upsertFailure.run(id, code, message, retryable, now());
    return getDisposition(id);
  }

  function settle(requestId, outcome) {
    const id = nonEmpty("Genesis development requestId", requestId);
    if (get(id) === null) throw new Error(`Genesis development request ${id} does not exist`);
    const existing = getDisposition(id);
    if (existing !== null && existing.outcome !== null && existing.outcome !== outcome) {
      throw new GenesisDevelopmentRequestConflictError(
        `Genesis development request ${id} is already settled as ${existing.outcome}`,
      );
    }
    const timestamp = now();
    upsertOutcome.run(id, outcome, timestamp, timestamp);
    return getDisposition(id);
  }

  return Object.freeze({
    storeVersion: GENESIS_DEVELOPMENT_REQUEST_STORE_VERSION,
    stateScopeId: session.scopeId,
    get,
    getByGenesisId,
    recent,
    reserve,
    saveAdmission,
    markSubmitted,
    getDisposition,
    recordFailure,
    settleBorn(requestId) { return settle(requestId, "born"); },
    settleStillborn(requestId) { return settle(requestId, "stillborn"); },
    close() { session.close(); },
  });
}
