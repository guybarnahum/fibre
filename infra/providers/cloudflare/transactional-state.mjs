import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "../../infra-driver.mjs";
import {
  assertInfraId,
  assertInfraPlainObject,
} from "../../internal.mjs";
import {
  TRANSACTIONAL_STATE_VERSION,
  assertSynchronousTransactionResult,
  assertTransactionalStateSession,
} from "../../transactional-state.mjs";

const FIBRE_SQLITE_META_TABLE = "_fibre_sqlite_meta";
const USER_VERSION_KEY = "user_version";
const USER_VERSION_READ_PATTERN = /^\s*PRAGMA\s+user_version\s*;?\s*$/iu;
const USER_VERSION_WRITE_PATTERN = /^\s*PRAGMA\s+user_version\s*=\s*(\d+)\s*;?\s*$/iu;

function assertDurableObjectStorage(storage, scopeId) {
  if (!storage || typeof storage !== "object") {
    throw new TypeError(`Cloudflare transactional state scope ${scopeId} requires Durable Object storage`);
  }
  if (!storage.sql || typeof storage.sql.exec !== "function") {
    throw new TypeError(`Cloudflare transactional state scope ${scopeId} requires SQLite-backed Durable Object storage`);
  }
  if (typeof storage.transactionSync !== "function") {
    throw new TypeError(`Cloudflare transactional state scope ${scopeId} requires transactionSync()`);
  }
  return storage;
}

function normalizeScopes(scopes) {
  assertInfraPlainObject("Cloudflare transactional state scopes", scopes);
  const normalized = new Map();
  for (const [scopeId, storage] of Object.entries(scopes)) {
    assertInfraId("Cloudflare transactional state scopeId", scopeId);
    normalized.set(scopeId, assertDurableObjectStorage(storage, scopeId));
  }
  if (normalized.size === 0) throw new TypeError("Cloudflare transactional state requires at least one scope");
  return normalized;
}

function stateGuarantees() {
  return Object.freeze({
    relationalStatements: true,
    atomicWriteTransactions: true,
    serializedWriteTransactions: true,
    durableCommitBeforeAcknowledgement: true,
    transactionalReads: true,
    schemaMigrations: true,
    consistencyScope: "single_named_scope",
  });
}

function firstSqlKeyword(sql) {
  if (typeof sql !== "string" || sql.trim() === "") throw new TypeError("transactional state SQL must be a non-empty string");
  const stripped = sql
    .replace(/^\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)*/u, "")
    .trimStart();
  return stripped.match(/^([A-Za-z]+)/u)?.[1]?.toUpperCase() ?? "";
}

function assertReadOnlySql(sql) {
  const keyword = firstSqlKeyword(sql);
  if (!["SELECT", "WITH", "EXPLAIN", "PRAGMA"].includes(keyword)) {
    throw new Error("transactional state session is read-only");
  }
}

function normalizeRows(cursor) {
  if (!cursor || typeof cursor.toArray !== "function") {
    throw new TypeError("Cloudflare SQLite cursor must provide toArray()");
  }
  return cursor.toArray().map((row) => Object.fromEntries(Object.entries(row)));
}

function syntheticCursor(rows, { rowsWritten = 0 } = {}) {
  const snapshot = rows.map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    rowsWritten,
    toArray() { return snapshot.map((row) => ({ ...row })); },
  });
}

function runResult(cursor) {
  return {
    changes: Number.isSafeInteger(cursor?.rowsWritten) ? cursor.rowsWritten : 0,
  };
}

function classifyUserVersionPragma(sql) {
  if (typeof sql !== "string") return null;
  if (USER_VERSION_READ_PATTERN.test(sql)) return Object.freeze({ kind: "read" });
  const write = sql.match(USER_VERSION_WRITE_PATTERN);
  if (!write) return null;
  const version = Number(write[1]);
  if (!Number.isSafeInteger(version)) throw new TypeError("PRAGMA user_version must be a safe non-negative integer");
  return Object.freeze({ kind: "write", version });
}

