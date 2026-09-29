import assert from "node:assert/strict";
import test from "node:test";

import {
  BIRTH_STATE_SCHEMA_VERSION,
  migrateBirthState,
  requireCurrentBirthState,
} from "../src/birth-state-migrations.mjs";
import { tempBirthState } from "./support/birth-state-fixture.mjs";

test("Birth Center state is migrated explicitly and runtime schema checks are read-only", (t) => {
  const state = tempBirthState(t);
  const storage = state.rawStorage();

  assert.throws(
    () => requireCurrentBirthState(storage),
    /deploy migration 1 before starting runtime/u,
  );

  assert.deepEqual(migrateBirthState(storage), {
    fromVersion:0,
    toVersion:BIRTH_STATE_SCHEMA_VERSION,
    applied:[1],
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
