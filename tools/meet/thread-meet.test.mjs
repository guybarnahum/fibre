// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: thread-meet-enters-existing-life-with-bounded-random-selection

import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceThreadMeetState,
  parseThreadMeetArgs,
  selectMeetingThread,
} from "./thread-meet.mjs";

test("thread:meet allows explicit or random Thread selection with explicit environment", () => {
  assert.deepEqual(
    parseThreadMeetArgs(["--env","staging","--thread","thr_meet_001","-vv"]),
    { targetEnvironment:"staging", threadId:"thr_meet_001", verbosity:2 },
  );
  assert.deepEqual(
    parseThreadMeetArgs(["--env","staging","-vvv"]),
    { targetEnvironment:"staging", threadId:null, verbosity:3 },
  );
  assert.throws(
    () => parseThreadMeetArgs(["--thread","thr_meet_001"]),
    /--env <staging\|production> is required/,
  );
});

test("random meet selection excludes non-meetable Thread lifecycle states", () => {
  const selected=selectMeetingThread([
    { threadId:"thr_candidate", displayName:"Candidate", status:"genesis_candidate" },
    { threadId:"thr_retired", displayName:"Retired", status:"retired" },
    { threadId:"thr_frozen", displayName:"Frozen", status:"frozen" },
    { threadId:"thr_active", displayName:"Active", status:"active" },
  ],(length)=>{
    assert.equal(length,2,"random selection included a non-meetable Thread");
    return 1;
  });

  assert.equal(selected.threadId,"thr_active","random selection did not choose from the meetable World set");
});

test("thread:meet continuation follows admitted encounter history and stops when participation ends", () => {
  const accepted=advanceThreadMeetState({
    situationId:"sit_001",
    priorEncounterStoryId:null,
    terminal:false,
  },{
    outcome:"accepted",
    situationId:"sit_002",
    encounterStoryId:"story_001",
  });
  assert.deepEqual(accepted,{
    situationId:"sit_002",
    priorEncounterStoryId:"story_001",
    terminal:false,
  },"accepted meet turn did not advance admitted lived history");

  const declined=advanceThreadMeetState(accepted,{
    outcome:"decline",
    situationId:"sit_002",
  });
  assert.equal(declined.terminal,true,"declined participation kept a meeting session alive");
});
