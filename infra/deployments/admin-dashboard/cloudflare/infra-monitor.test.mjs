import test from "node:test";
import assert from "node:assert/strict";

import { readAdminInfraMonitor } from "./infra-monitor.mjs";

function healthBinding(service, check, { critical = false } = {}) {
  let reads = 0;
  return {
    get reads() { return reads; },
    async fetch(request) {
      reads += 1;
      assert.equal(request.method, "GET");
      assert.equal(new URL(request.url).pathname, "/internal/health/infra");
      const healthCheck = critical
        ? {
            ...check,
            provider:"cloudflare",
            level:"critical",
            error:{
              code:"DURABLE_OBJECT_ROWS_READ_LIMIT",
              detail:"Exceeded allowed rows read in Durable Objects free tier.",
            },
          }
        : { ...check, provider:"cloudflare", level:"normal" };
      return new Response(JSON.stringify({
        ok:!critical,
        service,
        provider:"cloudflare",
        health:{ level:critical ? "critical" : "normal", checks:[healthCheck] },
      }), { status:critical ? 503 : 200, headers:{ "Content-Type":"application/json" } });
    },
  };
}

function activityDatabase() {
  let reads = 0;
  return {
    get reads() { return reads; },
    prepare(sql) {
      assert.match(sql, /SELECT 1 AS fibre_health/u);
      return {
        async first() {
          reads += 1;
          return { fibre_health:1 };
        },
      };
    },
  };
}

function monitorEnv() {
  const world = healthBinding("world-kernel", { kind:"state", resource:"world" }, { critical:true });
  const birth = healthBinding("birth-center", { kind:"state", resource:"birth" });
  const presentation = healthBinding("thread-presentation", { kind:"objects", resource:"r2" });
  const asset = healthBinding("asset-generator", { kind:"workflows", resource:"asset_generation_v1" });
  const activity = activityDatabase();
  return {
    services:[world, birth, presentation, asset],
    activity,
    env:{
      WORLD_KERNEL:world,
      BIRTH_CENTER:birth,
      THREAD_PRESENTATION:presentation,
      ASSET_GENERATOR:asset,
      ACTIVITY_LOG:activity,
      FIBRE_CLOUDFLARE_ANALYTICS_CONFIG:JSON.stringify({
        accountId:"account",
        apiToken:"analytics-token",
        ttlSeconds:900,
        limits:{ d1RowsReadDaily:1000, d1RowsWrittenDaily:100, workerRequests15m:1000, workerErrors15m:10 },
        d1Resources:[{ name:"activity", id:"activity", binding:"ACTIVITY_LOG" }],
      }),
    },
  };
}

function analyticsResponse() {
  return new Response(JSON.stringify({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[{ dimensions:{ databaseId:"activity" }, sum:{ readQueries:1, writeQueries:0, rowsRead:100, rowsWritten:0 } }],
      workersInvocationsAdaptive:[],
    }] } },
  }), { status:200, headers:{ "Content-Type":"application/json" } });
}

test("Admin surfaces infra failure with one bounded read-only probe per Fibre dependency", async () => {
  const { env, services, activity } = monitorEnv();
  let analyticsReads = 0;
  const payload = await readAdminInfraMonitor({
    env,
    environment:"staging",
    now:new Date("2026-09-15T16:12:38.000Z"),
    fetchImpl:async () => { analyticsReads += 1; return analyticsResponse(); },
  });

  assert.equal(payload.sample.level, "critical");
  assert.equal(payload.sample.checks.find((check) => check.resource === "world")?.error?.code, "DURABLE_OBJECT_ROWS_READ_LIMIT");
  assert.ok(services.every((service) => service.reads === 1), "each runtime service must be probed once");
  assert.equal(activity.reads, 1, "shared Activity D1 must be probed once");
  assert.equal(analyticsReads, 1, "capacity must be sampled once");
});
