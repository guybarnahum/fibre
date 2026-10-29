import { openBirthStateDatabase } from "./birth-state-storage.mjs";

const ACTIVE = new Set(["queued","authoring","developing","publishing"]);
const STATUSES = new Set([...ACTIVE,"published","failed"]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function nullableText(name, value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${name} must be a string or null`);
  return value.trim();
}

function normalizeSex(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value !== "female" && value !== "male") throw new TypeError("birth sex must be female, male, or null");
  return value;
}

function storedLocation(value) {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.freeze(parsed) : null;
  } catch {
    return null;
  }
}

function normalize(row) {
  if (row === undefined) return null;
  return Object.freeze({
    requestId:row.request_id,
    requestedAt:row.requested_at,
    requestedLocation:storedLocation(row.requested_location),
    requestedSex:row.requested_sex,
    location:row.selected_location,
    locationSource:row.location_source,
    sex:row.selected_sex,
    status:row.status,
    threadId:row.thread_id,
    genesisId:row.genesis_id,
    error:row.error_text,
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  });
}

export function createBirthRequestStore(storage, { now = () => new Date().toISOString() } = {}) {
  if (typeof now !== "function") throw new TypeError("birth request store now must be a function");
  const database = openBirthStateDatabase(storage, { storeName:"ModernBirthRequestStore" });

  const select = database.prepare(`
    SELECT request_id,requested_at,requested_location,requested_sex,selected_location,location_source,
           selected_sex,status,thread_id,genesis_id,error_text,created_at,updated_at
    FROM modern_birth_requests WHERE request_id=?
  `);
  const insert = database.prepare(`
    INSERT INTO modern_birth_requests(
      request_id,requested_at,requested_location,requested_sex,selected_location,location_source,
      selected_sex,status,thread_id,genesis_id,error_text,created_at,updated_at
    ) VALUES (?,?,?,?,NULL,NULL,NULL,'queued',NULL,NULL,NULL,?,?)
  `);
  const update = database.prepare(`
    UPDATE modern_birth_requests
    SET selected_location=?,location_source=?,selected_sex=?,status=?,thread_id=?,genesis_id=?,error_text=?,updated_at=?
    WHERE request_id=?
  `);
  const recentAll = database.prepare(`
    SELECT request_id,requested_at,requested_location,requested_sex,selected_location,location_source,
           selected_sex,status,thread_id,genesis_id,error_text,created_at,updated_at
    FROM modern_birth_requests
    WHERE lifecycle_input_json IS NULL
    ORDER BY created_at DESC,request_id DESC
    LIMIT ?
  `);
  const recentActive = database.prepare(`
    SELECT request_id,requested_at,requested_location,requested_sex,selected_location,location_source,
           selected_sex,status,thread_id,genesis_id,error_text,created_at,updated_at
    FROM modern_birth_requests
    WHERE lifecycle_input_json IS NULL AND status IN ('queued','authoring','developing','publishing')
    ORDER BY created_at DESC,request_id DESC
    LIMIT ?
  `);
  // The existing status/created index reaches failed admin births regardless
  // of age. A settled disposition is never reconsidered.
  const failedUnsettledQuery = database.prepare(`
    SELECT b.request_id,b.requested_at,b.requested_location,b.requested_sex,b.selected_location,
           b.location_source,b.selected_sex,b.status,b.thread_id,b.genesis_id,
           b.error_text,b.created_at,b.updated_at
    FROM modern_birth_requests b
    JOIN genesis_development_requests g ON g.request_id=b.request_id
    LEFT JOIN genesis_development_dispositions d ON d.request_id=b.request_id
    WHERE b.lifecycle_input_json IS NULL AND b.status='failed' AND b.thread_id IS NOT NULL
      AND (b.location_source IS NULL OR b.location_source!='cli')
      AND d.outcome IS NULL AND (d.failure_retryable IS NULL OR d.failure_retryable=0)
      AND (b.created_at > ? OR (b.created_at = ? AND b.request_id > ?))
    ORDER BY b.created_at ASC,b.request_id ASC
    LIMIT ?
  `);

  function get(requestId) {
    return normalize(select.get(nonEmpty("birth requestId", requestId)));
  }

  function enqueue({ requestId, requestedAt, location = null, sex = null } = {}) {
    const id = nonEmpty("birth requestId", requestId);
    const at = nonEmpty("birth requestedAt", requestedAt);
    if (!Number.isFinite(Date.parse(at))) throw new TypeError("birth requestedAt must be an ISO timestamp");
    const requestedLocation = location === null || location === undefined
      ? null
      : JSON.stringify(location);
    const requestedSex = normalizeSex(sex);
    return database.transaction(() => {
      const existing = get(id);
      if (existing !== null) {
        if (
          existing.requestedAt !== at
          || JSON.stringify(existing.requestedLocation) !== requestedLocation
          || existing.requestedSex !== requestedSex
        ) throw new Error(`birth request ${id} already exists with different input`);
        return existing;
      }
      const timestamp = now();
      insert.run(id, at, requestedLocation, requestedSex, timestamp, timestamp);
      return get(id);
    });
  }

  function progress(requestId, patch = {}) {
    const id = nonEmpty("birth requestId", requestId);
    const existing = get(id);
    if (existing === null) throw new Error(`birth request ${id} was not enqueued`);
    const status = patch.status ?? existing.status;
    if (!STATUSES.has(status)) throw new TypeError(`unsupported birth status ${String(status)}`);
    const next = {
      location:patch.location === undefined ? existing.location : nullableText("birth selected location", patch.location),
      locationSource:patch.locationSource === undefined ? existing.locationSource : nullableText("birth location source", patch.locationSource),
      sex:patch.sex === undefined ? existing.sex : normalizeSex(patch.sex),
      threadId:patch.threadId === undefined ? existing.threadId : nullableText("birth threadId", patch.threadId),
      genesisId:patch.genesisId === undefined ? existing.genesisId : nullableText("birth genesisId", patch.genesisId),
      error:patch.error === undefined ? existing.error : nullableText("birth error", patch.error),
    };
    update.run(
      next.location,
      next.locationSource,
      next.sex,
      status,
      next.threadId,
      next.genesisId,
      next.error,
      now(),
      id,
    );
    return get(id);
  }

  function fail(requestId, error) {
    return progress(requestId, {
      status:"failed",
      error:error instanceof Error ? error.message : String(error),
    });
  }

  function recent({ limit = 64, activeOnly = false } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
      throw new TypeError("birth recent limit must be an integer from 1 through 256");
    }
    return (activeOnly ? recentActive : recentAll).all(limit).map(normalize);
  }

  return Object.freeze({
    get,
    enqueue,
    progress,
    fail,
    recent,
    unsettledFailed({limit=64,after=null}={}){
      if(!Number.isSafeInteger(limit)||limit<1||limit>256)
        throw new TypeError("failed birth query limit must be 1 through 256");
      const createdAt=after?.createdAt??"";
      const requestId=after?.requestId??"";
      return failedUnsettledQuery.all(createdAt,createdAt,requestId,limit).map(normalize);
    },
    isActive(status) { return ACTIVE.has(status); },
    close() { database.close(); },
  });
}
