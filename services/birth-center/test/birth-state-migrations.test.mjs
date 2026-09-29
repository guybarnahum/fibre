import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  BIRTH_STATE_SCHEMA_VERSION,
  migrateBirthState,
  requireCurrentBirthState,
} from "../src/birth-state-migrations.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

test("Birth Center state is migrated explicitly and runtime schema checks are read-only", (t) => {
  const state = tempBirthState(t);
  new DatabaseSync(state.databasePath).close();
  const storage = state.rawStorage();

  assert.throws(
    () => requireCurrentBirthState(storage),
    /deploy migration 2 before starting runtime/u,
  );

  assert.deepEqual(migrateBirthState(storage), {
    fromVersion:0,
    toVersion:BIRTH_STATE_SCHEMA_VERSION,
    applied:[1,2],
  });
  assert.equal(requireCurrentBirthState(storage), BIRTH_STATE_SCHEMA_VERSION);

  assert.deepEqual(migrateBirthState(storage), {
    fromVersion:BIRTH_STATE_SCHEMA_VERSION,
    toVersion:BIRTH_STATE_SCHEMA_VERSION,
    applied:[],
  });

  const session = storage.infraDriver.state.open(storage.stateScopeId, { readOnly:true });
  try {
    const tables = new Set(session.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ).all().map((row) => row.name));
    for (const table of [
      "provisional_births",
      "modern_birth_requests",
      "genesis_development_requests",
      "genesis_development_dispositions",
      "birth_model_invocations",
    ]) {
      assert.equal(tables.has(table), true, `missing migrated table ${table}`);
    }
  } finally {
    session.close();
  }
});


test("schema v1 upgrades historical unmappable births to terminal", (t) => {
  const state = tempBirthState(t);
  const storage = state.rawStorage();
  migrateBirthState(storage);

  const database = new DatabaseSync(state.databasePath);
  database.exec(`
    PRAGMA user_version = 1;
    INSERT INTO genesis_development_dispositions(
      request_id,outcome,failure_code,failure_message,failure_retryable,settled_at,updated_at
    ) VALUES (
      'tokyo-old',NULL,'ERROR','Genesis birth place Tokyo, Japan is not mappable',NULL,NULL,'2026-09-28T23:51:13Z'
    );
  `);
  database.close();

  assert.deepEqual(migrateBirthState(storage), {
    fromVersion:1,
    toVersion:2,
    applied:[2],
  });

  const session = storage.infraDriver.state.open(storage.stateScopeId, { readOnly:true });
  try {
    const row = session.prepare(`
      SELECT failure_code,failure_retryable
      FROM genesis_development_dispositions
      WHERE request_id='tokyo-old'
    `).get();
    assert.equal(row.failure_code, "GENESIS_COMPILE_VALIDATION_ERROR");
    assert.equal(row.failure_retryable, 0);
  } finally {
    session.close();
  }
});
