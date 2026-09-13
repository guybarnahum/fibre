import test from "node:test";
import assert from "node:assert/strict";

import { sampleCloudflareResourceHealth } from "./resource-health.mjs";

function response(payload) {
  return new Response(JSON.stringify(payload), { status:200, headers:{ "Content-Type":"application/json" } });
}

test("resource health classifies normal, elevated, and critical usage from one Cloudflare sample", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[
        { dimensions:{ databaseId:"activity" }, sum:{ readQueries:10, writeQueries:2, rowsRead:600, rowsWritten:20 } },
        { dimensions:{ databaseId:"catalog" }, sum:{ readQueries:1, writeQueries:0, rowsRead:20, rowsWritten:0 } },
      ],
      workersInvocationsAdaptive:[
        { dimensions:{ scriptName:"fibre-admin-dashboard-staging", status:"success" }, sum:{ requests:120, errors:0, subrequests:120 }, quantiles:{ cpuTimeP99:5 } },
      ],
    }] } },
  });
  const result = await sampleCloudflareResourceHealth({
    accountId:"account",
    apiToken:"token",
    environment:"staging",
    d1Resources:[
      { name:"fibre-activity-log-staging", id:"activity", binding:"ACTIVITY_LOG" },
      { name:"fibre-presentation-catalog-staging", id:"catalog", binding:"PRESENTATION_CATALOG" },
    ],
    limits:{ d1RowsReadDaily:1000, d1RowsWrittenDaily:100, workerRequests15m:1000, workerErrors15m:10 },
    now:new Date("2026-09-13T14:00:00.000Z"),
    fetchImpl,
  });
  assert.equal(result.level, "elevated");
  assert.equal(result.d1[0].rowsRead, 600);
  assert.equal(result.checks.find((check) => check.kind === "d1_rows_read" && check.resource === "fibre-activity-log-staging").level, "elevated");
  assert.equal(result.checks.find((check) => check.kind === "d1_rows_written" && check.resource === "fibre-activity-log-staging").level, "normal");
});

test("resource health becomes critical at the configured limit", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[{ dimensions:{ databaseId:"activity" }, sum:{ readQueries:1, writeQueries:0, rowsRead:1000, rowsWritten:0 } }],
      workersInvocationsAdaptive:[],
    }] } },
  });
  const result = await sampleCloudflareResourceHealth({
    accountId:"account",
    apiToken:"token",
    environment:"staging",
    d1Resources:[{ name:"activity", id:"activity", binding:"ACTIVITY_LOG" }],
    limits:{ d1RowsReadDaily:1000, d1RowsWrittenDaily:100, workerRequests15m:1000, workerErrors15m:10 },
    fetchImpl,
  });
  assert.equal(result.level, "critical");
});
