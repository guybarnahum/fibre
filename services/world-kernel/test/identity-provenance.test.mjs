import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  IdentityConflictError,
  identityAssertionId,
  identityClaimId,
} from "../src/identity-provenance-domain.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  identityDomainDefinition,
} from "../src/identity-domain-registry.mjs";
import {
  memoryPhotoPromptDigest,
  memoryPhotoRequirementSatisfied,
  memoryVisualCompanionId,
} from "../src/memory-visual-companion.mjs";
import {
  openIdentityInspectionStore,
  openIdentityStore,
} from "../src/identity-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const store = openWorldStore(databasePath);
  const thread = store.seedThread(structuredClone(fixture)).thread;
  store.close();
  return thread;
}

function admission(sourceMode = "fibre_derivation", evidenceClassification = "exogenous") {
  return {
    policy: { id: "identity_admission", version: "1" },
    admittedBy: {
      entityId: "fibre.world-kernel",
      kind: "institution",
      displayName: "Fibre World Kernel",
    },
    evidenceClassification,
    sourceMode,
  };
}

function revisionOf(previous, overrides = {}) {
  const recordedAt = overrides.recordedAt ?? "2026-08-12T23:55:00Z";
  const meaning = overrides.meaning ?? `${previous.meaning} (revised)`;
  const candidate = {
    assertionId: identityAssertionId({
      claimId: previous.claimId,
      revision: previous.revision + 1,
      meaning,
      recordedAt,
    }),
    claimId: previous.claimId,
    revision: previous.revision + 1,
    threadId: previous.threadId,
    domain: previous.domain,
    kind: previous.kind,
    meaning,
    provenanceClass: overrides.provenanceClass ?? previous.provenanceClass,
    authorship: overrides.authorship ?? previous.authorship,
    sourceReferences: overrides.sourceReferences ?? [previous.assertionId],
    effectiveAt: overrides.effectiveAt ?? recordedAt,
    recordedAt,
    visibility: overrides.visibility ?? previous.visibility,
    status: overrides.status ?? "current",
    supersedesAssertionId: previous.assertionId,
    projectionClass: overrides.projectionClass ?? previous.projectionClass,
    behavioralStatus: overrides.behavioralStatus ?? previous.behavioralStatus,
    admission: overrides.admission ?? admission(),
  };
  if (overrides.disputeCorrection !== undefined) {
    candidate.disputeCorrection = overrides.disputeCorrection;
  }
  return candidate;
}

test("#37 bootstraps Mina into claim-level identity, passport, and mandatory memory-photo lineage", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const integrity = identity.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(integrity.ok, true);
    assert.equal(integrity.registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
    assert.equal(integrity.claimCount, 13);
    assert.equal(integrity.assertionCount, 13);
    assert.equal(integrity.acceptedCausalAssertions, 0);
    assert.equal(integrity.endogenousEvidenceAssertions, 0);
    assert.equal(integrity.memoryVisualCompanionCount, fixture.memoryRefs.length);

    const view = identity.getCurrentIdentityView(fixture.threadId);
    assert.equal(view.assertions.length, 13);
    assert.equal(view.assertions.filter((item) => item.domain === "upbringing_culture").length, 2);
    assert.equal(view.assertions.filter((item) => item.domain === "inherited_disposition").length, 4);
    assert.ok(view.assertions.every((item) => item.meaning.length < 2048));

    const passport = identity.getPassport(fixture.threadId);
    assert.equal(passport.canonicalName, "Mina Park");
    assert.equal(passport.originOrientation, "original");
    assert.equal(passport.birthPlace, "Los Angeles, California");
    assert.match(passport.passportDigest, /^sha256:[0-9a-f]{64}$/);

    const visual = identity.getMemoryVisualCompanionHistory(
      fixture.threadId,
      "mem_mina_first_review",
    );
    assert.equal(visual.length, 1);
    assert.equal(
      visual[0].companion.companionId,
      memoryVisualCompanionId(fixture.threadId, "mem_mina_first_review"),
    );
    assert.equal(visual[0].companion.status, "pending_generation");
    assert.equal(visual[0].companion.assetRef, null);
    assert.equal(memoryPhotoRequirementSatisfied(visual[0].companion), false);
    assert.equal(
      visual[0].companion.photoPromptDigest,
      memoryPhotoPromptDigest(visual[0].companion.photoPrompt),
    );
    assert.match(visual[0].companion.photoPrompt, /MEMORY MOMENT/);
    assert.match(visual[0].companion.photoPrompt, /THREAD CONTINUITY/);
    assert.match(visual[0].companion.photoPrompt, /TRUTH BOUNDARY/);
    assert.match(visual[0].companion.photoPrompt, /REGENERATION/);
    assert.match(visual[0].companion.photoPrompt, /does not yet contain an admitted narrative summary/);
    assert.equal(
      visual[0].companion.truthStatus,
      "synthetic_representation_not_historical_evidence",
    );
    assert.equal(visual[0].companion.provenance.createdFrom, "legacy_memory_reference");
    identity.close();
  }));

