import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { characterizeGenesisMemoryMeaning } from "../services/world-kernel/src/genesis-memory-meaning-characterization.mjs";
import { characterizeN2MemoryMeaning } from "./genesis-memory-meaning-n2-characterization.mjs";

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

test("sealed N2 evidence is characterizable at the correct resolution without changing its gate result", () => {
  const artifactUrl = new URL("../artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-n2-v1.json", import.meta.url);
  const artifact = JSON.parse(readFileSync(artifactUrl, "utf8"));
  const result = characterizeN2MemoryMeaning(artifact);

  assert.equal(result.admissionVerdict, null);
  assert.equal(result.funnel.observations, 18);
  assert.equal(result.funnel.remembered, 18);
  assert.equal(result.funnel.notRemembered, 0);
  assert.equal(result.funnel.durableMeaning, 18);
  assert.equal(result.funnel.noDurableMeaning, 0);
  assert.equal(result.funnel.rememberedRate, 1);
  assert.equal(result.funnel.rememberedToDurableMeaningRate, 1);
  assert.deepEqual(result.selectivity.byVisibleEpisodeCount.map((item) => [item.visibleEpisodeCount, item.observations]), [
    [6, 6],
    [8, 6],
    [10, 6],
  ]);
  assert.ok(result.selectivity.citationShareOfVisibleHistory.mean > 0);
  assert.ok(result.selectivity.citationShareOfVisibleHistory.mean < 0.5);
  assert.ok(result.selectivity.citationShareOfVisibleHistory.max <= 0.5);
  assert.equal(artifact.score.gateFDownstreamFertilityMet, true);
});
