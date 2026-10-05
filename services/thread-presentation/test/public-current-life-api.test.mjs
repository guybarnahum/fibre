import assert from "node:assert/strict";
import test from "node:test";

import { createPublicCurrentLifeApi } from "../src/http/current-life-api.mjs";

const THREAD_ID="thr_public_visit_001";

function visit(url=`https://api.insidefibre.com/api/threads/${THREAD_ID}/present`){
  return new Request(url,{
    method:"GET",
    headers:{ Origin:"https://insidefibre.com" },
  });
}

test("public visit observes the Thread's reconciled current life rather than creating a meeting",async()=>{
  const situations=[
    {
      situationId:"sit_visit_morning",
      establishedAt:"2026-10-05T16:00:00Z",
      phase:"at_place",
      location:{ kind:"place",place:{ displayName:"Library",region:"Tucson" } },
      activity:"Reading near a window.",
      participants:[],
      depictionMediaId:"media_visit_morning",
    },
    {
      situationId:"sit_visit_afternoon",
      establishedAt:"2026-10-05T20:00:00Z",
      phase:"in_transit",
      location:{
        kind:"transit",
        from:{ displayName:"Library",region:"Tucson" },
        to:{ displayName:"Home",region:"Tucson" },
        progress:0.4,
      },
      activity:"Heading home.",
      participants:[],
      depictionMediaId:"media_visit_afternoon",
    },
  ];
  let ensureCalls=0;
  const api=createPublicCurrentLifeApi({
    viewerOrigin:"https://insidefibre.com",
    isPublicThread:async threadId=>threadId===THREAD_ID,
    ensureCurrentPresent:async threadId=>{
      assert.equal(threadId,THREAD_ID);
      return { present:situations[ensureCalls++] };
    },
  });

  const first=await api.fetch(visit());
  const second=await api.fetch(visit());

  assert.equal(first.status,200);
  assert.equal(second.status,200);
  assert.equal((await first.json()).currentPresent.payload.situationId,"sit_visit_morning");
  assert.equal((await second.json()).currentPresent.payload.situationId,"sit_visit_afternoon");
  assert.equal(ensureCalls,2,"public revisit did not ask World for current life again");
});

test("public visit cannot author life or reconcile a non-public Thread",async()=>{
  let ensureCalls=0;
  const api=createPublicCurrentLifeApi({
    viewerOrigin:"https://insidefibre.com",
    isPublicThread:async threadId=>threadId===THREAD_ID,
    ensureCurrentPresent:async()=>{
      ensureCalls+=1;
      throw new Error("must not run");
    },
  });

  const authored=await api.fetch(visit(
    `https://api.insidefibre.com/api/threads/${THREAD_ID}/present?at=2030-01-01T00%3A00%3A00Z`,
  ));
  assert.equal(authored.status,400);
  assert.equal(ensureCalls,0,"caller-authored time reached World");

  const hidden=await api.fetch(new Request(
    "https://api.insidefibre.com/api/threads/thr_private_visit_001/present",
    { method:"GET",headers:{ Origin:"https://insidefibre.com" } },
  ));
  assert.equal(hidden.status,404);
  assert.equal(ensureCalls,0,"non-public visit reconciled private Thread life");
});
