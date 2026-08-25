import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { repoFile } from "#repo-root";

const fixture = JSON.parse(
  readFileSync(repoFile("fixtures/threads/mina.thread.json"), "utf8"),
);
const directory = mkdtempSync(join(tmpdir(), "fibre-validate-world-seed-"));
const databasePath = join(directory, "world.sqlite");

try {
  const world = openWorldStore(databasePath);
  try {
    const result = world.seedThread(structuredClone(fixture));
    assert.equal(result.created, true, "validation smoke must be able to create a Thread");
    assert.equal(result.thread.threadId, fixture.threadId, "seeded Thread identity must survive persistence");
    assert.equal(world.getThread(fixture.threadId).threadId, fixture.threadId, "seeded Thread must be readable");
  } finally {
    world.close();
  }
  console.log("World seed validation passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
