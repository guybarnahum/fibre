import { DurableObject } from "cloudflare:workers";

import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
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
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/internal/health/state") {
      return Response.json({
        ok: true,
        service: "world-kernel",
        provider: "cloudflare",
        stateScopeId: WORLD_SCOPE_ID,
        stateChecked: true,
        capabilities: runtime.infraDriver.capabilities,
      });
    }
    const recoveryResponse = await runtime.visualRecoveryApi.fetch(request);
    if (recoveryResponse !== null) return recoveryResponse;
    const inspectionResponse = await runtime.inspectionApi.fetch(request);
    if (inspectionResponse !== null) return inspectionResponse;
    const birthResponse = await runtime.birthApi.fetch(request);
    if (birthResponse !== null) return birthResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm() {
    return this.runtimeForRequest().reconciliationRuntime.handleWake();
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service: "world-kernel",
  bindingName: "WORLD_STATE",
  stateScopeId: WORLD_SCOPE_ID,
});
