import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "../src/genesis-development-plan.mjs";
import { buildNeutralGenesisThreadSeed } from "../src/genesis-publication.mjs";
import { genesisSexForThread } from "../src/genesis-sex.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

test("Genesis birth produces a specific person grounded in a specific world", () => {
  const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
  const identities = fixture("fixtures/genesis/pr39/subject-identities-v1.json");
  const slot = cohort.slots[0];
  const worldSpec = fixture(slot.worldSpecPath);
  const genome = fixture(slot.genomePath);
  const identityFixture = identities.slots.find(({ slot: ordinal }) => ordinal === slot.slot);
  const subjectIdentity = {
    femaleName: identityFixture.femaleName,
    maleName: identityFixture.maleName,
    birthCity: identityFixture.birthCity,
    languages: [...worldSpec.languages],
    raisedLanguages: [worldSpec.languages[0]],
  };
  const requestedAt = "2026-09-14T22:41:35Z";
  const plan = buildGenesisDevelopmentPlan({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId: "modern-birth-reference-001",
    requestedAt,
    worldSpec,
    subjectIdentity,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });

  const thread = buildNeutralGenesisThreadSeed({
    threadId: plan.threadId,
    createdAt: requestedAt,
    subjectIdentity: plan.subjectIdentity,
    worldSpec: plan.worldSpec,
    bornAt: plan.bornAt,
    runtimeBaselines:plan.genome.runtimeBaselines,
  });

  const expectedSex = genesisSexForThread({ threadId: plan.threadId });
  const expectedName = expectedSex === "female"
    ? subjectIdentity.femaleName
    : subjectIdentity.maleName;

  assert.equal(thread.identity.sex, expectedSex, "birth lost authoritative sex");
  assert.equal(thread.identity.name, expectedName, "birth lost the person's proper name");
  assert.notEqual(thread.identity.name, "Fibre Thread", "birth fell back to a generic person");
  assert.equal(thread.identity.birthDate, plan.bornAt.slice(0, 10), "birth date drifted from Genesis chronology");
  assert.equal(thread.identity.birthCity, plan.subjectIdentity.birthCity, "birth place drifted from the birth plan");
  assert.equal(thread.identity.birthPlace.displayName, plan.subjectIdentity.birthCity, "mappable birthplace label drifted");
  assert.equal(Number.isFinite(thread.identity.birthPlace.lat), true, "birthplace latitude is missing");
  assert.equal(Number.isFinite(thread.identity.birthPlace.long), true, "birthplace longitude is missing");
  assert.deepEqual(thread.identity.languages, plan.subjectIdentity.languages, "spoken languages were lost at birth");
  assert.deepEqual(plan.subjectIdentity.raisedLanguages, [worldSpec.languages[0]], "raised languages were lost from the birth plan");
  assert.ok(thread.identity.culture.length > 0, "birth lacks cultural grounding");
  assert.equal(thread.currentState.selfModel, `I am ${expectedName}.`, "newborn self-model is generic");
  assert.deepEqual(
    thread.genome.runtimeBaselines,
    plan.genome.runtimeBaselines,
    "birth lost inherited organismic baselines",
  );
});