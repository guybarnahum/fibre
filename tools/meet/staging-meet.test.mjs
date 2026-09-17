import assert from "node:assert/strict";
import test from "node:test";

import { meetStagingThread } from "./staging-meet.mjs";

test("a staging meeting enters the Thread's published situation", async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url:String(url), init });
    if (String(url).endsWith("/snapshot")) {
      return Response.json({ currentPresent:{ payload:{ situationId:"sit_current_001" } } });
    }
    return Response.json({ situationId:"sit_current_001", responseText:"I am still here." });
  };

  const result = await meetStagingThread({
    threadId:"thr_meeting_001",
    utterance:"What are you doing?",
    fetchImpl,
  });

  assert.equal(result.situationId, "sit_current_001", "meeting must stay in the published situation");
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    situationId:"sit_current_001",
    utterance:"What are you doing?",
  });
});
