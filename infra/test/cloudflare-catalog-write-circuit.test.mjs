import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareCatalogPort } from "../providers/cloudflare/presentation-ports.mjs";

function quotaError() {
  const error = new Error(
    "D1_ERROR: Your account has exceeded D1's free tier daily row write limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.",
  );
  error.code = 7500;
  return error;
}

test("Cloudflare catalog D1 quota failure opens one shared write circuit", async () => {
  let writes = 0;
  let reads = 0;
  const database = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              writes += 1;
              throw quotaError();
            },
            async first() {
              reads += 1;
              return null;
            },
            async all() {
              reads += 1;
              return { results: [] };
            },
          };
        },
      };
    },
  };

  const first = createCloudflareCatalogPort(database);
  await assert.rejects(
    () => first.upsert("catalog_test_1", { value: 1 }),
    (error) => {
      assert.equal(error.code, "D1_WRITE_QUOTA_EXHAUSTED");
      assert.equal(error.retryable, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  const second = createCloudflareCatalogPort(database);
  await assert.rejects(
    () => second.upsert("catalog_test_2", { value: 2 }),
    (error) => {
      assert.equal(error.code, "D1_WRITE_CIRCUIT_OPEN");
      assert.equal(error.retryable, true);
      assert.equal(error.suppressActivity, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  await assert.rejects(
    () => second.remove("catalog_test_1"),
    (error) => {
      assert.equal(error.code, "D1_WRITE_CIRCUIT_OPEN");
      assert.equal(error.suppressActivity, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  assert.equal(await second.get("catalog_test_1"), null);
  assert.equal(reads, 1);
});
