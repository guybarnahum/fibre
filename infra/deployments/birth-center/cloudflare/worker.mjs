import { DurableObject } from "cloudflare:workers";

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

function reasoningProfileWitness(adapter) {
  if (!adapter) return null;
  return Object.freeze({
    provider: adapter.provider,
    modelId: adapter.modelId,
  });
}

export class FibreBirthCenterDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
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

  async fetch(request) {
    const cloud = this.runtimeForRequest();
    await cloud.runtime.ensureScheduled();
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({
        ok: true,
        service: "birth-center",
        provider: "cloudflare",
        stateScopeId: BIRTH_SCOPE_ID,
        capabilities: cloud.infraDriver.capabilities,
        pendingBirthCount: cloud.runtime.status().pendingBirthCount,
        genesisDevelopmentConfigured: cloud.developmentApi !== null,
        genesisReasoningProfiles: {
          creative: reasoningProfileWitness(cloud.creativeAdapter),
          repair: reasoningProfileWitness(cloud.repairAdapter),
        },
      });
    }
    if (cloud.developmentApi !== null) {
      const developmentResponse = await cloud.developmentApi.fetch(request);
      if (developmentResponse !== null) return developmentResponse;
    }
    const birthResponse = await cloud.birthApi.fetch(request);
    if (birthResponse !== null) return birthResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm() {
    return this.runtimeForRequest().runtime.handleWake();
  }
}

export default {
  async fetch(request, env) {
    if (!env?.BIRTH_STATE || typeof env.BIRTH_STATE.getByName !== "function") {
      throw new TypeError("birth-center Worker requires BIRTH_STATE Durable Object binding");
    }
    return env.BIRTH_STATE.getByName(BIRTH_SCOPE_ID).fetch(request);
  },
};
