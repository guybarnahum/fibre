// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: thread-meet-enters-existing-life-with-bounded-random-selection

import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";

import {
  advanceThreadMeetState,
  createMeetInputReader,
  parseThreadMeetArgs,
  readLiveEncounterEvents,
  selectMeetingThread,
} from "./thread-meet.mjs";

test("thread:meet allows explicit or random Thread selection with explicit environment", () => {
  assert.deepEqual(
    parseThreadMeetArgs(["--env","staging","--thread","thr_meet_001","-vv"]),
    { targetEnvironment:"staging", threadId:"thr_meet_001", verbosity:2, live:false },
  );
  assert.deepEqual(
    parseThreadMeetArgs(["--env","staging","-vvv"]),
    { targetEnvironment:"staging", threadId:null, verbosity:3, live:false },
  );
  assert.equal(parseThreadMeetArgs(["--env","staging","--live"]).live,true);
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

test("live CLI preserves actual audible speech and a single World admission across fragmented transport",async()=>{
  const frames=[
    'event: speech_delta\ndata: {"actorId":"thr_meet_001","text":"I can help."}\n\n',
    'event: scene_changed\ndata: {"currentSituationId":"sit_elsewhere"}\n\n',
    'event: speech_end\ndata: {"actorId":"thr_meet_001","completion":"interrupted"}\n\n',
    'event: result\ndata: {"outcome":"accepted","situationId":"sit_001","currentSituationId":"sit_elsewhere","encounterStoryId":"story_spoken","responseText":"I can help.","completion":"interrupted"}\n\n',
  ].join("");
  const encoder=new TextEncoder();
  const encoded=encoder.encode(frames);
  const stream=new ReadableStream({
    start(controller){
      for(let i=0;i<encoded.length;i+=7)controller.enqueue(encoded.slice(i,i+7));
      controller.close();
    },
  });
  const observed=[];
  const result=await readLiveEncounterEvents(stream,(type,event)=>{
    observed.push({type,event});
  });
  assert.deepEqual(observed.filter(({type})=>type==="speech_delta")
    .map(({event})=>event.text),["I can help."],
    "live transport lost an actually audible sentence");
  assert.equal(observed.some(({type})=>type==="scene_changed"),true,
    "World movement disappeared from the live visitor's perception");
  assert.equal(result.encounterStoryId,"story_spoken",
    "live CLI discarded the objective Story admitted by World");
  assert.equal(result.completion,"interrupted",
    "live CLI treated a World-interrupted person as an ordinary completed turn");
  assert.deepEqual(advanceThreadMeetState({
    situationId:"sit_001",priorEncounterStoryId:null,terminal:false,
  },result),{
    situationId:"sit_elsewhere",
    priorEncounterStoryId:"story_spoken",
    terminal:true,
  },"live CLI carried a departed scene into the next request");
});

test("a scripted visitor keeps every utterance across slow World replies and exits cleanly at EOF",async()=>{
  const input=new PassThrough();
  const output=new PassThrough();
  const {terminal,next}=createMeetInputReader({input,output});

  input.end("Hi there! Got a minute?\\nWhat are you doing now?\\n/leave\\n");
  const first=await next();
  assert.equal(first,"Hi there! Got a minute?","script lost its first visitor utterance");
  await new Promise((resolve)=>setImmediate(resolve));
  assert.equal(await next(),"What are you doing now?",
    "script lost a queued utterance while the Thread was responding");
  assert.equal(await next(),"/leave","script lost its voluntary exit");
  assert.equal(await next(),null,"scripted encounter failed to finish on input EOF");
  terminal.close();
});