test("passport change appends a revision and an as-of view preserves the former self", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const originalName = identity.getCurrentIdentityView(fixture.threadId).assertions.find(
      (item) => item.domain === "passport_name" && item.kind === "canonical_name",
    );
    const changed = revisionOf(originalName, {
      meaning: "Mina Park Lee",
      provenanceClass: "self_authored",
      authorship: {
        kind: "thread_self_authored",
        entityId: fixture.threadId,
      },
      behavioralStatus: "candidate_causal",
    });
    const recorded = identity.recordAssertion(changed);
    assert.equal(recorded.idempotent, false);
    assert.equal(identity.recordAssertion(changed).idempotent, true);
    assert.equal(identity.getPassport(fixture.threadId).canonicalName, "Mina Park Lee");
    assert.deepEqual(
      identity.getPassport(fixture.threadId).priorNames.map((item) => item.meaning),
      ["Mina Park"],
    );
    const before = identity.getIdentityViewAsOf(fixture.threadId, "2026-08-12T23:54:59Z");
    assert.equal(
      before.assertions.find((item) => item.claimId === originalName.claimId).meaning,
      "Mina Park",
    );
    assert.equal(identity.listClaimHistory(fixture.threadId, originalName.claimId).length, 2);
    identity.close();
  }));

test("#37 refuses biography blobs, accepted-causal credit, endogenous credit, and cross-slot revisions", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions.find(
      (item) => item.domain === "passport_name",
    ).sourceReferences[0];
    const claimId = identityClaimId({ threadId: fixture.threadId, purpose: "test-claim" });
    const base = {
      assertionId: identityAssertionId({ claimId, revision: 1, meaning: "I value making things by hand.", recordedAt: "2026-08-12T23:55:00Z" }),
      claimId,
      revision: 1,
      threadId: fixture.threadId,
      domain: "artistic_formation",
      kind: "craft_orientation",
      meaning: "I value making things by hand.",
      provenanceClass: "historical_experienced",
      authorship: { kind: "thread_self_authored", entityId: fixture.threadId },
      sourceReferences: [seedEvent],
      effectiveAt: "2026-08-12T23:55:00Z",
      recordedAt: "2026-08-12T23:55:00Z",
      visibility: "private",
      status: "current",
      projectionClass: identityDomainDefinition("artistic_formation").projectionSection,
      behavioralStatus: "candidate_causal",
      admission: admission(),
    };
    identity.recordAssertion(base);

    const hugeClaimId = identityClaimId({ x: 2 });
    const huge = {
      ...base,
      assertionId: identityAssertionId({ claimId: hugeClaimId, revision: 1, huge: true }),
      claimId: hugeClaimId,
      meaning: "x".repeat(2049),
    };
    assert.throws(() => identity.recordAssertion(huge), /split the biography/);

    const causalClaimId = identityClaimId({ x: 3 });
    const causal = {
      ...base,
      claimId: causalClaimId,
      assertionId: identityAssertionId({ claimId: causalClaimId, revision: 1 }),
      behavioralStatus: "accepted_causal",
    };
    assert.throws(() => identity.recordAssertion(causal), /#37 cannot author accepted_causal/);

    const endogenousClaimId = identityClaimId({ x: 4 });
    const endogenous = {
      ...base,
      claimId: endogenousClaimId,
      assertionId: identityAssertionId({ claimId: endogenousClaimId, revision: 1 }),
      admission: admission("thread_runtime", "endogenous"),
    };
    assert.throws(() => identity.recordAssertion(endogenous), /#41 must earn/);

    const crossSlot = revisionOf(base, {
      meaning: "This tries to move a claim into another domain.",
      projectionClass: "culture",
    });
    crossSlot.domain = "upbringing_culture";
    crossSlot.provenanceClass = "upbringing_cultural";
    assert.throws(() => identity.recordAssertion(crossSlot), /changes identity slot/);
    identity.close();
  }));

