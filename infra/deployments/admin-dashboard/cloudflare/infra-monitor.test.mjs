import test from "node:test";
import assert from "node:assert/strict";

import { readAdminInfraMonitor } from "./infra-monitor.mjs";

function fakeD1() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...bindings) {
          return {
            async all() {
              if (!sql.startsWith("SELECT sampled_at")) throw new Error(`unexpected all SQL: ${sql}`);
              const row = rows.get(bindings[0]);
              return { results: row ? [{ ...row }] : [] };
            },
            async run() {
              if (sql.startsWith("INSERT OR IGNORE")) {
                if (!rows.has(bindings[0])) rows.set(bindings[0], { sampled_at:null, sample_json:null, sampling_started_at:null });
                return { meta:{ changes:1 } };
              }
              if (sql.startsWith("UPDATE fibre_admin_infra_monitor SET sampling_started_at = ?")) {
                const [startedAt, environment, cutoff] = bindings;
                const row = rows.get(environment);
                const available = row && (row.sampling_started_at === null || row.sampling_started_at < cutoff);
                if (available) row.sampling_started_at = startedAt;
                return { meta:{ changes:available ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE fibre_admin_infra_monitor SET sampled_at = ?")) {
                const [sampledAt, sampleJson, environment] = bindings;
                const row = rows.get(environment);
                row.sampled_at = sampledAt;
                row.sample_json = sampleJson;
                row.sampling_started_at = null;
                return { meta:{ changes:1 } };
              }
              if (sql.startsWith("UPDATE fibre_admin_infra_monitor SET sampling_started_at = NULL")) {
                const row = rows.get(bindings[0]);
                if (row) row.sampling_started_at = null;
                return { meta:{ changes:row ? 1 : 0 } };
              }
              throw new Error(`unexpected run SQL: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function monitorEnv(database) {
  return {
    ACTIVITY_LOG:database,
    FIBRE_CLOUDFLARE_ANALYTICS_CONFIG:JSON.stringify({
      accountId:"account",
      apiToken:"token",
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
  const database = fakeD1();
  let fetches = 0;
  const fetchImpl = async () => { fetches += 1; return analyticsResponse(fetches * 100); };
  const first = await readAdminInfraMonitor({
    env:monitorEnv(database), environment:"staging", now:new Date("2026-09-13T14:00:00.000Z"), fetchImpl,
  });
  const cached = await readAdminInfraMonitor({
    env:monitorEnv(database), environment:"staging", now:new Date("2026-09-13T14:05:00.000Z"), fetchImpl,
  });
  const forced = await readAdminInfraMonitor({
    env:monitorEnv(database), environment:"staging", force:true, now:new Date("2026-09-13T14:06:00.000Z"), fetchImpl,
  });

  assert.equal(fetches, 2);
  assert.equal(first.cached, false);
  assert.equal(cached.cached, true);
  assert.equal(cached.sample.d1[0].rowsRead, 100);
  assert.equal(forced.cached, false);
  assert.equal(forced.sample.d1[0].rowsRead, 200);
});

test("Admin infra monitor returns cached state while another isolate owns the sampling lease", async () => {
  const database = fakeD1();
  const env = monitorEnv(database);
  await readAdminInfraMonitor({ env, environment:"staging", now:new Date("2026-09-13T14:00:00.000Z"), fetchImpl:async () => analyticsResponse(100) });
  database.rows.get("staging").sampling_started_at = "2026-09-13T14:20:00.000Z";
  let fetched = false;
  const result = await readAdminInfraMonitor({
    env,
    environment:"staging",
    force:true,
    now:new Date("2026-09-13T14:20:30.000Z"),
    fetchImpl:async () => { fetched = true; return analyticsResponse(999); },
  });
  assert.equal(fetched, false);
  assert.equal(result.cached, true);
  assert.equal(result.refreshing, true);
  assert.equal(result.sample.d1[0].rowsRead, 100);
});
