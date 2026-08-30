import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

test("WorldStore persists Thread projection and event history through Infra state", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-infra-state-"));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({
    scopes: { world: databasePath },
  });
  let store = openWorldStore({ infraDriver, stateScopeId: "world" });

  try {
    const seeded = store.seedThread(mina);
    assert.equal(seeded.created, true);
    assert.deepEqual(store.getThread(mina.threadId), seeded.thread);

    const initialEvents = store.listEvents(mina.threadId);
    assert.equal(initialEvents.length, 1);
    assert.equal(initialEvents[0].eventType, "THREAD_SEEDED");
    assert.equal(store.verifyThreadIntegrity(mina.threadId).eventCount, 1);

    store.close();
    store = openWorldStore({ infraDriver, stateScopeId: "world" });

    assert.deepEqual(store.getThread(mina.threadId), seeded.thread);
    assert.deepEqual(store.listEvents(mina.threadId), initialEvents);
    assert.equal(store.verifyThreadIntegrity(mina.threadId).eventCount, 1);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
