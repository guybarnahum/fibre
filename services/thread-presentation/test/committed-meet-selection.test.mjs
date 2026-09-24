import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMITTED_MEET_SELECTION_POLICY,
  selectCommittedAvailableThread,
} from "../src/committed-meet-selection.mjs";

test("Meet selection skips public Threads who are not actually committed and available", async () => {
  const candidates = [
    { threadId:"thr_public_but_unavailable", displayName:"Ari" },
    { threadId:"thr_committed_available", displayName:"Mira" },
  ];
  const attempted = [];

  const result = await selectCommittedAvailableThread({
    requestUrl:"https://api.insidefibre.com/api/threads/meet?seed=demo",
    async selectCandidate(url) {
      const excluded = new Set(url.searchParams.getAll("exclude"));
      const thread = candidates.find((candidate) => !excluded.has(candidate.threadId)) ?? null;
      return {
        thread,
        selection:{
          policyVersion:"thread-meet-v0.1",
          seed:"demo",
          eligibleCount:candidates.filter((candidate) => !excluded.has(candidate.threadId)).length,
        },
      };
    },
    async admitCandidate(threadId) {
      attempted.push(threadId);
      if (threadId === "thr_public_but_unavailable") return null;
      return {
        present:{
          situationId:"sit_committed_now",
          establishedAt:"2026-09-23T18:20:00Z",
          phase:"at_place",
          location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
          mediatedContext:null,
          activity:"Meeting Inside Fibre visitors.",
          reason:null,
          participants:[],
          depictionMediaId:"media_present_committed_now",
        },
        availability:{
          threadId,
          commitmentId:"work_private_001",
          startAt:"2026-09-23T18:00:00Z",
          endAt:"2026-09-23T19:00:00Z",
          mediatedContext:"insidefibre:visitor-work",
          situationId:"sit_committed_now",
          planId:"lplan_private_001",
          compensation:{ fibreCredits:12 },
        },
      };
    },
  });

  assert.deepEqual(attempted, [
    "thr_public_but_unavailable",
    "thr_committed_available",
  ], "Meet should keep searching after a public Thread is unavailable");
  assert.equal(result.thread.threadId, "thr_committed_available",
    "Meet should return a Thread whose current World state admits the visitor");
  assert.equal(result.currentPresent.payload.situationId, "sit_committed_now");
  assert.deepEqual(result.livedScene, {
    sceneVersion:"inside-fibre-lived-scene-v0.1",
    situationId:"sit_committed_now",
    establishedAt:"2026-09-23T18:20:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
    activity:"Meeting Inside Fibre visitors.",
    participants:[],
    depictionMediaId:"media_present_committed_now",
    encounterAvailability:{
      kind:"inside_fibre_visitor_availability",
      startAt:"2026-09-23T18:00:00Z",
      endAt:"2026-09-23T19:00:00Z",
    },
  }, "Meet should return one public lived moment");
  assert.deepEqual(result.availability, {
    startAt:"2026-09-23T18:00:00Z",
    endAt:"2026-09-23T19:00:00Z",
  });
  assert.equal(result.availabilityPolicyVersion, COMMITTED_MEET_SELECTION_POLICY);

  const publicJson = JSON.stringify(result);
  assert.equal(publicJson.includes("work_private_001"), false,
    "Directory selection must not expose the private work commitment");
  assert.equal(publicJson.includes("fibreCredits"), false,
    "Directory selection must not expose work compensation");
});

test("Meet selection returns nobody when no public candidate is currently available", async () => {
  const result = await selectCommittedAvailableThread({
    requestUrl:"https://api.insidefibre.com/api/threads/meet",
    async selectCandidate(url) {
      const excluded = new Set(url.searchParams.getAll("exclude"));
      const thread = excluded.has("thr_alice")
        ? null
        : { threadId:"thr_alice", displayName:"Alice" };
      return { thread, selection:{ policyVersion:"thread-meet-v0.1", eligibleCount:thread ? 1 : 0 } };
    },
    async admitCandidate() { return null; },
  });

  assert.equal(result.thread, null,
    "Meet should not offer a Thread merely because the Thread has public Presentation");
  assert.equal(result.currentPresent, null);
  assert.equal(result.livedScene, null);
  assert.equal(result.availability, null);
});
