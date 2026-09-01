import test from "node:test";
import assert from "node:assert/strict";

import {
  authenticateAccessRequest,
  authorizeAdminPrincipal,
  buildAdminActivitySql,
  createAdminDashboardWorker,
  normalizeAdminPrincipalEmail,
  parseAdminActivityQuery,
  validateAccessClaims,
} from "./worker.mjs";

function activity(overrides = {}) {
  return {
    activityVersion: "fibre-runtime-activity-v0.1",
    activityId: "act_1",
    occurredAt: "2026-09-01T14:00:00.000Z",
    recordedAt: "2026-09-01T14:00:00.100Z",
    environment: "staging",
    service: "world-kernel",
    deploymentGitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    requestId: "req_1",
    genesisId: "gen_1",
    threadId: "thr_1",
    experienceId: null,
    sessionId: null,
    correlationId: "req_1",
    causationId: null,
    stage: "world.publication",
    status: "succeeded",
    attempt: 1,
    message: null,
    error: null,
    evidence: { eventId: "evt_1" },
    ...overrides,
  };
}

function fakeD1(records, { admins = {}, entitlementError = null } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...bindings) {
          calls.push({ sql, bindings });
          if (sql.startsWith("SELECT admin FROM fibre_admin_entitlements")) {
            return {
              all: async () => {
                if (entitlementError) throw entitlementError;
                const admin = admins[bindings[0]];
                return { results: admin === undefined ? [] : [{ admin }] };
              },
            };
          }
          return { all: async () => ({ results: records.map((record) => ({ record_json: JSON.stringify(record) })) }) };
        },
      };
    },
  };
}

function jwtPart(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

async function signedAccessToken({ privateKey, kid, claims }) {
  const header = jwtPart({ alg: "RS256", kid, typ: "JWT" });
  const payload = jwtPart(claims);
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(input),
  );
  return { token: `${input}.${Buffer.from(signature).toString("base64url")}`, input, signature: new Uint8Array(signature) };
}

test("activity query parser supports recent, failure, and exact identity views", () => {
  assert.equal(parseAdminActivityQuery(new URL("https://admin/activity?kind=recent&limit=50")).kind, "recent");
  assert.equal(parseAdminActivityQuery(new URL("https://admin/activity?kind=failures")).kind, "failures");
  assert.deepEqual(
    parseAdminActivityQuery(new URL("https://admin/activity?kind=thread&value=thr_1&status=failed&service=world-kernel")),
    { kind: "thread", value: "thr_1", service: "world-kernel", stage: null, status: "failed", before: null, limit: 100 },
  );
  assert.throws(() => parseAdminActivityQuery(new URL("https://admin/activity?kind=request")), /Fibre identifier/u);
  assert.throws(() => parseAdminActivityQuery(new URL("https://admin/activity?kind=recent&limit=500")), /between 1 and 200/u);
});

test("admin SQL is parameterized and exact identity chains are chronological", () => {
  const query = parseAdminActivityQuery(new URL("https://admin/activity?kind=request&value=req_1&service=birth-center&limit=50"));
  const built = buildAdminActivitySql({ environment: "staging", query });
  assert.match(built.sql, /request_id = \?/u);
  assert.match(built.sql, /service = \?/u);
  assert.match(built.sql, /ORDER BY occurred_at ASC/u);
  assert.deepEqual(built.bindings, ["staging", "req_1", "birth-center", 50]);

  const failures = buildAdminActivitySql({
    environment: "staging",
    query: parseAdminActivityQuery(new URL("https://admin/activity?kind=failures")),
  });
  assert.match(failures.sql, /status IN \('failed','retrying'\)/u);
  assert.match(failures.sql, /ORDER BY occurred_at DESC/u);
});

test("Admin principal email is normalized and authorized only by exact D1 admin=1", async () => {
  assert.equal(normalizeAdminPrincipalEmail({ email: " Operator@Example.COM " }), "operator@example.com");
  assert.equal(normalizeAdminPrincipalEmail({ email: "invalid" }), null);
  assert.equal(normalizeAdminPrincipalEmail({}), null);

  const d1 = fakeD1([], { admins: { "operator@example.com": 1, "disabled@example.com": 0 } });
  assert.equal(await authorizeAdminPrincipal({ ACTIVITY_LOG: d1 }, { email: "Operator@Example.com" }), true);
  assert.equal(await authorizeAdminPrincipal({ ACTIVITY_LOG: d1 }, { email: "disabled@example.com" }), false);
  assert.equal(await authorizeAdminPrincipal({ ACTIVITY_LOG: d1 }, { email: "missing@example.com" }), false);
  assert.deepEqual(d1.calls[0].bindings, ["operator@example.com"]);
});

