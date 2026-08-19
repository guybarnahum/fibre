import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  normalizeEventStructurePoolV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { normalizeGenesisWorldSpec } from "../services/world-kernel/src/genesis-domain.mjs";
import {
  SLICE_E_DEV_ROSTER,
  SLICE_E_DEV_SPAN,
  SLICE_E_DEV_WORLD,
  stratifySliceEDevelopmentSpan,
} from "./genesis-rich-life-dev.mjs";
import {
  E2_D1_ROSTER,
  E2_D1_SPAN,
  E2_D1_WORLD,
  E2_D2_ROSTER,
  E2_D2_SPAN,
  E2_D2_WORLD,
  E2_DIAGNOSTIC_WORLDS,
} from "./genesis-rich-life-e2-worlds.mjs";

function eligibleCount(window) {
  return normalizeEventStructurePoolV2(GENESIS_EVENT_STRUCTURE_POOL_V2).filter(({ structure }) =>
    structure.developmentalRange.minAge <= window.minAge
      && structure.developmentalRange.maxAge >= window.maxAge).length;
}

test("E2 D1/D2 worlds are valid fresh diagnostics without silently increasing E1 roster/place capacity", () => {
  assert.equal(E2_DIAGNOSTIC_WORLDS.length, 2);
  assert.notEqual(E2_D1_WORLD.worldSpecId, E2_D2_WORLD.worldSpecId);
  assert.notEqual(E2_D1_WORLD.worldSpecId, SLICE_E_DEV_WORLD.worldSpecId);
  assert.notEqual(E2_D2_WORLD.worldSpecId, SLICE_E_DEV_WORLD.worldSpecId);

  for (const candidate of [E2_D1_WORLD, E2_D2_WORLD]) {
    assert.deepEqual(normalizeGenesisWorldSpec(candidate), candidate);
    assert.equal(candidate.places.length, SLICE_E_DEV_WORLD.places.length);
    assert.deepEqual([...candidate.affordedRoles].sort(), [...SLICE_E_DEV_WORLD.affordedRoles].sort());
    const serialized = JSON.stringify(candidate);
    for (const forbidden of ["genome", "locus", "personality", "futureRole", "benchmark"]) {
      assert.equal(serialized.includes(`\"${forbidden}\"`), false);
    }
  }

  assert.equal(E2_D1_ROSTER.length, SLICE_E_DEV_ROSTER.length);
  assert.equal(E2_D2_ROSTER.length, SLICE_E_DEV_ROSTER.length);
});

test("E2 records the current full-stratum offer-width ceiling before A6", () => {
  const expected = [9, 12, 14, 15, 16, 13, 18, 15, 13, 11];
  for (const span of [SLICE_E_DEV_SPAN, E2_D1_SPAN, E2_D2_SPAN]) {
    const counts = stratifySliceEDevelopmentSpan(span, 10).map(eligibleCount);
    assert.deepEqual(counts, expected);
    assert.equal(Math.min(...counts), 9);
    assert.equal(counts.at(-1), 11);
  }

  // A fixed >=12 wider-offer arm cannot cover all ten existing strata. This is
  // H6 evidence to interpret, not permission to mutate Pool-v2 before diagnosis.
  assert.equal(expected.every((count) => count >= 12), false);
});
