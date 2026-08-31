import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareInfraDriver } from "../providers/cloudflare/index.mjs";
import { createLocalInfraDriver } from "../providers/local/driver.mjs";

function createCloudflareStorage() {
  let alarm = null;
  return {
    sql: {
      exec() {
        return {
          rowsWritten: 0,
          toArray() { return []; },
        };
      },
    },
    transactionSync(callback) { return callback(); },
    getAlarm() { return alarm; },
    setAlarm(value) { alarm = value; },
    deleteAlarm() { alarm = null; },
  };
}

async function assertSchedulerContract(scheduler) {
  const scheduledTimeMs = Date.now() + 60_000;
  assert.equal(await scheduler.get("world"), null);
  assert.deepEqual(await scheduler.schedule("world", scheduledTimeMs), {
    scopeId: "world",
    scheduledTimeMs,
  });
  assert.equal(await scheduler.get("world"), scheduledTimeMs);
  assert.equal(await scheduler.cancel("world"), true);
  assert.equal(await scheduler.get("world"), null);
  assert.equal(await scheduler.cancel("world"), false);
}

test("local and Cloudflare InfraDrivers expose the same World state+scheduler shape", async () => {
  const cloudStorage = createCloudflareStorage();
  const local = createLocalInfraDriver({
    stateScopes: { world: ":memory:" },
    schedulerScopes: { world: { onWake() {} } },
  });
  const cloudflare = createCloudflareInfraDriver({
    stateScopes: { world: cloudStorage },
    schedulerScopes: { world: cloudStorage },
  });

  assert.deepEqual(local.capabilities, ["state", "scheduler"]);
  assert.deepEqual(cloudflare.capabilities, ["state", "scheduler"]);
  assert.deepEqual(Object.keys(local.scheduler), Object.keys(cloudflare.scheduler));
  assert.deepEqual(Object.keys(local.state), Object.keys(cloudflare.state));

  await assertSchedulerContract(local.scheduler);
  await assertSchedulerContract(cloudflare.scheduler);
});

test("local scheduler wakes the configured scope without exposing timer APIs through InfraDriver", async () => {
  let wakeCount = 0;
  let resolveWake;
  const woke = new Promise((resolve) => { resolveWake = resolve; });
  const local = createLocalInfraDriver({
    schedulerScopes: {
      world: {
        onWake() {
          wakeCount += 1;
          resolveWake();
        },
      },
    },
  });
  const scheduledTimeMs = Date.now() + 25;
  await local.scheduler.schedule("world", scheduledTimeMs);
  await woke;
  assert.equal(wakeCount, 1);
  assert.equal(await local.scheduler.get("world"), null);
  assert.equal("setInterval" in local.scheduler, false);
  assert.equal("setTimeout" in local.scheduler, false);
});
