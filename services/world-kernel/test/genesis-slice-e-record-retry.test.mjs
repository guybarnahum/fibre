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

test("record-local structural rejection regenerates only that episode without exposing the rejected scene", async () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const plan = buildE2A0Plan(worldFixture, E2_A0_DEFAULT_SEEDS[0]);
  const item = plan.find(({ offeredEntries }) =>
    offeredEntries.some(({ structure }) => structure.structureId === "ges_v2_peer_joke_or_reference_missed"));
  assert.ok(item, "frozen E2-D1 schedule must expose peer_joke_or_reference_missed");

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

  const occurredAt = new Date(Date.parse(item.developmentalWindow.startAt) + (7 * 24 * 60 * 60 * 1000)).toISOString();
  const invalid = {
    episodeId: "episode_e2_record_retry_rejected",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[0].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId],
    observableAction: "The young person asks what a phrase means after hearing it used nearby.",
    structureRef: "ges_v2_peer_joke_or_reference_missed",
    introducedParticipants: [],
    intellectualEncounter: null,
  };
  const replacement = {
    ...structuredClone(invalid),
    episodeId: "episode_e2_record_retry_replacement",
    observableAction: "The young person checks the posted ferry timetable before walking back toward home.",
    structureRef: null,
  };

  const calls = [];
  let invocation = 0;
  const adapter = {
    async invoke(request) {
      calls.push(structuredClone(request));
      invocation += 1;
      return {
        output: invocation === 1 ? { episode: invalid } : { episode: replacement },
        provenance: { provider: "fixture", modelId: "record-retry-fixture" },
      };
    },
  };

  const retries = [];
  const result = await generateRichPassAEpisode({
    adapter,
    input,
    clientRequestId: "slice-e-record-retry",
    onRecordRetry: (retry) => retries.push(structuredClone(retry)),
  });

  assert.equal(result.episode.episodeId, replacement.episodeId);
  assert.equal(result.repairs.length, 0);
  assert.equal(result.recordRetries.length, 1);
  assert.equal(result.recordRetries[0].failedGate, "pass_a_structure_participation");
  assert.deepEqual(result.calls.map(({ kind }) => kind), ["initial", "record_retry"]);
  assert.equal(retries.length, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(Object.keys(calls[1].input).sort(), ["failedGate", "passAInput"]);
  assert.equal(calls[1].input.failedGate, "pass_a_structure_participation");
  assert.equal(calls[1].input.passAInput.subject.provisionalThreadId, worldFixture.subject.provisionalThreadId);
  const retrySerialized = JSON.stringify(calls[1].input);
  assert.equal(retrySerialized.includes(invalid.episodeId), false);
  assert.equal(retrySerialized.includes(invalid.observableAction), false);
});
