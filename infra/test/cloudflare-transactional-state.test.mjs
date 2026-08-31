import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { assertInfraDriver } from "../infra-driver.mjs";
import {
  createCloudflareStateInfraDriver,
  createCloudflareTransactionalStatePort,
} from "../providers/cloudflare/transactional-state.mjs";
import {
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireTransactionalStateGuarantees,
} from "../transactional-state.mjs";

function cursor(rows = [], rowsWritten = 0) {
  return {
    rowsWritten,
    toArray() {
      return rows.map((row) => Object.fromEntries(Object.entries(row)));
    },
  };
}

function sqliteBackedDurableObjectStorage() {
  const database = new DatabaseSync(":memory:");
  let transactionActive = false;
  return {
    sql: {
      exec(sql, ...bindings) {
        if (bindings.length === 0 && /;\s*(?:\S|$)/u.test(sql.trim().replace(/;\s*$/u, ""))) {
          database.exec(sql);
          return cursor();
        }
        if (bindings.length === 0 && /^(?:CREATE|ALTER|DROP|PRAGMA)\b/iu.test(sql.trim())) {
          database.exec(sql);
          return cursor();
        }
        const statement = database.prepare(sql);
        if (/^(?:SELECT|WITH|EXPLAIN|PRAGMA)\b/iu.test(sql.trim())) {
          return cursor(statement.all(...bindings));
        }
        const result = statement.run(...bindings);
        return cursor([], Number(result.changes ?? 0));
      },
    },
    transactionSync(callback) {
      if (transactionActive) throw new Error("nested Durable Object transaction");
      database.exec("BEGIN IMMEDIATE");
      transactionActive = true;
      try {
        const result = callback();
        database.exec("COMMIT");
        transactionActive = false;
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        transactionActive = false;
        throw error;
      }
    },
    close() {
      database.close();
    },
  };
}

test("Cloudflare state advertises the same Fibre transactional guarantees as production local state", () => {
  const storage = sqliteBackedDurableObjectStorage();
  try {
    const infra = createCloudflareStateInfraDriver({ scopes: { world: storage } });
    assert.equal(assertInfraDriver(infra, { required: ["state"] }), infra);
    assert.deepEqual(
      requireTransactionalStateGuarantees(infra.state, "world", FIBRE_WORLD_STATE_REQUIREMENTS),
      {
        relationalStatements: true,
        atomicWriteTransactions: true,
        serializedWriteTransactions: true,
        durableCommitBeforeAcknowledgement: true,
        transactionalReads: true,
        schemaMigrations: true,
        consistencyScope: "single_named_scope",
      },
    );
  } finally {
    storage.close();
  }
});

test("Cloudflare state executes relational writes and reads through one named Durable Object scope", () => {
  const storage = sqliteBackedDurableObjectStorage();
  try {
    const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
    const session = state.open("world");
    session.exec("CREATE TABLE proof (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;");
    const result = session.transaction(() => session.prepare(
      "INSERT INTO proof(id,value) VALUES (?,?)",
    ).run("one", "committed"));
    assert.deepEqual(result, { changes: 1 });
    assert.deepEqual(session.prepare("SELECT id,value FROM proof WHERE id=?").get("one"), {
      id: "one",
      value: "committed",
    });
    assert.deepEqual(session.prepare("SELECT id,value FROM proof ORDER BY id").all(), [{
      id: "one",
      value: "committed",
    }]);
    session.close();
  } finally {
    storage.close();
  }
});

test("Cloudflare transactionSync rollback prevents partial authoritative state", () => {
  const storage = sqliteBackedDurableObjectStorage();
  try {
    const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
    const session = state.open("world");
    session.exec("CREATE TABLE proof (id TEXT PRIMARY KEY) STRICT;");
    assert.throws(() => session.transaction(() => {
      session.prepare("INSERT INTO proof(id) VALUES (?)").run("temporary");
      throw new Error("abort cloud transaction");
    }), /abort cloud transaction/);
    assert.equal(session.prepare("SELECT id FROM proof").get(), undefined);
    session.close();
  } finally {
    storage.close();
  }
});

test("Cloudflare state rejects async transactions and read-only mutation", () => {
  const storage = sqliteBackedDurableObjectStorage();
  try {
    const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
    const writer = state.open("world");
    writer.exec("CREATE TABLE proof (id TEXT PRIMARY KEY) STRICT;");
    assert.throws(
      () => writer.transaction(async () => writer.prepare("INSERT INTO proof(id) VALUES (?)").run("async")),
      /must be synchronous/,
    );
    assert.equal(writer.prepare("SELECT id FROM proof").get(), undefined);
    writer.close();

    const reader = state.open("world", { readOnly: true });
    assert.deepEqual(reader.transaction(() => reader.prepare("SELECT id FROM proof").all()), []);
    assert.throws(
      () => reader.transaction(() => reader.prepare("INSERT INTO proof(id) VALUES (?)").run("forbidden")),
      /read-only/,
    );
    reader.close();
  } finally {
    storage.close();
  }
});

test("Cloudflare state requires SQLite-backed Durable Object storage and explicit scopes", () => {
  assert.throws(
    () => createCloudflareTransactionalStatePort({ scopes: { world: {} } }),
    /SQLite-backed Durable Object storage/,
  );
  const storage = sqliteBackedDurableObjectStorage();
  try {
    const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
    assert.throws(() => state.open("other"), /not configured/);
  } finally {
    storage.close();
  }
});
