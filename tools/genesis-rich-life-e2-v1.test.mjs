import assert from "node:assert/strict";
import test from "node:test";

import {
  E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN,
  E2_V1_SEEDS,
  buildE2V1Preflight,
} from "./genesis-rich-life-e2-v1.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";
import { E2_V1_WORLD_FIXTURE } from "./genesis-rich-life-e2-v1-world.mjs";

test("E2-V1 preflight freezes one source-free fresh world and identical offer surfaces before model use", () => {
  const first = buildE2V1Preflight();
  const second = buildE2V1Preflight();

  assert.deepEqual(first, second);
  assert.equal(first.worldId, "E2-V1");
  assert.equal(first.sourceFree, true);
  assert.equal(first.firstModelUseBurnsWorld, true);
  assert.equal(E2_V1_WORLD_FIXTURE.worldSpec.worldAuthorship.sourcesConsulted.length, 0);
  assert.equal(
    E2_DIAGNOSTIC_WORLDS.some(
      (world) => world.worldSpec.worldSpecId === E2_V1_WORLD_FIXTURE.worldSpec.worldSpecId,
    ),
    false,
  );

  assert.deepEqual(first.seeds, E2_V1_SEEDS);
  assert.equal(first.schedules.length, 3);
  assert.deepEqual(first.armOrderWithinSeed, ["A0", "FROZEN"]);
  assert.equal(first.comparison.primaryMeasure, "mean_same_world_pairwise_structure_ref_jaccard");
  assert.equal(first.comparison.frozenMustImproveByAtLeast, E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN);
  assert.equal(E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN, 0.15);
  assert.equal(first.comparison.noRichnessScore, true);
  assert.equal(first.frozenMechanism.selectorCognitionUsed, false);

  for (const schedule of first.schedules) {
    assert.equal(schedule.a0OfferedWindows.length, 10);
    assert.equal(schedule.frozenEvidence.length, 10);
    for (let index = 0; index < 10; index += 1) {
      const a0 = schedule.a0OfferedWindows[index];
      const frozen = schedule.frozenEvidence[index];
      assert.equal(a0.windowId, frozen.windowId);
      assert.deepEqual(a0.offeredStructureIds, frozen.offeredStructureIds);
      assert.equal(a0.offeredStructureIds.length, 9);
      assert.equal(frozen.routeCount, 10);
      if (frozen.selectedOpportunity.selectionKind === "offered_structure") {
        assert.equal(a0.offeredStructureIds.includes(frozen.selectedOpportunity.structureRef), true);
      } else {
        assert.deepEqual(frozen.selectedOpportunity, {
          selectionKind: "world_emergent",
          structureRef: null,
        });
      }
    }
  }
});
