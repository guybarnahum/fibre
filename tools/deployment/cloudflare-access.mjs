import { normalizeCloudflareEnvironment } from "./cloudflare-operator.mjs";

export const CLOUDFLARE_ACCESS_CONFIGURATION_VERSION = "fibre-cloudflare-access-configuration-v0.3";

const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com/client/v4";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function adminAccessDomain(environment) {
  return normalizeCloudflareEnvironment(environment) === "production"
    ? "admin.insidefibre.com"
    : "admin.staging.insidefibre.com";
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

  async function request(path) {
    const response = await fetchImpl(`${CLOUDFLARE_API_ORIGIN}${accountPath}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    async listPolicies(appId) {
      return request(`/access/apps/${encodeURIComponent(nonEmpty("Access application id", appId))}/policies?per_page=100`);
    },
  });
}

function asArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value;
}

function includesEveryone(policy) {
  return Array.isArray(policy?.include) && policy.include.some((selector) => (
    selector !== null
    && typeof selector === "object"
    && Object.prototype.hasOwnProperty.call(selector, "everyone")
  ));
}

function isUnrestrictedPolicy(policy) {
  return (policy?.decision === "allow" || policy?.decision === "bypass") && includesEveryone(policy);
}

export async function inspectAdminAccess({ environment, client } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!client) throw new TypeError("Cloudflare Access client is required");
  const domain = adminAccessDomain(env);
  const organization = await client.getOrganization();
  const teamDomain = normalizedTeamDomain(organization?.auth_domain);

  const applications = asArray("Cloudflare Access applications", await client.listApplications({ domain }));
  if (applications.length !== 1) {
    throw new Error(`expected exactly one Cloudflare Access application protecting ${domain}; configure it in Zero Trust before deploying Fibre Admin`);
  }
  const application = applications[0];
  if (application?.type !== "self_hosted") throw new Error(`Cloudflare Access application for ${domain} must be self_hosted`);
  const appId = nonEmpty("Cloudflare Access application id", application.id);
  const audience = nonEmpty("Cloudflare Access application audience", application.aud);

  const policies = asArray("Cloudflare Access application policies", await client.listPolicies(appId));
  if (policies.some(isUnrestrictedPolicy)) {
    throw new Error(`Cloudflare Access application for ${domain} must not contain an unrestricted Everyone allow or bypass policy`);
  }
  const allowPolicies = policies.filter((policy) => policy?.decision === "allow");
  if (allowPolicies.length === 0) {
    throw new Error(`Cloudflare Access application for ${domain} must have at least one allow policy so authenticated users can reach the Fibre D1 authorization gate`);
  }

  return Object.freeze({
    contract: CLOUDFLARE_ACCESS_CONFIGURATION_VERSION,
    environment: env,
    domain,
    teamDomain,
    audience,
    appId,
    policyCount: policies.length,
    allowPolicyCount: allowPolicies.length,
  });
}
