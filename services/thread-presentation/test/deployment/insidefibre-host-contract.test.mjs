import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentationConfigUrl = new URL(
  "../../../../infra/deployments/thread-presentation/cloudflare/wrangler.jsonc",
  import.meta.url,
);

async function config() {
  return JSON.parse(await readFile(presentationConfigUrl, "utf8"));
}

test("Thread Presentation owns the insidefibre public API hostname and Viewer origin contract", async () => {
  const deployment = await config();
  assert.deepEqual(deployment.routes, [{
    pattern: "api.insidefibre.com",
    custom_domain: true,
  }]);
  assert.equal(deployment.vars.VIEWER_ORIGIN, "https://insidefibre.com");
});
