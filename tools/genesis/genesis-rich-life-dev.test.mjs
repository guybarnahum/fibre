import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "#services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "#services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  SLICE_E_DEV_ROSTER,
  SLICE_E_DEV_SPAN,
  SLICE_E_DEV_SUBJECT,
  SLICE_E_DEV_WORLD,
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
  assert.equal(first.every(({ developmentalWindow, offeredEntries }) => offeredEntries.every(({ structure }) =>
    structure.developmentalRange.minAge <= developmentalWindow.minAge
      && structure.developmentalRange.maxAge >= developmentalWindow.maxAge)), true);
  assert.equal(first[0].offeredEntries.some(({ structure }) => structure.structureId === "ges_v2_drawing_or_making_seen"), false);
});

test("rich Pass A refuses a manually supplied offer that covers only part of a developmental stratum", () => {
  const item = buildSliceEDevelopmentPlan({ episodeCount: 10, seed: "slice-e-dev-burned-001" })[0];
  const partial = GENESIS_EVENT_STRUCTURE_POOL_V2.find(({ structure }) => structure.structureId === "ges_v2_drawing_or_making_seen");
  assert.ok(partial);
  const offeredEntries = [...item.offeredEntries];
  offeredEntries[0] = partial;

  assert.throws(() => buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: SLICE_E_DEV_WORLD,
    subject: SLICE_E_DEV_SUBJECT,
    developmentalWindow: item.developmentalWindow,
    chronologyEndsAt: item.developmentalWindow.endAt,
    initialRoster: SLICE_E_DEV_ROSTER,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries,
  }), /does not cover the entire developmental window/);
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
