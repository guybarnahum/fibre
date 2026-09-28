import {
  physicalPhenotypeRenderingProjection,
  resolveBirthPhysicalInheritance,
} from "#core/src/human-phenotype/index.mjs";
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
  const family=[{population:"Georgian family",share:1,referencePopulation:"west_asia"}];
  const physicalGenome=resolveBirthPhysicalInheritance({maternalAncestry:family,paternalAncestry:family,seed:"birth-context"}).genome;
  const subjectIdentity = {
    femaleName: "Mariam Beridze",
    maleName: "Giorgi Beridze",
    birthCity: "Tbilisi, Georgia",
    sex: "female",
    place: { country: "Georgia", city: "Tbilisi" },
    heritage: "Georgian Jewish",
    languages:["Georgian", "English"],
    raisedLanguages:["Georgian"],
    physicalGenome,
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
  assert.match(subjectFacts, /Raised with these household\/early-upbringing languages: Georgian/u);
  assert.match(subjectFacts, /By young-adult entry the subject uses these languages: Georgian, English/u);

  const seed = buildNeutralGenesisThreadSeed({
    threadId: plan.threadId,
    createdAt: "2026-09-15T06:40:01Z",
    subjectIdentity: plan.subjectIdentity,
    worldSpec: plan.worldSpec,
    bornAt: plan.bornAt,
    runtimeBaselines:plan.genome.runtimeBaselines,
  });
  assert.equal(seed.identity.sex, "female");
  assert.equal(seed.identity.name, "Mariam Beridze");
  assert.deepEqual(seed.identity.culture, ["Tbilisi, Georgia formative context"], "heritage must not become public culture by default");

  const visual = buildGenesisCanonicalVisualIdentity({
    threadId: plan.threadId,
    sex: seed.identity.sex,
    physicalGenome:plan.subjectIdentity.physicalGenome,
  });
  const visualDescription = visual.specification.subject.description;
  assert.match(visualDescription, /adult female person/u);
  const physicalProjection=physicalPhenotypeRenderingProjection(
    plan.subjectIdentity.physicalGenome,
    { sex:seed.identity.sex },
  );
  assert.ok(
    visualDescription.includes(physicalProjection.description),
    "birth lost shared physical appearance projection",
  );
  assert.doesNotMatch(visualDescription, /Georgian Jewish|Georgian family|west_asia/u, "family provenance must not become a portrait prompt");
  assert.deepEqual(seed.genome.physical,physicalGenome,"birth lost physical inheritance");
});
