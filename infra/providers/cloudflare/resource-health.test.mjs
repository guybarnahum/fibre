import test from "node:test";
import assert from "node:assert/strict";

import { sampleCloudflareResourceHealth } from "./resource-health.mjs";

function response(payload) {
  return new Response(JSON.stringify(payload), { status:200, headers:{ "Content-Type":"application/json" } });
}

test("resource health includes Durable Object row usage in the infrastructure signal", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[
        { dimensions:{ databaseId:"activity" }, sum:{ readQueries:10, writeQueries:2, rowsRead:600, rowsWritten:20 } },
      ],
      durableObjectsPeriodicGroups:[
        { sum:{ rowsRead:6000, rowsWritten:20 } },
        { sum:{ rowsRead:3000, rowsWritten:10 } },
      ],
      workersInvocationsAdaptive:[],
    }] } },
  });
  const result = await sampleCloudflareResourceHealth({
    accountId:"account",
    apiToken:"token",
    environment:"staging",
    d1Resources:[{ name:"activity", id:"activity", binding:"ACTIVITY_LOG" }],
    limits:{
      d1RowsReadDaily:1000,
      d1RowsWrittenDaily:100,
      durableObjectRowsReadDaily:10_000,
      durableObjectRowsWrittenDaily:100,
      workerRequests15m:1000,
      workerErrors15m:10,
    },
    fetchImpl,
  });
  assert.equal(result.durableObjects.rowsRead, 9000);
  assert.equal(result.checks.find((check) => check.kind === "durable_object_rows_read")?.level, "elevated");
});

test("Durable Object row exhaustion makes infrastructure critical", async () => {
  const fetchImpl = async () => response({
    data:{ viewer:{ accounts:[{
      d1AnalyticsAdaptiveGroups:[],
      durableObjectsPeriodicGroups:[{ sum:{ rowsRead:5_000_000, rowsWritten:100 } }],
      workersInvocationsAdaptive:[],
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
  assert.equal(result.checks.find((check) => check.kind === "durable_object_rows_read")?.level, "critical");
});
