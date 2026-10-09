import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

const TOKEN_ENCODER = new TextEncoder();

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers:{ "cache-control":"no-store" },
  });
}

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

export function createPublicVisitorEncounterWriteApi({
  encounterService,
  privateToken,
  now = () => new Date().toISOString(),
}) {
  requireMethod(encounterService, "public visitor encounterService", "encounter");
  if (typeof privateToken !== "string" || privateToken.trim() === "") {
    throw new TypeError("public visitor encounter API requires privateToken");
  }
  if (typeof now !== "function") throw new TypeError("public visitor encounter API requires now()");

  const active=new Map();
  const encode=new TextEncoder();
  const liveEvent=(type,value)=>encode.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const interrupt=url.pathname==="/internal/public-visitor-encounter/interrupt";
      if(url.pathname!=="/internal/public-visitor-encounter"&&!interrupt)return null;
      if(request.method!=="POST")return json({error:"method_not_allowed"},405);
      if(!constantTimeEqual(request.headers.get("x-fibre-private-token"),privateToken)){
        return json({error:"private_token_required"},403);
      }
      if(interrupt){
        let input;
        try{
          input=await request.json();
          assertPlainObject("public encounter interrupt",input);
          assertExactKeys("public encounter interrupt",input,["requestId","threadId"]);
          assertId("public encounter interrupt requestId",input.requestId);
          assertId("public encounter interrupt threadId",input.threadId);
        }catch(error){return json({error:"invalid_public_encounter",detail:error.message},400);}
        const running=active.get(input.requestId);
        if(running===undefined||running.threadId!==input.threadId)return json({interrupted:false});
        running.abort.abort("visitor interrupted");
        return json({interrupted:true});
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("public visitor encounter request", body);
        const keys = Object.hasOwn(body, "priorEncounterStoryId")
          ? ["requestId", "threadId", "expectedSituationId", "utterance", "priorEncounterStoryId"]
          : ["requestId", "threadId", "expectedSituationId", "utterance"];
        assertExactKeys("public visitor encounter request", body, keys);
        assertId("public visitor encounter request.requestId", body.requestId);
        assertId("public visitor encounter request.threadId", body.threadId);
        assertId("public visitor encounter request.expectedSituationId", body.expectedSituationId);
        assertNonEmpty("public visitor encounter request.utterance", body.utterance);
        if (Object.hasOwn(body, "priorEncounterStoryId")) {
          assertId("public visitor encounter request.priorEncounterStoryId", body.priorEncounterStoryId);
        }
      } catch (error) {
        return json({ error:"invalid_public_encounter", detail:error.message }, 400);
      }

      const input={
        requestId:body.requestId,
        threadId:body.threadId,
        expectedSituationId:body.expectedSituationId,
        utterance:body.utterance,
        ...(body.priorEncounterStoryId===undefined?{}:{priorEncounterStoryId:body.priorEncounterStoryId}),
        at:now(),
      };
      if(request.headers.get("accept")?.includes("text/event-stream")){
        if(active.has(body.requestId))return json({error:"encounter_already_live"},409);
        const abort=new AbortController();
        let cancelled=false;
        const stream=new ReadableStream({
          start(controller){
            active.set(body.requestId,{threadId:body.threadId,abort});
            void encounterService.encounter(input,{
              signal:abort.signal,
              onLiveEvent(event){
                if(cancelled)return;
                if(event.actorId===body.threadId
                  &&(event.type==="speech_delta"||event.type==="speech_end")){
                  controller.enqueue(liveEvent(event.type,event));
                }else if(event.type==="scene_changed"&&event.participantId===body.threadId){
                  controller.enqueue(liveEvent("scene_changed",{
                    currentSituationId:event.currentSituation.situationId,
                  }));
                }
              },
            }).then((result)=>{
              if(cancelled)return;
              controller.enqueue(liveEvent("result",result));
              controller.close();
            }).catch((error)=>{
              if(cancelled)return;
              controller.enqueue(liveEvent("error",{error:"public_encounter_unavailable"}));
              controller.close();
            }).finally(()=>{
              if(active.get(body.requestId)?.abort===abort)active.delete(body.requestId);
            });
          },
          cancel(){
            cancelled=true;
            abort.abort("visitor disconnected");
          },
        });
        return new Response(stream,{
          headers:{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store"},
        });
      }
      const result=await encounterService.encounter(input);
      if (result.outcome === "scene_changed") {
        return json({
          error:"encounter_scene_changed",
          currentSituationId:result.currentSituationId,
        }, 409);
      }
      return json({ ok:true, result });
    },
  });
}
