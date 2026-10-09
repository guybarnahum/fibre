import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";

import { createNodeServiceHandler } from "../../../infra/providers/local/service.mjs";

import { createPublicVisitorEncounterWriteApi } from "../src/public-visitor-encounter-write-api.mjs";
import { createPublicCurrentLifeApi } from "../../thread-presentation/src/http/current-life-api.mjs";

async function withLocalHttp(service,run){
  const server=createServer(createNodeServiceHandler({service}));
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  try{
    return await run(`http://127.0.0.1:${server.address().port}`);
  }finally{
    server.closeAllConnections();
    server.close();
    await once(server,"close");
  }
}

test("local HTTP delivers live World speech through Presentation before visitor interruption",async()=>{
  const threadId="thr_listening";
  const requestId="req_live_public";
  const situationId="sit_world_now";
  let active=0;
  let interruptions=0;

  const world=createPublicVisitorEncounterWriteApi({
    privateToken:"private_test",
    encounterService:{
      async encounter(input,{onLiveEvent,signal}={}){
        assert.equal(input.threadId,threadId);
        assert.equal(input.expectedSituationId,situationId);
        assert.equal(typeof onLiveEvent,"function","public path did not stream live speech");
        active++;
        onLiveEvent({type:"speech_delta",actorId:threadId,text:"I was about to explain—"});
        return new Promise((resolve)=>{
          signal.addEventListener("abort",()=>{
            interruptions++;
            onLiveEvent({
              type:"speech_end",
              actorId:threadId,
              text:"I was about to explain—",
              completion:"interrupted",
            });
            resolve({
              outcome:"accepted",
              situationId,
              responseText:"I was about to explain—",
              completion:"interrupted",
              encounterStoryId:"story_spoken",
            });
          },{once:true});
        });
      },
    },
  });

  await withLocalHttp(world,async (worldUrl)=>{
    const presentation=createPublicCurrentLifeApi({
      viewerOrigin:"https://insidefibre.test",
      async isPublicThread(){return true;},
      async ensureCurrentPresent(){throw new Error("not a visit");},
      async submitEncounter(){throw new Error("completed-response path was selected");},
      streamEncounter(_threadId,input){
        return fetch(worldUrl+"/internal/public-visitor-encounter",{
          method:"POST",
          headers:{"content-type":"application/json","x-fibre-private-token":"private_test",accept:"text/event-stream"},
          body:JSON.stringify({
            requestId:input.requestId,
            threadId,
            expectedSituationId:input.situationId,
            utterance:input.utterance,
          }),
        });
      },
      interruptEncounter(_threadId,id){
        return fetch(worldUrl+"/internal/public-visitor-encounter/interrupt",{
          method:"POST",
          headers:{"content-type":"application/json","x-fibre-private-token":"private_test"},
          body:JSON.stringify({requestId:id,threadId}),
        }).then((response)=>response.json());
      },
    });

    await withLocalHttp(presentation,async (presentationUrl)=>{
      const stream=await fetch(`${presentationUrl}/api/threads/${threadId}/encounter`,{
        method:"POST",
        headers:{
          origin:"https://insidefibre.test",
          accept:"text/event-stream",
          "content-type":"application/json",
        },
        body:JSON.stringify({requestId,situationId,utterance:"Tell me more."}),
        signal:AbortSignal.timeout(10_000),
      }).catch(()=>assert.fail("Local HTTP withheld live speech until encounter completion"));
  assert.equal(stream.status,200,"the public encounter did not open its live stream");
  const reader=stream.body.getReader();
  const first=await reader.read().catch(()=>
    assert.fail("Live speech did not reach the visitor before completion"));
  const spoken=new TextDecoder().decode(first.value);
  assert.match(spoken,/event: speech_delta/,"Thread speech was withheld until final completion");
  assert.match(spoken,/I was about to explain/,"the public visitor heard no Thread speech");
  assert.equal(interruptions,0,"live encounter ended before the visitor could interrupt");

  const interruption=await fetch(
    `${presentationUrl}/api/threads/${threadId}/encounter/${requestId}/interrupt`,{
      method:"POST",headers:{origin:"https://insidefibre.test"},
    },
  );
  assert.deepEqual(await interruption.json(),{interrupted:true},
    "visitor interruption did not reach the active World encounter");
  assert.equal(interruptions,1,"interruption failed to stop the ongoing speech");
  assert.equal(active,1,"interruption created another conversation");

  let tail="";
  while(true){
    const next=await reader.read();
    if(next.done)break;
    tail+=new TextDecoder().decode(next.value);
  }
  assert.match(tail,/event: speech_end/,"interrupted speech did not close outwardly");
  assert.match(tail,/event: result/,"interrupted speech did not provide an outcome");
  assert.match(tail,/"completion":"interrupted"/,
    "public history lost the audible interruption");
    });
  });
});
