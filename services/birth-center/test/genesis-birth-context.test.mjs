import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "../src/genesis-development-plan.mjs";
import { buildNeutralGenesisThreadSeed } from "../src/genesis-publication.mjs";
import { buildGenesisCanonicalVisualIdentity } from "../src/genesis-visual-phenotype.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

test("Genesis carries explicit sex place and heritage into life context and embodiment", () => {
  const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[0];
  const worldSpec = fixture(slot.worldSpecPath);
  const genome = fixture(slot.genomePath);
  const appearanceContext = "This family context permits a broad range of West Asian and Caucasus-region appearance, including substantial variation in complexion, hair texture and eye color; it does not imply a single facial type or stereotyped phenotype.";
  const subjectIdentity = {
    femaleName: "Mariam Beridze",
    maleName: "Giorgi Beridze",
    birthCity: "Tbilisi, Georgia",
    sex: "female",
    place: { country: "Georgia", city: "Tbilisi" },
    heritage: "Georgian Jewish",
    appearanceContext,
  };
  const plan = buildGenesisDevelopmentPlan({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId: "genesis_birth_context_test",
    requestedAt: "2026-09-15T06:40:00Z",
    worldSpec,
    subjectIdentity,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });

  assert.equal(plan.subjectIdentity.sex, "female");
  assert.equal(plan.subjectIdentity.heritage, "Georgian Jewish");
  const subjectFacts = plan.roster.participants[0].relationshipFacts.join(" ");
  assert.match(subjectFacts, /Sex at birth: female/u);
  assert.match(subjectFacts, /Born in Tbilisi, Georgia/u);
  assert.match(subjectFacts, /Georgian Jewish heritage/u);

  const seed = buildNeutralGenesisThreadSeed({
    threadId: plan.threadId,
    createdAt: "2026-09-15T06:40:01Z",
    subjectIdentity: plan.subjectIdentity,
    worldSpec: plan.worldSpec,
    bornAt: plan.bornAt,
  });
  assert.equal(seed.identity.sex, "female");
  assert.equal(seed.identity.name, "Mariam Beridze");
  assert.deepEqual(seed.identity.culture, ["Tbilisi, Georgia formative context"], "heritage must not become public culture by default");

  const visual = buildGenesisCanonicalVisualIdentity({
    threadId: plan.threadId,
    sex: seed.identity.sex,
    originMode: "de_novo",
    birthCity: plan.subjectIdentity.birthCity,
    heritage: plan.subjectIdentity.heritage,
    appearanceContext: plan.subjectIdentity.appearanceContext,
  });
  const visualDescription = visual.specification.subject.description;
  assert.match(visualDescription, /adult female person/u);
  assert.match(visualDescription, /broad family appearance prior/u);
  assert.doesNotMatch(visualDescription, /Georgian Jewish/u, "heritage label must not become a portrait prompt");
});
