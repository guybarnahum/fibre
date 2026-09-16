import test from "node:test";
import assert from "node:assert/strict";

import { sampleCloudflareResourceHealth } from "./resource-health.mjs";

function response(payload) {
  return new Response(JSON.stringify(payload), { status:200, headers:{ "Content-Type":"application/json" } });
}

test("resource health classifies D1, account-wide Durable Object, and Worker usage from one Cloudflare sample", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[
        { dimensions:{ databaseId:"activity" }, sum:{ readQueries:10, writeQueries:2, rowsRead:600, rowsWritten:20 } },
        { dimensions:{ databaseId:"catalog" }, sum:{ readQueries:1, writeQueries:0, rowsRead:20, rowsWritten:0 } },
      ],
      workersInvocationsAdaptive:[
        { dimensions:{ scriptName:"fibre-admin-dashboard-staging", status:"success" }, sum:{ requests:120, errors:0, subrequests:120 }, quantiles:{ cpuTimeP99:5 } },
      ],
      durableObjectsInvocationsAdaptiveGroups:[
        { dimensions:{ namespaceId:"world-ns", scriptName:"fibre-world-kernel-staging" }, sum:{ requests:12, errors:0 } },
        { dimensions:{ namespaceId:"prod-world-ns", scriptName:"fibre-world-kernel" }, sum:{ requests:50, errors:0 } },
      ],
      durableObjectsPeriodicGroups:[
        { dimensions:{ namespaceId:"world-ns" }, sum:{ rowsRead:6000, rowsWritten:20 } },
        { dimensions:{ namespaceId:"prod-world-ns" }, sum:{ rowsRead:3000, rowsWritten:10 } },
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
    limits:{
      d1RowsReadDaily:1000,
      d1RowsWrittenDaily:100,
      durableObjectRowsReadDaily:10_000,
      durableObjectRowsWrittenDaily:100,
      workerRequests15m:1000,
      workerErrors15m:10,
    },
    now:new Date("2026-09-13T14:00:00.000Z"),
    fetchImpl,
  });
  assert.equal(result.level, "elevated");
  assert.equal(result.d1[0].rowsRead, 600);
  assert.equal(result.checks.find((check) => check.kind === "d1_rows_read" && check.resource === "fibre-activity-log-staging").level, "elevated");
  assert.equal(result.durableObjects.length, 2);
  assert.equal(result.durableObjectTotal.rowsRead, 9000, "the free-tier quota is shared across Durable Object namespaces");
  assert.equal(result.checks.find((check) => check.kind === "durable_object_rows_read")?.level, "elevated");
});

test("Durable Object capacity becomes critical when namespaces collectively exhaust the daily account limit", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[],
      workersInvocationsAdaptive:[],
      durableObjectsInvocationsAdaptiveGroups:[
        { dimensions:{ namespaceId:"world-ns", scriptName:"fibre-world-kernel-staging" }, sum:{ requests:5, errors:0 } },
        { dimensions:{ namespaceId:"birth-ns", scriptName:"fibre-birth-center-staging" }, sum:{ requests:4, errors:0 } },
      ],
      durableObjectsPeriodicGroups:[
        { dimensions:{ namespaceId:"world-ns" }, sum:{ rowsRead:3_000_000, rowsWritten:100 } },
        { dimensions:{ namespaceId:"birth-ns" }, sum:{ rowsRead:2_000_000, rowsWritten:100 } },
      ],
    }] } },
  });
  const result = await sampleCloudflareResourceHealth({
    accountId:"account",
    apiToken:"token",
    environment:"staging",
    limits:{ durableObjectRowsReadDaily:5_000_000, durableObjectRowsWrittenDaily:100_000 },
    fetchImpl,
  });
  assert.equal(result.level, "critical");
  assert.equal(result.durableObjectTotal.rowsRead, 5_000_000);
  assert.equal(result.checks.find((check) => check.kind === "durable_object_rows_read")?.level, "critical");
});
