import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "../src/genesis-development-plan.mjs";
import {
  assertModernGenesisThreadIdentity,
  buildNeutralGenesisThreadSeed,
} from "../src/genesis-publication.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

test("modern Genesis request carries a proper, sexed and situated identity into birth", () => {
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
  };
  const plan = buildGenesisDevelopmentPlan({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId: "modern-birth-reference-001",
    requestedAt: "2026-09-14T22:41:35Z",
    worldSpec,
    subjectIdentity,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });
  assert.deepEqual(plan.subjectIdentity, subjectIdentity);

  const thread = buildNeutralGenesisThreadSeed({
    threadId: plan.threadId,
    createdAt: "2026-09-14T22:41:35Z",
    subjectIdentity: plan.subjectIdentity,
    worldSpec: plan.worldSpec,
    bornAt: plan.bornAt,
  });

  assert.equal(assertModernGenesisThreadIdentity(thread), true);
  assert.ok(["female", "male"].includes(thread.identity.sex));
  assert.equal(
    thread.identity.name,
    thread.identity.sex === "female" ? subjectIdentity.femaleName : subjectIdentity.maleName,
  );
  assert.notEqual(thread.identity.name, "Fibre Thread");
  assert.equal(thread.identity.birthDate, "2004-08-20");
  assert.deepEqual(thread.identity.languages, worldSpec.languages);
  assert.equal(thread.identity.birthCity, "Tbilisi, Georgia");
  assert.deepEqual(thread.identity.culture, ["Tbilisi, Georgia formative context"]);
  assert.equal(thread.identity.selfDescription, `I am ${thread.identity.name}.`);
  assert.equal(thread.currentState.selfModel, `I am ${thread.identity.name}.`);
});
