import assert from "node:assert/strict";
import test from "node:test";
import { createLivedEncounterWriteApi } from "../src/lived-encounter-write-api.mjs";

const thread = {
  threadId: "thr_a5_bridge",
  identity: { selfDescription: "I am here already." },
  currentState: { selfModel: "I am drawing.", unresolvedIntentions: [] },
};
const situation = {
  situationId: "sit_a5_bridge",
  threadId: thread.threadId,
  establishedAt: "2026-09-11T00:00:00Z",
};

function api({ modelCalls = [], activityRecorder = null } = {}) {
  return createLivedEncounterWriteApi({
    privateToken: "private-token-a5-bridge",
    worldReader: { getThread: () => structuredClone(thread) },
    livedNowStore: { getCurrentSituation: () => structuredClone(situation) },
    semanticStateStore: { listCurrentState: () => [] },
    activityRecorder,
    modelAdapter: {
      async invoke(input) {
        modelCalls.push(input);
        return {
          output: { responseText: "Hi." },
          provenance: { provider: "fixture", modelId: "fixture-a5", providerRequestId: "req_a5" },
        };
      },
    },
  });
}

function request(body) {
  return new Request("https://world.internal/internal/lived-encounter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-fibre-private-token": "private-token-a5-bridge" },
    body: JSON.stringify(body),
  });
}

test("A5 private encounter bridge requires the public scene to still be the World-owned scene", async () => {
  const modelCalls = [];
  const response = await api({ modelCalls }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: "sit_stale_public_scene",
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "encounter_scene_changed");
  assert.equal(modelCalls.length, 0, "stale public reality must be rejected before cognition");
});

test("A5 private encounter bridge exposes speech but keeps cognition grounded in World-owned life", async () => {
  const modelCalls = [];
  const response = await api({ modelCalls }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: situation.situationId,
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.responseText, "Hi.");
  assert.equal(body.result.grounding.situationId, situation.situationId);
  assert.equal(modelCalls.length, 1);
});

test("A5 Activity Log exposes encounter causality without copying private speech", async () => {
  const stages = [];
  const activityRecorder = {
    async runStage(metadata, operation) {
      stages.push(structuredClone(metadata));
      return operation();
    },
  };
  const utterance = "This is private visitor speech.";
  const response = await api({ activityRecorder }).fetch(request({
    threadId: thread.threadId,
    expectedSituationId: situation.situationId,
    utterance,
    occurredAt: "2026-09-11T00:05:00Z",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(stages, [{
    threadId: thread.threadId,
    correlationId: situation.situationId,
    stage: "encounter.cognition.respond",
  }]);
  assert.equal(JSON.stringify(stages).includes(utterance), false,
    "operator telemetry should identify the lived encounter without becoming a copy of it");
});
