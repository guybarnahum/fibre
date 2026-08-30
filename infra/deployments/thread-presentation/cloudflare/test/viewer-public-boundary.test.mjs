import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const WRANGLER_URL = new URL("../wrangler.jsonc", import.meta.url);

test("insidefibre.com Viewer is bound only to the public Thread Presentation API origin", async () => {
  const config = JSON.parse(await readFile(WRANGLER_URL, "utf8"));

  assert.equal(config.vars.VIEWER_ORIGIN, "https://insidefibre.com");
  assert.deepEqual(config.routes, [
    {
      pattern: "api.insidefibre.com",
      custom_domain: true,
    },
  ]);
  assert.equal(config.name, "fibre-thread-presentation");
});
