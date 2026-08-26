import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertInfraDriver } from "../src/infra-driver.mjs";
import { createSqliteStateInfraDriver } from "../src/sqlite-transactional-state.mjs";
import {
  FIBRE_BIRTH_STATE_REQUIREMENTS,
  requireTransactionalStateGuarantees,
} from "../src/transactional-state.mjs";

function withDriver(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-infra-state-"));
  const databasePath = join(directory, "world.sqlite");
  const infra = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
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
        durableCommitBeforeAcknowledgement: true,
        transactionalReads: true,
        schemaMigrations: true,
        consistencyScope: "single_named_scope",
      },
    );
  }));

test("state commit is visible after reopening the same logical scope", () =>
  withDriver(({ infra }) => {
    const writer = infra.state.open("world");
    writer.exec("CREATE TABLE proof (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;");
    writer.beginWrite();
    writer.prepare("INSERT INTO proof(id,value) VALUES (?,?)").run("one", "committed");
    writer.commit();
    writer.close();

    const reader = infra.state.open("world", { readOnly: true });
    assert.deepEqual(reader.prepare("SELECT id,value FROM proof WHERE id=?").get("one"), {
      id: "one",
      value: "committed",
    });
    reader.close();
  }));

test("failed state transaction can roll back without a partial durable write", () =>
  withDriver(({ infra }) => {
    const session = infra.state.open("world");
    session.exec("CREATE TABLE proof (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;");
    session.beginWrite();
    session.prepare("INSERT INTO proof(id,value) VALUES (?,?)").run("one", "temporary");
    assert.equal(session.rollback(), true);
    assert.equal(session.prepare("SELECT id FROM proof WHERE id=?").get("one"), undefined);
    session.close();
  }));

test("read-only state sessions refuse write transactions", () =>
  withDriver(({ infra }) => {
    const writer = infra.state.open("world");
    writer.exec("CREATE TABLE proof (id TEXT PRIMARY KEY) STRICT;");
    writer.close();

    const reader = infra.state.open("world", { readOnly: true });
    assert.throws(() => reader.beginWrite(), /read-only/);
    reader.close();
  }));

test("unconfigured state scopes fail explicitly instead of silently creating another authority", () =>
  withDriver(({ infra }) => {
    assert.throws(() => infra.state.guarantees("other_world"), /not configured/);
    assert.throws(() => infra.state.open("other_world"), /not configured/);
  }));
