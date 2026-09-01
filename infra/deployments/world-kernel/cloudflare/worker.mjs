import { DurableObject } from "cloudflare:workers";

import { createWorldCloudflareRuntime } from "./runtime.mjs";

const WORLD_SCOPE_ID = "world";

export class FibreWorldDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
  }

  runtimeForRequest() {
    if (this.runtime === null) {
      this.runtime = createWorldCloudflareRuntime({ storage: this.ctx.storage, env: this.env });
    }
    return this.runtime;
  }

  async fetch(request) {
    const runtime = this.runtimeForRequest();
    await runtime.reconciliationRuntime.ensureScheduled();
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({
        ok: true,
        service: "world-kernel",
        provider: "cloudflare",
        stateScopeId: WORLD_SCOPE_ID,
        capabilities: runtime.infraDriver.capabilities,
      });
    }
    const threadInspectionResponse = await runtime.threadInspectionApi.fetch(request);
    if (threadInspectionResponse !== null) return threadInspectionResponse;
    const genesisInspectionResponse = await runtime.genesisInspectionApi.fetch(request);
    if (genesisInspectionResponse !== null) return genesisInspectionResponse;
    const birthResponse = await runtime.birthApi.fetch(request);
    if (birthResponse !== null) return birthResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm() {
    return this.runtimeForRequest().reconciliationRuntime.handleWake();
  }
}

export default {
  async fetch(request, env) {
    if (!env?.WORLD_STATE || typeof env.WORLD_STATE.getByName !== "function") {
      throw new TypeError("world-kernel Worker requires WORLD_STATE Durable Object binding");
    }
    return env.WORLD_STATE.getByName(WORLD_SCOPE_ID).fetch(request);
  },
};
