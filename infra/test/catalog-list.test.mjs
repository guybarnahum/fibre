import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "../providers/local/memory-driver.mjs";
import { createCloudflareCatalogPort } from "../providers/cloudflare/presentation-ports.mjs";

function fakeD1() {
  const values = new Map();
  return {
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();
      return {
        bind(...args) {
          return {
            async run() {
              if (!normalized.startsWith("INSERT INTO FIBRE_CATALOG")) throw new Error(`unsupported run: ${normalized}`);
              values.set(args[0], args[1]);
              return { success: true, meta: { changes: 1 } };
            },
            async all() {
              if (!normalized.startsWith("SELECT CATALOG_KEY, VALUE_JSON FROM FIBRE_CATALOG")) {
                throw new Error(`unsupported all: ${normalized}`);
              }
              const [likePattern, after, limit] = args;
              const prefix = likePattern.slice(0, -1).replace(/\\([\\%_])/g, "$1");
              const results = [...values.entries()]
                .filter(([key]) => key.startsWith(prefix) && key > after)
                .sort(([left], [right]) => left.localeCompare(right))
                .slice(0, limit)
                .map(([catalog_key, value_json]) => ({ catalog_key, value_json }));
              return { success: true, results };
            },
          };
        },
      };
    },
  };
}

async function exerciseCatalogList(catalog) {
  await catalog.upsert("media:asset_1", { kind: "media" });
  await catalog.upsert("presentation:thr_b", { threadId: "thr_b" });
  await catalog.upsert("presentation:thr_a", { threadId: "thr_a" });
  await catalog.upsert("presentation:thr_c", { threadId: "thr_c" });

  const first = await catalog.list({ prefix: "presentation:", limit: 2 });
  assert.deepEqual(first.entries.map((entry) => entry.key), ["presentation:thr_a", "presentation:thr_b"]);
  assert.equal(first.nextCursor, "presentation:thr_b");

  const second = await catalog.list({ prefix: "presentation:", after: first.nextCursor, limit: 2 });
  assert.deepEqual(second.entries.map((entry) => entry.key), ["presentation:thr_c"]);
  assert.equal(second.nextCursor, null);
}

test("memory catalog lists ordered prefix pages", async () => {
  await exerciseCatalogList(createMemoryInfraDriver().catalog);
});

test("Cloudflare D1 catalog lists ordered prefix pages", async () => {
  await exerciseCatalogList(createCloudflareCatalogPort(fakeD1()));
});
