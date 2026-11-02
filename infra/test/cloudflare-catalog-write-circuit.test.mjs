import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareCatalogPort } from "../providers/cloudflare/presentation-ports.mjs";
import {createCloudflareTransactionalStatePort} from "../providers/cloudflare/transactional-state.mjs";
import {InfraCapacityExhaustedError} from "../infra-driver.mjs";

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
      assert.ok(error instanceof InfraCapacityExhaustedError);
      assert.equal(error.capability,"catalog");
      assert.equal(error.code,"INFRA_CAPACITY_EXHAUSTED");
      assert.equal(error.retryable, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  const second = createCloudflareCatalogPort(database);
  await assert.rejects(
    () => second.upsert("catalog_test_2", { value: 2 }),
    (error) => {
      assert.ok(error instanceof InfraCapacityExhaustedError);
      assert.equal(error.capability,"catalog");
      assert.equal(error.retryable, true);
      assert.equal(error.suppressActivity, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  await assert.rejects(
    () => second.remove("catalog_test_1"),
    (error) => {
      assert.ok(error instanceof InfraCapacityExhaustedError);
      assert.equal(error.capability,"catalog");
      assert.equal(error.suppressActivity, true);
      return true;
    },
  );
  assert.equal(writes, 1);

  assert.equal(await second.get("catalog_test_1"), null);
  assert.equal(reads, 1);
});

test("Cloudflare catalog and state adapt capacity failures",async()=>{
  const original=new Error("Durable Objects Free plan rows written quota exceeded");
  const state=createCloudflareTransactionalStatePort({scopes:{world:{
    sql:{exec(){throw original;}},
    transactionSync:run=>run(),
  }}});
  const session=state.open("world");
  assert.throws(()=>session.prepare("SELECT 1").get(),error=>
    error instanceof InfraCapacityExhaustedError
      &&error.capability==="state"&&error.cause===original,
    "DO quota was not translated by state");
  session.close();

  const quota=new Error("D1 daily quota");quota.code=7500;
  const catalog=createCloudflareCatalogPort({
    prepare(){return {bind(){return {async run(){throw quota;}};}};},
  });
  await assert.rejects(()=>catalog.upsert("quota_contract",{x:1}),error=>
    error instanceof InfraCapacityExhaustedError
      &&error.capability==="catalog"&&error.cause===quota,
    "D1 quota was not translated by catalog");
});
