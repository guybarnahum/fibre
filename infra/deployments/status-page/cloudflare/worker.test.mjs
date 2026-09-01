import test from "node:test";
import assert from "node:assert/strict";

import { createStatusPageWorker, currentPublicStatus } from "./worker.mjs";

function serviceBinding(service, { ok = true, status = 200 } = {}) {
  return {
    async fetch() {
      return new Response(JSON.stringify({ ok, service }), { status, headers: { "Content-Type": "application/json" } });
    },
  };
}

function environment(overrides = {}) {
  return {
    FIBRE_ENVIRONMENT: "staging",
    VIEWER_ORIGIN: "https://staging.insidefibre.com",
    BIRTH_CENTER: serviceBinding("birth-center"),
    WORLD_KERNEL: serviceBinding("world-kernel"),
    THREAD_PRESENTATION: serviceBinding("thread-presentation"),
    ASSET_GENERATOR: serviceBinding("asset-generator"),
    ...overrides,
  };
}

const viewerOk = async () => new Response("ok", { status: 200 });

test("public status is operational only when viewer and every runtime component are healthy", async () => {
  const result = await currentPublicStatus(environment(), {
    fetchImpl: viewerOk,
    now: () => "2026-09-01T14:00:00.000Z",
  });
  assert.equal(result.status, "operational");
  assert.equal(result.environment, "staging");
  assert.equal(result.components.length, 5);
  assert.ok(result.components.every((component) => component.status === "operational"));
  const serialized = JSON.stringify(result);
  for (const forbidden of ["requestId", "threadId", "genesisId", "providerRequestId", "error"]) assert.equal(serialized.includes(forbidden), false);
});

test("one failed component degrades public status without exposing its internal error", async () => {
  const result = await currentPublicStatus(environment({ WORLD_KERNEL: { fetch: async () => { throw new Error("secret internal detail"); } } }), { fetchImpl: viewerOk });
  assert.equal(result.status, "degraded");
  const world = result.components.find((component) => component.key === "world");
  assert.equal(world.status, "outage");
  assert.equal(JSON.stringify(result).includes("secret internal detail"), false);
});

test("multiple outages produce an outage state", async () => {
  const result = await currentPublicStatus(environment({
    WORLD_KERNEL: { fetch: async () => { throw new Error("down"); } },
    BIRTH_CENTER: { fetch: async () => { throw new Error("down"); } },
  }), { fetchImpl: viewerOk });
  assert.equal(result.status, "outage");
});

test("status Worker exposes public API and its own minimal health identity", async () => {
  const worker = createStatusPageWorker({ statusResolver: async () => ({ contract:"test", environment:"staging", checkedAt:"2026-09-01T14:00:00.000Z", status:"operational", components:[] }) });
  const status = await worker.fetch(new Request("https://status.insidefibre.com/api/status"), {});
  assert.equal(status.status, 200);
  assert.equal((await status.json()).status, "operational");
  const health = await worker.fetch(new Request("https://status.insidefibre.com/healthz"), {});
  assert.equal((await health.json()).service, "status-page");
});
