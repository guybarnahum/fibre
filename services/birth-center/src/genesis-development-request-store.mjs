import { openBirthStateDatabase } from "./birth-state-storage.mjs";
import { canonicalDigest, canonicalJson } from "./state-codec.mjs";

export const GENESIS_DEVELOPMENT_REQUEST_STORE_VERSION = "fibre-genesis-development-request-store-v1";

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
  const selectByIdentity = session.prepare(`
    SELECT request_id,request_digest,plan_digest,genesis_id,thread_id,plan_json,
           admission_digest,admission_json,status,submission_result_json,created_at,updated_at
    FROM genesis_development_requests WHERE genesis_id=? OR thread_id=? LIMIT 1
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

  function get(requestId) {
    return normalize(selectByRequest.get(nonEmpty("Genesis development requestId", requestId)));
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

  return Object.freeze({
    storeVersion: GENESIS_DEVELOPMENT_REQUEST_STORE_VERSION,
    stateScopeId: session.scopeId,
    get,
    reserve,
    saveAdmission,
    markSubmitted,
    close() { session.close(); },
  });
}
