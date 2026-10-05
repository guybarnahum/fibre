import assert from "node:assert/strict";
import test from "node:test";

import { openThreadMeeting } from "./thread-meet.mjs";

test("a meeting starts from the public current life and stays bound to its situation", async () => {
  const requests = [];
  const currentPresent = {
    presentVersion:"thread-public-present-v0.1",
    situationId:"sit_current_001",
    establishedAt:"2026-09-17T18:00:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Mission Dolores Park", region:"San Francisco" } },
    activity:"sketching people on the lawn",
    participants:["Mara"],
    depictionMediaId:"media_present_current_001",
  };

  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/present")) {
      assert.equal(init.method ?? "GET", "GET");
      return Response.json({
        currentPresent:{ payload:currentPresent },
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

  assert.deepEqual(meeting.scene, currentPresent, "meeting should consume Presentation's public current life");
  assert.equal(requests[0].url, "https://fibre.example/api/threads/thr_meeting_001/present", "meeting must begin from current life");
  assert.deepEqual(requests.slice(1).map(({ init }) => JSON.parse(init.body).situationId), [
    "sit_current_001",
    "sit_current_001",
  ], "every turn must stay in that lived situation");
});
