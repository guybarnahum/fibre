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

function infraBinding(level = "normal", { stale = false } = {}) {
  return {
    async fetch(request) {
      assert.equal(new URL(request.url).pathname, "/internal/infra-health");
      return new Response(JSON.stringify({ contract:"fibre-infra-health-summary-v0.5", level, stale, observedAt:"2026-09-13T14:00:00.000Z" }), { status:200, headers:{ "Content-Type":"application/json" } });
    },
  };
}

function changingInfraBinding(levels) {
  let reads = 0;
  return {
    async fetch() {
      const level = levels[Math.min(reads, levels.length - 1)];
      reads += 1;
      return new Response(JSON.stringify({ contract:"fibre-infra-health-summary-v0.5", level, stale:false }), { status:200, headers:{ "Content-Type":"application/json" } });
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
    ADMIN_DASHBOARD: infraBinding(),
    ...overrides,
  };
}

const viewerOk = async () => new Response("ok", { status: 200 });

test("public status is operational only when viewer, runtime, and infra health are normal", async () => {
  const result = await currentPublicStatus(environment(), {
    fetchImpl: viewerOk,
    now: () => "2026-09-01T14:00:00.000Z",
  });
  assert.equal(result.status, "operational");
  assert.equal(result.environment, "staging");
  assert.equal(result.components.length, 6);
  assert.ok(result.components.every((component) => component.status === "operational"));
  const serialized = JSON.stringify(result);
  for (const forbidden of ["requestId", "threadId", "genesisId", "providerRequestId", "error", "databaseId", "accountId"]) assert.equal(serialized.includes(forbidden), false);
});

test("public status does not hide a new infrastructure failure behind stale health", async () => {
  const env = environment({ ADMIN_DASHBOARD:changingInfraBinding(["normal", "critical"]) });
  assert.equal((await currentPublicStatus(env, { fetchImpl:viewerOk })).status, "operational");
  assert.equal((await currentPublicStatus(env, { fetchImpl:viewerOk })).status, "degraded");
});

test("elevated resource use stays operational while remaining visible", async () => {
  const result = await currentPublicStatus(environment({ ADMIN_DASHBOARD:infraBinding("elevated") }), { fetchImpl:viewerOk });
  assert.equal(result.status, "operational");
  const infra = result.components.find((component) => component.key === "infra");
  assert.equal(infra.status, "operational");
  assert.match(infra.description, /elevated/u);
});

test("one failed component degrades public status without exposing its internal error", async () => {
  const result = await currentPublicStatus(environment({ WORLD_KERNEL: { fetch: async () => { throw new Error("secret internal detail"); } } }), { fetchImpl: viewerOk });
  assert.equal(result.status, "degraded");
  const world = result.components.find((component) => component.key === "world");
  assert.equal(world.status, "outage");
  assert.equal(JSON.stringify(result).includes("secret internal detail"), false);
});

test("viewer failure degrades public status without changing healthy internal components", async () => {
  const result = await currentPublicStatus(environment(), {
    fetchImpl: async () => new Response("down", { status: 503 }),
  });
  assert.equal(result.status, "degraded");
  const web = result.components.find((component) => component.key === "web");
  assert.equal(web.status, "degraded");
  assert.ok(result.components.filter((component) => component.key !== "web").every((component) => component.status === "operational"));
});

test("a hanging service binding is bounded and reported as an outage", async () => {
  const hangingWorld = { fetch() { return new Promise(() => {}); } };
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
