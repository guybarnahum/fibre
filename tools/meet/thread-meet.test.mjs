import assert from "node:assert/strict";
import test from "node:test";

import { openThreadMeeting } from "./thread-meet.mjs";

test("a meeting enters and stays in the Thread's published scene", async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/meet")) {
      assert.equal(init.method, "POST");
      return Response.json({
        currentPresent:{ payload:{
          situationId:"sit_current_001",
          establishedAt:"2026-09-17T18:00:00Z",
          phase:"at_place",
          location:{ kind:"place", place:{ displayName:"Mission Dolores Park", region:"San Francisco" } },
          mediatedContext:"late afternoon in the park",
          activity:"sketching people on the lawn",
          reason:"taking a break after work",
          participants:["Mara"],
        } },
      });
    }
    return Response.json({ situationId:"sit_current_001", responseText:"I am still here." });
  };

  const meeting = await openThreadMeeting({
    threadId:"thr_meeting_001",
    baseUrl:"https://fibre.example",
    fetchImpl,
  });
  await meeting.say("What are you doing?");
  await meeting.say("Tell me more.");

  assert.deepEqual(meeting.scene, {
    establishedAt:"2026-09-17T18:00:00Z",
    phase:"at_place",
    location:"Mission Dolores Park, San Francisco",
    activity:"sketching people on the lawn",
    reason:"taking a break after work",
    mediatedContext:"late afternoon in the park",
    participants:["Mara"],
  }, "meeting must expose the published scene");
  assert.equal(requests[0].url, "https://fibre.example/api/threads/thr_meeting_001/meet", "meeting must reconcile before reading a scene");
  assert.deepEqual(requests.slice(1).map(({ init }) => JSON.parse(init.body).situationId), [
    "sit_current_001",
    "sit_current_001",
  ], "every turn must stay in that scene");
});
