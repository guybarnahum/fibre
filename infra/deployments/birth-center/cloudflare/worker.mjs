import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
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

  startStaleReconciliation(cloud, { force = false } = {}) {
    const now = Date.now();
    if (this.staleReconciliation !== null) return this.staleReconciliation;
    if (!force && now < this.nextStaleReconcileAt) return null;
    this.nextStaleReconcileAt = now + (5 * 60 * 1000);
    const work = cloud.reconcileStaleBirths().finally(() => {
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
      return Response.json({ ok:true, service:"birth-center", migration:result });
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
        capabilities:["state"],
        health,
      }, { status:health.level === "normal" ? 200 : 503 });
    }
    const cloud = this.runtimeForRequest();
    this.ensureSchedulerForStatefulRequest(cloud);
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
    } finally {
      try {
        await (this.startStaleReconciliation(cloud, { force:true }) ?? Promise.resolve());
      } finally {
        await cloud.ensureBirthStatusScheduled();
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