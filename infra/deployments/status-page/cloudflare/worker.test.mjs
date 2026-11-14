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

function infraBinding(failures = {}, { stale = false } = {}) {
  return {
    async fetch(request) {
      assert.equal(new URL(request.url).pathname, "/internal/infra-health");
      return Response.json({ contract:"fibre-infra-health-summary-v0.6", level:"normal", stale, failures,
        observedAt:"2026-09-13T14:00:00.000Z" });
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
const down = { fetch: async () => { throw new Error("secret internal detail"); } };
const of = (result, key) => result.components.find((component) => component.key === key);

test("the public page speaks of what a visitor relies on: Thread life, births and the website, with no internals", async () => {
  const result = await currentPublicStatus(environment(), { fetchImpl: viewerOk, now: () => "2026-09-01T14:00:00.000Z" });
  assert.equal(result.status, "operational");
  assert.deepEqual(result.components.map((component) => component.key), ["life", "birth", "web"]);
  assert.ok(result.components.every((component) => component.status === "operational" && component.summary));
  const serialized = JSON.stringify(result);
  for (const forbidden of ["requestId", "threadId", "providerRequestId", "error", "openai", "world-kernel", "durable", "accountId"])
    assert.equal(serialized.includes(forbidden), false, `the public status exposed ${forbidden}`);
});

test("a World that answers but cannot think pauses Thread life, without saying why", async () => {
  const result = await currentPublicStatus(environment({ ADMIN_DASHBOARD:infraBinding({ "world-kernel":"critical" }) }), { fetchImpl: viewerOk });
  assert.equal(of(result, "life").status, "outage");
  assert.equal(result.status, "outage", "Fibre read as running while Thread life was paused");
  assert.equal(of(result, "birth").status, "operational");
  assert.equal(JSON.stringify(result).includes("critical"), false);
});

test("a failure that only touches new portraits degrades the website, never takes it down", async () => {
  const media = await currentPublicStatus(environment({ ASSET_GENERATOR: down }), { fetchImpl: viewerOk });
  assert.equal(of(media, "web").status, "degraded");
  assert.equal(media.status, "degraded");
  const viewer = await currentPublicStatus(environment(), { fetchImpl: async () => { throw new Error("down"); } });
  assert.equal(of(viewer, "web").status, "outage");
  assert.equal(of(viewer, "life").status, "operational");
});

test("stale or unavailable infrastructure health neither alarms nor reassures", async () => {
  const stale = await currentPublicStatus(environment({ ADMIN_DASHBOARD:infraBinding({ "world-kernel":"critical" }, { stale:true }) }), { fetchImpl: viewerOk });
  assert.equal(stale.status, "operational");
  const missing = await currentPublicStatus(environment({ ADMIN_DASHBOARD: down, WORLD_KERNEL: down }), { fetchImpl: viewerOk });
  assert.equal(of(missing, "life").status, "outage", "an unreachable World was hidden by missing infrastructure health");
});

test("a hanging service binding is bounded and reported as an outage", async () => {
  const started = Date.now();
  const result = await currentPublicStatus(environment({ BIRTH_CENTER: { fetch() { return new Promise(() => {}); } } }), {
    fetchImpl: viewerOk, bindingTimeoutMs: 10,
  });
  assert.ok(Date.now() - started < 1000);
  assert.equal(of(result, "birth").status, "outage");
  assert.equal(result.status, "degraded");
  assert.equal(JSON.stringify(result).includes("secret internal detail"), false);
});

test("status Worker exposes public API and its own minimal health identity", async () => {
  const worker = createStatusPageWorker({ statusResolver: async () => ({ contract:"test", environment:"staging", checkedAt:"2026-09-01T14:00:00.000Z", status:"operational", components:[] }) });
  const status = await worker.fetch(new Request("https://status.insidefibre.com/api/status"), {});
  assert.equal(status.status, 200);
  assert.equal((await status.json()).status, "operational");
  const health = await worker.fetch(new Request("https://status.insidefibre.com/healthz"), {});
  assert.equal((await health.json()).service, "status-page");
});

test("Admin app deployment can be verified without polling Admin during regular status health",async()=>{
  let inspected=0;
  const env=environment({
    FIBRE_DEPLOYMENT_GIT_SHA:"status-source",
    ADMIN_DASHBOARD:{async fetch(){
      inspected++;
      return Response.json({ok:true,deploymentGitSha:"admin-source"});
    }},
  });
  const worker=createStatusPageWorker();
  const normal=await worker.fetch(new Request("https://status.staging.insidefibre.com/healthz"),env);
  assert.equal((await normal.json()).deploymentGitSha,"status-source");
  assert.equal(inspected,0,"routine Status health probed Admin deployment");
  const accepted=await worker.fetch(new Request("https://status.staging.insidefibre.com/healthz?service=admin-dashboard"),env);
  assert.equal((await accepted.json()).deploymentGitSha,"admin-source",
    "Admin deployment revision was not available through its service binding");
  assert.equal(inspected,1);
});
