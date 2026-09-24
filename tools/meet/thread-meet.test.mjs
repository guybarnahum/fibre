import assert from "node:assert/strict";
import test from "node:test";

import { openThreadMeeting } from "./thread-meet.mjs";

test("a meeting consumes one public lived scene and stays bound to its situation", async () => {
  const requests = [];
  const livedScene = {
    sceneVersion:"inside-fibre-lived-scene-v0.1",
    situationId:"sit_current_001",
    establishedAt:"2026-09-17T18:00:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Mission Dolores Park", region:"San Francisco" } },
    activity:"sketching people on the lawn",
    participants:["Mara"],
    depictionMediaId:"media_present_current_001",
    encounterAvailability:{
      kind:"inside_fibre_visitor_availability",
      startAt:"2026-09-17T17:30:00Z",
      endAt:"2026-09-17T18:30:00Z",
    },
  };

  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/meet")) {
      assert.equal(init.method, "POST");
      return Response.json({
        currentPresent:{ payload:{
          situationId:"sit_current_001",
          establishedAt:"2026-09-17T18:00:00Z",
        } },
        livedScene,
        availability:{
          startAt:"2026-09-17T17:30:00Z",
          endAt:"2026-09-17T18:30:00Z",
        },
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

  assert.deepEqual(meeting.scene, livedScene, "meeting should consume Presentation's public lived-scene projection");
  assert.equal(requests[0].url, "https://fibre.example/api/threads/thr_meeting_001/meet", "meeting must reconcile before entering the scene");
  assert.deepEqual(requests.slice(1).map(({ init }) => JSON.parse(init.body).situationId), [
    "sit_current_001",
    "sit_current_001",
  ], "every turn must stay in that lived situation");
});
