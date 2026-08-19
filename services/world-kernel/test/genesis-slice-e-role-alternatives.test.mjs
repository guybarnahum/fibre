import assert from "node:assert/strict";
import test from "node:test";

import { validateConsistentPassAEpisode } from "../src/genesis-pass-a-consistency.mjs";
import { buildRichLifePassAInput } from "../src/genesis-rich-life-domain.mjs";
import { validateRichPassAEpisode } from "../src/genesis-rich-life-episode.mjs";
import { generateRichPassAEpisode } from "../src/genesis-rich-pass-a-runner.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
} from "../src/genesis-event-structure-pool-v2.mjs";
import {
  SLICE_E_DEV_ROSTER,
  SLICE_E_DEV_SUBJECT,
  SLICE_E_DEV_WORLD,
  buildSliceEDevelopmentPlan,
} from "../../../tools/genesis-rich-life-dev.mjs";

function firstWindowInput() {
  const item = buildSliceEDevelopmentPlan({
    episodeCount: 10,
    seed: "slice-e-dev-burned-001",
  })[0];
  assert.ok(item.offeredEntries.some(({ structure }) => structure.structureId === "ges_v2_lost_small_item"));
  return buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: SLICE_E_DEV_WORLD,
    subject: SLICE_E_DEV_SUBJECT,
    developmentalWindow: item.developmentalWindow,
    chronologyEndsAt: item.developmentalWindow.endAt,
    initialRoster: SLICE_E_DEV_ROSTER,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: item.offeredEntries,
  });
}

function lostItemEpisode(participantRefs) {
  return {
    episodeId: "epi_thr_slice_e_dev_001_role_regression",
    occurredAt: "2000-04-03T00:00:00.000Z",
    ageAtEvent: 6,
    placeRef: "place_e_home",
    participantRefs,
    observableAction: "The child and a caregiver check the entry shelf and coat hooks for a missing key ring.",
    structureRef: "ges_v2_lost_small_item",
    introducedParticipants: [],
    intellectualEncounter: null,
  };
}

test("Slice E v2 treats listed counterpart roles as alternatives without weakening legacy Pass A", () => {
  const input = firstWindowInput();
  const candidate = lostItemEpisode([
    SLICE_E_DEV_SUBJECT.provisionalThreadId,
    "person_e_caregiver_1",
  ]);

  assert.doesNotThrow(() => validateRichPassAEpisode(candidate, input));

  const legacyCandidate = structuredClone(candidate);
  delete legacyCandidate.intellectualEncounter;
  assert.throws(
    () => validateConsistentPassAEpisode(legacyCandidate, input),
    /without a participant in required role/,
  );

  assert.throws(
    () => validateRichPassAEpisode(
      lostItemEpisode([SLICE_E_DEV_SUBJECT.provisionalThreadId]),
      input,
    ),
    /without a participant in any allowed counterpart role/,
  );
});

test("rich runner accepts the originally failing lost-item shape with one valid counterpart", async () => {
  const input = firstWindowInput();
  const output = {
    episode: lostItemEpisode([
      SLICE_E_DEV_SUBJECT.provisionalThreadId,
      "person_e_caregiver_1",
    ]),
  };
  const adapter = {
    async invoke() {
      return {
        output: structuredClone(output),
        provenance: { provider: "test", modelId: "role-regression" },
      };
    },
  };

  const result = await generateRichPassAEpisode({
    adapter,
    input,
    clientRequestId: "slice-e-role-regression",
  });
  assert.equal(result.episode.structureRef, "ges_v2_lost_small_item");
  assert.deepEqual(result.episode.participantRefs, [
    SLICE_E_DEV_SUBJECT.provisionalThreadId,
    "person_e_caregiver_1",
  ]);
  assert.equal(result.calls.length, 1);
});
