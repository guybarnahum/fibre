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
  if (value !== "female" && value !== "male") throw new TypeError("modern birth sex must be female, male, or null");
  return value;
}

function normalize(row) {
  if (row === undefined) return null;
  return Object.freeze({
    requestId:row.request_id,
    requestedAt:row.requested_at,
    requestedLocation:row.requested_location,
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

export function createModernBirthRequestStore(storage, { now = () => new Date().toISOString() } = {}) {
  if (typeof now !== "function") throw new TypeError("modern birth request store now must be a function");
  const database = openBirthStateDatabase(storage, { storeName:"ModernBirthRequestStore" });
  database.exec(`
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
  `);

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
    ORDER BY created_at DESC,request_id DESC
    LIMIT ?
  `);
  const recentActive = database.prepare(`
    SELECT request_id,requested_at,requested_location,requested_sex,selected_location,location_source,
           selected_sex,status,thread_id,genesis_id,error_text,created_at,updated_at
    FROM modern_birth_requests
    WHERE status IN ('queued','authoring','developing','publishing')
    ORDER BY created_at DESC,request_id DESC
    LIMIT ?
  `);

  function get(requestId) {
    return normalize(select.get(nonEmpty("modern birth requestId", requestId)));
  }

  function enqueue({ requestId, requestedAt, location = null, sex = null } = {}) {
    const id = nonEmpty("modern birth requestId", requestId);
    const at = nonEmpty("modern birth requestedAt", requestedAt);
    if (!Number.isFinite(Date.parse(at))) throw new TypeError("modern birth requestedAt must be an ISO timestamp");
    const requestedLocation = nullableText("modern birth location", location);
    const requestedSex = normalizeSex(sex);
    return database.transaction(() => {
      const existing = get(id);
      if (existing !== null) {
        if (
          existing.requestedAt !== at
          || existing.requestedLocation !== requestedLocation
          || existing.requestedSex !== requestedSex
        ) throw new Error(`modern birth request ${id} already exists with different input`);
        return existing;
      }
      const timestamp = now();
      insert.run(id, at, requestedLocation, requestedSex, timestamp, timestamp);
      return get(id);
    });
  }

  function progress(requestId, patch = {}) {
    const id = nonEmpty("modern birth requestId", requestId);
    const existing = get(id);
    if (existing === null) throw new Error(`modern birth request ${id} was not enqueued`);
    const status = patch.status ?? existing.status;
    if (!STATUSES.has(status)) throw new TypeError(`unsupported modern birth status ${String(status)}`);
    const next = {
      location:patch.location === undefined ? existing.location : nullableText("modern birth selected location", patch.location),
      locationSource:patch.locationSource === undefined ? existing.locationSource : nullableText("modern birth location source", patch.locationSource),
      sex:patch.sex === undefined ? existing.sex : normalizeSex(patch.sex),
      threadId:patch.threadId === undefined ? existing.threadId : nullableText("modern birth threadId", patch.threadId),
      genesisId:patch.genesisId === undefined ? existing.genesisId : nullableText("modern birth genesisId", patch.genesisId),
      error:patch.error === undefined ? existing.error : nullableText("modern birth error", patch.error),
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
      throw new TypeError("modern birth recent limit must be an integer from 1 through 256");
    }
    return (activeOnly ? recentActive : recentAll).all(limit).map(normalize);
  }

  return Object.freeze({
    get,
    enqueue,
    progress,
    fail,
    recent,
    isActive(status) { return ACTIVE.has(status); },
    close() { database.close(); },
  });
}
