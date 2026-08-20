import assert from "node:assert/strict";
import test from "node:test";

import { E2_A0_DEFAULT_SEEDS, buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";
import {
  E2_A2B_SELECTOR_INPUT_VERSION,
  buildE2A2bSelectorInput,
  normalizeE2A2bPlausibility,
  plausibleRoutes,
  seededUniformRouteDraw,
} from "./genesis-rich-life-e2-a2b.mjs";

test("A2b plausibility input preserves A2 stateless blindness and normalizes only offered plausible routes", () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[0]);
  const item = plan[4];
  const input = buildE2A2bSelectorInput({
    worldFixture,
    developmentalWindow: item.developmentalWindow,
    offeredEntries: item.offeredEntries,
    ordinal: 5,
    total: plan.length,
  });

  assert.equal(input.inputVersion, E2_A2B_SELECTOR_INPUT_VERSION);
  assert.deepEqual(Object.keys(input).sort(), [
    "chronology",
    "developmentalWindow",
    "inputVersion",
    "offeredStructures",
    "policyWitness",
    "world",
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
    assert.equal(serialized.includes(`\"${forbidden}\"`), false, `${forbidden} leaked into A2b plausibility input`);
  }

  const offeredIds = item.offeredEntries.map((entry) => entry.structure.structureId);
  const normalized = normalizeE2A2bPlausibility({
    plausibleStructureRefs: [offeredIds[2], offeredIds[0]],
    worldEmergentPlausible: true,
  }, item.offeredEntries);
  assert.deepEqual(normalized.plausibleStructureRefs, [offeredIds[0], offeredIds[2]].sort());
  assert.equal(normalized.worldEmergentPlausible, true);
  assert.equal(plausibleRoutes(normalized).length, 3);

  assert.throws(() => normalizeE2A2bPlausibility({
    plausibleStructureRefs: [],
    worldEmergentPlausible: false,
  }, item.offeredEntries), /at least one route/);
  assert.throws(() => normalizeE2A2bPlausibility({
    plausibleStructureRefs: ["ges_not_offered"],
    worldEmergentPlausible: false,
  }, item.offeredEntries), /unoffered structure/);
  assert.throws(() => normalizeE2A2bPlausibility({
    plausibleStructureRefs: [offeredIds[0], offeredIds[0]],
    worldEmergentPlausible: false,
  }, item.offeredEntries), /repeated structure/);
});

test("A2b seeded contingency is deterministic, auditable and independent of prior-life state", () => {
  const routes = Object.freeze([
    Object.freeze({ selectionKind: "offered_structure", structureRef: "ges_alpha" }),
    Object.freeze({ selectionKind: "offered_structure", structureRef: "ges_beta" }),
    Object.freeze({ selectionKind: "world_emergent", structureRef: null }),
  ]);
  const args = {
    worldId: "E2-D1",
    seed: "slice-e2-a0-seed-01",
    ordinal: 4,
    routes,
  };
  const first = seededUniformRouteDraw(args);
  const second = seededUniformRouteDraw(structuredClone(args));
  assert.deepEqual(first, second);
  assert.ok(first.chosenIndex >= 0 && first.chosenIndex < routes.length);
  assert.deepEqual(first.chosenRoute, routes[first.chosenIndex]);
  assert.match(first.plausibleSetDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.drawInputDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.acceptedHash, /^sha256:[0-9a-f]{64}$/);
  assert.ok(Number.isInteger(first.rejectionCounter) && first.rejectionCounter >= 0);

  const differentSeed = seededUniformRouteDraw({ ...args, seed: "slice-e2-a0-seed-02" });
  assert.notEqual(differentSeed.drawInputDigest, first.drawInputDigest);
  const differentOrdinal = seededUniformRouteDraw({ ...args, ordinal: 5 });
  assert.notEqual(differentOrdinal.drawInputDigest, first.drawInputDigest);
});