test("Admin Worker verifies a signed Cloudflare Access JWT and exposes its email claim to the D1 gate", async () => {
  const teamDomain = "https://fibre-admin-test.cloudflareaccess.com";
  const audience = "admin-audience-test";
  const kid = "admin-test-key";
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = { ...(await crypto.subtle.exportKey("jwk", keyPair.publicKey)), kid, alg: "RS256", use: "sig" };
  const now = Math.floor(Date.now() / 1000);
  const signed = await signedAccessToken({
    privateKey: keyPair.privateKey,
    kid,
    claims: { aud: audience, iss: teamDomain, exp: now + 300, nbf: now - 10, email: "Operator@Example.com", sub: "access-user" },
  });
  const fetchImpl = async (url) => {
    assert.equal(url, `${teamDomain}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const env = { FIBRE_ACCESS_TEAM_DOMAIN: teamDomain, FIBRE_ACCESS_AUD: audience };
  const request = new Request("https://admin.staging.insidefibre.com/", { headers: { "Cf-Access-Jwt-Assertion": signed.token } });
  const claims = await authenticateAccessRequest(request, env, { fetchImpl });
  assert.equal(claims.email, "Operator@Example.com");
  assert.equal(normalizeAdminPrincipalEmail(claims), "operator@example.com");

  const tamperedSignature = Uint8Array.from(signed.signature);
  tamperedSignature[0] ^= 1;
  const tamperedToken = `${signed.input}.${Buffer.from(tamperedSignature).toString("base64url")}`;
  const forged = await authenticateAccessRequest(
    new Request("https://admin.staging.insidefibre.com/", { headers: { "Cf-Access-Jwt-Assertion": tamperedToken } }),
    env,
    { fetchImpl },
  );
  assert.equal(forged, null);
});

test("admin API requires both Access authentication and D1 Admin entitlement", async () => {
  const d1 = fakeD1([activity()], { admins: { "operator@example.com": 1 } });
  const worker = createAdminDashboardWorker({ authenticate: async () => ({ sub: "admin", email: "Operator@Example.com" }) });
  const response = await worker.fetch(new Request("https://admin.insidefibre.com/api/activity?kind=request&value=req_1"), {
    FIBRE_ENVIRONMENT: "staging",
    ACTIVITY_LOG: d1,
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.environment, "staging");
  assert.equal(payload.records.length, 1);
  assert.equal(payload.records[0].activityId, "act_1");
  assert.equal(payload.summary.failures, 0);
  assert.deepEqual(d1.calls[0].bindings, ["operator@example.com"]);
  assert.deepEqual(d1.calls[1].bindings, ["staging", "req_1", 100]);
});

test("authenticated non-admins and principals without email are denied", async () => {
  const d1 = fakeD1([], { admins: { "reader@example.com": 0 } });
  const nonAdmin = createAdminDashboardWorker({ authenticate: async () => ({ email: "reader@example.com" }) });
  const denied = await nonAdmin.fetch(new Request("https://admin.insidefibre.com/"), { ACTIVITY_LOG: d1 });
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "admin_required" });

  const noEmail = createAdminDashboardWorker({ authenticate: async () => ({ sub: "user" }) });
  const noEmailResponse = await noEmail.fetch(new Request("https://admin.insidefibre.com/"), { ACTIVITY_LOG: d1 });
  assert.equal(noEmailResponse.status, 403);
  assert.deepEqual(await noEmailResponse.json(), { error: "admin_required" });
});

test("Admin entitlement-store failure fails closed without impersonating non-admin", async () => {
  const d1 = fakeD1([], { admins: {}, entitlementError: new Error("D1 unavailable") });
  const worker = createAdminDashboardWorker({ authenticate: async () => ({ email: "operator@example.com" }) });
  const response = await worker.fetch(new Request("https://admin.insidefibre.com/"), { ACTIVITY_LOG: d1 });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "admin_authorization_unavailable" });
});

test("admin surface fails closed without an authenticated Access principal while health stays public", async () => {
  const worker = createAdminDashboardWorker({ authenticate: async () => null });
  const denied = await worker.fetch(new Request("https://admin.insidefibre.com/"), {});
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "access_required" });

  const health = await worker.fetch(new Request("https://admin.insidefibre.com/healthz"), {});
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, "admin-dashboard");
});

test("Access claims require expected audience, issuer, and live expiry", () => {
  const now = 1_800_000_000;
  const common = { aud: "aud_1", iss: "https://fibre.cloudflareaccess.com", exp: now + 60, nbf: now - 60 };
  assert.equal(validateAccessClaims(common, { audience: "aud_1", issuer: "https://fibre.cloudflareaccess.com", nowSeconds: now }), true);
  assert.equal(validateAccessClaims({ ...common, aud: "other" }, { audience: "aud_1", issuer: "https://fibre.cloudflareaccess.com", nowSeconds: now }), false);
  assert.equal(validateAccessClaims({ ...common, exp: now - 1 }, { audience: "aud_1", issuer: "https://fibre.cloudflareaccess.com", nowSeconds: now }), false);
});