function readCloudflareUserVersion(storage) {
  const table = normalizeRows(storage.sql.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    FIBRE_SQLITE_META_TABLE,
  ))[0];
  if (table === undefined) return syntheticCursor([{ user_version: 0 }]);
  const row = normalizeRows(storage.sql.exec(
    `SELECT integer_value AS user_version FROM ${FIBRE_SQLITE_META_TABLE} WHERE key = ? LIMIT 1`,
    USER_VERSION_KEY,
  ))[0];
  const version = Number(row?.user_version ?? 0);
  if (!Number.isSafeInteger(version) || version < 0) throw new Error("Cloudflare Fibre SQLite user_version metadata is invalid");
  return syntheticCursor([{ user_version: version }]);
}

function writeCloudflareUserVersion(storage, version) {
  storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS ${FIBRE_SQLITE_META_TABLE} (
      key TEXT PRIMARY KEY,
      integer_value INTEGER NOT NULL CHECK (integer_value >= 0)
    ) STRICT
  `);
  return storage.sql.exec(
    `INSERT INTO ${FIBRE_SQLITE_META_TABLE}(key, integer_value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET integer_value = excluded.integer_value`,
    USER_VERSION_KEY,
    version,
  );
}

function executeCloudflareSql(storage, sql, params, { readOnly }) {
  const pragma = classifyUserVersionPragma(sql);
  if (pragma?.kind === "read") {
    if (params.length !== 0) throw new TypeError("PRAGMA user_version does not accept bound parameters");
    return readCloudflareUserVersion(storage);
  }
  if (pragma?.kind === "write") {
    if (params.length !== 0) throw new TypeError("PRAGMA user_version does not accept bound parameters");
    if (readOnly) throw new Error("transactional state session is read-only");
    return writeCloudflareUserVersion(storage, pragma.version);
  }
  return storage.sql.exec(sql, ...params);
}

function createSession(scopeId, storage, { readOnly }) {
  let closed = false;
  let transactionActive = false;

  function assertOpen() {
    if (closed) throw new Error(`transactional state session ${scopeId} is closed`);
  }

  function execute(sql, params = [], { mutation = false } = {}) {
    assertOpen();
    if (readOnly && mutation) throw new Error(`transactional state scope ${scopeId} is read-only`);
    if (readOnly) assertReadOnlySql(sql);
    return executeCloudflareSql(storage, sql, params, { readOnly });
  }

  const session = {
    scopeId,
    readOnly,
    exec(sql) {
      execute(sql, [], { mutation: !readOnly });
    },
    prepare(sql) {
      assertOpen();
      return Object.freeze({
        run(...params) {
          return runResult(execute(sql, params, { mutation: true }));
        },
        get(...params) {
          const rows = normalizeRows(execute(sql, params));
          return rows[0];
        },
        all(...params) {
          return normalizeRows(execute(sql, params));
        },
      });
    },
    transaction(callback) {
      assertOpen();
      if (typeof callback !== "function") throw new TypeError("transactional state transaction callback must be a function");
      if (transactionActive) throw new Error(`transactional state scope ${scopeId} already has an active transaction`);
      transactionActive = true;
      try {
        return storage.transactionSync(() => assertSynchronousTransactionResult(callback(session)));
      } finally {
        transactionActive = false;
      }
    },
    close() {
      closed = true;
    },
  };

  return assertTransactionalStateSession(Object.freeze(session), { scopeId, readOnly });
}

export function createCloudflareTransactionalStatePort({ scopes } = {}) {
  const normalizedScopes = normalizeScopes(scopes);
  return Object.freeze({
    stateVersion: TRANSACTIONAL_STATE_VERSION,
    guarantees(scopeId) {
      assertInfraId("transactional state scopeId", scopeId);
      if (!normalizedScopes.has(scopeId)) throw new Error(`transactional state scope ${scopeId} is not configured`);
      return stateGuarantees();
    },
    open(scopeId, { readOnly = false } = {}) {
      assertInfraId("transactional state scopeId", scopeId);
      if (typeof readOnly !== "boolean") throw new TypeError("transactional state readOnly must be boolean");
      const storage = normalizedScopes.get(scopeId);
      if (storage === undefined) throw new Error(`transactional state scope ${scopeId} is not configured`);
      return createSession(scopeId, storage, { readOnly });
    },
  });
}

export function createCloudflareStateInfraDriver({
  driverId = "cloudflare-state-v1",
  scopes,
} = {}) {
  const driver = {
    driverId,
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["state"],
    state: createCloudflareTransactionalStatePort({ scopes }),
  };
  return Object.freeze(assertInfraDriver(driver, { required: ["state"] }));
}
