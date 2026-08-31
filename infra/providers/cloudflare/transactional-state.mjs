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

function runResult(cursor) {
  return {
    changes: Number.isSafeInteger(cursor?.rowsWritten) ? cursor.rowsWritten : 0,
  };
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
    return storage.sql.exec(sql, ...params);
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
