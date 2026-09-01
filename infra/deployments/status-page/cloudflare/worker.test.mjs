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

test("viewer failure degrades public status without changing runtime component health", async () => {
  const result = await currentPublicStatus(environment(), {
    fetchImpl: async () => new Response("down", { status: 503 }),
  });
  assert.equal(result.status, "degraded");
  const web = result.components.find((component) => component.key === "web");
  assert.equal(web.status, "degraded");
  assert.ok(result.components.filter((component) => component.key !== "web").every((component) => component.status === "operational"));
});

test("a hanging service binding is bounded and reported as an outage", async () => {
  const hangingWorld = {
    fetch(request) {
      return new Promise((resolve, reject) => {
        const abort = () => reject(request.signal.reason ?? new Error("aborted"));
        if (request.signal.aborted) abort();
        else request.signal.addEventListener("abort", abort, { once: true });
      });
    },
  };
  const started = Date.now();
  const result = await currentPublicStatus(environment({ WORLD_KERNEL: hangingWorld }), {
    fetchImpl: viewerOk,
    bindingTimeoutMs: 10,
  });
  assert.ok(Date.now() - started < 1000);
  assert.equal(result.status, "degraded");
  assert.equal(result.components.find((component) => component.key === "world").status, "outage");
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
