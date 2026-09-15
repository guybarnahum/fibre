import test from "node:test";
import assert from "node:assert/strict";

import { createCloudflareInfraDriver } from "../providers/cloudflare/index.mjs";

test("Cloudflare state health is one read-only row probe and surfaces the DO quota limit", async () => {
  const statements = [];
  let transactions = 0;
  const storage = {
    sql:{
      exec(sql) {
        statements.push(sql);
        throw new Error("Exceeded allowed rows read in Durable Objects free tier.");
      },
    },
    transactionSync(callback) {
      transactions += 1;
      return callback();
    },
  };

  const infra = createCloudflareInfraDriver({ stateScopes:{ world:storage } });
  const health = await infra.health.check();

  assert.equal(health.level, "critical");
  assert.equal(health.checks.length, 1);
  assert.equal(health.checks[0].kind, "state");
  assert.equal(health.checks[0].error.code, "DURABLE_OBJECT_ROWS_READ_LIMIT");
  assert.deepEqual(statements, ["SELECT 1 AS fibre_health"]);
  assert.equal(transactions, 0);
});
