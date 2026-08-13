import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { threadStateHash } from "../src/persistence-common.mjs";
import {
  IDENTITY_VIEW_DERIVATION_POLICY,
  openIdentityInspectionStore,
  openIdentityStore,
} from "../src/identity-store.mjs";
import {
  backfillLegacyThreadIdentity,
  createIdentityTables,
} from "../src/identity-schema.mjs";

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

test("v5 migration preserves genesis, observes projection drift, and derives currency from ordinality", () =>
  withDatabase((databasePath) => {
    seed(databasePath);

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const seedEvent = database.prepare(`
      SELECT event_id FROM thread_events
      WHERE thread_id=? AND event_type='THREAD_SEEDED'
      ORDER BY sequence LIMIT 1
    `).get(fixture.threadId);
    assert.ok(seedEvent?.event_id);
    const seedEventId = seedEvent.event_id;

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
    assert.deepEqual(passport.derivationPolicy, IDENTITY_VIEW_DERIVATION_POLICY);

    const currentView = inspector.getCurrentIdentityView(fixture.threadId);
    assert.deepEqual(currentView.derivationPolicy, IDENTITY_VIEW_DERIVATION_POLICY);
    const currentName = currentView.assertions.find(
      (assertion) => assertion.domain === "passport_name" && assertion.kind === "canonical_name",
    );
    assert.equal(currentName.isCurrentRevision, true);
    assert.equal(currentName.registryVersion, "1");

    const history = inspector.listClaimHistory(fixture.threadId, currentName.claimId);
    assert.equal(history.length, 2);
    assert.equal(history[0].isCurrentRevision, false);
    assert.equal(history[1].isCurrentRevision, true);
    assert.equal(history.filter((item) => item.isCurrentRevision).length, 1);

    const genesis = history[0].assertion;
    const observed = history[1].assertion;
    assert.equal(genesis.meaning, "Mina Park");
    assert.equal(genesis.revision, 1);
    assert.equal(genesis.status, "current");
    assert.equal(genesis.provenanceClass, "birth_created");
    assert.equal(genesis.authorship.kind, "genesis_authority");
    assert.equal(genesis.sourceReferences[0], seedEventId);
    assert.notEqual(genesis.sourceReferences[0], fixture.provenance.lastEventId);

    assert.equal(observed.meaning, "Mina Park Lee");
    assert.equal(observed.revision, 2);
    assert.equal(observed.status, "disputed");
    assert.equal(observed.provenanceClass, "fibre_derived");
    assert.equal(observed.authorship.kind, "fibre_policy_derived");
    assert.equal(observed.authorship.policy.id, "legacy_projection_drift_migration");
    assert.equal(observed.admission.sourceMode, "fibre_derivation");
    assert.equal(observed.recordedAt, driftRecordedAt);
    assert.equal(observed.supersedesAssertionId, genesis.assertionId);
    assert.equal(observed.disputeCorrection.kind, "dispute");
    assert.match(observed.disputeCorrection.reason, /authority|authorized/i);
    assert.deepEqual(observed.sourceReferences, [genesis.assertionId]);
    inspector.close();

    const raw = new DatabaseSync(databasePath, { readOnly: true });
    const versions = raw.prepare(`
      SELECT DISTINCT registry_version FROM identity_assertion_records ORDER BY registry_version
    `).all().map((item) => item.registry_version);
    assert.deepEqual(versions, ["1"]);
    raw.close();
  }));

test("legacy migration counts post-seed projection additions instead of silently fabricating provenance", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const row = database.prepare(
      "SELECT state_json FROM threads WHERE thread_id=?",
    ).get(fixture.threadId);
    const drifted = JSON.parse(row.state_json);
    drifted.identity.culture = [...drifted.identity.culture, "Post-seed unprovenanced culture label"];
    database.prepare(`
      UPDATE threads SET state_json=?,state_hash=?,updated_at=? WHERE thread_id=?
    `).run(
      JSON.stringify(drifted),
      threadStateHash(drifted),
      "2026-08-13T03:20:00Z",
      fixture.threadId,
    );

    database.exec(`
      DROP TRIGGER identity_assertions_no_update;
      DROP TRIGGER identity_assertions_no_delete;
      DROP TABLE identity_assertion_records;
    `);
    createIdentityTables(database);
    const report = backfillLegacyThreadIdentity(database);
    assert.equal(report.droppedPostSeedAdditions, 1);
    assert.equal(report.corrections, 0);
    database.close();
  }));
