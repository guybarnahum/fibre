import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { runE2H6Probe } from "./genesis-rich-life-e2-h6-probe.mjs";

function ratingsFor(request) {
  return request.input.structures.map((structure) => ({
    structureId: structure.structureId,
    plausibleSceneCountBand: "six_or_more",
    distinctConfigurationBand: "three_or_more",
    outsideHouseholdPlausibility: "multiple",
    householdDominant: false,
    realizationDegenerateWith: [],
    reason: "Multiple world-grounded realizations remain available without selecting a desired developmental outcome.",
  }));
}

test("H6 probe hides generated life and world experiment identity from the rater", async () => {
  const requests = [];
  const adapter = {
    async invoke(request) {
      requests.push(structuredClone(request));
      return {
        output: {
          probeWorldId: request.input.probeWorldId,
          ratings: ratingsFor(request),
        },
        provenance: { provider: "test", model: "test-rater" },
      };
    },
  };

  const artifact = await runE2H6Probe({ adapter, provider: "test", model: "test-rater" });

  assert.equal(requests.length, 3);
  assert.equal(artifact.results.length, 3);
  assert.equal(artifact.admissionVerdict, null);
  assert.equal(artifact.developmentOnly, true);
  assert.equal(artifact.burnedForFinalCohort, true);

  for (const request of requests) {
    assert.deepEqual(Object.keys(request.input).sort(), [
      "developmentalSpan",
      "probeVersion",
      "probeWorldId",
      "structures",
      "world",
    ]);
    assert.match(request.input.probeWorldId, /^probe_world_0[1-3]$/);
    const serialized = JSON.stringify(request.input);
    for (const forbidden of [
      "episodes",
      "priorEpisodes",
      "genome",
      "rememberedMeaning",
      "benchmark",
      "seed",
      "worldSpecId",
      "worldAuthorship",
      "burned",
      "slice_e2",
      "slice_e_dev",
    ]) {
      assert.equal(serialized.includes(forbidden), false);
    }
    assert.equal(request.input.structures.length, GENESIS_EVENT_STRUCTURE_POOL_V2.length);
  }

  for (const result of artifact.results) {
    assert.equal(result.ratings.length, GENESIS_EVENT_STRUCTURE_POOL_V2.length);
    assert.equal(result.characterization.lowSceneShare, 0);
    assert.equal(result.characterization.householdDominantShare, 0);
    assert.equal(result.characterization.warning.moreThanHalfLowScene, false);
    assert.equal(result.characterization.warning.moreThanHalfHouseholdDominant, false);
  }
});
