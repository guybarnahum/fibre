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
        present:{
          situationId: "sit_reconciled_now",
          establishedAt: "2026-09-21T03:40:00Z",
          phase: "at_place",
          location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
          mediatedContext:null,
          activity: "meeting Inside Fibre visitors",
          reason:null,
          participants:[],
          depictionMediaId:"media_present_reconciled_now",
        },
        availability:{
          startAt:"2026-09-21T03:00:00Z",
          endAt:"2026-09-21T04:00:00Z",
          situationId:"sit_reconciled_now",
          commitmentId:"work_private_001",
          planId:"lplan_private_001",
          compensation:{ fibreCredits:12 },
        },
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
  const body = await response.json();
  assert.deepEqual(body.currentPresent, {
    payload: {
      situationId: "sit_reconciled_now",
      establishedAt: "2026-09-21T03:40:00Z",
      phase: "at_place",
      location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
      mediatedContext:null,
      activity: "meeting Inside Fibre visitors",
      reason:null,
      participants:[],
      depictionMediaId:"media_present_reconciled_now",
    },
  }, "meeting entry should expose the scene produced by reconciliation, not the stale prior projection");
  assert.deepEqual(body.livedScene, {
    sceneVersion:"inside-fibre-lived-scene-v0.1",
    situationId:"sit_reconciled_now",
    establishedAt:"2026-09-21T03:40:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
    activity:"meeting Inside Fibre visitors",
    participants:[],
    depictionMediaId:"media_present_reconciled_now",
    encounterAvailability:{
      kind:"inside_fibre_visitor_availability",
      startAt:"2026-09-21T03:00:00Z",
      endAt:"2026-09-21T04:00:00Z",
    },
  }, "meeting entry should compose one public lived moment");
  assert.deepEqual(body.availability, {
    startAt:"2026-09-21T03:00:00Z",
    endAt:"2026-09-21T04:00:00Z",
  }, "public meeting entry should expose only the bounded availability window");
  const publicJson = JSON.stringify(body);
  assert.equal(publicJson.includes("work_private_001"), false,
    "public meeting entry must not expose the work commitment identity");
  assert.equal(publicJson.includes("fibreCredits"), false,
    "public meeting entry must not expose compensation");
  assert.equal(publicJson.includes("lplan_private_001"), false,
    "public meeting entry must not expose the governing plan");
});



test("meeting entry preserves visitor unavailability instead of calling it a LivedNow failure", async () => {
  const api = createPublicEncounterApi({
    viewerOrigin:"https://insidefibre.com",
    ensurePublicPresent:async () => {
      const error = new Error("thread_meeting_unavailable");
      error.status = 409;
      error.body = { error:"thread_meeting_unavailable" };
      throw error;
    },
    readPublicPresent:async () => null,
    encounter:async () => { throw new Error("encounter must not run"); },
  });

  const response = await api.fetch(new Request(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/meet`,
    { method:"POST", headers:{ Origin:"https://insidefibre.com" } },
  ));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error:"thread_meeting_unavailable" },
    "pre-window visitor unavailability was mislabeled as a LivedNow failure");
});
