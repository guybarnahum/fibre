import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../src/genesis-rich-life-domain.mjs";
import { generateRichPassAEpisode } from "../src/genesis-rich-pass-a-runner.mjs";
import { E2_A0_DEFAULT_SEEDS, buildE2A0Plan } from "../../../tools/genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "../../../tools/genesis-rich-life-e2-worlds.mjs";

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

function ageAt(bornAt, occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(bornAt)) / YEAR_MS;
}

function selectedPeerFixture() {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[0]);
  const item = plan.find(({ offeredEntries }) => {
    const ids = new Set(offeredEntries.map(({ structure }) => structure.structureId));
    return ids.has("ges_v2_peer_joke_or_reference_missed") && ids.has("ges_v2_adult_finishes_task_unasked");
  });
  assert.ok(item, "frozen E2-D1 schedule must expose both peer-joke and easier caregiver alternatives");

  const input = buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: worldFixture.worldSpec,
    subject: worldFixture.subject,
    developmentalWindow: item.developmentalWindow,
    chronologyEndsAt: item.developmentalWindow.endAt,
    initialRoster: worldFixture.initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: item.offeredEntries,
  });

  const selectedOpportunity = Object.freeze({
    selectionKind: "offered_structure",
    structureRef: "ges_v2_peer_joke_or_reference_missed",
  });
  const occurredAt = new Date(Date.parse(item.developmentalWindow.startAt) + (7 * 24 * 60 * 60 * 1000)).toISOString();
  return { worldFixture, input, selectedOpportunity, occurredAt };
}

test("selected peer opportunity cannot escape to an easier offered structure and may be realized by introducing a legal peer", async () => {
  const { worldFixture, input, selectedOpportunity, occurredAt } = selectedPeerFixture();
  const easierButWrong = {
    episodeId: "episode_e2_selected_wrong",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[0].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId, worldFixture.initialRoster[1].participantId],
    observableAction: "A caregiver takes over a small unfinished household task while the subject stands beside the table.",
    structureRef: "ges_v2_adult_finishes_task_unasked",
    introducedParticipants: [],
    intellectualEncounter: null,
  };
  const peerId = "person_e2_a2_new_peer";
  const realized = {
    episodeId: "episode_e2_selected_peer",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[1].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId, peerId],
    observableAction: "A newly met peer repeats a playground phrase, and the subject asks what the phrase refers to before the bell rings.",
    structureRef: "ges_v2_peer_joke_or_reference_missed",
    introducedParticipants: [{
      provisionalPersonId: peerId,
      roleRef: "peer",
      introducedAt: occurredAt,
    }],
    intellectualEncounter: null,
  };

  const calls = [];
  let invocation = 0;
  const adapter = {
    async invoke(request) {
      calls.push(structuredClone(request));
      invocation += 1;
      return {
        output: invocation === 1 ? { episode: easierButWrong } : { episode: realized },
        provenance: { provider: "fixture", modelId: "selected-opportunity-fixture" },
      };
    },
  };

  const retries = [];
  const result = await generateRichPassAEpisode({
    adapter,
    input,
    selectedOpportunity,
    clientRequestId: "slice-e-selected-opportunity",
    onRecordRetry: (retry) => retries.push(structuredClone(retry)),
  });

  assert.equal(result.episode.structureRef, selectedOpportunity.structureRef);
  assert.equal(result.episode.introducedParticipants.length, 1);
  assert.equal(result.episode.introducedParticipants[0].roleRef, "peer");
  assert.equal(result.recordRetries.length, 1);
  assert.equal(result.recordRetries[0].failedGate, "pass_a_selected_opportunity");
  assert.deepEqual(result.calls.map(({ kind }) => kind), ["initial", "record_retry"]);
  assert.equal(retries.length, 1);
  assert.deepEqual(Object.keys(calls[0].input).sort(), ["passAInput", "selectedOpportunity"]);
  assert.deepEqual(Object.keys(calls[1].input).sort(), ["failedGate", "passAInput", "selectedOpportunity"]);
  assert.deepEqual(calls[1].input.selectedOpportunity, selectedOpportunity);
  assert.equal(JSON.stringify(calls[1].input).includes(easierButWrong.observableAction), false);
});

