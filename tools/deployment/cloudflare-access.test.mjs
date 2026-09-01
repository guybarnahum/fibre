import assert from "node:assert/strict";
import test from "node:test";

import {
  FIBRE_ADMIN_ACCESS_POLICY_NAME,
  adminAccessDomain,
  allowedAdminAccessEmails,
  buildAdminAccessPolicy,
  reconcileAdminAccess,
} from "./cloudflare-access.mjs";

test("Admin Access principals are explicit exact emails", () => {
  assert.deepEqual(
    allowedAdminAccessEmails({ FIBRE_ACCESS_ALLOWED_EMAILS: "SECOND@example.com, first@example.com, second@example.com" }),
    ["first@example.com", "second@example.com"],
  );
  assert.throws(() => allowedAdminAccessEmails({}), /FIBRE_ACCESS_ALLOWED_EMAILS/u);
  assert.throws(() => allowedAdminAccessEmails({ FIBRE_ACCESS_ALLOWED_EMAILS: "not-an-email" }), /invalid Admin Access email/u);
});

test("Admin Access policy contains only exact-email allow rules", () => {
  assert.deepEqual(buildAdminAccessPolicy(["operator@example.com"]), {
    name: FIBRE_ADMIN_ACCESS_POLICY_NAME,
    decision: "allow",
    precedence: 1,
    include: [{ email: { email: "operator@example.com" } }],
  });
});

test("staging Admin Access bootstrap creates self-hosted app and managed allow policy", async () => {
  const calls = [];
  const client = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications({ domain }) { calls.push(["list-apps", domain]); return []; },
    async createApplication(input) {
      calls.push(["create-app", input]);
      return { id: "app-staging", aud: "aud-staging", type: "self_hosted", ...input };
    },
    async listPolicies(appId) { calls.push(["list-policies", appId]); return []; },
    async createPolicy(appId, policy) {
      calls.push(["create-policy", appId, policy]);
      return { id: "policy-staging", ...policy };
    },
    async updatePolicy() { throw new Error("unexpected update"); },
  };

  const result = await reconcileAdminAccess({
    environment: "staging",
    operatorConfig: { FIBRE_ACCESS_ALLOWED_EMAILS: "operator@example.com" },
    client,
  });

  assert.equal(result.domain, "admin.staging.insidefibre.com");
  assert.equal(result.teamDomain, "https://fibre.cloudflareaccess.com");
  assert.equal(result.audience, "aud-staging");
  assert.equal(result.appId, "app-staging");
  assert.equal(result.policyId, "policy-staging");
  assert.equal(result.principalCount, 1);
  assert.equal(result.changed, true);
  assert.equal(calls[1][1].domain, "admin.staging.insidefibre.com");
  assert.deepEqual(calls[3][2].include, [{ email: { email: "operator@example.com" } }]);
});

test("Admin Access reconciliation is idempotent when the managed policy already matches", async () => {
  const client = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications() { return [{ id: "app", aud: "aud", type: "self_hosted" }]; },
    async listPolicies() {
      return [{
        id: "policy",
        name: FIBRE_ADMIN_ACCESS_POLICY_NAME,
        decision: "allow",
        precedence: 1,
        include: [{ email: { email: "operator@example.com" } }],
        require: [],
        exclude: [],
      }];
    },
    async createApplication() { throw new Error("unexpected create app"); },
    async createPolicy() { throw new Error("unexpected create policy"); },
    async updatePolicy() { throw new Error("unexpected update policy"); },
  };
  const result = await reconcileAdminAccess({
    environment: "staging",
    operatorConfig: { FIBRE_ACCESS_ALLOWED_EMAILS: "operator@example.com" },
    client,
  });
  assert.equal(result.changed, false);
});

test("Admin Access reconciliation updates only its named managed policy", async () => {
  let updated = null;
  const client = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications() { return [{ id: "app", aud: "aud", type: "self_hosted" }]; },
    async listPolicies() {
      return [{ id: "policy", name: FIBRE_ADMIN_ACCESS_POLICY_NAME, decision: "allow", include: [{ email: { email: "old@example.com" } }] }];
    },
    async updatePolicy(appId, policyId, policy) { updated = { appId, policyId, policy }; return { id: policyId, ...policy }; },
    async createApplication() { throw new Error("unexpected create app"); },
    async createPolicy() { throw new Error("unexpected create policy"); },
  };
  const result = await reconcileAdminAccess({
    environment: "staging",
    operatorConfig: { FIBRE_ACCESS_ALLOWED_EMAILS: "new@example.com" },
    client,
  });
  assert.equal(result.changed, true);
  assert.deepEqual(updated.policy.include, [{ email: { email: "new@example.com" } }]);
});

test("Admin Access reconciliation refuses unmanaged policies that could widen access", async () => {
  const client = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications() { return [{ id: "app", aud: "aud", type: "self_hosted" }]; },
    async listPolicies() { return [{ id: "other", name: "Everyone", decision: "allow", include: [{ everyone: {} }] }]; },
  };
  await assert.rejects(
    reconcileAdminAccess({
      environment: "staging",
      operatorConfig: { FIBRE_ACCESS_ALLOWED_EMAILS: "operator@example.com" },
      client,
    }),
    /unmanaged Cloudflare Access policies/u,
  );
});

test("Admin Access dry-run validates existing configuration and never bootstraps it", async () => {
  assert.equal(adminAccessDomain("staging"), "admin.staging.insidefibre.com");
  const client = {
    async getOrganization() { return { auth_domain: "fibre.cloudflareaccess.com" }; },
    async listApplications() { return []; },
  };
  await assert.rejects(
    reconcileAdminAccess({
      environment: "staging",
      operatorConfig: { FIBRE_ACCESS_ALLOWED_EMAILS: "operator@example.com" },
      client,
      apply: false,
    }),
    /run without --dry-run/u,
  );
});
