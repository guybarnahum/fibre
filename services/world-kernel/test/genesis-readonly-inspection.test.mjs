import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GenesisStore } from "../src/genesis-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-inspection-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test("read-only Genesis inspection is empty rather than mutating or failing on a non-Genesis world", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(localWorldStateStorage(databasePath));
    world.seedThread(structuredClone(fixture));
    world.close();

    const inspector = new GenesisStore(localWorldStateStorage(databasePath), { readOnly: true });
    assert.equal(inspector.queryOnly(), true);
    assert.deepEqual(inspector.inspectGenesis("gen_none"), {
      genesisId: "gen_none",
      manifest: null,
      worldSpec: null,
      attempts: [],
      historicalEnvelopePlan: null,
      threadPublished: false,
    });
    assert.equal(inspector.getManifest("gen_none", { required: false }), null);
    inspector.close();
  }));
