import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { migrateBirthState } from "#services/birth-center/src/birth-state-migrations.mjs";
import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createBirthCenterCloudflareRuntime, publishQueuedBirths, reconcileStaleWhenDue } from "./runtime.mjs";

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
  // The family-profile structured output can be much larger than ordinary
  // cognition; retain the former CLI's bounded authoring configuration.
  const worldAuthoringAdapter=createOpenAIModelAdapter({
    environment:env,
    modelId:creative.config.model,
    reasoningEffort:"low",
    maxOutputTokens:16_000,
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
    worldAuthoringAdapter,
  });
}

export class FibreBirthCenterDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
    this.schedulerBootstrapped = false;
    this.staleReconciliation = null;
    this.nextStaleReconcileAt = 0;
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
        await cloud.ensureBirthStatusScheduled({ reconcileStaleNow:true });
      } catch (error) {
        console.error(JSON.stringify({
          event:"birth-center-scheduler-bootstrap-failed",
          message:error instanceof Error ? error.message : String(error),
        }));
        this.schedulerBootstrapped = false;
      }
    })());
  }

  startStaleReconciliation(cloud, { onlyWhenDue = false } = {}) {
    const now = Date.now();
    if (this.staleReconciliation !== null) return this.staleReconciliation;
    if (now < this.nextStaleReconcileAt) return null;
    this.nextStaleReconcileAt = now + (5 * 60 * 1000);
    const reconciliation=onlyWhenDue
      ?reconcileStaleWhenDue(cloud,()=>cloud.reconcileStaleBirths())
      :cloud.reconcileStaleBirths();
    if(reconciliation===null)return null;
    const work = reconciliation.finally(() => {
      this.staleReconciliation = null;
    });
    this.staleReconciliation = work;
    return work;
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
      /^\/births\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(url.pathname))){
      const response=await cloud.lifecycleApi?.fetch(request);
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
      const birthResponse = await cloud.birthApi.fetch(request, {
        defer:(promise) => this.ctx.waitUntil(promise),
      });
      if (birthResponse !== null) {
        if (request.method === "POST") {
          this.ctx.waitUntil(cloud.ensureBirthStatusScheduled().catch((error) => {
            console.error(JSON.stringify({
              event:"birth-center-status-schedule-failed",
              message:error instanceof Error ? error.message : String(error),
            }));
          }));
        } else if (url.pathname === "/internal/births/pending") {
          const reconciliation = this.startStaleReconciliation(cloud);
          if (reconciliation !== null) {
            this.ctx.waitUntil(reconciliation.catch((error) => {
              console.error(JSON.stringify({
                event:"birth-center-stale-reconciliation-failed",
                message:error instanceof Error ? error.message : String(error),
              }));
            }));
          }
        }
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

  async alarm() {
    const cloud = this.runtimeForRequest();
    let publication = null;
    try {
      publication = await cloud.runtime.handleWake();
      await cloud.lifecycle?.handleWake();
    } finally {
      try {
        await (this.startStaleReconciliation(cloud, { onlyWhenDue:true }) ?? Promise.resolve());
      } finally {
        await cloud.ensureBirthStatusScheduled();
        await cloud.lifecycle?.ensureScheduled();
      }
    }
    return publication;
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service: "birth-center",
  bindingName: "BIRTH_STATE",
  stateScopeId: BIRTH_SCOPE_ID,
});