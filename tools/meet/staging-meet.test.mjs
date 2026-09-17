import assert from "node:assert/strict";
import test from "node:test";

import { openStagingMeeting } from "./staging-meet.mjs";

test("a meeting stays in the Thread's published situation", async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/snapshot")) {
      return Response.json({ currentPresent:{ payload:{ situationId:"sit_current_001" } } });
    }
    return Response.json({ situationId:"sit_current_001", responseText:"I am still here." });
  };

  const meeting = await openStagingMeeting({ threadId:"thr_meeting_001", fetchImpl });
  await meeting.say("What are you doing?");
  await meeting.say("Bye");

  assert.equal(meeting.situationId, "sit_current_001", "meeting must enter the published situation");
  assert.deepEqual(requests.slice(1).map(({ init }) => JSON.parse(init.body).situationId), [
    "sit_current_001",
    "sit_current_001",
  ], "every turn must remain in the published situation");
});
