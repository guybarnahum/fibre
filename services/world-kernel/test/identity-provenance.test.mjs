import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { IdentityConflictError, identityAssertionId, identityClaimId } from "../src/identity-provenance-domain.mjs";
import { IDENTITY_DOMAIN_REGISTRY_VERSION } from "../src/identity-domain-registry.mjs";
import { IDENTITY_DOMAIN_REGISTRY_V2_VERSION, identityDomainV2Definition } from "../src/identity-domain-registry-v2.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY_V1 } from "../src/identity-claim-discipline.mjs";
import { memoryPhotoPromptDigest, memoryPhotoRequirementSatisfied, memoryVisualCompanionId } from "../src/memory-visual-companion.mjs";
import { openIdentityInspectionStore, openIdentityStore } from "../src/identity-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

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
    policy: { id: "identity_world_admission", version: "1" },
    claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY_V1 },
    admittedBy: { entityId: "fibre.world-kernel", kind: "institution", displayName: "Fibre World Kernel" },
    evidenceClassification,
    sourceMode,
  };
}
function revisionOf(previous, overrides = {}) {
  const recordedAt = overrides.recordedAt ?? "2026-08-12T23:55:00Z";
  const meaning = overrides.meaning ?? `${previous.meaning} (revised)`;
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
    sourceReferences: overrides.sourceReferences ?? [previous.assertionId],
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
function v2LineageBase(identity) {
  const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions.find((item) => item.domain === "passport_name").sourceReferences[0];
  const claimId = identityClaimId({ threadId: fixture.threadId, purpose: "lineage-v2" });
  const recordedAt = "2026-08-12T23:55:00Z";
  return {
    assertionId: identityAssertionId({ claimId, revision: 1, recordedAt, meaning: "Mina's mother is her source parent." }),
    claimId, revision: 1, threadId: fixture.threadId,
    domain: "lineage_relation", kind: "source_parent",
    claimPredicate: { subject: "self", predicate: "has_source_parent", object: "maternal_parent" },
    meaning: "Mina's mother is her source parent.", provenanceClass: "relational",
    authorship: { kind: "relationship_shared_world_source", entityId: "fibre.world-kernel" },
    sourceReferences: [seedEvent], effectiveAt: recordedAt, recordedAt,
    visibility: "private", status: "current",
    projectionClass: identityDomainV2Definition("lineage_relation").projectionSection,
    behavioralStatus: "context_only", admission: admission(),
  };
}

test("#37 bootstrap remains pure-v1 and preserves its derivation shape", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(databasePath);
  const integrity = identity.verifyThreadIdentityIntegrity(fixture.threadId);
  assert.equal(integrity.ok, true);
  assert.equal(integrity.registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
  assert.deepEqual(integrity.admittedRegistryVersions, ["1"]);
  assert.equal(integrity.claimCount, 13);
  assert.equal(integrity.acceptedCausalAssertions, 0);
  assert.equal(integrity.endogenousEvidenceAssertions, 0);
  const view = identity.getCurrentIdentityView(fixture.threadId);
  assert.equal(view.registry.version, "1");
  assert.match(view.registry.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(view.derivationPolicy.version, "1");
  assert.equal(view.registryBindings, undefined);
  const passport = identity.getPassport(fixture.threadId);
  assert.equal(passport.canonicalName, "Mina Park");
  assert.equal(passport.registryVersion, "1");
  assert.equal(passport.derivationPolicy.version, "1");
  const visual = identity.getMemoryVisualCompanionHistory(fixture.threadId, "mem_mina_first_review")[0].companion;
  assert.equal(visual.companionId, memoryVisualCompanionId(fixture.threadId, "mem_mina_first_review"));
  assert.equal(memoryPhotoRequirementSatisfied(visual), false);
  assert.equal(visual.photoPromptDigest, memoryPhotoPromptDigest(visual.photoPrompt));
  identity.close();
}));

test("v1 revisions stay v1 but public writes cannot use the old claims as biography-blob bypasses", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(databasePath);
  const original = identity.getCurrentIdentityView(fixture.threadId).assertions.find((item) => item.domain === "passport_name");
  const changed = revisionOf(original, { meaning: "Mina Park Lee", provenanceClass: "self_authored", authorship: { kind: "thread_self_authored", entityId: fixture.threadId }, behavioralStatus: "candidate_causal" });
  assert.equal(identity.recordAssertion(changed).registryVersion, "1");
  assert.equal(identity.getPassport(fixture.threadId).canonicalName, "Mina Park Lee");
  assert.throws(() => identity.recordAssertion(revisionOf(changed, { meaning: "Mina Park Lee; she is also a sculptor", recordedAt: "2026-08-12T23:56:00Z" })), /one material proposition|bundle/i);
  identity.close();
}));

