import assert from "node:assert/strict";
import test from "node:test";

import {
  adminAccessDomain,
  createCloudflareAccessClient,
  inspectAdminAccess,
} from "./cloudflare-access.mjs";

test("Admin Access uses isolated staging and production hostnames", () => {
  assert.equal(adminAccessDomain("staging"), "admin.staging.insidefibre.com");
  assert.equal(adminAccessDomain("production"), "admin.insidefibre.com");
});

test("Admin Access inspection discovers JWT verification configuration without mutating policies", async () => {
  const calls = [];
  const client = {
    async getOrganization() { calls.push(["organization"]); return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications({ domain }) {
      calls.push(["applications", domain]);
      return [{ id: "app-staging", aud: "aud-staging", type: "self_hosted", domain }];
    },
    async listPolicies(appId) {
      calls.push(["policies", appId]);
      return [
        { id: "policy-allow", decision: "allow", include: [{ email_domain: { domain: "example.com" } }] },
        { id: "policy-bypass", decision: "bypass", include: [{ everyone: {} }] },
      ];
    },
  };

  const result = await inspectAdminAccess({ environment: "staging", client });
  assert.equal(result.domain, "admin.staging.insidefibre.com");
  assert.equal(result.teamDomain, "https://fibre.cloudflareaccess.com");
  assert.equal(result.audience, "aud-staging");
  assert.equal(result.appId, "app-staging");
  assert.equal(result.policyCount, 2);
  assert.equal(result.allowPolicyCount, 1);
  assert.deepEqual(calls, [
    ["organization"],
    ["applications", "admin.staging.insidefibre.com"],
    ["policies", "app-staging"],
  ]);
});

test("Admin Access inspection requires one self-hosted application and an allow policy", async () => {
  const base = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
  };

  await assert.rejects(
    inspectAdminAccess({
      environment: "staging",
      client: { ...base, async listApplications() { return []; } },
    }),
    /expected exactly one Cloudflare Access application/u,
  );

  await assert.rejects(
    inspectAdminAccess({
      environment: "staging",
      client: {
        ...base,
        async listApplications() { return [{ id: "app", aud: "aud", type: "saas" }]; },
      },
    }),
    /must be self_hosted/u,
  );

  await assert.rejects(
    inspectAdminAccess({
      environment: "staging",
      client: {
        ...base,
        async listApplications() { return [{ id: "app", aud: "aud", type: "self_hosted" }]; },
        async listPolicies() { return [{ id: "bypass", decision: "bypass" }]; },
      },
    }),
    /at least one allow policy/u,
  );
});

test("Cloudflare Access client uses read-only account endpoints", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const result = url.endsWith("/access/organizations")
      ? { auth_domain: "fibre.cloudflareaccess.com" }
      : url.includes("/policies")
        ? [{ id: "policy", decision: "allow" }]
        : [{ id: "app", aud: "aud", type: "self_hosted" }];
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createCloudflareAccessClient({ accountId: "account-1", apiToken: "token-1", fetchImpl });
  await client.getOrganization();
  await client.listApplications({ domain: "admin.staging.insidefibre.com" });
  await client.listPolicies("app");
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.init.method, undefined);
    assert.equal(request.init.headers.Authorization, "Bearer token-1");
  }
  assert.match(requests[0].url, /\/accounts\/account-1\/access\/organizations$/u);
  assert.match(requests[1].url, /\/accounts\/account-1\/access\/apps\?/u);
  assert.match(requests[2].url, /\/accounts\/account-1\/access\/apps\/app\/policies\?/u);
});
