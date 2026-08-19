import assert from "node:assert/strict";
import test from "node:test";

import {
  E2_A2_SELECTOR_INPUT_VERSION,
  buildE2A2SelectorInput,
  normalizeE2A2Selection,
} from "./genesis-rich-life-e2-a2.mjs";
import { E2_A0_DEFAULT_SEEDS, buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

test("A2 selector input is stateless and excludes household, history, counterpart economics and richness labels", () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[0]);
  const item = plan[4];
  const input = buildE2A2SelectorInput({
    worldFixture,
    developmentalWindow: item.developmentalWindow,
    offeredEntries: item.offeredEntries,
    ordinal: 5,
    total: plan.length,
  });

  assert.equal(input.inputVersion, E2_A2_SELECTOR_INPUT_VERSION);
  assert.deepEqual(Object.keys(input).sort(), [
    "chronology",
    "developmentalWindow",
    "inputVersion",
    "offeredStructures",
    "policyWitness",
    "world",
  ]);
  assert.deepEqual(Object.keys(input.world).sort(), [
    "affordedRoles",
    "availableInstitutions",
    "culturalContext",
    "intellectualEnvironment",
    "languages",
    "places",
    "schoolingOrCommunityContext",
    "timeFrame",
  ]);
  assert.deepEqual(Object.keys(input.offeredStructures[0]).sort(), [
    "abstractSituation",
    "participatingRoles",
    "structureId",
  ]);

  const serialized = JSON.stringify(input);
  for (const forbidden of [
    "provisionalThreadId",
    "bornAt",
    "householdShape",
    "familyRelations",
    "materialCircumstances",
    "mobilityPattern",
    "initialRoster",
    "priorEpisodes",
    "previouslyIntroducedParticipants",
    "counterpartMode",
    "contextKinds",
    "consequenceClass",
    "genome",
    "memory",
    "richness",
  ]) {
    assert.equal(serialized.includes(`\"${forbidden}\"`), false, `${forbidden} leaked into selector input`);
  }

  const offered = input.offeredStructures[0].structureId;
  assert.deepEqual(normalizeE2A2Selection({ selectionKind: "offered_structure", structureRef: offered }, item.offeredEntries), {
    selectionKind: "offered_structure",
    structureRef: offered,
  });
  assert.deepEqual(normalizeE2A2Selection({ selectionKind: "world_emergent", structureRef: null }, item.offeredEntries), {
    selectionKind: "world_emergent",
    structureRef: null,
  });
  assert.throws(
    () => normalizeE2A2Selection({ selectionKind: "offered_structure", structureRef: "ges_not_offered" }, item.offeredEntries),
    /unoffered structure/,
  );
});