test("v2 writes require a structural predicate and a recorded discipline witness", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(databasePath);
  const base = v2LineageBase(identity);
  const stored = identity.recordAssertion(base);
  assert.equal(stored.registryVersion, IDENTITY_DOMAIN_REGISTRY_V2_VERSION);
  assert.deepEqual(identity.getAssertion(fixture.threadId, base.assertionId).assertion.claimPredicate, base.claimPredicate);
  for (const [purpose, meaning] of [
    ["sentence", "Her mother is her source parent. Her father grew up in Seoul."],
    ["lower", "Her mother is her source parent. her father grew up in Seoul."],
    ["semicolon", "Her mother is her source parent; her father grew up in Seoul"],
    ["dash", "Born in Seoul — her father ran a store — she moved away"],
  ]) {
    const claimId = identityClaimId({ purpose });
    assert.throws(() => identity.recordAssertion({ ...base, claimId, assertionId: identityAssertionId({ claimId, revision: 1 }), meaning }), /one material proposition|bundle/i);
  }
  const wrongId = identityClaimId({ purpose: "wrong-discipline" });
  assert.throws(() => identity.recordAssertion({ ...base, claimId: wrongId, assertionId: identityAssertionId({ claimId: wrongId, revision: 1 }), admission: { ...admission(), claimDiscipline: { id: "identity_atomic_material_proposition", version: "999" } } }), /current claim discipline|unknown historical/i);
  const integrity = identity.verifyThreadIdentityIntegrity(fixture.threadId);
  assert.deepEqual(integrity.admittedRegistryVersions, ["1", "2"]);
  assert.equal(integrity.registryVersion, null);
  const view = identity.getCurrentIdentityView(fixture.threadId);
  assert.equal(view.derivationPolicy.version, "2");
  assert.ok(view.registryBindings.some((item) => item.registryVersion === "2" && item.domain === "lineage_relation"));
  identity.close();
  const reopened = openIdentityStore(databasePath);
  assert.equal(reopened.getCurrentIdentityView(fixture.threadId).assertions.length, 14);
  assert.equal(reopened.getPassport(fixture.threadId).canonicalName, "Mina Park");
  assert.equal(reopened.verifyThreadIdentityIntegrity(fixture.threadId).ok, true);
  reopened.close();
}));

test("#38 refuses causal inflation, endogenous credit, and cross-slot revisions", () => withDatabase((databasePath) => {
  seed(databasePath);
  const identity = openIdentityStore(databasePath);
  const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions[0].sourceReferences[0];
  const claimId = identityClaimId({ purpose: "craft" });
  const base = {
    assertionId: identityAssertionId({ claimId, revision: 1 }), claimId, revision: 1, threadId: fixture.threadId,
    domain: "artistic_formation", kind: "craft_orientation",
    claimPredicate: { subject: "self", predicate: "values_practice", object: "handmaking" },
    meaning: "I value making things by hand.", provenanceClass: "historical_experienced",
    authorship: { kind: "thread_self_authored", entityId: fixture.threadId }, sourceReferences: [seedEvent],
    effectiveAt: "2026-08-12T23:55:00Z", recordedAt: "2026-08-12T23:55:00Z", visibility: "private", status: "current",
    projectionClass: identityDomainV2Definition("artistic_formation").projectionSection, behavioralStatus: "candidate_causal", admission: admission(),
  };
  identity.recordAssertion(base);
  const causalId = identityClaimId({ purpose: "causal" });
  assert.throws(() => identity.recordAssertion({ ...base, claimId: causalId, assertionId: identityAssertionId({ claimId: causalId, revision: 1 }), behavioralStatus: "accepted_causal" }), /#38 cannot author accepted_causal/);
  const endogenousId = identityClaimId({ purpose: "endogenous" });
  assert.throws(() => identity.recordAssertion({ ...base, claimId: endogenousId, assertionId: identityAssertionId({ claimId: endogenousId, revision: 1 }), admission: admission("thread_runtime", "endogenous") }), /#42 must earn/);
  const cross = revisionOf(base, { meaning: "This tries to move the claim.", projectionClass: "culture" });
  cross.domain = "upbringing_culture";
  cross.provenanceClass = "upbringing_cultural";
  assert.throws(() => identity.recordAssertion(cross), /changes identity slot|projectionClass/);
  identity.close();
}));

test("identity and visual ledgers remain append-only and read-only inspection stays query-only", () => withDatabase((databasePath) => {
  seed(databasePath);
  const inspector = openIdentityInspectionStore(databasePath);
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
  tampered.meaning = `${tampered.meaning} silently rewritten`;
  database.exec("DROP TRIGGER identity_assertions_no_update");
  database.prepare("UPDATE identity_assertion_records SET assertion_json=? WHERE assertion_id=?").run(JSON.stringify(tampered), row.assertion_id);
  database.close();
  const inspector = openIdentityInspectionStore(databasePath);
  assert.throws(() => inspector.verifyThreadIdentityIntegrity(fixture.threadId), /digest\/canonical JSON verification/);
  inspector.close();
}));

test("v5-style migration reconstructs identity and memory visual lineages", () => withDatabase((databasePath) => {
  seed(databasePath);
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  database.exec("DROP TRIGGER identity_assertions_registry_pin; DROP TRIGGER identity_assertions_no_update; DROP TRIGGER identity_assertions_no_delete; DROP TRIGGER memory_visual_companions_no_update; DROP TRIGGER memory_visual_companions_no_delete; DROP TABLE memory_visual_companion_records; DROP TABLE identity_assertion_records; PRAGMA user_version=5;");
  database.close();
  const reopened = openWorldStore(databasePath);
  assert.equal(reopened.storageMetadata().schemaVersion, 6);
  reopened.close();
  const inspector = openIdentityInspectionStore(databasePath);
  const integrity = inspector.verifyThreadIdentityIntegrity(fixture.threadId);
  assert.equal(integrity.claimCount, 13);
  assert.deepEqual(integrity.admittedRegistryVersions, ["1"]);
  assert.equal(integrity.memoryVisualCompanionCount, fixture.memoryRefs.length);
  inspector.close();
}));
