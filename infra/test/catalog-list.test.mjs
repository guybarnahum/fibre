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
              const [prefix, upper, after, limit] = args;
              if(normalized.includes("LIKE")||normalized.includes("GLOB")){
                throw new Error("D1 catalog prefix query must not use LIKE/GLOB");
              }
              const results = [...values.entries()]
                .filter(([key]) => key >= prefix && key < upper && key > after)
                .sort(([left],[right]) => left < right ? -1 : left > right ? 1 : 0)
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

test("Cloudflare D1 catalogs support long Thread-scoped and literal wildcard prefixes", async () => {
  const catalog=createCloudflareCatalogPort(fakeD1());
  const prefix="visual-age-anchor:admission:thr_4d134059fa4e966706315b134e23d2d1af5d5d0b:";
  assert.ok(new TextEncoder().encode(prefix+"%").length>50);
  await catalog.upsert(prefix+"candidate_b",{age:35});
  await catalog.upsert(prefix+"candidate_a",{age:12});
  await catalog.upsert(prefix.replace("thr_","thr_other_")+"candidate_a",{age:60});
  await catalog.upsert("visual-age-anchor:admission:thr_unrelated:candidate_a",{age:20});
  const first=await catalog.list({prefix,limit:1});
  assert.deepEqual(first.entries.map(e=>e.value.age),[12],"Thread-local age lookup returned another identity");
  const next=await catalog.list({prefix,after:first.nextCursor,limit:1});
  assert.deepEqual(next.entries.map(e=>e.value.age),[35],"Thread-local age lookup lost pagination");
  assert.equal(next.nextCursor,null);

  await catalog.upsert("literal_%_anchor:1",{age:9});
  await catalog.upsert("literal_xyz_anchor:2",{age:8});
  const literal=await catalog.list({prefix:"literal_%_anchor:"});
  assert.deepEqual(literal.entries.map(e=>e.value.age),[9],"Literal % or _ widened catalog lookup");
});
