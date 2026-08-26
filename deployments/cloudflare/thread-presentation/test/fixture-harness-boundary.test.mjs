import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workerUrl = new URL("../worker.mjs", import.meta.url);

test("Cloudflare live fixture harness is generic and remains explicitly dev-only", async () => {
  const source = await readFile(workerUrl, "utf8");

  assert.match(source, /env\.P3_FIXTURE_MODE !== "1"/);
  assert.match(source, /\/__p3\/fixtures\/thread/);
  assert.match(source, /\/__p3\/fixtures\/generate/);
  assert.match(source, /body\.threadId/);
  assert.match(source, /body\.mediaId/);
  assert.match(source, /presentation\?\.manifest\?\.fixture !== true/);
  assert.match(source, /\/__p3\/fixtures\/can-tho\/generate-market/,
    "existing Cần Thơ P3 endpoint should remain as a compatibility alias");
});
