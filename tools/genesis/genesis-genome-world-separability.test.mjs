// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-genome
// fibre-test-purpose: genome-world-geography-separability

import assert from "node:assert/strict";
import test from "node:test";

import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";

function wordSet(value) {
  return new Set(
    String(value)
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .match(/\p{L}+/gu) ?? [],
  );
}

function geographyTerms(worldSpec) {
  const [identity] = worldSpec.culturalContext.split(/\s+[—–]\s+/u, 1);
  const terms = [...wordSet(identity)].filter((term) => term.length >= 3);
  assert.ok(
    terms.length > 0,
    `World ${worldSpec.worldSpecId} must expose its geographic identity at the start of culturalContext`,
  );
  return terms;
}

function genomeTerms(bundle) {
  return wordSet(bundle.loci.map((locus) => locus.value).join(" "));
}

test("current Genesis genomes remain relocatable across every current World geography", () => {
  const plans = buildGenesisDevelopmentPlans();
  assert.equal(plans.slots.length, 5);

  const geography = new Set(
    plans.slots.flatMap(({ worldSpec }) => geographyTerms(worldSpec)),
  );
  assert.ok(geography.size >= plans.slots.length);

  for (const slot of plans.slots) {
    const bundles = [
      slot.genome,
      ...slot.parentGenomes.map(({ bundle }) => bundle),
    ];
    for (const bundle of bundles) {
      const terms = genomeTerms(bundle);
      const leaked = [...geography].filter((term) => terms.has(term));
      assert.deepEqual(
        leaked,
        [],
        `${bundle.header.genomeId} leaks current World geography: ${leaked.join(", ")}`,
      );
    }
  }
});