test("A2 form repair preserves an invalid encounter until authoritative validation classifies it for record retry", async () => {
  const { worldFixture, input, selectedOpportunity, occurredAt } = selectedPeerFixture();
  const peerId = "person_e2_a2_retry_peer";
  const overlongAction = "A peer repeats a playground phrase while the subject asks what it means near the school yard. ".repeat(20);
  assert.ok(Buffer.byteLength(overlongAction, "utf8") > 1200);
  const invalid = {
    episodeId: "episode_e2_selected_invalid_encounter",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[1].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId, peerId],
    observableAction: overlongAction,
    structureRef: "ges_v2_peer_joke_or_reference_missed",
    introducedParticipants: [{
      provisionalPersonId: peerId,
      roleRef: "peer",
      introducedAt: occurredAt,
    }],
    intellectualEncounter: {
      kind: "conversation",
      subjectKind: "conversation",
      subjectLabel: "playground phrase exchange",
      participantRef: peerId,
      accessMode: "peer_mediated",
    },
  };
  const validRetry = {
    ...structuredClone(invalid),
    episodeId: "episode_e2_selected_valid_retry",
    observableAction: "A newly met peer repeats a different playground phrase, and the subject asks what it refers to before the bell rings.",
    intellectualEncounter: null,
  };

  const calls = [];
  const outputs = [
    { episode: invalid },
    { observableAction: "A newly met peer repeats a playground phrase, and the subject asks what it refers to before the bell rings." },
    { episode: validRetry },
  ];
  let index = 0;
  const adapter = {
    async invoke(request) {
      calls.push(structuredClone(request));
      return {
        output: outputs[index++],
        provenance: { provider: "fixture", modelId: "selected-opportunity-multidefect-fixture" },
      };
    },
  };

  const result = await generateRichPassAEpisode({
    adapter,
    input,
    selectedOpportunity,
    clientRequestId: "slice-e-selected-opportunity-multidefect",
  });

  assert.equal(result.repairs.length, 1);
  assert.equal(result.repairs[0].failedGate, "pass_a_observable_action_bounds");
  assert.equal(result.recordRetries.length, 1);
  assert.equal(result.recordRetries[0].failedGate, "pass_a_intellectual_encounter");
  assert.deepEqual(result.calls.map(({ kind }) => kind), ["initial", "record_repair", "record_retry"]);
  assert.equal(result.episode.episodeId, validRetry.episodeId);
  assert.equal(result.episode.structureRef, selectedOpportunity.structureRef);
  assert.equal(result.episode.introducedParticipants[0].roleRef, "peer");
  assert.equal(result.episode.intellectualEncounter, undefined);
  assert.deepEqual(Object.keys(calls[2].input).sort(), ["failedConstraint", "failedGate", "passAInput", "selectedOpportunity"]);
  assert.equal(calls[2].input.failedGate, "pass_a_intellectual_encounter");
  assert.deepEqual(calls[2].input.failedConstraint, {
    rule: "intellectualEncounter.subjectPersonRef identifies the encountered subject only when subjectKind=person; otherwise subjectPersonRef must be null. A person who merely mediates access to a text, path, practice, idea, event, artwork, community, or other non-person subject belongs in episode.participantRefs instead.",
  });
  const retrySerialized = JSON.stringify(calls[2].input);
  assert.equal(retrySerialized.includes(invalid.episodeId), false);
  assert.equal(retrySerialized.includes(overlongAction), false);
  assert.equal(retrySerialized.includes(invalid.intellectualEncounter.subjectLabel), false);
  assert.deepEqual(calls[2].input.selectedOpportunity, selectedOpportunity);
});

