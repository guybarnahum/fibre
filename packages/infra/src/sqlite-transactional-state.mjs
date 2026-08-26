import { mkdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "./infra-driver.mjs";
import {
  assertInfraId,
  assertInfraPlainObject,
} from "./internal.mjs";
import {
  TRANSACTIONAL_STATE_VERSION,
  assertTransactionalStateSession,
} from "./transactional-state.mjs";

function normalizeSqlitePath(databasePath) {
  if (databasePath === ":memory:") return databasePath;
  if (typeof databasePath !== "string" || databasePath.trim() === "") {
    throw new TypeError("SQLite transactional state database path is required");
  }
  const absolutePath = resolve(databasePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const parent = realpathSync(dirname(absolutePath));
  return resolve(parent, basename(absolutePath));
}

function normalizeScopes(scopes) {
  assertInfraPlainObject("SQLite transactional state scopes", scopes);
  const normalized = new Map();
  for (const [scopeId, databasePath] of Object.entries(scopes)) {
    assertInfraId("SQLite transactional state scopeId", scopeId);
    normalized.set(scopeId, normalizeSqlitePath(databasePath));
  }
  if (normalized.size === 0) throw new TypeError("SQLite transactional state requires at least one scope");
  return normalized;
}

function normalizeSqliteRecord(record) {
  if (record === undefined) return undefined;
  return Object.fromEntries(Object.entries(record));
}

function stateGuarantees(databasePath) {
  return Object.freeze({
    relationalStatements: true,
    atomicWriteTransactions: true,
    durableCommitBeforeAcknowledgement: databasePath !== ":memory:",
    transactionalReads: true,
    schemaMigrations: true,
    consistencyScope: "single_named_scope",
  });
}

function sqlTransactionTransition(sql) {
  const normalized = String(sql).trim().replace(/;+\s*$/u, "").toUpperCase();
  if (/^BEGIN(?:\s|$)/u.test(normalized)) return "begin";
  if (normalized === "COMMIT" || normalized === "END") return "commit";
  if (normalized === "ROLLBACK") return "rollback";
  return null;
}

function createSession(scopeId, databasePath, { readOnly, busyTimeoutMs }) {
  const database = new DatabaseSync(databasePath, {
    readOnly,
    enableForeignKeyConstraints: true,
  });
  let closed = false;
  let transactionActive = false;

  try {
    if (readOnly) {
      database.exec(`PRAGMA query_only=ON; PRAGMA busy_timeout=${busyTimeoutMs};`);
    } else {
      database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=${busyTimeoutMs};`);
    }
  } catch (error) {
    database.close();
    throw error;
  }

  function assertOpen() {
    if (closed) throw new Error(`transactional state session ${scopeId} is closed`);
  }

  const session = {
    scopeId,
    readOnly,
    exec(sql) {
      assertOpen();
      const transition = sqlTransactionTransition(sql);
      const result = database.exec(sql);
      if (transition === "begin") transactionActive = true;
      else if (transition === "commit" || transition === "rollback") transactionActive = false;
      return result;
    },
    prepare(sql) {
      assertOpen();
      const statement = database.prepare(sql);
      return Object.freeze({
        run(...params) {
          assertOpen();
          return normalizeSqliteRecord(statement.run(...params));
        },
        get(...params) {
          assertOpen();
          return normalizeSqliteRecord(statement.get(...params));
        },
        all(...params) {
          assertOpen();
          return statement.all(...params).map(normalizeSqliteRecord);
        },
      });
    },
    beginWrite() {
      assertOpen();
      if (readOnly) throw new Error(`transactional state scope ${scopeId} is read-only`);
      if (transactionActive) throw new Error(`transactional state scope ${scopeId} already has an active transaction`);
      session.exec("BEGIN IMMEDIATE");
    },
    commit() {
      assertOpen();
      if (!transactionActive) throw new Error(`transactional state scope ${scopeId} has no active transaction`);
      session.exec("COMMIT");
    },
    rollback() {
      assertOpen();
      if (!transactionActive) return false;
      session.exec("ROLLBACK");
      return true;
    },
    close() {
      if (closed) return;
      if (transactionActive) {
        try { database.exec("ROLLBACK"); }
        catch { /* Closing must not turn cleanup into a second failure. */ }
        transactionActive = false;
      }
      database.close();
      closed = true;
    },
  };
  return assertTransactionalStateSession(Object.freeze(session), { scopeId, readOnly });
}

export function createSqliteTransactionalStatePort({
  scopes,
  busyTimeoutMs = 5_000,
} = {}) {
  const normalizedScopes = normalizeScopes(scopes);
  if (!Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 0) {
    throw new TypeError("SQLite transactional state busyTimeoutMs must be a non-negative integer");
  }

  return Object.freeze({
    stateVersion: TRANSACTIONAL_STATE_VERSION,
    guarantees(scopeId) {
      assertInfraId("transactional state scopeId", scopeId);
      const databasePath = normalizedScopes.get(scopeId);
      if (databasePath === undefined) throw new Error(`transactional state scope ${scopeId} is not configured`);
      return stateGuarantees(databasePath);
    },
    open(scopeId, { readOnly = false } = {}) {
      assertInfraId("transactional state scopeId", scopeId);
      if (typeof readOnly !== "boolean") throw new TypeError("transactional state readOnly must be boolean");
      const databasePath = normalizedScopes.get(scopeId);
      if (databasePath === undefined) throw new Error(`transactional state scope ${scopeId} is not configured`);
      return createSession(scopeId, databasePath, { readOnly, busyTimeoutMs });
    },
  });
}

export function createSqliteStateInfraDriver({
  driverId = "sqlite-local",
  scopes,
  busyTimeoutMs = 5_000,
} = {}) {
  const driver = {
    driverId,
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["state"],
    state: createSqliteTransactionalStatePort({ scopes, busyTimeoutMs }),
  };
  return Object.freeze(assertInfraDriver(driver, { required: ["state"] }));
}
