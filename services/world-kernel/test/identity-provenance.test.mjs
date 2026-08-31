import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { IdentityConflictError, identityAssertionId, identityClaimId } from "../src/identity-provenance-domain.mjs";
import { IDENTITY_DOMAIN_REGISTRY_VERSION, identityDomainDefinition } from "../src/identity-domain-registry.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "../src/identity-claim-discipline.mjs";
import { memoryPhotoPromptDigest, memoryPhotoRequirementSatisfied, memoryVisualCompanionId } from "../src/memory-visual-companion.mjs";
import { openIdentityInspectionStore, openIdentityStore } from "../src/identity-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const store = openWorldStore(localWorldStateStorage(databasePath));
  const thread = store.seedThread(structuredClone(fixture)).thread;
  store.close();
  return thread;
}

function admission(sourceMode = "fibre_derivation", evidenceClassification = "exogenous") {
  return {
    policy: { id: "identity_world_admission", version: "1" },
    claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
    admittedBy: { entityId: "fibre.world-kernel", kind: "institution", displayName: "Fibre World Kernel" },
    evidenceClassification,
    sourceMode,
  };
}

function revisionOf(previous, overrides = {}) {
  const recordedAt = overrides.recordedAt ?? "2026-08-12T23:55:00Z";
  const meaning = overrides.meaning ?? `${previous.meaning} revised`;
  const candidate = {
    assertionId: identityAssertionId({ claimId: previous.claimId, revision: previous.revision + 1, meaning, recordedAt }),
    claimId: previous.claimId,
    revision: previous.revision + 1,
    threadId: previous.threadId,
    domain: previous.domain,
    kind: previous.kind,
    ...(previous.claimPredicate === undefined ? {} : { claimPredicate: overrides.claimPredicate ?? previous.claimPredicate }),
    meaning,
    provenanceClass: overrides.provenanceClass ?? previous.provenanceClass,
    authorship: overrides.authorship ?? previous.authorship,
    sourceReferences: overrides.sourceReferences ?? previous.sourceReferences,
    effectiveAt: overrides.effectiveAt ?? recordedAt,
    recordedAt,
    visibility: overrides.visibility ?? previous.visibility,
    status: overrides.status ?? "current",
    supersedesAssertionId: previous.assertionId,
    projectionClass: overrides.projectionClass ?? previous.projectionClass,
    behavioralStatus: overrides.behavioralStatus ?? previous.behavioralStatus,
    admission: overrides.admission ?? previous.admission,
  };
  if (overrides.disputeCorrection !== undefined) candidate.disputeCorrection = overrides.disputeCorrection;
  return candidate;
}

function currentClaim(identity, purpose = "craft") {
  const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions[0].sourceReferences[0];
  const claimId = identityClaimId({ threadId: fixture.threadId, purpose });
  const recordedAt = "2026-08-12T23:55:00Z";
  const meaning = "I value making things by hand.";
  return {
    assertionId: identityAssertionId({ claimId, revision: 1, meaning, recordedAt }),
    claimId,
    revision: 1,
    threadId: fixture.threadId,
    domain: "artistic_formation",
    kind: "craft_orientation",
    claimPredicate: { subject: "self", predicate: "values_practice", object: "handmaking" },
    meaning,
    provenanceClass: "historical_experienced",
    authorship: { kind: "thread_self_authored", entityId: fixture.threadId },
    sourceReferences: [seedEvent],
    effectiveAt: recordedAt,
    recordedAt,
    visibility: "private",
    status: "current",
    projectionClass: identityDomainDefinition("artistic_formation").projectionSection,
    behavioralStatus: "candidate_causal",
    admission: admission(),
  };
}

test("seeded Thread identity uses one current registry and remains non-causal", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(localWorldStateStorage(databasePath));
  const integrity = identity.verifyThreadIdentityIntegrity(fixture.threadId);
  assert.equal(integrity.ok, true);
  assert.deepEqual(integrity.admittedRegistryVersions, [IDENTITY_DOMAIN_REGISTRY_VERSION]);
  assert.equal(integrity.acceptedCausalAssertions, 0);
  assert.equal(integrity.endogenousEvidenceAssertions, 0);
  const view = identity.getCurrentIdentityView(fixture.threadId);
  assert.equal(view.registry.version, IDENTITY_DOMAIN_REGISTRY_VERSION);
  assert.match(view.registry.digest, /^sha256:[0-9a-f]{64}$/);
  const passport = identity.getPassport(fixture.threadId);
  assert.equal(passport.canonicalName, "Mina Park");
  assert.equal(passport.registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
  const visual = identity.getMemoryVisualCompanionHistory(fixture.threadId, "mem_mina_first_review")[0].companion;
  assert.equal(visual.companionId, memoryVisualCompanionId(fixture.threadId, "mem_mina_first_review"));
  assert.equal(memoryPhotoRequirementSatisfied(visual), false);
  assert.equal(visual.photoPromptDigest, memoryPhotoPromptDigest(visual.photoPrompt));
  identity.close();
}));

