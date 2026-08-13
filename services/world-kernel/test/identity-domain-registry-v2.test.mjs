import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_ATOMIC_CLAIM_POLICY,
  IDENTITY_ATOMIC_CLAIM_POLICY_V1,
  IDENTITY_CLAIM_STRUCTURE,
  assertCurrentClaimDiscipline,
  assertRecordedClaimDiscipline,
  assertSingleMaterialProposition,
  normalizeClaimPredicate,
} from "../src/identity-claim-discipline.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_V2,
  IDENTITY_DOMAIN_REGISTRY_V2_DIGEST,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
  identityDomainV2Definition,
} from "../src/identity-domain-registry-v2.mjs";
import {
  IDENTITY_DOMAIN_REGISTRIES,
  identityDomainRegistryDigest,
} from "../src/identity-domain-registry.mjs";

function disciplinedAssertion() {
  return {
    claimPredicate: {
      subject: "thread_mina",
      predicate: "has_source_parent",
      object: "human_mina_mother",
    },
    meaning: "Mina's mother is the source parent for this lineage relation.",
    admission: {
      policy: { id: "identity_world_admission", version: "1" },
      claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY_V1 },
    },
  };
}

test("registry v2 is additive, structurally claim-shaped, and does not mutate frozen v1", () => {
  assert.equal(IDENTITY_DOMAIN_REGISTRY_V2_VERSION, "2");
  assert.match(IDENTITY_DOMAIN_REGISTRY_V2_DIGEST, /^sha256:[0-9a-f]{64}$/);

  const v1 = IDENTITY_DOMAIN_REGISTRIES["1"];
  const v1DigestBefore = identityDomainRegistryDigest("1");

  for (const domainId of Object.keys(v1)) {
    assert.ok(IDENTITY_DOMAIN_REGISTRY_V2[domainId]);
    assert.equal(IDENTITY_DOMAIN_REGISTRY_V2[domainId].claimStructure, IDENTITY_CLAIM_STRUCTURE);
  }

  for (const domainId of [
    "lineage_relation",
    "family_role",
    "ancestral_origin",
    "cultural_formation",
    "geography_residence",
    "geography_work",
    "place_meaning",
    "embodiment_visual",
    "embodiment_voice",
    "memory_interpretation",
  ]) {
    const definition = identityDomainV2Definition(domainId);
    assert.equal(definition.claimStructure, IDENTITY_CLAIM_STRUCTURE);
  }

  assert.equal(identityDomainRegistryDigest("1"), v1DigestBefore);
  assert.equal(v1.lineage_relation, undefined);
  assert.equal(v1.geography_residence, undefined);
  assert.equal(identityDomainV2Definition("lineage_family").authoringStatus, "superseded");
  assert.deepEqual(
    identityDomainV2Definition("geography").supersededBy,
    ["geography_residence", "geography_work", "place_meaning"],
  );
  assert.deepEqual(
    identityDomainV2Definition("cultural_formation").allowedBehavioralStatuses,
    ["context_only"],
  );
  assert.equal(identityDomainV2Definition("memory_interpretation").projectionSection, "memory");
});

test("atomic prose backstop rejects the hostile composition bypasses", () => {
  assert.equal(
    assertSingleMaterialProposition("Her family moved from Seoul to Seattle when she was nine."),
    "Her family moved from Seoul to Seattle when she was nine.",
  );

  for (const bundled of [
    "Her family moved to Seattle. She later became an engineer.",
    "Her family moved to Seattle. she later became an engineer.",
    "Her childhood included:\n- Seoul\n- Seattle",
    "She learned pottery from her grandmother; she studied violin in Seoul; she resents her father",
    "She is a conservator and also a mother of two",
    "Born in Seoul — her father ran a hardware store — she married in 2031",
  ]) {
    assert.throws(() => assertSingleMaterialProposition(bundled), /one material proposition|bundle/i);
  }
});

test("claim predicate makes one proposition a structural record property", () => {
  assert.deepEqual(
    normalizeClaimPredicate({
      subject: "thread_mina",
      predicate: "has_source_parent",
      object: "human_mina_mother",
    }),
    {
      subject: "thread_mina",
      predicate: "has_source_parent",
      object: "human_mina_mother",
    },
  );
  assert.throws(
    () => normalizeClaimPredicate({
      subject: "thread_mina",
      predicate: "has source parent",
      object: "human_mina_mother",
    }),
    /lowercase snake_case/,
  );
  assert.throws(
    () => normalizeClaimPredicate({
      subject: "thread_mina",
      predicate: "has_source_parent",
      object: "mother and father",
    }),
    /one subject\/object/,
  );
});

test("historical discipline dispatches by recorded witness while current admission uses current policy", () => {
  const assertion = disciplinedAssertion();
  assert.equal(assertRecordedClaimDiscipline(assertion), assertion);
  assert.equal(assertCurrentClaimDiscipline(assertion), assertion);
  assert.deepEqual(IDENTITY_ATOMIC_CLAIM_POLICY, IDENTITY_ATOMIC_CLAIM_POLICY_V1);

  assert.throws(
    () => assertRecordedClaimDiscipline({
      ...assertion,
      admission: {
        ...assertion.admission,
        claimDiscipline: { id: "identity_atomic_material_proposition", version: "999" },
      },
    }),
    /unknown historical identity claim discipline/i,
  );
});
