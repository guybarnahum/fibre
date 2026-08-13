import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_ATOMIC_CLAIM_POLICY,
  assertRegistryV2ClaimDiscipline,
  assertSingleMaterialProposition,
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

test("registry v2 is additive, disciplined, and does not mutate frozen v1", () => {
  assert.equal(IDENTITY_DOMAIN_REGISTRY_V2_VERSION, "2");
  assert.match(IDENTITY_DOMAIN_REGISTRY_V2_DIGEST, /^sha256:[0-9a-f]{64}$/);

  const v1 = IDENTITY_DOMAIN_REGISTRIES["1"];
  const v1DigestBefore = identityDomainRegistryDigest("1");

  for (const domainId of Object.keys(v1)) {
    assert.ok(IDENTITY_DOMAIN_REGISTRY_V2[domainId]);
    assert.deepEqual(
      IDENTITY_DOMAIN_REGISTRY_V2[domainId].claimDiscipline,
      IDENTITY_ATOMIC_CLAIM_POLICY,
    );
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
    assert.deepEqual(definition.claimDiscipline, IDENTITY_ATOMIC_CLAIM_POLICY);
  }

  assert.equal(identityDomainRegistryDigest("1"), v1DigestBefore);
  assert.equal(v1.lineage_relation, undefined);
  assert.equal(v1.geography_residence, undefined);
});

test("registry v2 atomic discipline rejects obvious biography bundles", () => {
  assert.equal(
    assertSingleMaterialProposition("Her family moved from Seoul to Seattle when she was nine."),
    "Her family moved from Seoul to Seattle when she was nine.",
  );

  for (const bundled of [
    "Her family moved to Seattle. She later became an engineer.",
    "Her childhood included:\n- Seoul\n- Seattle",
    "She speaks Korean; additionally, she identifies strongly with Seattle.",
  ]) {
    assert.throws(() => assertSingleMaterialProposition(bundled), /one material proposition|bundle/i);
  }
});

test("registry v2 admission requires the named atomic-claim policy", () => {
  const assertion = {
    meaning: "Her mother is the source parent for this lineage relation.",
    admission: {
      policy: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
    },
  };
  assert.equal(assertRegistryV2ClaimDiscipline(assertion), assertion);

  assert.throws(
    () => assertRegistryV2ClaimDiscipline({
      ...assertion,
      admission: { policy: { id: "identity_admission", version: "1" } },
    }),
    /registry v2 identity assertions require/i,
  );
});
