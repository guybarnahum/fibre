import assert from "node:assert/strict";
import test from "node:test";
import { createPublicEncounterApi } from "../src/http/encounter-api.mjs";

const THREAD_ID = "thr_a5_public";
const SITUATION_ID = "sit_a5_public";

function request(body) {
  return new Request(`https://api.insidefibre.com/api/threads/${THREAD_ID}/encounter`, {
    method: "POST",
    headers: { "content-type": "application/json", Origin: "https://insidefibre.com" },
    body: JSON.stringify(body),
  });
}

test("A5 public encounter passes only an utterance against the already-published situation", async () => {
  let forwarded = null;
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    now: () => "2026-09-11T00:05:00Z",
    readPublicPresent: async () => ({ situationId: SITUATION_ID }),
    encounter: async (input) => {
      forwarded = structuredClone(input);
      return { situationId: SITUATION_ID, responseText: "Hi." };
    },
  });
  const response = await api.fetch(request({ situationId: SITUATION_ID, utterance: "Hello" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { situationId: SITUATION_ID, responseText: "Hi." });
  assert.deepEqual(forwarded, {
    threadId: THREAD_ID,
    expectedSituationId: SITUATION_ID,
    utterance: "Hello",
    occurredAt: "2026-09-11T00:05:00Z",
  });
});

test("A5 public encounter rejects visitor-authored life and stale public scenes", async () => {
  let calls = 0;
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    readPublicPresent: async () => ({ situationId: SITUATION_ID }),
    encounter: async () => { calls += 1; return { situationId: SITUATION_ID, responseText: "Hi." }; },
  });

  const authored = await api.fetch(request({
    situationId: SITUATION_ID,
    utterance: "Hello",
    currentSituation: { activity: "Talking to me now" },
  }));
  assert.equal(authored.status, 400);

  const stale = await api.fetch(request({ situationId: "sit_old", utterance: "Hello" }));
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error, "encounter_scene_changed");
  assert.equal(calls, 0);
});
