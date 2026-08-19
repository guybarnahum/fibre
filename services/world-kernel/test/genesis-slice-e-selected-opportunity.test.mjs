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
  assert.deepEqual(Object.keys(calls[2].input).sort(), ["failedGate", "passAInput", "selectedOpportunity"]);
  const retrySerialized = JSON.stringify(calls[2].input);
  assert.equal(retrySerialized.includes(invalid.episodeId), false);
  assert.equal(retrySerialized.includes(overlongAction), false);
  assert.deepEqual(calls[2].input.selectedOpportunity, selectedOpportunity);
});
