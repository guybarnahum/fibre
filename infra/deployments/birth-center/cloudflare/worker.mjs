import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { migrateBirthState } from "#services/birth-center/src/birth-state-migrations.mjs";
import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createBirthCenterCloudflareRuntime, publishQueuedBirths } from "./runtime.mjs";

const BIRTH_SCOPE_ID = "birth";
const DEPLOYMENT = resolveServiceDeployment(
  parseDeploymentManifest(cloudflareDeploymentYaml),
  "birth-center",
);

function reasoningProfile(name) {
  const selected = DEPLOYMENT.integrations?.[name];
  if (!selected || selected.kind !== "ai.reasoning") {
    throw new TypeError(`birth-center Cloudflare deployment requires ${name} reasoning integration`);
  }
  return selected;
}

function createReasoningAdapters(env) {
  const creative=reasoningProfile("creative");
  const authoringAdapter=maxOutputTokens=>createOpenAIModelAdapter({
    environment:env,
    modelId:creative.config.model,
    reasoningEffort:"low",
    maxOutputTokens,
    timeoutMs:180_000,
    retryLimit:0,
    fetchImpl:async(input,init)=>{
      if(typeof init?.body!=="string")return fetch(input,init);
      const body=JSON.parse(init.body);
      delete body.temperature;
      delete body.top_p;
      return fetch(input,{...init,body:JSON.stringify(body)});
    },
  });
  return Object.freeze({
    creativeAdapter: selectReasoningIntegration(creative, { environment: env }),
    repairAdapter: selectReasoningIntegration(reasoningProfile("repair"), { environment: env }),
    worldAuthoringAdapter:authoringAdapter(16_000),
    populationAuthoringAdapter:authoringAdapter(32_000),
  });
}

export class FibreBirthCenterDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
    this.schedulerBootstrapped = false;
    this.health = createCloudflareInfraDriver({ stateScopes:{ [BIRTH_SCOPE_ID]:ctx.storage } }).health;
  }

  runtimeForRequest() {
    if (this.runtime === null) {
      this.runtime = createBirthCenterCloudflareRuntime({
        storage: this.ctx.storage,
        env: this.env,
        reasoningAdapters: createReasoningAdapters(this.env),
      });
    }
    return this.runtime;
  }

  ensureSchedulerForStatefulRequest(cloud) {
    if (this.schedulerBootstrapped) return;
    this.schedulerBootstrapped = true;
    this.ctx.waitUntil((async () => {
      try {
        await cloud.runtime.ensureScheduled();
        await cloud.lifecycle?.ensureScheduled();
      } catch (error) {
        console.error(JSON.stringify({
          event:"birth-center-scheduler-bootstrap-failed",
          message:error instanceof Error ? error.message : String(error),
        }));
        this.schedulerBootstrapped = false;
      }
    })());
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/internal/migrate") {
      if (request.method !== "POST") {
        return Response.json({ error:{ code:"METHOD_NOT_ALLOWED" } }, { status:405 });
      }
      if (request.headers.get("x-fibre-private-token") !== this.env.FIBRE_PRIVATE_TOKEN) {
        return Response.json({ error:{ code:"PRIVATE_TOKEN_REQUIRED" } }, { status:403 });
      }
      const infraDriver = createCloudflareInfraDriver({ stateScopes:{ [BIRTH_SCOPE_ID]:this.ctx.storage } });
      const result = migrateBirthState({ infraDriver, stateScopeId:BIRTH_SCOPE_ID });
      return Response.json({ ok:true, service:"birth-center", migration:result,
        deploymentGitSha:this.env.FIBRE_DEPLOYMENT_GIT_SHA??null });
    }
    if (request.method === "GET"
      && (url.pathname === "/internal/health/state" || url.pathname === "/internal/health/infra")) {
      const health = await this.health.check();
      return Response.json({
        ok: health.level === "normal",
        service: "birth-center",
        provider: health.provider,
        stateScopeId: BIRTH_SCOPE_ID,
        stateChecked: true,
        deploymentGitSha:this.env.FIBRE_DEPLOYMENT_GIT_SHA??null,
        capabilities:["state"],
        health,
      }, { status:health.level === "normal" ? 200 : 503 });
    }
    const cloud = this.runtimeForRequest();
    // A lifecycle status read is one indexed local row; a cold read must not
    // bootstrap the legacy stale-birth scanner or touch World.
    if(request.method==="GET" && (url.pathname==="/births" ||
      /^\/births\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(?:\/place)?$/u.test(url.pathname))){
      const response=await cloud.lifecycleApi?.fetch(request);
      if(response!==null&&response!==undefined)return response;
    }
    if(request.method==="GET" &&
      ["/internal/births/places","/internal/births/stillborn"].includes(url.pathname)){
      const response=await cloud.birthApi?.fetch(request);
      if(response!==null&&response!==undefined)return response;
    }
    this.ensureSchedulerForStatefulRequest(cloud);
    if (cloud.lifecycleApi !== null) {
      const lifecycleResponse=await cloud.lifecycleApi.fetch(request);
      if(lifecycleResponse!==null){
        if(request.method==="POST"&&lifecycleResponse.ok)
          this.ctx.waitUntil(cloud.lifecycle.ensureScheduled());
        return lifecycleResponse;
      }
    }
    if (cloud.birthApi !== null) {
      const birthResponse = await cloud.birthApi.fetch(request);
      if (birthResponse !== null) {
        return birthResponse;
      }
    }
    if (cloud.developmentApi !== null) {
      const developmentResponse = await cloud.developmentApi.fetch(request);
      if (developmentResponse !== null) {
        if (request.method === "POST" && developmentResponse.status === 202) {
          this.ctx.waitUntil(publishQueuedBirths(cloud).catch((error) => {
            console.error(JSON.stringify({
              event:"birth-center-publication-kick-failed",
              message:error instanceof Error ? error.message : String(error),
            }));
          }));
        }
        return developmentResponse;
      }
    }
    const publicationResponse = await cloud.publicationApi.fetch(request);
    if (publicationResponse !== null) return publicationResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm(){
    const cloud=this.runtimeForRequest();
    try{
      await cloud.runtime.handleWake();
      await cloud.lifecycle?.handleWake();
    }finally{
      await cloud.lifecycle?.ensureScheduled();
    }
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service: "birth-center",
  bindingName: "BIRTH_STATE",
  stateScopeId: BIRTH_SCOPE_ID,
});