import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertModernGenesisThreadIdentity,
  buildNeutralGenesisThreadSeed,
} from "../src/genesis-publication.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

test("modern Genesis birth creates a named, sexed and situated Thread", () => {
  const worldSpec = fixture("fixtures/genesis/pr39/worlds/tbilisi.json");
  const identities = fixture("fixtures/genesis/pr39/subject-identities-v1.json");
  const subjectIdentity = identities.slots.find(({ slot }) => slot === 1);
  const thread = buildNeutralGenesisThreadSeed({
    threadId: "thr_modern_birth_reference",
    createdAt: "2026-09-14T22:41:35Z",
    subjectIdentity,
    worldSpec,
    bornAt: worldSpec.timeFrame.startAt,
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
  assert.deepEqual(thread.identity.culture, [worldSpec.culturalContext]);
  assert.equal(thread.identity.selfDescription, `I am ${thread.identity.name}.`);
  assert.equal(thread.currentState.selfModel, `I am ${thread.identity.name}.`);
});
