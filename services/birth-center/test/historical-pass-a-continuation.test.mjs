import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createBirthCenterRuntime } from "../src/runtime.mjs";
import {
  continueRichPassAFromHistoricalState,
  inspectHistoricalPassAContinuation,
} from "../src/historical-pass-a-continuation.mjs";
import { buildH2Slot4Episode3RecoveryState } from "../../../tools/genesis/genesis-h2-recovery-state.mjs";

function fakeBaseAdapter(invoke) {
  return Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    configuration: Object.freeze({ transport: "test", temperature: 0, topP: 1, reasoningEffort: "none" }),
    invoke,
  });
}

function validRetryOutput() {
  return {
    output: {
      episode: {
        episodeId: "epi_thr_pr39_g2_03_0003",
        occurredAt: "2013-07-06T10:20:00Z",
        ageAtEvent: 8.9,
        placeRef: "place_g1v2_04_home",
        participantRefs: ["thr_pr39_g2_03", "person_g4_s04_cousin_1"],
        observableAction: "At home, the subject and older cousin pause their bottle-cap game, compare two possible scoring rules, agree that a goal counts when the cap crosses the doorway, and resume play using that rule.",
        structureRef: null,
        introducedParticipants: [],
        intellectualEncounter: null,
      },
    },
    provenance: {
      provider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      providerRequestId: "req_recovery_retry_2",
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    },
  };
}

test("H-v2 slot 4 recovery reconstructs exact history and resumes at record retry 2 without resetting budget", () => {
  const recovery = buildH2Slot4Episode3RecoveryState();
  assert.equal(recovery.slot, 4);
  assert.equal(recovery.threadId, "thr_pr39_g2_03");
  assert.equal(recovery.acceptedEpisodes.length, 2);
  assert.equal(recovery.episode3.state.generatedVersions, 3);
  assert.equal(recovery.episode3.state.formRepairs, 1);
  assert.equal(recovery.episode3.state.recordRetries, 1);
  assert.equal(recovery.episode3.inspection.currentGate, "pass_a_structure_participation");
  assert.equal(recovery.episode3.inspection.nextKind, "record_retry");
  assert.equal(recovery.episode3.inspection.nextOrdinal, 2);
  assert.equal(recovery.episode3.inspection.budgetDecision.allowed, true);

  const independentlyInspected = inspectHistoricalPassAContinuation({
    input: recovery.episode3.input,
    state: recovery.episode3.state,
  });
  assert.deepEqual(independentlyInspected, recovery.episode3.inspection);
});

test("Birth Center journals H-v2 retry 2 and restart replays it without another provider call", async (t) => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fibre-h2-recovery-birth-center-"));
  t.after(() => rmSync(stateRoot, { recursive: true, force: true }));
  const recovery = buildH2Slot4Episode3RecoveryState();
  const expectedRequestId = "pr39-h:slot-04:pass-a:episode-03:record-retry:2";

  const firstProviderCalls = [];
  const firstRuntime = createBirthCenterRuntime({ stateRoot });
  const firstAdapter = firstRuntime.durableAdapter(fakeBaseAdapter(async ({ clientRequestId }) => {
    firstProviderCalls.push(clientRequestId);
    assert.equal(clientRequestId, expectedRequestId);
    return validRetryOutput();
  }));

  const first = await continueRichPassAFromHistoricalState({
    adapter: firstAdapter,
    input: recovery.episode3.input,
    clientRequestId: "pr39-h:slot-04:pass-a:episode-03",
    state: recovery.episode3.state,
  });
  assert.deepEqual(firstProviderCalls, [expectedRequestId]);
  assert.equal(first.continuationCalls.length, 1);
  assert.equal(first.continuationCalls[0].kind, "record_retry");
  assert.equal(first.continuationCalls[0].recordRetryOrdinal, 2);
  assert.deepEqual(first.budgetState, { generatedVersions: 4, formRepairs: 1, recordRetries: 2 });

  const restartedProviderCalls = [];
  const restartedRuntime = createBirthCenterRuntime({ stateRoot });
  const restartedAdapter = restartedRuntime.durableAdapter(fakeBaseAdapter(async ({ clientRequestId }) => {
    restartedProviderCalls.push(clientRequestId);
    throw new Error(`provider must not be called for committed recovery invocation ${clientRequestId}`);
  }));
  const replayed = await continueRichPassAFromHistoricalState({
    adapter: restartedAdapter,
    input: recovery.episode3.input,
    clientRequestId: "pr39-h:slot-04:pass-a:episode-03",
    state: recovery.episode3.state,
  });
  assert.deepEqual(restartedProviderCalls, []);
  assert.equal(replayed.episodeDigest, first.episodeDigest);
  assert.deepEqual(replayed.episode, first.episode);
  assert.deepEqual(replayed.budgetState, first.budgetState);
});
