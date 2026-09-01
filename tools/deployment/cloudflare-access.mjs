import { normalizeCloudflareEnvironment } from "./cloudflare-operator.mjs";

export const CLOUDFLARE_ACCESS_CONFIGURATION_VERSION = "fibre-cloudflare-access-configuration-v0.1";
export const FIBRE_ADMIN_ACCESS_POLICY_NAME = "Fibre Admin Operators";

const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com/client/v4";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function normalizedEmail(value) {
  const email = nonEmpty("Admin Access email", value).toLocaleLowerCase("en-US");
  if (!EMAIL_PATTERN.test(email)) throw new TypeError(`invalid Admin Access email ${value}`);
  return email;
}

export function adminAccessDomain(environment) {
  return normalizeCloudflareEnvironment(environment) === "production"
    ? "admin.insidefibre.com"
    : "admin.staging.insidefibre.com";
}

export function adminAccessApplicationName(environment) {
  return normalizeCloudflareEnvironment(environment) === "production"
    ? "Fibre Admin"
    : "Fibre Admin (staging)";
}

export function allowedAdminAccessEmails(operatorConfig = {}) {
  const raw = nonEmpty("FIBRE_ACCESS_ALLOWED_EMAILS", operatorConfig.FIBRE_ACCESS_ALLOWED_EMAILS);
  const emails = [...new Set(raw.split(",").map((value) => normalizedEmail(value)))].sort();
  if (emails.length === 0) throw new TypeError("FIBRE_ACCESS_ALLOWED_EMAILS must contain at least one email");
  return Object.freeze(emails);
}

export function buildAdminAccessPolicy(emails) {
  if (!Array.isArray(emails) || emails.length === 0) throw new TypeError("Admin Access policy requires at least one email");
  return Object.freeze({
    name: FIBRE_ADMIN_ACCESS_POLICY_NAME,
    decision: "allow",
    precedence: 1,
    include: Object.freeze(emails.map((email) => Object.freeze({ email: Object.freeze({ email: normalizedEmail(email) }) }))),
  });
}

function normalizedTeamDomain(authDomain) {
  const raw = nonEmpty("Cloudflare Access auth_domain", authDomain);
  let origin;
  try { origin = new URL(raw.startsWith("https://") ? raw : `https://${raw}`).origin; }
  catch { throw new TypeError("Cloudflare Access auth_domain is invalid"); }
  if (!origin.endsWith(".cloudflareaccess.com")) throw new TypeError("Cloudflare Access auth_domain must end in cloudflareaccess.com");
  return origin;
}

function cloudflareApiError(payload, response) {
  const detail = Array.isArray(payload?.errors) && payload.errors[0]?.message
    ? payload.errors[0].message
    : `${response.status} ${response.statusText}`;
  return new Error(`Cloudflare Access API request failed: ${detail}`);
}

