import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { threadStateHash } from "../src/persistence-common.mjs";
import {
  openIdentityInspectionStore,
  openIdentityStore,
} from "../src/identity-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-review-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function seed(databasePath) {
  const store = openWorldStore(databasePath);
  store.seedThread(structuredClone(fixture));
  store.close();
}

test("photo completion is an observable outstanding obligation, not a freeze precondition", () =>
  withDatabase((databasePath) => {
    seed(databasePath);

    let inspector = openIdentityInspectionStore(databasePath);
    const pending = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(pending.ok, true);
    assert.equal(pending.memoryPhotoRequirementSatisfied, false);
    assert.equal(pending.memoriesMissingPhotoCount, fixture.memoryRefs.length);
    assert.deepEqual(pending.memoriesMissingPhoto, [...fixture.memoryRefs].sort());
    assert.equal(
      pending.memoryVisualCompanions[0].photoRequirementSatisfied,
      false,
    );
    inspector.close();

    const identity = openIdentityStore(databasePath);
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

    inspector = openIdentityInspectionStore(databasePath);
    const satisfied = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(satisfied.ok, true);
    assert.equal(satisfied.memoryPhotoRequirementSatisfied, true);
    assert.equal(satisfied.memoriesMissingPhotoCount, 0);
    assert.deepEqual(satisfied.memoriesMissingPhoto, []);
    assert.equal(
      satisfied.memoryVisualCompanions[0].photoRequirementSatisfied,
      true,
    );
    inspector.close();
  }));

test("v5 migration derives genesis from THREAD_SEEDED and records later projection drift as revision 2", () =>
  withDatabase((databasePath) => {
    seed(databasePath);

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const row = database.prepare(
      "SELECT state_json FROM threads WHERE thread_id=?",
    ).get(fixture.threadId);
    const drifted = JSON.parse(row.state_json);
    drifted.identity.name = "Mina Park Lee";
    const driftRecordedAt = "2026-08-12T23:59:00Z";
    database.prepare(`
      UPDATE threads SET state_json=?,state_hash=?,updated_at=? WHERE thread_id=?
    `).run(
      JSON.stringify(drifted),
      threadStateHash(drifted),
      driftRecordedAt,
      fixture.threadId,
    );
    database.exec(`
      DROP TRIGGER identity_assertions_no_update;
      DROP TRIGGER identity_assertions_no_delete;
      DROP TRIGGER memory_visual_companions_no_update;
      DROP TRIGGER memory_visual_companions_no_delete;
      DROP TABLE memory_visual_companion_records;
      DROP TABLE identity_assertion_records;
      PRAGMA user_version=5;
    `);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.equal(reopened.storageMetadata().schemaVersion, 6);
    reopened.close();

    const inspector = openIdentityInspectionStore(databasePath);
    const passport = inspector.getPassport(fixture.threadId);
    assert.equal(passport.canonicalName, "Mina Park Lee");
    assert.deepEqual(passport.priorNames.map((item) => item.meaning), ["Mina Park"]);

    const currentName = inspector.getCurrentIdentityView(fixture.threadId).assertions.find(
      (assertion) => assertion.domain === "passport_name" && assertion.kind === "canonical_name",
    );
    const history = inspector.listClaimHistory(fixture.threadId, currentName.claimId)
      .map(({ assertion }) => assertion);
    assert.equal(history.length, 2);
    assert.equal(history[0].meaning, "Mina Park");
    assert.equal(history[0].revision, 1);
    assert.equal(history[0].provenanceClass, "birth_created");
    assert.equal(history[0].authorship.kind, "genesis_authority");
    assert.equal(history[0].sourceReferences[0], fixture.provenance.lastEventId);

    assert.equal(history[1].meaning, "Mina Park Lee");
    assert.equal(history[1].revision, 2);
    assert.equal(history[1].status, "corrected");
    assert.equal(history[1].authorship.kind, "admin_correction");
    assert.equal(history[1].recordedAt, driftRecordedAt);
    assert.equal(history[1].supersedesAssertionId, history[0].assertionId);
    assert.equal(history[1].disputeCorrection.kind, "correction");
    assert.match(history[1].disputeCorrection.reason, /legacy projection differed/i);
    assert.deepEqual(history[1].sourceReferences, [history[0].assertionId]);
    inspector.close();
  }));
