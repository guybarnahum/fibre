import test from "node:test";
import assert from "node:assert/strict";

import { createCloudflareTransactionalStatePort } from "../providers/cloudflare/transactional-state.mjs";

function cursor(rows = [], rowsWritten = 0) {
  return {
    rowsWritten,
    toArray() { return rows.map((row) => ({ ...row })); },
  };
}

function fakeSqliteDurableStorage() {
  let metadataTable = false;
  let userVersion = null;
  let transactions = 0;
  const ordinaryCalls = [];
  return {
    get metadataTable() { return metadataTable; },
    get userVersion() { return userVersion; },
    get transactions() { return transactions; },
    ordinaryCalls,
    sql: {
      exec(sql, ...params) {
        const normalized = String(sql).replace(/\s+/gu, " ").trim();
        if (normalized.startsWith("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")) {
          assert.deepEqual(params, ["_fibre_sqlite_meta"]);
          return cursor(metadataTable ? [{ name: "_fibre_sqlite_meta" }] : []);
        }
        if (normalized.startsWith("SELECT integer_value AS user_version FROM _fibre_sqlite_meta")) {
          assert.equal(metadataTable, true);
          assert.deepEqual(params, ["user_version"]);
          return cursor(userVersion === null ? [] : [{ user_version: userVersion }]);
        }
        if (normalized.startsWith("CREATE TABLE IF NOT EXISTS _fibre_sqlite_meta")) {
          metadataTable = true;
          return cursor();
        }
        if (normalized.startsWith("INSERT INTO _fibre_sqlite_meta(key, integer_value)")) {
          assert.equal(metadataTable, true);
          assert.equal(params[0], "user_version");
          userVersion = params[1];
          return cursor([], 1);
        }
        ordinaryCalls.push({ sql, params });
        return cursor([{ value: params[0] ?? "ordinary" }]);
      },
    },
    transactionSync(callback) {
      transactions += 1;
      return callback();
    },
  };
}

test("Cloudflare transactional state emulates SQLite user_version without mutating a fresh read", () => {
  const storage = fakeSqliteDurableStorage();
  const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
  const database = state.open("world");

  assert.deepEqual(database.prepare("PRAGMA user_version").get(), { user_version: 0 });
  assert.equal(storage.metadataTable, false, "reading an unversioned fresh Durable Object must not create metadata");

  database.exec("PRAGMA user_version = 23");
  assert.equal(storage.metadataTable, true);
  assert.equal(storage.userVersion, 23);
  assert.deepEqual(database.prepare(" PRAGMA  user_version ; ").get(), { user_version: 23 });
});

test("Cloudflare user_version compatibility remains transactional and rejects writes from read-only sessions", () => {
  const storage = fakeSqliteDurableStorage();
  const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
  const database = state.open("world");

  database.transaction((tx) => {
    tx.exec("PRAGMA user_version=7;");
  });
  assert.equal(storage.transactions, 1);
  assert.equal(database.prepare("PRAGMA user_version").get().user_version, 7);

  const readOnly = state.open("world", { readOnly: true });
  assert.equal(readOnly.prepare("PRAGMA user_version").get().user_version, 7);
  assert.throws(() => readOnly.exec("PRAGMA user_version = 8"), /read-only/u);
  assert.equal(storage.userVersion, 7);
});

test("Cloudflare transactional state delegates ordinary SQL unchanged", () => {
  const storage = fakeSqliteDurableStorage();
  const state = createCloudflareTransactionalStatePort({ scopes: { world: storage } });
  const database = state.open("world");

  assert.deepEqual(database.prepare("SELECT ? AS value").get("delegated"), { value: "delegated" });
  assert.deepEqual(storage.ordinaryCalls, [{ sql: "SELECT ? AS value", params: ["delegated"] }]);
});
