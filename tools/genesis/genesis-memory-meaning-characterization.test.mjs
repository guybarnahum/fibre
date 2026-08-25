// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-memory
// fibre-test-purpose: selective-memory-characterization-is-observational

import assert from "node:assert/strict";
import test from "node:test";

import { characterizeGenesisMemoryMeaning } from "#services/world-kernel/src/genesis-memory-meaning-characterization.mjs";

function syntheticRecords() {
  return [
    {
      formationRef: "formation_stage2_001",
      visibleEpisodeCount: 6,
      memoryOutcome: "remembered",
      citedEpisodeRefs: ["ep_stage2_001"],
      meaningOutcome: "durable_meaning",
    },
    {
      formationRef: "formation_stage2_002",
      visibleEpisodeCount: 8,
      memoryOutcome: "remembered",
      citedEpisodeRefs: ["ep_stage2_002", "ep_stage2_003"],
      meaningOutcome: "no_durable_meaning",
    },
    {
      formationRef: "formation_stage2_003",
      visibleEpisodeCount: 10,
      memoryOutcome: "not_remembered",
      citedEpisodeRefs: [],
      meaningOutcome: null,
    },
  ];
}

test("memory/meaning characterization measures selection and meaning without producing an admission verdict", () => {
  const result = characterizeGenesisMemoryMeaning({ records: syntheticRecords() });

  assert.equal(result.admissionVerdict, null);
  assert.match(result.note, /must not be used as admission gates or regeneration triggers/);
  assert.deepEqual(result.funnel, {
    observations: 3,
    remembered: 2,
    notRemembered: 1,
    rememberedRate: 2 / 3,
    durableMeaning: 1,
    noDurableMeaning: 1,
    rememberedToDurableMeaningRate: 1 / 2,
  });
  assert.equal(result.selectivity.rememberedObservations, 2);
  assert.equal(result.selectivity.citedEpisodesTotal, 3);
  assert.deepEqual(result.selectivity.citedEpisodesPerMemory, { mean: 1.5, min: 1, max: 2 });
  assert.deepEqual(result.selectivity.citationShareOfVisibleHistory, {
    mean: ((1 / 6) + (2 / 8)) / 2,
    min: 1 / 6,
    max: 2 / 8,
  });
  assert.deepEqual(result.selectivity.byVisibleEpisodeCount.map((item) => item.visibleEpisodeCount), [6, 8, 10]);
});

test("memory/meaning characterization rejects incoherent memory/meaning states", () => {
  assert.throws(
    () => characterizeGenesisMemoryMeaning({ records: [{
      formationRef: "formation_stage2_bad_001",
      visibleEpisodeCount: 6,
      memoryOutcome: "not_remembered",
      citedEpisodeRefs: ["ep_stage2_bad_001"],
      meaningOutcome: null,
    }] }),
    /not_remembered cannot cite episodes/,
  );

  assert.throws(
    () => characterizeGenesisMemoryMeaning({ records: [{
      formationRef: "formation_stage2_bad_002",
      visibleEpisodeCount: 6,
      memoryOutcome: "remembered",
      citedEpisodeRefs: ["ep_stage2_bad_002"],
      meaningOutcome: null,
    }] }),
    /meaningOutcome is invalid for remembered memory/,
  );
});