export function createCloudflareAccessClient({ accountId, apiToken, fetchImpl = globalThis.fetch } = {}) {
  const account = nonEmpty("CLOUDFLARE_ACCOUNT_ID", accountId);
  const token = nonEmpty("CLOUDFLARE_API_TOKEN", apiToken);
  if (typeof fetchImpl !== "function") throw new TypeError("Cloudflare Access client requires fetch()");
  const accountPath = `/accounts/${encodeURIComponent(account)}`;

  async function request(path, { method = "GET", body = undefined } = {}) {
    const response = await fetchImpl(`${CLOUDFLARE_API_ORIGIN}${accountPath}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok || payload?.success !== true) throw cloudflareApiError(payload, response);
    return payload.result;
  }

  return Object.freeze({
    async getOrganization() {
      return request("/access/organizations");
    },
    async listApplications({ domain }) {
      const query = new URLSearchParams({ domain: nonEmpty("Access application domain", domain), exact: "true", per_page: "100" });
      return request(`/access/apps?${query}`);
    },
    async createApplication({ name, domain }) {
      return request("/access/apps", {
        method: "POST",
        body: {
          name: nonEmpty("Access application name", name),
          domain: nonEmpty("Access application domain", domain),
          type: "self_hosted",
          session_duration: "8h",
          app_launcher_visible: false,
        },
      });
    },
    async listPolicies(appId) {
      return request(`/access/apps/${encodeURIComponent(nonEmpty("Access application id", appId))}/policies?per_page=100`);
    },
    async createPolicy(appId, policy) {
      return request(`/access/apps/${encodeURIComponent(nonEmpty("Access application id", appId))}/policies`, {
        method: "POST",
        body: policy,
      });
    },
    async updatePolicy(appId, policyId, policy) {
      return request(`/access/apps/${encodeURIComponent(nonEmpty("Access application id", appId))}/policies/${encodeURIComponent(nonEmpty("Access policy id", policyId))}`, {
        method: "PUT",
        body: policy,
      });
    },
  });
}

function asArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value;
}

function managedPolicyMatches(policy, desiredEmails) {
  if (policy?.decision !== "allow") return false;
  if (Array.isArray(policy.require) && policy.require.length > 0) return false;
  if (Array.isArray(policy.exclude) && policy.exclude.length > 0) return false;
  if (!Array.isArray(policy.include)) return false;
  const actual = [];
  for (const rule of policy.include) {
    const email = rule?.email?.email;
    if (typeof email !== "string" || Object.keys(rule).length !== 1) return false;
    actual.push(normalizedEmail(email));
  }
  const expected = [...desiredEmails].sort();
  actual.sort();
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function reconcileAdminAccess({ environment, operatorConfig = {}, client, apply = true } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!client) throw new TypeError("Cloudflare Access client is required");
  const emails = allowedAdminAccessEmails(operatorConfig);
  const domain = adminAccessDomain(env);
  const applicationName = adminAccessApplicationName(env);
  const organization = await client.getOrganization();
  const teamDomain = normalizedTeamDomain(organization?.auth_domain);

  let applications = asArray("Cloudflare Access applications", await client.listApplications({ domain }));
  if (applications.length > 1) throw new Error(`multiple Cloudflare Access applications protect ${domain}`);
  let application = applications[0] ?? null;
  let applicationCreated = false;
  if (application === null) {
    if (!apply) throw new Error(`Cloudflare Access application for ${domain} does not exist; run without --dry-run to create it`);
    application = await client.createApplication({ name: applicationName, domain });
    applicationCreated = true;
  }
  if (application?.type !== "self_hosted") throw new Error(`Cloudflare Access application for ${domain} must be self_hosted`);
  const appId = nonEmpty("Cloudflare Access application id", application.id);
  const audience = nonEmpty("Cloudflare Access application audience", application.aud);

  const policies = asArray("Cloudflare Access application policies", await client.listPolicies(appId));
  const managed = policies.filter((policy) => policy?.name === FIBRE_ADMIN_ACCESS_POLICY_NAME);
  const unmanaged = policies.filter((policy) => policy?.name !== FIBRE_ADMIN_ACCESS_POLICY_NAME);
  if (managed.length > 1) throw new Error(`multiple ${FIBRE_ADMIN_ACCESS_POLICY_NAME} policies exist for ${domain}`);
  if (unmanaged.length > 0) {
    throw new Error(`unmanaged Cloudflare Access policies exist for ${domain}; refusing to risk a broader Admin allow path`);
  }

  const desiredPolicy = buildAdminAccessPolicy(emails);
  let policy = managed[0] ?? null;
  let policyChanged = false;
  if (policy === null) {
    if (!apply) throw new Error(`Cloudflare Access policy ${FIBRE_ADMIN_ACCESS_POLICY_NAME} does not exist; run without --dry-run to create it`);
    policy = await client.createPolicy(appId, desiredPolicy);
    policyChanged = true;
  } else if (!managedPolicyMatches(policy, emails)) {
    if (!apply) throw new Error(`Cloudflare Access policy ${FIBRE_ADMIN_ACCESS_POLICY_NAME} does not match FIBRE_ACCESS_ALLOWED_EMAILS`);
    policy = await client.updatePolicy(appId, nonEmpty("Cloudflare Access policy id", policy.id), desiredPolicy);
    policyChanged = true;
  }

  return Object.freeze({
    contract: CLOUDFLARE_ACCESS_CONFIGURATION_VERSION,
    environment: env,
    domain,
    teamDomain,
    audience,
    appId,
    policyId: nonEmpty("Cloudflare Access policy id", policy.id),
    principalCount: emails.length,
    changed: applicationCreated || policyChanged,
  });
}
