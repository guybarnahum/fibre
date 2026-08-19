import assert from "node:assert/strict";
import test from "node:test";

import { buildRichLifePassAInput, projectRichLifePassAInputForCognition } from "../src/genesis-rich-life-domain.mjs";
import { assertRichStructureParticipation } from "../src/genesis-rich-life-episode.mjs";
import {
  richCounterpartMode,
  richCounterpartPolicyWitness,
} from "../src/genesis-rich-participation-policy.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../src/genesis-event-structure-pool-v2.mjs";
import {
  E2_A0_DEFAULT_SEEDS,
  buildE2A0Plan,
} from "../../../tools/genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "../../../tools/genesis-rich-life-e2-worlds.mjs";

function participationInput(structureId, participatingRoles, knownRoles = ["subject"]) {
  return {
    offeredStructures: [{ structureId, participatingRoles }],
    initialRoster: knownRoles.map((role, index) => ({
      participantId: index === 0 ? "thr_subject" : `person_${role}_${index}`,
      factualRoles: [role],
    })),
    previouslyIntroducedParticipants: [],
  };
}

function subjectOnlyEpisode(structureId) {
  return {
    episodeId: `episode_${structureId}`,
    structureRef: structureId,
    participantRefs: ["thr_subject"],
    introducedParticipants: [],
  };
}

test("rich counterpart modes make self-directed affordances truthful without weakening counterpart-required structures", () => {
  assert.equal(richCounterpartMode("ges_v2_choose_text_self_directed"), "present_optional");
  assert.equal(richCounterpartMode("ges_v2_scientific_claim_test"), "present_optional");
  assert.equal(richCounterpartMode("ges_v2_religious_or_philosophical_text"), "present_optional");
  assert.equal(richCounterpartMode("ges_v2_mentor_absence_or_unavailability"), "known_required");
  assert.equal(richCounterpartMode("ges_v2_peer_joke_or_reference_missed"), "present_required");
  assert.match(richCounterpartPolicyWitness().digest, /^sha256:[0-9a-f]{64}$/);

  assert.doesNotThrow(() => assertRichStructureParticipation(
    subjectOnlyEpisode("ges_v2_choose_text_self_directed"),
    participationInput("ges_v2_choose_text_self_directed", ["librarian", "teacher", "peer"]),
  ));

  assert.throws(() => assertRichStructureParticipation(
    subjectOnlyEpisode("ges_v2_peer_joke_or_reference_missed"),
    participationInput("ges_v2_peer_joke_or_reference_missed", ["peer"]),
  ), /without a participant in any allowed counterpart role/);

  assert.doesNotThrow(() => assertRichStructureParticipation(
    subjectOnlyEpisode("ges_v2_mentor_absence_or_unavailability"),
    participationInput("ges_v2_mentor_absence_or_unavailability", ["mentor", "teacher"], ["subject", "teacher"]),
  ));
  assert.throws(() => assertRichStructureParticipation(
    subjectOnlyEpisode("ges_v2_mentor_absence_or_unavailability"),
    participationInput("ges_v2_mentor_absence_or_unavailability", ["mentor", "teacher"]),
  ), /without a previously known counterpart/);

  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[0]);
  const chooseTextWindow = plan.find(({ offeredEntries }) =>
    offeredEntries.some(({ structure }) => structure.structureId === "ges_v2_choose_text_self_directed"));
  assert.ok(chooseTextWindow, "frozen E2-D1 A0 schedule must expose choose_text_self_directed");
  const input = buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: worldFixture.worldSpec,
    subject: worldFixture.subject,
    developmentalWindow: chooseTextWindow.developmentalWindow,
    chronologyEndsAt: chooseTextWindow.developmentalWindow.endAt,
    initialRoster: worldFixture.initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: chooseTextWindow.offeredEntries,
  });
  const cognition = projectRichLifePassAInputForCognition(input);
  const projected = cognition.offeredStructures.find(({ structureId }) => structureId === "ges_v2_choose_text_self_directed");
  assert.equal(projected.counterpartMode, "present_optional");
  assert.equal(cognition.offeredStructures.every(({ counterpartMode }) =>
    ["present_required", "present_optional", "known_required"].includes(counterpartMode)), true);
});
