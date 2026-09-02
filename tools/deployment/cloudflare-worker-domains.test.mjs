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

function domainResult({ hostname = "api.staging.insidefibre.com", service = "fibre-thread-presentation-staging" } = {}) {
  return {
    id: "domain-id",
    cert_id: "cert-id",
    hostname,
    service,
    zone_id: "zone-id",
    zone_name: "insidefibre.com",
    environment: "production",
  };
}

function cloudflareNsResponse() {
  return response({
    Status: 0,
    Answer: [
      { name: "insidefibre.com.", type: 2, TTL: 300, data: "ada.ns.cloudflare.com." },
      { name: "insidefibre.com.", type: 2, TTL: 300, data: "bob.ns.cloudflare.com." },
    ],
  });
}

test("Workers Domain API attaches missing custom domain and verifies public Cloudflare delegation", async () => {
  const requests = [];
  const client = createCloudflareWorkerDomainClient({
    accountId: "account-id",
    apiToken: "secret-token",
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).startsWith("https://dns.google/")) return cloudflareNsResponse();
      if ((options.method ?? "GET") === "GET") return response({ success: true, errors: [], result: [] });
      return response({ success: true, errors: [], result: domainResult() });
    },
  });
  const result = await ensureCloudflareWorkerDomain({
    client,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  });
  assert.equal(result.status, "attached");
  assert.equal(result.zoneName, "insidefibre.com");
  assert.equal(result.certId, "cert-id");
  assert.deepEqual(result.delegation.nameservers, ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"]);
  assert.match(requests[0].url, /workers\/domains\?hostname=api\.staging\.insidefibre\.com/u);
  assert.equal(requests[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  });
  assert.equal(requests[1].options.headers.Authorization, "Bearer secret-token");
  assert.match(requests[2].url, /^https:\/\/dns\.google\/resolve\?.*name=insidefibre\.com.*type=NS/u);
});

test("Workers Domain convergence reuses expected ownership and fails closed on a foreign Worker", async () => {
  let attachCalls = 0;
  const existing = {
    async listDomains() { return [domainResult()]; },
    async attachDomain() { attachCalls += 1; },
    async assertPublicDelegation({ zoneName }) { return { zoneName, nameservers: ["ada.ns.cloudflare.com"] }; },
  };
  assert.equal((await ensureCloudflareWorkerDomain({
    client: existing,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  })).status, "existing");
  assert.equal(attachCalls, 0);

  const foreign = {
    async listDomains() { return [domainResult({ service: "other-worker" })]; },
    async attachDomain() { throw new Error("must not reassign foreign domain"); },
    async assertPublicDelegation() { throw new Error("must not inspect foreign domain"); },
  };
  await assert.rejects(ensureCloudflareWorkerDomain({
    client: foreign,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  }), /already attached to other-worker/u);
});

test("Workers Domain convergence fails fast when registrar delegation is not Cloudflare", async () => {
  const client = createCloudflareWorkerDomainClient({
    accountId: "account-id",
    apiToken: "secret-token",
    fetchImpl: async (url) => {
      if (String(url).startsWith("https://dns.google/")) {
        return response({ Status: 0, Answer: [
          { name: "insidefibre.com.", type: 2, TTL: 300, data: "ns1.registrar.example." },
          { name: "insidefibre.com.", type: 2, TTL: 300, data: "ns2.registrar.example." },
        ] });
      }
      return response({ success: true, errors: [], result: [domainResult()] });
    },
  });
  await assert.rejects(ensureCloudflareWorkerDomain({
    client,
    hostname: "api.staging.insidefibre.com",
    service: "fibre-thread-presentation-staging",
  }), /not delegated to Cloudflare nameservers.*ns1\.registrar\.example.*registrar nameservers/iu);
});

test("runtime deployment explicitly converges a generated custom domain after Worker upload", async () => {
  const calls = [];
  const domainClient = {
    async listDomains({ hostname }) { calls.push(`domain:list:${hostname}`); return []; },
    async attachDomain({ hostname, service }) {
      calls.push(`domain:attach:${hostname}:${service}`);
      return domainResult({ hostname, service });
    },
    async assertPublicDelegation({ zoneName }) {
      calls.push(`domain:dns:${zoneName}`);
      return { zoneName, nameservers: ["ada.ns.cloudflare.com"] };
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
    "domain:dns:insidefibre.com",
  ]);
});

test("app deployment attaches custom domain only for a live deployment, never a dry-run", async () => {
  const calls = [];
  const domainClient = {
    async listDomains({ hostname }) { calls.push(`domain:list:${hostname}`); return []; },
    async attachDomain({ hostname, service }) {
      calls.push(`domain:attach:${hostname}:${service}`);
      return domainResult({ hostname, service });
    },
    async assertPublicDelegation({ zoneName }) {
      calls.push(`domain:dns:${zoneName}`);
      return { zoneName, nameservers: ["ada.ns.cloudflare.com"] };
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
    "domain:dns:insidefibre.com",
  ]);
});
