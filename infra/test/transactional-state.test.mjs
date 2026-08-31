import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertInfraDriver } from "../infra-driver.mjs";
import { createSqliteStateInfraDriver } from "../providers/local/sqlite-state.mjs";
import {
  FIBRE_BIRTH_STATE_REQUIREMENTS,
  requireTransactionalStateGuarantees,
} from "../transactional-state.mjs";

function withDriver(run, { busyTimeoutMs = 5_000 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-infra-state-"));
  const databasePath = join(directory, "world.sqlite");
  const infra = createSqliteStateInfraDriver({
    scopes: { world: databasePath },
    busyTimeoutMs,
  });
  try { return run({ infra, databasePath }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test("SQLite state driver advertises and satisfies the Fibre birth transaction profile", () =>
  withDriver(({ infra }) => {
    assert.equal(assertInfraDriver(infra, { required: ["state"] }), infra);
    assert.deepEqual(
      requireTransactionalStateGuarantees(infra.state, "world", FIBRE_BIRTH_STATE_REQUIREMENTS),
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
  }));

test("same-scope write transactions serialize across independently opened sessions", () =>
  withDriver(({ infra }) => {
    const first = infra.state.open("world");
    first.exec("CREATE TABLE serialization_proof (id TEXT PRIMARY KEY) STRICT;");
    const second = infra.state.open("world");

    first.transaction(() => {
      first.prepare("INSERT INTO serialization_proof(id) VALUES (?)").run("first");
      assert.throws(
        () => second.transaction(() => second.prepare("INSERT INTO serialization_proof(id) VALUES (?)").run("blocked")),
        /busy|locked/i,
      );
    });

    second.transaction(() => {
      second.prepare("INSERT INTO serialization_proof(id) VALUES (?)").run("second");
    });

    assert.deepEqual(
      second.prepare("SELECT id FROM serialization_proof ORDER BY id").all(),
      [{ id: "first" }, { id: "second" }],
    );

    second.close();
    first.close();
  }, { busyTimeoutMs: 10 }));

test("state commit is visible after reopening the same logical scope", () =>
  withDriver(({ infra }) => {
    const writer = infra.state.open("world");
    writer.exec("CREATE TABLE proof (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;");
    writer.transaction(() => {
      const writeResult = writer.prepare("INSERT INTO proof(id,value) VALUES (?,?)").run("one", "committed");
      assert.equal(Object.getPrototypeOf(writeResult), Object.prototype);
    });
    writer.close();

    const reader = infra.state.open("world", { readOnly: true });
    assert.deepEqual(reader.prepare("SELECT id,value FROM proof WHERE id=?").get("one"), {
      id: "one",
      value: "committed",
    });
    assert.deepEqual(reader.prepare("SELECT id,value FROM proof ORDER BY id").all(), [{
      id: "one",
      value: "committed",
    }]);
    reader.close();
  }));

test("failed state transaction rolls back without a partial durable write", () =>
  withDriver(({ infra }) => {
    const session = infra.state.open("world");
    session.exec("CREATE TABLE proof (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;");
    assert.throws(() => session.transaction(() => {
      session.prepare("INSERT INTO proof(id,value) VALUES (?,?)").run("one", "temporary");
      throw new Error("abort transaction");
    }), /abort transaction/);
    assert.equal(session.prepare("SELECT id FROM proof WHERE id=?").get("one"), undefined);
    session.close();
  }));

test("transaction callbacks are synchronous for every provider", () =>
  withDriver(({ infra }) => {
    const session = infra.state.open("world");
    session.exec("CREATE TABLE proof (id TEXT PRIMARY KEY) STRICT;");
    assert.throws(
      () => session.transaction(async () => {
        session.prepare("INSERT INTO proof(id) VALUES (?)").run("one");
      }),
      /must be synchronous/,
    );
    assert.equal(session.prepare("SELECT id FROM proof").get(), undefined);
    session.close();
  }));

test("read-only state sessions permit transactional reads but refuse writes", () =>
  withDriver(({ infra }) => {
    const writer = infra.state.open("world");
    writer.exec("CREATE TABLE proof (id TEXT PRIMARY KEY) STRICT;");
    writer.transaction(() => writer.prepare("INSERT INTO proof(id) VALUES (?)").run("one"));
    writer.close();

    const reader = infra.state.open("world", { readOnly: true });
    const result = reader.transaction(() => reader.prepare("SELECT id FROM proof").get());
    assert.deepEqual(result, { id: "one" });
    assert.throws(
      () => reader.transaction(() => reader.prepare("INSERT INTO proof(id) VALUES (?)").run("two")),
      /read-only|readonly/i,
    );
    reader.close();
  }));

test("unconfigured state scopes fail explicitly instead of silently creating another authority", () =>
  withDriver(({ infra }) => {
    assert.throws(() => infra.state.guarantees("other_world"), /not configured/);
    assert.throws(() => infra.state.open("other_world"), /not configured/);
  }));
