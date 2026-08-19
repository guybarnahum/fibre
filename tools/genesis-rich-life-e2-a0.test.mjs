import assert from "node:assert/strict";
import test from "node:test";

import {
  E2_A0_DEFAULT_SEEDS,
  E2_A0_EPISODES,
  E2_A0_STRUCTURES_PER_WINDOW,
  buildE2A0Plan,
  characterizeE2BetweenLifeParticularity,
} from "./genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

test("E2 A0 keeps the cleared ten-window nine-offer Pass-A protocol", () => {
  assert.equal(E2_A0_EPISODES, 10);
  assert.equal(E2_A0_STRUCTURES_PER_WINDOW, 9);
  assert.equal(E2_A0_DEFAULT_SEEDS.length, 3);

  for (const world of E2_DIAGNOSTIC_WORLDS) {
    const first = buildE2A0Plan(world, E2_A0_DEFAULT_SEEDS[0]);
    const second = buildE2A0Plan(world, E2_A0_DEFAULT_SEEDS[0]);
    assert.deepEqual(first, second);
    assert.equal(first.length, 10);
    for (const item of first) {
      assert.equal(item.offeredEntries.length, 9);
      assert.ok(item.offeredEntries.every(({ structure }) =>
        structure.developmentalRange.minAge <= item.developmentalWindow.minAge
        && structure.developmentalRange.maxAge >= item.developmentalWindow.maxAge));
    }
  }
});

test("E2 A0 between-life evidence reports exact pairwise structural overlap", () => {
  function episode({ id, placeRef, structureRef, participantRefs, sourceRef = null }) {
    return {
      episodeId: id,
      placeRef,
      structureRef,
      participantRefs,
      introducedParticipants: [],
      ...(sourceRef === null ? {} : { intellectualEncounter: { subjectRef: sourceRef } }),
    };
  }
  function life(seed, episodes) {
    return {
      seed,
      subject: { provisionalThreadId: `thr_${seed}` },
      initialRoster: [
        { participantId: `thr_${seed}`, factualRoles: ["subject"] },
        { participantId: "person_caregiver", factualRoles: ["caregiver"] },
        { participantId: "person_peer", factualRoles: ["peer"] },
      ],
      episodes,
    };
  }

  const result = characterizeE2BetweenLifeParticularity([
    life("a", [
      episode({ id: "a1", placeRef: "home", structureRef: "s1", participantRefs: ["thr_a", "person_caregiver"], sourceRef: "src_1" }),
      episode({ id: "a2", placeRef: "school", structureRef: "s2", participantRefs: ["thr_a", "person_peer"] }),
    ]),
    life("b", [
      episode({ id: "b1", placeRef: "home", structureRef: "s1", participantRefs: ["thr_b", "person_caregiver"], sourceRef: "src_1" }),
      episode({ id: "b2", placeRef: "library", structureRef: "s3", participantRefs: ["thr_b", "person_peer"] }),
    ]),
    life("c", [
      episode({ id: "c1", placeRef: "street", structureRef: "s4", participantRefs: ["thr_c", "person_peer"] }),
    ]),
  ]);

  assert.equal(result.pairCount, 3);
  const ab = result.pairs.find(({ leftSeed, rightSeed }) => leftSeed === "a" && rightSeed === "b");
  assert.equal(ab.placeRefs.value, 1 / 3);
  assert.deepEqual(ab.placeRefs.intersection, ["home"]);
  assert.equal(ab.participantRoles.value, 1);
  assert.equal(ab.structureRefs.value, 1 / 3);
  assert.equal(ab.intellectualSubjectRefs.value, 1);

  const ac = result.pairs.find(({ leftSeed, rightSeed }) => leftSeed === "a" && rightSeed === "c");
  assert.equal(ac.placeRefs.value, 0);
  assert.equal(ac.participantRoles.value, 1 / 2);
  assert.equal(ac.structureRefs.value, 0);
  assert.equal(ac.intellectualSubjectRefs.value, 0);
  assert.equal(result.admissionVerdict, null);
});
