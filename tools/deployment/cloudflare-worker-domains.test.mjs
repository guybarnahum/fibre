import assert from "node:assert/strict";
import test from "node:test";

import { createWranglerAppDeploymentClient } from "./cloudflare-apps.mjs";
import { createWranglerDeploymentClient } from "./deploy-cloudflare.mjs";
import {
  createCloudflareWorkerDomainClient,
  ensureCloudflareWorkerDomain,
} from "./cloudflare-worker-domains.mjs";

function response(payload, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

test("Workers Domain API lists by hostname and attaches missing custom domain to exact Worker", async () => {
  const requests = [];
  const client = createCloudflareWorkerDomainClient({
    accountId: "account-id",
    apiToken: "secret-token",
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if ((options.method ?? "GET") === "GET") return response({ success: true, errors: [], result: [] });
      return response({
        success: true,
        errors: [],
        result: { id: "domain-id", hostname: "api.staging.insidefibre.com", service: "fibre-thread-presentation-staging" },
      });
    },
  });
  const result = await ensureCloudflareWorkerDomain({
    client,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  });
  assert.equal(result.status, "attached");
  assert.match(requests[0].url, /workers\/domains\?hostname=api\.staging\.insidefibre\.com/u);
  assert.equal(requests[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  });
  assert.equal(requests[1].options.headers.Authorization, "Bearer secret-token");
});

test("Workers Domain convergence reuses expected ownership and fails closed on a foreign Worker", async () => {
  let attachCalls = 0;
  const existing = {
    async listDomains() {
      return [{ id: "domain-id", hostname: "api.staging.insidefibre.com", service: "fibre-thread-presentation-staging" }];
    },
    async attachDomain() { attachCalls += 1; },
  };
  assert.equal((await ensureCloudflareWorkerDomain({
    client: existing,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  })).status, "existing");
  assert.equal(attachCalls, 0);

  const foreign = {
    async listDomains() {
      return [{ id: "domain-id", hostname: "api.staging.insidefibre.com", service: "other-worker" }];
    },
    async attachDomain() { throw new Error("must not reassign foreign domain"); },
  };
  await assert.rejects(ensureCloudflareWorkerDomain({
    client: foreign,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  }), /already attached to other-worker/u);
});

test("runtime deployment explicitly converges a generated custom domain after Worker upload", async () => {
  const calls = [];
  const domainClient = {
    async listDomains({ hostname }) { calls.push(`domain:list:${hostname}`); return []; },
    async attachDomain({ hostname, service }) {
      calls.push(`domain:attach:${hostname}:${service}`);
      return { id: "domain-id", hostname, service };
    },
  };
  const client = createWranglerDeploymentClient({
    workerDomainClient: domainClient,
    runner: async (args) => {
      calls.push(`wrangler:${args[0]}`);
      return { stdout: "Published https://worker.account.workers.dev", stderr: "", exitCode: 0 };
    },
    fetchImpl: async () => response({ ok: true, service: "thread-presentation" }),
  });
  const result = await client.deployService({
    configPath: "/repo/presentation.jsonc",
    workerName: "fibre-thread-presentation-staging",
    resolvedConfig: { routes: [{ pattern: "api.staging.insidefibre.com", custom_domain: true }] },
  });
  assert.equal(result.customDomain.status, "attached");
  assert.deepEqual(calls, [
    "wrangler:deploy",
    "domain:list:api.staging.insidefibre.com",
    "domain:attach:api.staging.insidefibre.com:fibre-thread-presentation-staging",
  ]);
});

test("app deployment attaches custom domain only for a live deployment, never a dry-run", async () => {
  const calls = [];
  const domainClient = {
    async listDomains({ hostname }) { calls.push(`domain:list:${hostname}`); return []; },
    async attachDomain({ hostname, service }) {
      calls.push(`domain:attach:${hostname}:${service}`);
      return { id: "domain-id", hostname, service };
    },
  };
  const client = createWranglerAppDeploymentClient({
    workerDomainClient: domainClient,
    runner: async (args) => { calls.push(`wrangler:${args.includes("--dry-run") ? "dry" : "live"}`); return { stdout: "", stderr: "", exitCode: 0 }; },
  });
  const resolvedConfig = {
    name: "fibre-status-page-staging",
    routes: [{ pattern: "status.staging.insidefibre.com", custom_domain: true }],
  };
  await client.deploy({ configPath: "/repo/status.jsonc", dryRun: true, resolvedConfig });
  await client.deploy({ configPath: "/repo/status.jsonc", dryRun: false, resolvedConfig });
  assert.deepEqual(calls, [
    "wrangler:dry",
    "wrangler:live",
    "domain:list:status.staging.insidefibre.com",
    "domain:attach:status.staging.insidefibre.com:fibre-status-page-staging",
  ]);
});
