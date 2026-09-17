import assert from "node:assert/strict";
import test from "node:test";

import { openStagingMeeting } from "./staging-meet.mjs";

test("a meeting enters and stays in the Thread's published scene", async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/snapshot")) {
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

  const meeting = await openStagingMeeting({ threadId:"thr_meeting_001", fetchImpl });
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
  assert.deepEqual(requests.slice(1).map(({ init }) => JSON.parse(init.body).situationId), [
    "sit_current_001",
    "sit_current_001",
  ], "every turn must stay in that scene");
});
