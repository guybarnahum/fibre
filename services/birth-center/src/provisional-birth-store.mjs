import { openBirthStateDatabase } from "./birth-state-storage.mjs";
import { canonicalDigest, canonicalJson } from "./state-codec.mjs";

export const PROVISIONAL_BIRTH_STORE_VERSION = "fibre-provisional-birth-store-v1";

export class ProvisionalBirthConflictError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function identity(bundle) {
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("provisional birth bundle must be an object");
  }
  const manifest = bundle.manifest;
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new TypeError("provisional birth bundle.manifest is required");
  }
  return Object.freeze({
    genesisId: nonEmpty("provisional birth manifest.genesisId", manifest.genesisId),
    threadId: nonEmpty("provisional birth manifest.threadId", manifest.threadId),
  });
}

function parseJson(name, value) {
  try { return JSON.parse(value); }
  catch (error) { throw new Error(`${name} contains invalid JSON: ${error.message}`); }
}

function normalize(row) {
  if (row === undefined) return null;
  return Object.freeze({
    genesisId: row.genesis_id,
    threadId: row.thread_id,
    bundleDigest: row.bundle_digest,
    bundle: parseJson("provisional birth bundle", row.bundle_json),
    status: row.status === "pending" && row.world_result_json !== null ? "failed" : row.status,
    worldResult: row.world_result_json === null ? null : parseJson("provisional birth World result", row.world_result_json),
    attemptCount:row.attempt_count,
    nextAttemptAt:row.next_attempt_at,
    lastRetryableError:row.last_retryable_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function createProvisionalBirthStore(storage, {
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof now !== "function") throw new TypeError("provisional birth store now must be a function");
  const session = openBirthStateDatabase(storage, { storeName: "Birth Center provisional birth store" });
  const selectByGenesis = session.prepare(`
    SELECT genesis_id, thread_id, bundle_digest, bundle_json, status,
           world_result_json, attempt_count, next_attempt_at, last_retryable_error, created_at, updated_at
    FROM provisional_births
    WHERE genesis_id = ?
  `);
  const insertPending = session.prepare(`
    INSERT INTO provisional_births (
      genesis_id, thread_id, bundle_digest, bundle_json, status,
      world_result_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?)
  `);
  const selectPending = session.prepare(`
    SELECT genesis_id, thread_id, bundle_digest, bundle_json, status,
           world_result_json, attempt_count, next_attempt_at, last_retryable_error, created_at, updated_at
    FROM provisional_births
    WHERE status = 'pending' AND world_result_json IS NULL
      AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
    ORDER BY created_at, genesis_id
    LIMIT ?
  `);
  const selectNextAttempt = session.prepare(`
    SELECT MIN(COALESCE(next_attempt_at,0)) AS next_at
    FROM provisional_births WHERE status='pending' AND world_result_json IS NULL
  `);
  const updateRetryable = session.prepare(`
    UPDATE provisional_births
    SET attempt_count=attempt_count+1, next_attempt_at=?, last_retryable_error=?, updated_at=?
    WHERE genesis_id=? AND status='pending' AND world_result_json IS NULL
  `);
  const updatePublished = session.prepare(`
    UPDATE provisional_births
    SET status = 'published', world_result_json = ?, updated_at = ?
    WHERE genesis_id = ? AND status = 'pending' AND world_result_json IS NULL
  `);
  // The existing World result column also persists an authoritative terminal
  // rejection. A failed projection is never sent to World again.
  const updateFailed = session.prepare(`
    UPDATE provisional_births
    SET world_result_json = ?, updated_at = ?
    WHERE genesis_id = ? AND status = 'pending' AND world_result_json IS NULL
  `);

  function get(genesisId) {
    return normalize(selectByGenesis.get(nonEmpty("genesisId", genesisId)));
  }

  function accept(bundle) {
    const { genesisId, threadId } = identity(bundle);
    const digest = canonicalDigest(bundle);
    const text = canonicalJson(bundle);
    return session.transaction(() => {
      const existing = get(genesisId);
      if (existing !== null) {
        if (existing.threadId !== threadId || existing.bundleDigest !== digest) {
          throw new ProvisionalBirthConflictError(
            `provisional birth ${genesisId} already exists for different birth material`,
          );
        }
        return Object.freeze({ ...existing, idempotent: true });
      }
      const timestamp = now();
      try {
        insertPending.run(genesisId, threadId, digest, text, timestamp, timestamp);
      } catch (error) {
        const raced = get(genesisId);
        if (raced !== null && raced.threadId === threadId && raced.bundleDigest === digest) {
          return Object.freeze({ ...raced, idempotent: true });
        }
        throw error;
      }
      return Object.freeze({ ...get(genesisId), idempotent: false });
    });
  }

  function pending({ limit = 16, nowMs = Date.now() } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
      throw new TypeError("provisional birth pending limit must be an integer from 1 through 256");
    }
    return selectPending.all(nowMs,limit).map(normalize);
  }

  function nextPendingAt() {
    return selectNextAttempt.get().next_at ?? null;
  }

  function markRetryable(genesisId,{nextAttemptAt,error}) {
    if(!Number.isSafeInteger(nextAttemptAt))throw new TypeError("retry time must be an integer");
    updateRetryable.run(nextAttemptAt,nonEmpty("retryable World error",error),now(),
      nonEmpty("genesisId",genesisId));
    return get(genesisId);
  }

  function markPublished(genesisId, worldResult) {
    nonEmpty("genesisId", genesisId);
    if (worldResult === null || typeof worldResult !== "object" || Array.isArray(worldResult)) {
      throw new TypeError("provisional birth worldResult must be an object");
    }
    return session.transaction(() => {
      const existing = get(genesisId);
      if (existing === null) throw new Error(`provisional birth ${genesisId} does not exist`);
      if (existing.status === "published") {
        if (canonicalDigest(existing.worldResult) !== canonicalDigest(worldResult)) {
          throw new ProvisionalBirthConflictError(
            `provisional birth ${genesisId} already has a different World publication result`,
          );
        }
        return existing;
      }
      if(existing.status==="failed")throw new ProvisionalBirthConflictError(
        `provisional birth ${genesisId} has a terminal World rejection`);
      updatePublished.run(canonicalJson(worldResult), now(), genesisId);
      return get(genesisId);
    });
  }

  function markFailed(genesisId, {code=null,message}) {
    nonEmpty("genesisId",genesisId);
    const result={error:{code,message:nonEmpty("World publication failure message",message),retryable:false}};
    return session.transaction(()=>{
      const existing=get(genesisId);
      if(existing===null)throw new Error(`provisional birth ${genesisId} does not exist`);
      if(existing.status==="published")throw new ProvisionalBirthConflictError(
        `provisional birth ${genesisId} is already published`);
      if(existing.status==="failed")return existing;
      updateFailed.run(canonicalJson(result),now(),genesisId);
      return get(genesisId);
    });
  }

  function countPending() {
    return session.prepare("SELECT COUNT(*) AS count FROM provisional_births WHERE status = 'pending' AND world_result_json IS NULL").get().count;
  }

  return Object.freeze({
    storeVersion: PROVISIONAL_BIRTH_STORE_VERSION,
    stateScopeId: session.scopeId,
    get,
    accept,
    pending,
    nextPendingAt,
    markRetryable,
    markPublished,
    markFailed,
    countPending,
    close() { session.close(); },
  });
}
