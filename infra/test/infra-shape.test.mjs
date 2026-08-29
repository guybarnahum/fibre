import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);

async function exists(path) {
  try {
    await access(new URL(path, ROOT));
    return true;
  } catch {
    return false;
  }
}

test("Infra has one root owner with provider implementations below providers", async () => {
  assert.equal(await exists("infra/infra-driver.mjs"), true);
  assert.equal(await exists("infra/service.mjs"), true);
  assert.equal(await exists("infra/providers/local/"), true);
  assert.equal(await exists("infra/providers/cloudflare/"), true);
  assert.equal(await exists("infra/deployments/"), true);

  for (const removed of [
    "packages/infra/",
    "deployments/",
    "infra/src/",
    "infra/service-runtime/",
    "infra/local/",
    "infra/cloudflare/",
    "infra/aws/",
    "infra/providers/aws/",
  ]) {
    assert.equal(await exists(removed), false, `${removed} must not be reintroduced`);
  }
});

test("Infra root stays shallow", async () => {
  const entries = await readdir(new URL("infra/", ROOT), { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(directories, ["deployments", "providers", "test"]);
});