test("current identity revisions stay in one format and biography bundles are rejected", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(localWorldStateStorage(databasePath));
  const original = identity.getCurrentIdentityView(fixture.threadId).assertions.find((item) => item.domain === "passport_name");
  const changed = revisionOf(original, {
    meaning: "Mina Park Lee",
    provenanceClass: "self_authored",
    authorship: { kind: "thread_self_authored", entityId: fixture.threadId },
  });
  assert.equal(identity.recordAssertion(changed).registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
  assert.equal(identity.getPassport(fixture.threadId).canonicalName, "Mina Park Lee");
  assert.throws(() => identity.recordAssertion(revisionOf(changed, {
    meaning: "Mina Park Lee; she is also a sculptor",
    recordedAt: "2026-08-12T23:56:00Z",
  })), /one material proposition|bundle/i);
  identity.close();
}));

test("current claims require structured predicates and the current discipline witness", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(localWorldStateStorage(databasePath));
  const base = currentClaim(identity);
  const stored = identity.recordAssertion(base);
  assert.equal(stored.registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
  assert.deepEqual(identity.getAssertion(fixture.threadId, base.assertionId).assertion.claimPredicate, base.claimPredicate);

  for (const [purpose, meaning] of [
    ["sentence", "Mina values handmaking. Her father grew up in Seoul."],
    ["semicolon", "Mina values handmaking; her father grew up in Seoul"],
    ["dash", "Mina values handmaking — her father ran a store"],
  ]) {
    const candidate = currentClaim(identity, purpose);
    assert.throws(() => identity.recordAssertion({ ...candidate, meaning }), /one material proposition|bundle/i);
  }

  const wrong = currentClaim(identity, "wrong-discipline");
  assert.throws(() => identity.recordAssertion({
    ...wrong,
    admission: { ...wrong.admission, claimDiscipline: { id: "identity_atomic_material_proposition", version: "999" } },
  }), /claim discipline/i);
  identity.close();
}));

test("natural-language identity may use ordinary conjunctions without being treated as a schema error", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(localWorldStateStorage(databasePath));
  const candidate = currentClaim(identity, "ordinary-conjunctions");
  candidate.meaning = "I enjoy drawing and painting and writing stories with close friends.";
  candidate.assertionId = identityAssertionId({ claimId: candidate.claimId, revision: 1, meaning: candidate.meaning, recordedAt: candidate.recordedAt });
  assert.doesNotThrow(() => identity.recordAssertion(candidate));
  identity.close();
}));

test("#38 refuses causal inflation, endogenous credit, and cross-slot revisions", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(localWorldStateStorage(databasePath));
  const base = currentClaim(identity);
  identity.recordAssertion(base);
  const causal = currentClaim(identity, "causal");
  assert.throws(() => identity.recordAssertion({ ...causal, behavioralStatus: "accepted_causal" }), /#38 cannot author accepted_causal/);
  const endogenous = currentClaim(identity, "endogenous");
  assert.throws(() => identity.recordAssertion({ ...endogenous, admission: admission("thread_runtime", "endogenous") }), /#42 must earn/);
  const cross = revisionOf(base, {
    meaning: "This tries to move the claim.",
    projectionClass: "culture",
    behavioralStatus: "context_only",
  });
  cross.domain = "cultural_formation";
  cross.provenanceClass = "upbringing_cultural";
  assert.throws(() => identity.recordAssertion(cross), /changes identity slot|projectionClass/);
  identity.close();
}));

test("identity and visual ledgers remain append-only and read-only inspection stays query-only", () => withDatabase((databasePath) => {
  seed(databasePath);
  const inspector = openIdentityInspectionStore(localWorldStateStorage(databasePath));
  assert.equal(inspector.queryOnly(), true);
  assert.equal(inspector.verifyThreadIdentityIntegrity(fixture.threadId).ok, true);
  assert.throws(() => inspector.recordAssertion(inspector.getCurrentIdentityView(fixture.threadId).assertions[0]), IdentityConflictError);
  inspector.close();
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  assert.throws(() => database.exec("UPDATE identity_assertion_records SET status='historical'"), /append-only/);
  assert.throws(() => database.exec("DELETE FROM memory_visual_companion_records"), /append-only/);
  database.close();
}));

test("read-only identity inspection detects coherent JSON tampering", () => withDatabase((databasePath) => {
  seed(databasePath);
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  const row = database.prepare("SELECT assertion_id,assertion_json FROM identity_assertion_records WHERE thread_id=? AND domain='self_authored_identity' LIMIT 1").get(fixture.threadId);
  const tampered = JSON.parse(row.assertion_json);
  tampered.visibility = tampered.visibility === "public" ? "restricted" : "public";
  database.exec("DROP TRIGGER identity_assertions_no_update");
  database.prepare("UPDATE identity_assertion_records SET assertion_json=? WHERE assertion_id=?").run(JSON.stringify(tampered), row.assertion_id);
  database.close();
  const inspector = openIdentityInspectionStore(localWorldStateStorage(databasePath));
  assert.throws(() => inspector.verifyThreadIdentityIntegrity(fixture.threadId), /digest\/canonical JSON verification/);
  inspector.close();
}));
