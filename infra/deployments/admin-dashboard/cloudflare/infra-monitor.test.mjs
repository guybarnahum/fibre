import test from "node:test";
import assert from "node:assert/strict";

import { readAdminInfraMonitor } from "./infra-monitor.mjs";

function stateBinding(service, { critical = false } = {}) {
  let reads = 0;
  return {
    get reads() { return reads; },
    async fetch(request) {
      reads += 1;
      assert.equal(request.method, "GET");
      assert.equal(new URL(request.url).pathname, "/internal/health/state");
      if (critical) {
        return new Response(JSON.stringify({
          ok:false,
          service,
          provider:"cloudflare",
          stateChecked:false,
          error:{
            code:"DURABLE_OBJECT_ROWS_READ_LIMIT",
            detail:"Exceeded allowed rows read in Durable Objects free tier.",
          },
        }), { status:503, headers:{ "Content-Type":"application/json" } });
      }
      return new Response(JSON.stringify({
        ok:true,
        service,
        provider:"cloudflare",
        stateChecked:true,
        health:{ checks:[{ kind:"state", resource:service, provider:"cloudflare", level:"normal" }] },
      }), { status:200, headers:{ "Content-Type":"application/json" } });
    },
  };
}

function monitorEnv() {
  const world = stateBinding("world-kernel", { critical:true });
  const birth = stateBinding("birth-center");
  return {
    world,
    birth,
    env:{
      WORLD_KERNEL:world,
      BIRTH_CENTER:birth,
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

test("Admin surfaces a Durable Objects quota outage with one read-only state probe per stateful service", async () => {
  const { env, world, birth } = monitorEnv();
  let analyticsReads = 0;
  const payload = await readAdminInfraMonitor({
    env,
    environment:"staging",
    now:new Date("2026-09-15T16:12:38.000Z"),
    fetchImpl:async () => { analyticsReads += 1; return analyticsResponse(); },
  });

  assert.equal(payload.sample.level, "critical");
  assert.equal(payload.sample.checks.find((check) => check.resource === "world")?.error?.code, "DURABLE_OBJECT_ROWS_READ_LIMIT");
  assert.equal(world.reads, 1);
  assert.equal(birth.reads, 1);
  assert.equal(analyticsReads, 1);
});
