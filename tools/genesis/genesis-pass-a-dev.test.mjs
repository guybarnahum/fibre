import assert from "node:assert/strict";
import test from "node:test";

import {
  SLICE_C_DEV_SUBJECT,
  SLICE_C_DEV_WINDOW,
  buildSliceCDevelopmentPlan,
  runSliceCPassADevelopment,
  stratifySliceCDevelopmentWindow,
} from "./genesis-pass-a-dev.mjs";

const MILLIS_PER_MEAN_GREGORIAN_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

function measuredAgeYears(occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(SLICE_C_DEV_SUBJECT.bornAt)) / MILLIS_PER_MEAN_GREGORIAN_YEAR;
}

function midpointIso(window) {
  return new Date(Math.floor((Date.parse(window.startAt) + Date.parse(window.endAt)) / 2)).toISOString();
}

test("Slice-C development chronology is deterministically stratified across the whole span", () => {
  const windows = stratifySliceCDevelopmentWindow(SLICE_C_DEV_WINDOW, 8);
  assert.equal(windows.length, 8);
  assert.equal(Date.parse(windows[0].startAt), Date.parse(SLICE_C_DEV_WINDOW.startAt));
  assert.equal(Date.parse(windows.at(-1).endAt), Date.parse(SLICE_C_DEV_WINDOW.endAt));
  assert.equal(windows[0].minAge, SLICE_C_DEV_WINDOW.minAge);
  assert.equal(windows.at(-1).maxAge, SLICE_C_DEV_WINDOW.maxAge);

  for (let index = 0; index < windows.length; index += 1) {
    assert.equal(windows[index].windowId, `middle_childhood_stratum_${String(index + 1).padStart(2, "0")}`);
    assert.ok(Date.parse(windows[index].endAt) >= Date.parse(windows[index].startAt));
    if (index > 0) {
      assert.equal(Date.parse(windows[index].startAt), Date.parse(windows[index - 1].endAt) + 1);
      assert.equal(windows[index].minAge, windows[index - 1].maxAge);
    }
  }
});

test("each chronology stratum gets its own deterministic 9-structure offer with the low-consequence floor", () => {
  const first = buildSliceCDevelopmentPlan({ episodeCount: 8, seed: "slice-c-strata-test" });
  const second = buildSliceCDevelopmentPlan({ episodeCount: 8, seed: "slice-c-strata-test" });
  assert.deepEqual(first, second);
  assert.equal(first.length, 8);
  for (const item of first) {
    assert.equal(item.offeredStructures.length, 9);
    assert.ok(item.offeredStructures.filter(({ consequenceClass }) => consequenceClass === "low").length >= 4);
  }
});

test("the live development runner uses one chronology stratum per generated episode without semantic selection", async () => {
  let ordinal = 0;
  const seenWindows = [];
  const adapter = {
    async invoke(request) {
      ordinal += 1;
      const window = request.input.developmentalWindow;
      seenWindows.push(structuredClone(window));
      const occurredAt = midpointIso(window);
      return {
        output: {
          episode: {
            episodeId: `ep_slice_c_stratum_${String(ordinal).padStart(2, "0")}`,
            occurredAt,
            ageAtEvent: Number(measuredAgeYears(occurredAt).toFixed(3)),
            placeRef: "place_home_block",
            participantRefs: [SLICE_C_DEV_SUBJECT.provisionalThreadId, "person_caregiver_1"],
            observableAction: "The child and caregiver walk from the apartment entrance to the corner, pause while a bus passes, and continue along the block together.",
            structureRef: null,
            introducedParticipants: [],
          },
        },
        provenance: { provider: "mock", modelId: "slice-c-strata" },
      };
    },
  };

  const result = await runSliceCPassADevelopment({
    provider: "openai",
    model: "slice-c-strata-mock",
    episodeCount: 8,
    seed: "slice-c-strata-runner-test",
    adapterOverride: adapter,
  });

  assert.equal(result.status, "complete");
  assert.equal(result.episodes.length, 8);
  assert.equal(seenWindows.length, 8);
  assert.deepEqual(seenWindows, result.eventStructurePool.windows.map(({ offeredStructureIds: _ignored, ...window }) => window));
  assert.equal(result.funnel.developmentalWindows, 8);
  assert.equal(result.funnel.structureOfferSlots, 72);
  assert.equal(result.funnel.episodesWorldEmergent, 8);
  assert.equal(result.rejectionRepairProfile.recordRepairs, 0);
  assert.deepEqual(result.memoryRecords, []);
  assert.deepEqual(result.meaningRecords, []);

  for (let index = 0; index < result.episodes.length; index += 1) {
    const episode = result.episodes[index];
    const window = seenWindows[index];
    assert.ok(Date.parse(episode.occurredAt) >= Date.parse(window.startAt));
    assert.ok(Date.parse(episode.occurredAt) <= Date.parse(window.endAt));
    if (index > 0) assert.ok(Date.parse(episode.occurredAt) > Date.parse(result.episodes[index - 1].occurredAt));
  }
});