test("selected present-required retry exposes the validator participantRefs representation contract", async () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[1]);
  const item = plan.find(({ offeredEntries }) => offeredEntries.some(({ structure }) => structure.structureId === "ges_v2_drawing_or_making_seen"));
  assert.ok(item, "frozen E2-D1 schedule must offer drawing_or_making_seen");
  const input = buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: worldFixture.worldSpec,
    subject: worldFixture.subject,
    developmentalWindow: item.developmentalWindow,
    chronologyEndsAt: item.developmentalWindow.endAt,
    initialRoster: worldFixture.initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: item.offeredEntries,
  });
  const selectedOpportunity = Object.freeze({ selectionKind: "offered_structure", structureRef: "ges_v2_drawing_or_making_seen" });
  const occurredAt = new Date(Date.parse(item.developmentalWindow.startAt) + (7 * 24 * 60 * 60 * 1000)).toISOString();
  const caregiver = worldFixture.initialRoster.find((participant) => participant.factualRoles.includes("caregiver"));
  assert.ok(caregiver);
  const invalid = {
    episodeId: "episode_e2_selected_drawing_no_counterpart",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[0].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId],
    observableAction: "The subject leaves an unfinished drawing on the table and looks over one penciled corner.",
    structureRef: selectedOpportunity.structureRef,
    introducedParticipants: [],
    intellectualEncounter: null,
  };
  const valid = {
    ...structuredClone(invalid),
    episodeId: "episode_e2_selected_drawing_with_counterpart",
    participantRefs: [worldFixture.subject.provisionalThreadId, caregiver.participantId],
    observableAction: "A caregiver notices the unfinished drawing and points to one line that stops short of the drawn doorway.",
  };
  const calls = [];
  let index = 0;
  const outputs = [{ episode: invalid }, { episode: valid }];
  const adapter = {
    async invoke(request) {
      calls.push(structuredClone(request));
      return { output: outputs[index++], provenance: { provider: "fixture", modelId: "selected-structure-retry-fixture" } };
    },
  };
  const result = await generateRichPassAEpisode({
    adapter,
    input,
    selectedOpportunity,
    clientRequestId: "slice-e-selected-structure-participation",
  });
  assert.equal(result.recordRetries.length, 1);
  assert.equal(result.recordRetries[0].failedGate, "pass_a_structure_participation");
  assert.equal(result.episode.episodeId, valid.episodeId);
  assert.deepEqual(Object.keys(calls[1].input).sort(), ["failedConstraint", "failedGate", "passAInput", "selectedOpportunity"]);
  assert.deepEqual(calls[1].input.failedConstraint, {
    rule: "The frozen selected opportunity has counterpartMode=present_required. The validator counts an allowed counterpart only when that participant's ID appears in episode.participantRefs; mentioning a caregiver, peer, teacher, or other counterpart only in observableAction does not satisfy the gate. Use a known participant from passAInput.initialRoster or passAInput.previouslyIntroducedParticipants whose role matches participatingRoles, and include that participant ID in episode.participantRefs. Or, when legal, introduce an allowed-role participant in episode.introducedParticipants and include the same provisionalPersonId in episode.participantRefs.",
    counterpartMode: "present_required",
    participatingRoles: ["peer", "caregiver", "teacher"],
    participantRefsRequired: true,
    sameEpisodeIntroductionAllowed: true,
    sameEpisodeIntroductionParticipantRefRequired: true,
  });
  assert.ok(calls[1].input.passAInput.initialRoster.some((participant) =>
    participant.participantId === caregiver.participantId && participant.factualRoles.includes("caregiver")));
  const retrySerialized = JSON.stringify(calls[1].input);
  assert.equal(retrySerialized.includes(invalid.episodeId), false);
  assert.equal(retrySerialized.includes(invalid.observableAction), false);
});
