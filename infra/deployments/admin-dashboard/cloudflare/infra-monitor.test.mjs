import test from "node:test";
import assert from "node:assert/strict";

import { FibreAdminInfraMonitor } from "./infra-monitor-do.mjs";

function fakeState() {
  const values = new Map();
  return {
    storage:{
      async get(key) { return values.get(key); },
      async put(key, value) { values.set(key, structuredClone(value)); },
    },
  };
}

function monitorEnv() {
  return {
    FIBRE_CLOUDFLARE_ANALYTICS_CONFIG:JSON.stringify({
      accountId:"account",
      apiToken:"analytics-token",
      ttlSeconds:900,
      limits:{ d1RowsReadDaily:1000, d1RowsWrittenDaily:100, workerRequests15m:1000, workerErrors15m:10 },
      d1Resources:[{ name:"activity", id:"activity", binding:"ACTIVITY_LOG" }],
    }),
  };
}

function analyticsResponse(rowsRead = 100) {
  return new Response(JSON.stringify({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[{ dimensions:{ databaseId:"activity" }, sum:{ readQueries:1, writeQueries:0, rowsRead, rowsWritten:0 } }],
      workersInvocationsAdaptive:[],
    }] } },
  }), { status:200, headers:{ "Content-Type":"application/json" } });
}

test("Admin infra monitor samples once per TTL and force bypasses freshness", async () => {
  const monitor = new FibreAdminInfraMonitor(fakeState(), monitorEnv());
  let fetches = 0;
  monitor.fetchImpl = async () => { fetches += 1; return analyticsResponse(fetches * 100); };

  const first = await monitor.sample({ environment:"staging", force:false, now:new Date("2026-09-13T14:00:00.000Z") });
  const cached = await monitor.sample({ environment:"staging", force:false, now:new Date("2026-09-13T14:05:00.000Z") });
  const forced = await monitor.sample({ environment:"staging", force:true, now:new Date("2026-09-13T14:06:00.000Z") });

  assert.equal(fetches, 2);
  assert.equal(first.cached, false);
  assert.equal(cached.cached, true);
  assert.equal(cached.sample.d1[0].rowsRead, 100);
  assert.equal(forced.cached, false);
  assert.equal(forced.sample.d1[0].rowsRead, 200);
});

test("cached infra health never triggers a Cloudflare sample", async () => {
  const monitor = new FibreAdminInfraMonitor(fakeState(), monitorEnv());
  let fetches = 0;
  monitor.fetchImpl = async () => { fetches += 1; return analyticsResponse(); };

  const response = await monitor.fetch(new Request("https://infra-monitor.internal/cached?environment=staging"));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(fetches, 0);
  assert.equal(payload.level, "unavailable");
  assert.equal(payload.stale, true);
});
