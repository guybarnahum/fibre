import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { withCloudflareQueueBindings } from "#infra/providers/cloudflare/queue";
import baseWorker, { AssetGenerationWorkflow } from "./worker.mjs";
import { ASSET_GENERATION_COMPLETION_QUEUE } from "#services/asset-generator/src/index.mjs";

export { AssetGenerationWorkflow };

async function infraHealth(env) {
  const base = createCloudflareInfraDriver({
    objectBucket:env.ASSET_OBJECTS,
    workflowBindings:env.ASSET_GENERATION ? { asset_generation_v1:env.ASSET_GENERATION } : {},
  });
  const infra = env.ASSET_COMPLETIONS
    ? withCloudflareQueueBindings(base, { [ASSET_GENERATION_COMPLETION_QUEUE]:env.ASSET_COMPLETIONS })
    : base;
  const health = await infra.health.check();
  return Response.json({
    ok:health.level === "normal",
    service:"asset-generator",
    provider:health.provider,
    health,
  }, { status:health.level === "normal" ? 200 : 503 });
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/internal/health/infra") return infraHealth(env);
    return baseWorker.fetch(request, env, ctx);
  },
};
