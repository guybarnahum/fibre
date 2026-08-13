import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_ATOMIC_CLAIM_POLICY,
  IDENTITY_CLAIM_STRUCTURE,
  assertCurrentClaimDiscipline,
  assertRecordedClaimDiscipline,
  assertSingleMaterialProposition,
  normalizeClaimPredicate,
} from "../src/identity-claim-discipline.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY,
  IDENTITY_DOMAIN_REGISTRY_DIGEST,
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  identityDomainDefinition,
} from "../src/identity-domain-registry.mjs";

function disciplinedAssertion() {
  return {
    claimPredicate: { subject: "thread_mina", predicate: "has_source_parent", object: "human_mina_mother" },
    meaning: "Mina's mother is the source parent for this lineage relation.",
    admission: {
      policy: { id: "identity_world_admission", version: "1" },
      claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
    },
  };
}

test("one current identity registry exposes the structured Slice B domains", () => {
  assert.equal(IDENTITY_DOMAIN_REGISTRY_VERSION, "1");
  assert.ok(IDENTITY_DOMAIN_REGISTRY_DIGEST.startsWith("sha256:"));
  for (const domainId of [
    "lineage_relation", "family_role", "ancestral_origin", "cultural_formation",
    "language_formation", "geography_residence", "geography_work", "place_meaning",
    "embodiment_visual", "embodiment_voice", "memory_interpretation",
  ]) {
    const definition = identityDomainDefinition(domainId);
    assert.equal(definition.claimStructure, IDENTITY_CLAIM_STRUCTURE);
  }
  assert.deepEqual(identityDomainDefinition("cultural_formation").allowedBehavioralStatuses, ["context_only"]);
  assert.equal(identityDomainDefinition("memory_interpretation").projectionSection, "memory");
  assert.ok(IDENTITY_DOMAIN_REGISTRY.lineage_relation);
});

test("claim discipline has one supported current policy and fails closed on unknown versions", () => {
  const assertion = disciplinedAssertion();
  assert.equal(assertCurrentClaimDiscipline(assertion), assertion);
  assert.equal(assertRecordedClaimDiscipline(assertion), assertion);
  assert.throws(() => assertRecordedClaimDiscipline({
    ...assertion,
    admission: {
      ...assertion.admission,
      claimDiscipline: { id: IDENTITY_ATOMIC_CLAIM_POLICY.id, version: "999" },
    },
  }), /require claim discipline/i);
});

test("atomic prose and structural predicate reject compound claims", () => {
  assert.equal(assertSingleMaterialProposition("Her family moved from Seoul to Seattle when she was nine."), "Her family moved from Seoul to Seattle when she was nine.");
  for (const bundled of [
    "Her family moved to Seattle. She later became an engineer.",
    "Her childhood included:\nSeoul and Seattle",
    "She learned pottery; she studied violin",
    "She is a conservator and a mother of two and a Seoul native",
  ]) {
    assert.throws(() => assertSingleMaterialProposition(bundled));
  }
  assert.deepEqual(normalizeClaimPredicate({ subject: "thread_mina", predicate: "has_source_parent", object: "human_mina_mother" }), {
    subject: "thread_mina", predicate: "has_source_parent", object: "human_mina_mother",
  });
  assert.throws(() => normalizeClaimPredicate({ subject: "thread_mina", predicate: "has source parent", object: "human_mina_mother" }));
  assert.throws(() => normalizeClaimPredicate({ subject: "thread_mina", predicate: "has_source_parent", object: "mother and father" }));
});