test("memory photo prompt is authoritative while Nano Banana S3 renders remain regenerable cache", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const first = identity.getMemoryVisualCompanionHistory(
      fixture.threadId,
      "mem_mina_first_review",
    )[0].companion;
    const second = {
      ...first,
      revision: 2,
      status: "available",
      assetRef: "s3://fibre-memory-visuals/nano-banana/mina-first-review/reconstruction-v1.webp",
      recordedAt: "2026-08-12T23:56:00Z",
      supersedesRevision: 1,
    };
    const recorded = identity.recordMemoryVisualCompanion(second);
    assert.equal(recorded.idempotent, false);
    assert.equal(identity.recordMemoryVisualCompanion(second).idempotent, true);
    assert.equal(memoryPhotoRequirementSatisfied(second), true);

    const cacheLost = {
      ...second,
      revision: 3,
      status: "pending_generation",
      assetRef: null,
      recordedAt: "2026-08-12T23:57:00Z",
      supersedesRevision: 2,
    };
    identity.recordMemoryVisualCompanion(cacheLost);
    assert.equal(memoryPhotoRequirementSatisfied(cacheLost), false);
    assert.equal(cacheLost.photoPrompt, second.photoPrompt);
    assert.equal(cacheLost.photoPromptDigest, second.photoPromptDigest);

    const regenerated = {
      ...cacheLost,
      revision: 4,
      status: "available",
      assetRef: "s3://fibre-memory-visuals/nano-banana/mina-first-review/reconstruction-v2.webp",
      recordedAt: "2026-08-12T23:58:00Z",
      supersedesRevision: 3,
    };
    identity.recordMemoryVisualCompanion(regenerated);
    assert.equal(memoryPhotoRequirementSatisfied(regenerated), true);
    assert.equal(regenerated.photoPromptDigest, first.photoPromptDigest);

    const history = identity.getMemoryVisualCompanionHistory(
      fixture.threadId,
      "mem_mina_first_review",
    );
    assert.equal(history.length, 4);
    assert.equal(history[0].companion.assetRef, null);
    assert.equal(history[1].companion.status, "available");
    assert.equal(history[2].companion.status, "pending_generation");
    assert.equal(history[3].companion.status, "available");
    assert.equal(history[1].companion.photoPromptDigest, history[3].companion.photoPromptDigest);
    assert.equal(
      history[3].companion.truthStatus,
      "synthetic_representation_not_historical_evidence",
    );
    assert.equal(
      history[3].companion.representationKind,
      "synthetic_reconstruction",
    );

    assert.throws(
      () => identity.recordMemoryVisualCompanion({
        ...regenerated,
        revision: 5,
        assetRef: "asset://memory/mina-first-review/not-an-s3-cache",
        recordedAt: "2026-08-12T23:59:00Z",
        supersedesRevision: 4,
      }),
      /s3:\/\/ cache locator/,
    );
    assert.throws(
      () => identity.recordMemoryVisualCompanion({
        ...regenerated,
        revision: 5,
        photoPrompt: `${regenerated.photoPrompt}\nTampered prompt without a matching digest.`,
        recordedAt: "2026-08-12T23:59:00Z",
        supersedesRevision: 4,
      }),
      /photoPromptDigest does not match/,
    );
    identity.close();
  }));

test("identity and visual ledgers are append-only and readable through query-only inspection", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const inspector = openIdentityInspectionStore(databasePath);
    assert.equal(inspector.queryOnly(), true);
    assert.equal(inspector.verifyThreadIdentityIntegrity(fixture.threadId).ok, true);
    const current = inspector.getCurrentIdentityView(fixture.threadId).assertions[0];
    assert.throws(() => inspector.recordAssertion(current), IdentityConflictError);
    inspector.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.throws(
      () => database.exec("UPDATE identity_assertion_records SET status='historical'"),
      /append-only/,
    );
    assert.throws(
      () => database.exec("DELETE FROM memory_visual_companion_records"),
      /append-only/,
    );
    database.close();
  }));

test("Passport refuses to fall back to legacy flat identity when mandatory ledger claims disappear", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec("DROP TRIGGER identity_assertions_no_delete");
    database.exec("DELETE FROM identity_assertion_records WHERE domain='passport_name'");
    database.close();

    const inspector = openIdentityInspectionStore(databasePath);
    try {
      assert.throws(
        () => inspector.getPassport(fixture.threadId),
        /no current canonical_name assertion/,
      );
      assert.throws(
        () => inspector.verifyThreadIdentityIntegrity(fixture.threadId),
        /no current canonical_name assertion/,
      );
    } finally {
      inspector.close();
    }
  }));

test("read-only identity inspection detects coherent JSON tampering independently of append-only triggers", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const row = database.prepare(`
      SELECT assertion_id,assertion_json FROM identity_assertion_records
      WHERE thread_id=? AND domain='self_authored_identity' LIMIT 1
    `).get(fixture.threadId);
    const tampered = JSON.parse(row.assertion_json);
    tampered.meaning = `${tampered.meaning} silently rewritten`;
    database.exec("DROP TRIGGER identity_assertions_no_update");
    database.prepare(
      "UPDATE identity_assertion_records SET assertion_json=? WHERE assertion_id=?",
    ).run(JSON.stringify(tampered), row.assertion_id);
    database.close();

    const inspector = openIdentityInspectionStore(databasePath);
    try {
      assert.throws(
        () => inspector.verifyThreadIdentityIntegrity(fixture.threadId),
        /digest\/canonical JSON verification/,
      );
    } finally {
      inspector.close();
    }
  }));

test("v5-style world migration reconstructs identity and memory visual lineages", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
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
    const integrity = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.equal(integrity.claimCount, 13);
    assert.equal(integrity.memoryVisualCompanionCount, fixture.memoryRefs.length);
    const visual = inspector.getMemoryVisualCompanionHistory(
      fixture.threadId,
      "mem_mina_first_review",
    )[0].companion;
    assert.equal(memoryPhotoRequirementSatisfied(visual), false);
    assert.equal(visual.photoPromptDigest, memoryPhotoPromptDigest(visual.photoPrompt));
    inspector.close();
  }));
