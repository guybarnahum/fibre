import assert from "node:assert/strict";
import test from "node:test";

import {
  SLICE_E_DEV_SPAN,
  buildSliceEDevelopmentPlan,
  buildSliceESyntheticLineage,
  stratifySliceEDevelopmentSpan,
} from "./genesis-rich-life-dev.mjs";

test("Slice E development spans childhood through adolescence with one deterministic offer per stratum", () => {
  const windows = stratifySliceEDevelopmentSpan(SLICE_E_DEV_SPAN, 10);
  assert.equal(windows.length, 10);
  assert.equal(windows[0].startAt, new Date(SLICE_E_DEV_SPAN.startAt).toISOString());
  assert.equal(windows.at(-1).endAt, new Date(SLICE_E_DEV_SPAN.endAt).toISOString());
  for (let index = 1; index < windows.length; index += 1) {
    assert.ok(Date.parse(windows[index].startAt) > Date.parse(windows[index - 1].endAt));
    assert.ok(windows[index].minAge >= windows[index - 1].minAge);
  }

  const first = buildSliceEDevelopmentPlan({ episodeCount: 10, seed: "slice-e-plan-test" });
  const second = buildSliceEDevelopmentPlan({ episodeCount: 10, seed: "slice-e-plan-test" });
  assert.deepEqual(first, second);
  assert.equal(first.every((item) => item.offeredEntries.length === 9), true);
  assert.equal(first.every((item) => item.offeredEntries.filter((entry) => entry.structure.consequenceClass === "low").length >= 4), true);
});

test("Slice E synthetic development lineage is a stable recombined genome witness", () => {
  const first = buildSliceESyntheticLineage({ seed: "slice-e-lineage-dev-test" });
  const second = buildSliceESyntheticLineage({ seed: "slice-e-lineage-dev-test" });
  assert.deepEqual(first, second);
  assert.match(first.witness.genomeRef, /^genome_/);
  assert.deepEqual(first.witness.parentOrAncestorRefs, ["ancestor_slice_e_dev_a", "ancestor_slice_e_dev_b"]);
  assert.match(first.witness.recombinationWitnessRef, /^recomb_[0-9a-f]{40}$/);
  assert.equal(first.evidence.locusCount, 6);
});
