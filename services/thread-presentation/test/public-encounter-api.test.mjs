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
    ensurePublicPresent: async () => ({ situationId: SITUATION_ID }),
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
    ensurePublicPresent: async () => ({ situationId: SITUATION_ID }),
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


test("N4 meeting entry reconciles LivedNow before exposing the scene", async () => {
  const order = [];
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    ensurePublicPresent: async (threadId) => {
      order.push(`ensure:${threadId}`);
      return {
        situationId: "sit_reconciled_now",
        establishedAt: "2026-09-21T03:40:00Z",
        phase: "at_place",
        activity: "walking home",
      };
    },
    readPublicPresent: async () => {
      order.push("read");
      return { situationId: "sit_old" };
    },
    encounter: async () => {
      order.push("encounter");
      throw new Error("meeting entry must not start the encounter");
    },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/meet`,
    {
      method: "POST",
      headers: { Origin: "https://insidefibre.com" },
    },
  ));
  assert.equal(response.status, 200);
  assert.deepEqual(order, [`ensure:${THREAD_ID}`]);
  assert.deepEqual(await response.json(), {
    currentPresent: {
      payload: {
        situationId: "sit_reconciled_now",
        establishedAt: "2026-09-21T03:40:00Z",
        phase: "at_place",
        activity: "walking home",
      },
    },
  }, "meeting entry should expose the scene produced by reconciliation, not the stale prior projection");
});


test("N4 meeting entry preserves safe World coverage detail on 409", async () => {
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    readPublicPresent: async () => null,
    ensurePublicPresent: async () => {
      const error = new Error("lived_now_unavailable");
      error.status = 409;
      error.body = {
        error: "lived_now_unavailable",
        detail: "Initial LivedNow requires the canonical Thread birth event",
      };
      throw error;
    },
    encounter: async () => { throw new Error("not reached"); },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/meet`,
    {
      method: "POST",
      headers: { Origin: "https://insidefibre.com" },
    },
  ));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "lived_now_unavailable",
    detail: "Initial LivedNow requires the canonical Thread birth event",
  });
});


test("N4 meeting entry preserves safe World reconciliation code on 503", async () => {
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    readPublicPresent: async () => null,
    ensurePublicPresent: async () => {
      const error = new Error("lived_now_reconciliation_failed");
      error.status = 503;
      error.body = {
        error: "lived_now_reconciliation_failed",
        code: "MODEL_REQUEST_CONFIGURATION_ERROR",
      };
      throw error;
    },
    encounter: async () => { throw new Error("not reached"); },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/meet`,
    {
      method: "POST",
      headers: { Origin: "https://insidefibre.com" },
    },
  ));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "lived_now_unavailable",
    code: "MODEL_REQUEST_CONFIGURATION_ERROR",
  });
});


test("N4 meeting entry carries safe schema reconciliation detail on 503", async () => {
  const api = createPublicEncounterApi({
    viewerOrigin: "https://insidefibre.com",
    readPublicPresent: async () => null,
    ensurePublicPresent: async () => {
      const error = new Error("lived_now_reconciliation_failed");
      error.status = 503;
      error.body = {
        error: "lived_now_reconciliation_failed",
        code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
        detail: "OpenAI model output violates Fibre canonical response schema at $.stops[0].activity: string length 0 is below minLength 1",
      };
      throw error;
    },
    encounter: async () => { throw new Error("not reached"); },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/meet`,
    {
      method: "POST",
      headers: { Origin: "https://insidefibre.com" },
    },
  ));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "lived_now_unavailable",
    code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
    detail: "OpenAI model output violates Fibre canonical response schema at $.stops[0].activity: string length 0 is below minLength 1",
  });
});
