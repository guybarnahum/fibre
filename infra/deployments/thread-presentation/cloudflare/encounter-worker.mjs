import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import baseWorker, { FibreAdminLiveDurableObject, FibrePresentationChannelDurableObject } from "./worker.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import { createPublicCurrentLifeApi } from "#services/thread-presentation/src/http/current-life-api.mjs";

export { FibreAdminLiveDurableObject, FibrePresentationChannelDurableObject };

function binding(env, name) {
  const value = env?.[name];
  if (!value || typeof value.fetch !== "function") throw new TypeError(`${name} service binding is required`);
  return value;
}

function publicThreadHeadRequest(request, threadId) {
  const url=new URL(request.url);
  url.pathname=`/api/threads/${encodeURIComponent(threadId)}/snapshot`;
  url.search="";
  return new Request(url,{
    method:"HEAD",
    headers:request.headers.get("Origin")===null?{}:{ Origin:request.headers.get("Origin") },
  });
}

async function callWorldCurrentPresent(env, threadId) {
  const response=await binding(env,"WORLD_KERNEL").fetch(new Request("https://world-kernel.internal/internal/lived-now/ensure",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-fibre-private-token":env.FIBRE_PRIVATE_TOKEN,
    },
    body:JSON.stringify({ threadId }),
  }));
  let body=null;
  try{ body=await response.json(); }catch{}
  if(!response.ok){
    const error=new Error(body?.detail??body?.error??`World LivedNow failed with HTTP ${response.status}`);
    error.status=response.status;
    error.body=body;
    if(typeof body?.code==="string")error.code=body.code;
    throw error;
  }
  if(body?.result?.present?.situationId!==body?.result?.situationId){
    throw new Error("World LivedNow returned an inconsistent public present");
  }
  return body.result;
}

async function callWorldVisitorEncounter(env, threadId, input) {
  const response=await binding(env,"WORLD_KERNEL").fetch(new Request("https://world-kernel.internal/internal/public-visitor-encounter",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-fibre-private-token":env.FIBRE_PRIVATE_TOKEN,
    },
    body:JSON.stringify({
      threadId,
      expectedSituationId:input.situationId,
      utterance:input.utterance,
    }),
  }));
  let body=null;
  try{ body=await response.json(); }catch{}
  if(!response.ok){
    const error=new Error(body?.detail??body?.error??`World visitor encounter failed with HTTP ${response.status}`);
    error.status=response.status;
    error.body=body;
    throw error;
  }
  return body.result;
}

function expectedWorldConflict(error, worldError) {
  return error?.status === 409 && error?.body?.error === worldError;
}

async function runWorldStage(activityRecorder, metadata, operation, expectedConflict) {
  if (activityRecorder === null) return operation();
  let expectedError = null;
  const result = await activityRecorder.runStage(metadata, async () => {
    try {
      return await operation();
    } catch (error) {
      if (!expectedConflict(error)) throw error;
      expectedError = error;
      return null;
    }
  });
  if (expectedError !== null) throw expectedError;
  return result;
}

function worldCurrentPresent(env, activityRecorder, threadId) {
  return runWorldStage(
    activityRecorder,
    {
      threadId,
      stage:"presentation.visit.current_life",
    },
    () => callWorldCurrentPresent(env, threadId),
    (error) => expectedWorldConflict(error, "lived_now_unavailable"),
  );
}

function worldVisitorEncounter(env, activityRecorder, threadId, input) {
  return runWorldStage(
    activityRecorder,
    {
      threadId,
      correlationId:input.situationId,
      stage:"presentation.encounter.submit",
    },
    () => callWorldVisitorEncounter(env, threadId, input),
    (error) => expectedWorldConflict(error, "encounter_scene_changed"),
  );
}

async function infraHealth(env) {
  const health = await createCloudflareInfraDriver({
    objectBucket:env.PRESENTATION_OBJECTS,
    presentationChannels:env.PRESENTATION_CHANNELS,
    catalogDatabase:env.PRESENTATION_CATALOG,
    workflowBindings:env.ASSET_GENERATION ? { asset_generation_v1:env.ASSET_GENERATION } : {},
  }).health.check();
  return Response.json({
    ok:health.level === "normal",
    service:"thread-presentation",
    provider:health.provider,
    health,
  }, { status:health.level === "normal" ? 200 : 503 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/internal/health/infra") return infraHealth(env);

    const activityRecorder = createCloudflareActivityRecorder({ env, service: "thread-presentation" });

    const currentLifeApi=createPublicCurrentLifeApi({
      viewerOrigin:env.VIEWER_ORIGIN??null,
      async isPublicThread(threadId,originalRequest){
        const response=await baseWorker.fetch(publicThreadHeadRequest(originalRequest,threadId),env,ctx);
        if(response.status===200)return true;
        if(response.status===404)return false;
        throw new Error(`public Thread lookup failed with HTTP ${response.status}`);
      },
      ensureCurrentPresent(threadId){
        return worldCurrentPresent(env,activityRecorder,threadId);
      },
      submitEncounter(threadId,input){
        return worldVisitorEncounter(env,activityRecorder,threadId,input);
      },
    });
    const currentLifeResponse=await currentLifeApi.fetch(request);
    if(currentLifeResponse!==null)return currentLifeResponse;

    return baseWorker.fetch(request, env, ctx);
  },
  queue(batch, env, ctx) { return baseWorker.queue(batch, env, ctx); },
};
