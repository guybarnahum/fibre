import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createBirthCenterCloudflareRuntime } from "./runtime.mjs";

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
  return Object.freeze({
    creativeAdapter: selectReasoningIntegration(reasoningProfile("creative"), { environment: env }),
    repairAdapter: selectReasoningIntegration(reasoningProfile("repair"), { environment: env }),
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
        await cloud.ensureBirthStatusScheduled();
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
    if (request.method === "GET"
      && (url.pathname === "/internal/health/state" || url.pathname === "/internal/health/infra")) {
      const health = await this.health.check();
      return Response.json({
        ok: health.level === "normal",
        service: "birth-center",
        provider: health.provider,
        stateScopeId: BIRTH_SCOPE_ID,
        stateChecked: true,
        capabilities:["state"],
        health,
      }, { status:health.level === "normal" ? 200 : 503 });
    }
    const cloud = this.runtimeForRequest();
    this.ensureSchedulerForStatefulRequest(cloud);
    if (cloud.modernBirthApi !== null) {
      const modernBirthResponse = await cloud.modernBirthApi.fetch(request, {
        defer:(promise) => this.ctx.waitUntil(promise),
      });
      if (modernBirthResponse !== null) {
        this.ctx.waitUntil(cloud.ensureBirthStatusScheduled().catch((error) => {
          console.error(JSON.stringify({
            event:"birth-center-status-schedule-failed",
            message:error instanceof Error ? error.message : String(error),
          }));
        }));
        return modernBirthResponse;
      }
    }
    if (cloud.developmentApi !== null) {
      const developmentResponse = await cloud.developmentApi.fetch(request);
      if (developmentResponse !== null) {
        this.ctx.waitUntil(cloud.ensureBirthStatusScheduled().catch((error) => {
          console.error(JSON.stringify({
            event:"birth-center-status-schedule-failed",
            message:error instanceof Error ? error.message : String(error),
          }));
        }));
        return developmentResponse;
      }
    }
    const birthResponse = await cloud.birthApi.fetch(request);
    if (birthResponse !== null) return birthResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm() {
    const cloud = this.runtimeForRequest();
    let publication = null;
    try {
      publication = await cloud.runtime.handleWake();
    } finally {
      await cloud.ensureBirthStatusScheduled();
    }
    return publication;
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service: "birth-center",
  bindingName: "BIRTH_STATE",
  stateScopeId: BIRTH_SCOPE_ID,
});