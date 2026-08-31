import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { IDENTITY_DOMAIN_REGISTRY_VERSION } from "../src/identity-domain-registry.mjs";
import { openIdentityInspectionStore, openIdentityStore } from "../src/identity-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-review-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const store = openWorldStore(localWorldStateStorage(databasePath));
  store.seedThread(structuredClone(fixture));
  store.close();
}

test("photo completion is an observable outstanding obligation, not a freeze precondition", () =>
  withDatabase((databasePath) => {
    seed(databasePath);

    let inspector = openIdentityInspectionStore(localWorldStateStorage(databasePath));
    const pending = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(pending.ok, true);
    assert.equal(pending.memoryPhotoRequirementSatisfied, false);
    assert.equal(pending.memoriesMissingPhotoCount, fixture.memoryRefs.length);
    assert.deepEqual(pending.memoriesMissingPhoto, [...fixture.memoryRefs].sort());
    inspector.close();

    const identity = openIdentityStore(localWorldStateStorage(databasePath));
    const first = identity.getMemoryVisualCompanionHistory(
      fixture.threadId,
      fixture.memoryRefs[0],
    ).at(-1).companion;
    identity.recordMemoryVisualCompanion({
      ...first,
      revision: 2,
      status: "available",
      assetRef: "s3://fibre-memory-visuals/review-closure/mina.webp",
      recordedAt: "2026-08-13T03:10:00Z",
      supersedesRevision: 1,
    });
    identity.close();

    inspector = openIdentityInspectionStore(localWorldStateStorage(databasePath));
    const satisfied = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(satisfied.ok, true);
    assert.equal(satisfied.memoryPhotoRequirementSatisfied, true);
    assert.equal(satisfied.memoriesMissingPhotoCount, 0);
    inspector.close();
  }));

test("pre-production identity persistence uses one current registry format", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const raw = new DatabaseSync(databasePath, { readOnly: true });
    const versions = raw.prepare(`
      SELECT DISTINCT registry_version FROM identity_assertion_records ORDER BY registry_version
    `).all().map((item) => item.registry_version);
    raw.close();
    assert.deepEqual(versions, [IDENTITY_DOMAIN_REGISTRY_VERSION]);

    const inspector = openIdentityInspectionStore(localWorldStateStorage(databasePath));
    const integrity = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(integrity.ok, true);
    assert.deepEqual(integrity.admittedRegistryVersions, [IDENTITY_DOMAIN_REGISTRY_VERSION]);
    inspector.close();
  }));
