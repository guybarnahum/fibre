import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { createCloudflareStateInfraDriver } from "../../../infra/providers/cloudflare/transactional-state.mjs";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openWorldStore, threadStateHash } from "../src/persistence.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

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
        const normalized = sql.trim();
        if (bindings.length === 0 && /;\s*(?:\S|$)/u.test(normalized.replace(/;\s*$/u, ""))) {
          database.exec(sql);
          return cursor();
        }
        if (bindings.length === 0 && /^(?:CREATE|ALTER|DROP)\b/iu.test(normalized)) {
          database.exec(sql);
          return cursor();
        }
        const statement = database.prepare(sql);
        if (/^(?:SELECT|WITH|EXPLAIN|PRAGMA)\b/iu.test(normalized)) {
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

function localHarness() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-provider-local-"));
  const databasePath = join(directory, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({
    driverId: "sqlite-world-provider-contract",
    scopes: { world: databasePath },
  });
  return {
    storage: Object.freeze({ infraDriver, stateScopeId: "world" }),
    close() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function cloudflareHarness() {
  const durableObjectStorage = sqliteBackedDurableObjectStorage();
  const infraDriver = createCloudflareStateInfraDriver({
    driverId: "cloudflare-world-provider-contract",
    scopes: { world: durableObjectStorage },
  });
  return {
    storage: Object.freeze({ infraDriver, stateScopeId: "world" }),
    close() {
      durableObjectStorage.close();
    },
  };
}

function selfModelCommand({ commandId, expectedVersion, occurredAt, summary }) {
  return {
    commandId,
    threadId: fixture.threadId,
    expectedVersion,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: `I remain reliable in systems work. ${summary}`,
      summary,
    },
    actor: {
      entityId: "test_world_provider_contract",
      kind: "system",
      displayName: "World provider contract",
    },
    occurredAt,
  };
}

for (const [providerName, createHarness] of [
  ["local SQLite InfraDriver.state", localHarness],
  ["Cloudflare SQLite Durable Object InfraDriver.state", cloudflareHarness],
]) {
  test(`${providerName} runs the same authoritative WorldStore transaction contract`, () => {
    const harness = createHarness();
    try {
      const store = openWorldStore(harness.storage);
      const seeded = store.seedThread(structuredClone(fixture));
      assert.equal(seeded.created, true);
      assert.deepEqual(store.verifyThreadIntegrity(fixture.threadId), {
        threadId: fixture.threadId,
        version: 1,
        stateHash: threadStateHash(seeded.thread),
        eventCount: 1,
      });

      const committed = store.applyCommand(selfModelCommand({
        commandId: "cmd_world_provider_committed",
        expectedVersion: 1,
        occurredAt: "2026-08-31T08:00:00Z",
        summary: "I seek explicit review before committing identity-sensitive changes.",
      }));
      assert.equal(committed.thread.version, 2);
      assert.equal(store.listEvents(fixture.threadId).length, 2);
      store.close();

      const reopened = openWorldStore(harness.storage);
      assert.equal(reopened.getThread(fixture.threadId).version, 2);
      assert.equal(reopened.verifyThreadIntegrity(fixture.threadId).eventCount, 2);

      const stateSession = harness.storage.infraDriver.state.open(harness.storage.stateScopeId);
      try {
        stateSession.exec(`
          CREATE TRIGGER provider_contract_fail_command
          BEFORE INSERT ON commands
          BEGIN
            SELECT RAISE(ABORT, 'forced provider-contract command failure');
          END;
        `);
      } finally {
        stateSession.close();
      }

      assert.throws(
        () => reopened.applyCommand(selfModelCommand({
          commandId: "cmd_world_provider_rolled_back",
          expectedVersion: 2,
          occurredAt: "2026-08-31T08:01:00Z",
          summary: "This change must roll back as one authoritative transaction.",
        })),
        /forced provider-contract command failure/,
      );
      assert.equal(reopened.getThread(fixture.threadId).version, 2);
      assert.equal(reopened.listEvents(fixture.threadId).length, 2);
      assert.equal(reopened.verifyThreadIntegrity(fixture.threadId).eventCount, 2);
      reopened.close();
    } finally {
      harness.close();
    }
  });
}
