import { DurableObject } from "cloudflare:workers";

import { createBirthCenterCloudflareRuntime } from "./runtime.mjs";

const BIRTH_SCOPE_ID = "birth";

export class FibreBirthCenterDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
  }

  runtimeForRequest() {
    if (this.runtime === null) {
      this.runtime = createBirthCenterCloudflareRuntime({ storage: this.ctx.storage, env: this.env });
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
        genesisDevelopmentConfigured: true,
      });
    }
    const developmentResponse = await cloud.developmentApi.fetch(request);
    if (developmentResponse !== null) return developmentResponse;
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
