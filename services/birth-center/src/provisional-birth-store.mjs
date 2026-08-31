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

function migrate(session) {
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
  `);
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
    status: row.status,
    worldResult: row.world_result_json === null ? null : parseJson("provisional birth World result", row.world_result_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function createProvisionalBirthStore(storage, {
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof now !== "function") throw new TypeError("provisional birth store now must be a function");
  const session = openBirthStateDatabase(storage, { storeName: "Birth Center provisional birth store" });
  migrate(session);

  const selectByGenesis = session.prepare(`
    SELECT genesis_id, thread_id, bundle_digest, bundle_json, status,
           world_result_json, created_at, updated_at
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
           world_result_json, created_at, updated_at
    FROM provisional_births
    WHERE status = 'pending'
    ORDER BY created_at, genesis_id
    LIMIT ?
  `);
  const updatePublished = session.prepare(`
    UPDATE provisional_births
    SET status = 'published', world_result_json = ?, updated_at = ?
    WHERE genesis_id = ? AND status = 'pending'
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

  function pending({ limit = 16 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
      throw new TypeError("provisional birth pending limit must be an integer from 1 through 256");
    }
    return selectPending.all(limit).map(normalize);
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
      updatePublished.run(canonicalJson(worldResult), now(), genesisId);
      return get(genesisId);
    });
  }

  function countPending() {
    return session.prepare("SELECT COUNT(*) AS count FROM provisional_births WHERE status = 'pending'").get().count;
  }

  return Object.freeze({
    storeVersion: PROVISIONAL_BIRTH_STORE_VERSION,
    stateScopeId: session.scopeId,
    get,
    accept,
    pending,
    markPublished,
    countPending,
    close() { session.close(); },
  });
}
