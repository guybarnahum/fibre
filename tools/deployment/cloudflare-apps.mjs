import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  environmentResourceName,
  normalizeCloudflareEnvironment,
  parseJsonc,
  parseOperatorEnv,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "./cloudflare-operator.mjs";
import {
  adminAccessDomain,
  createCloudflareAccessClient,
  inspectAdminAccess,
} from "./cloudflare-access.mjs";
import { resolveCleanGitDeploymentSource } from "./deploy-cloudflare-evidence.mjs";
import {
  createCloudflareWorkerDomainClient,
  ensureCloudflareWorkerDomain,
} from "./cloudflare-worker-domains.mjs";
import { relocateWranglerMain } from "./wrangler-config-paths.mjs";

export const CLOUDFLARE_APP_DEPLOYMENT_VERSION = "fibre-cloudflare-app-deployment-v0.3";
export const CLOUDFLARE_APP_CONFIGS = Object.freeze({
  "admin-dashboard": "infra/deployments/admin-dashboard/cloudflare/wrangler.jsonc",
  "status-page": "infra/deployments/status-page/cloudflare/wrangler.jsonc",
});
export const CLOUDFLARE_APP_DEPLOY_ORDER = Object.freeze(["admin-dashboard", "status-page"]);
const STATUS_SERVICE_TARGETS = Object.freeze({
  BIRTH_CENTER: "fibre-birth-center",
  WORLD_KERNEL: "fibre-world-kernel",
  THREAD_PRESENTATION: "fibre-thread-presentation",
  ASSET_GENERATOR: "fibre-asset-generator",
});
const UNRESOLVED_VALUE_PATTERN = /replace[-_ ]?with|placeholder|change[-_ ]?me|\btodo\b/iu;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function deployedValue(name, value) {
  const normalized = nonEmpty(name, value);
  if (UNRESOLVED_VALUE_PATTERN.test(normalized)) throw new TypeError(`${name} must not contain an unresolved placeholder`);
  return normalized;
}

export function cloudflareAppDomain(pattern, environment) {
  const env = normalizeCloudflareEnvironment(environment);
  if (pattern === "admin.insidefibre.com") return adminAccessDomain(env);
  if (env === "production") return pattern;
  if (pattern === "status.insidefibre.com") return "status.staging.insidefibre.com";
  throw new TypeError(`staging domain mapping is not defined for ${pattern}`);
}

function activityDatabase(resourceState) {
  const matches = (resourceState?.resources?.d1 ?? []).filter((item) => item.binding === "ACTIVITY_LOG");
  if (matches.length !== 1 || !matches[0]?.id || !matches[0]?.name) throw new TypeError("Cloudflare operator state must contain one provisioned ACTIVITY_LOG D1 database");
  return matches[0];
}

function normalizedAccessConfig(accessConfig) {
  const teamDomain = nonEmpty("Cloudflare Access team domain", accessConfig?.teamDomain);
  const audience = nonEmpty("Cloudflare Access audience", accessConfig?.audience);
  let normalized;
  try { normalized = new URL(teamDomain.startsWith("https://") ? teamDomain : `https://${teamDomain}`).origin; }
  catch { throw new TypeError("Cloudflare Access team domain must be valid"); }
  if (!normalized.endsWith(".cloudflareaccess.com")) throw new TypeError("Cloudflare Access team domain must be a cloudflareaccess.com origin");
  return Object.freeze({ teamDomain: normalized, audience });
}

export function resolveCloudflareAppConfig(appId, baseConfig, { environment, resourceState, accessConfig = null } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!CLOUDFLARE_APP_DEPLOY_ORDER.includes(appId)) throw new TypeError(`unsupported Cloudflare app ${appId}`);
  const config = structuredClone(baseConfig);
  config.name = environmentResourceName(nonEmpty("Worker name", config.name), env);
  config.vars ??= {};
  config.vars.FIBRE_ENVIRONMENT = env;
  for (const route of config.routes ?? []) route.pattern = cloudflareAppDomain(nonEmpty("custom domain", route.pattern), env);
  for (const binding of config.services ?? []) binding.service = environmentResourceName(nonEmpty("service binding target", binding.service), env);

  if (appId === "admin-dashboard") {
    const activity = activityDatabase(resourceState);
    const databases = config.d1_databases ?? [];
    const database = databases.find((item) => item.binding === "ACTIVITY_LOG");
    if (!database) throw new TypeError("admin-dashboard must bind ACTIVITY_LOG");
    database.database_name = activity.name;
    database.database_id = activity.id;
    const access = normalizedAccessConfig(accessConfig);
    config.vars.FIBRE_ACCESS_TEAM_DOMAIN = access.teamDomain;
    config.vars.FIBRE_ACCESS_AUD = access.audience;
  }

  if (appId === "status-page") {
    config.vars.VIEWER_ORIGIN = env === "production" ? "https://insidefibre.com" : "https://staging.insidefibre.com";
  }
  return config;
}

export function validateResolvedCloudflareAppConfig(appId, config, { environment } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!CLOUDFLARE_APP_DEPLOY_ORDER.includes(appId)) throw new TypeError(`unsupported Cloudflare app ${appId}`);
  if (config?.vars?.FIBRE_ENVIRONMENT !== env) throw new TypeError(`${appId} FIBRE_ENVIRONMENT must be ${env}`);
  const routes = (config?.routes ?? []).filter((route) => route?.custom_domain === true);
  if (routes.length !== 1) throw new TypeError(`${appId} must declare exactly one custom domain`);
  const expectedDomain = appId === "admin-dashboard"
    ? adminAccessDomain(env)
    : cloudflareAppDomain("status.insidefibre.com", env);
  if (routes[0].pattern !== expectedDomain) throw new TypeError(`${appId} custom domain must be ${expectedDomain}`);

  if (appId === "admin-dashboard") {
    deployedValue("Admin Cloudflare Access team domain", config.vars?.FIBRE_ACCESS_TEAM_DOMAIN);
    deployedValue("Admin Cloudflare Access audience", config.vars?.FIBRE_ACCESS_AUD);
    const databases = (config?.d1_databases ?? []).filter((database) => database?.binding === "ACTIVITY_LOG");
    if (databases.length !== 1) throw new TypeError("admin-dashboard must resolve exactly one ACTIVITY_LOG D1 binding");
    deployedValue("Admin ACTIVITY_LOG database name", databases[0].database_name);
    deployedValue("Admin ACTIVITY_LOG database id", databases[0].database_id);
  }

  if (appId === "status-page") {
    const expectedViewer = env === "production" ? "https://insidefibre.com" : "https://staging.insidefibre.com";
    if (config.vars?.VIEWER_ORIGIN !== expectedViewer) throw new TypeError(`status-page VIEWER_ORIGIN must be ${expectedViewer}`);
    const services = config.services ?? [];
    if (services.length !== Object.keys(STATUS_SERVICE_TARGETS).length) throw new TypeError("status-page must resolve exactly the four Fibre runtime service bindings");
    for (const [binding, baseService] of Object.entries(STATUS_SERVICE_TARGETS)) {
      const matches = services.filter((service) => service?.binding === binding);
      if (matches.length !== 1) throw new TypeError(`status-page must resolve exactly one ${binding} service binding`);
      const expectedService = environmentResourceName(baseService, env);
      if (matches[0].service !== expectedService) throw new TypeError(`status-page ${binding} must target ${expectedService}`);
    }
  }
  return config;
}

export async function loadCloudflareAppConfigs(repoRoot) {
  const configs = {};
  for (const [appId, path] of Object.entries(CLOUDFLARE_APP_CONFIGS)) configs[appId] = parseJsonc(await readFile(resolve(repoRoot, path), "utf8"), path);
  return configs;
}

export async function writeResolvedCloudflareAppConfigs({ repoRoot, environment, configs, resourceState, accessConfig }) {
  const baseDir = resolve(repoRoot, ".fibre", "cloudflare", environment, "wrangler");
  await mkdir(baseDir, { recursive: true });
  const written = {};
  for (const appId of CLOUDFLARE_APP_DEPLOY_ORDER) {
    const resolvedConfig = resolveCloudflareAppConfig(appId, configs[appId], { environment, resourceState, accessConfig });
    validateResolvedCloudflareAppConfig(appId, resolvedConfig, { environment });
    const path = resolve(baseDir, `${appId}.jsonc`);
    relocateWranglerMain(resolvedConfig, {
      repoRoot,
      sourceConfigPath: CLOUDFLARE_APP_CONFIGS[appId],
      generatedConfigPath: path,
    });
    await writeFile(path, `${JSON.stringify(resolvedConfig, null, 2)}\n`, { mode: 0o600 });
    written[appId] = relative(repoRoot, path);
  }
  return Object.freeze(written);
}

export function createWranglerAppDeploymentClient({
  runner = runWrangler,
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  workerDomainClient = null,
} = {}) {
  let domains = workerDomainClient;
  function domainClient() {
    domains ??= createCloudflareWorkerDomainClient({ accountId, apiToken, fetchImpl });
    return domains;
  }
  return Object.freeze({
    async deploy({ configPath, dryRun = false, resolvedConfig = null }) {
      const args = ["deploy"];
      if (dryRun) args.push("--dry-run");
      args.push("--config", configPath, "--experimental-provision=false", "--experimental-auto-create=false");
      const result = await runner(args, { cwd });
      const customRoute = (resolvedConfig?.routes ?? []).find((route) => route?.custom_domain === true);
      if (!dryRun && customRoute?.pattern) {
        await ensureCloudflareWorkerDomain({
          client: domainClient(),
          hostname: customRoute.pattern,
          service: resolvedConfig.name,
        });
      }
      return result;
    },
  });
}

export async function deployCloudflareApps({
  repoRoot,
  environment,
  operatorConfig,
  dryRun = false,
  client,
  accessClient = null,
  sourceResolver = resolveCleanGitDeploymentSource,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!client?.deploy) throw new TypeError("Cloudflare app deployment client is required");
  const source = await sourceResolver(repoRoot);
  const resourceState = await readCloudflareOperatorState({ repoRoot, environment: env });
  const configs = await loadCloudflareAppConfigs(repoRoot);
  const cloudflareAccess = accessClient ?? createCloudflareAccessClient({
    accountId: operatorConfig?.CLOUDFLARE_ACCOUNT_ID,
    apiToken: operatorConfig?.CLOUDFLARE_API_TOKEN,
  });
  const access = await inspectAdminAccess({ environment: env, client: cloudflareAccess });
  const written = await writeResolvedCloudflareAppConfigs({
    repoRoot,
    environment: env,
    configs,
    resourceState,
    accessConfig: access,
  });
  const deployments = [];
  for (const appId of CLOUDFLARE_APP_DEPLOY_ORDER) {
    const configPath = resolve(repoRoot, written[appId]);
    const resolved = parseJsonc(await readFile(configPath, "utf8"), configPath);
    await client.deploy({ appId, configPath, dryRun, resolvedConfig: resolved });
    const route = (resolved.routes ?? []).find((item) => item.custom_domain === true);
    deployments.push(Object.freeze({ appId, workerName: resolved.name, domain: route?.pattern ?? null }));
  }
  const evidence = Object.freeze({
    contract: CLOUDFLARE_APP_DEPLOYMENT_VERSION,
    environment: env,
    sourceGitSha: source.gitSha,
    sourceTreeClean: source.workingTreeClean,
    dryRun,
    recordedAt: new Date().toISOString(),
    access: Object.freeze({
      contract: access.contract,
      domain: access.domain,
      teamDomain: access.teamDomain,
      audience: access.audience,
      appId: access.appId,
      policyCount: access.policyCount,
      allowPolicyCount: access.allowPolicyCount,
    }),
    deployments: Object.freeze(deployments),
  });
  const evidencePath = resolve(repoRoot, ".fibre", "cloudflare", env, "apps-deployment.json");
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  return Object.freeze({ evidence, evidencePath, wranglerConfigs: written });
}

function parseArgs(argv) {
  let environment = null;
  let file = null;
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else if (argv[index] === "--file") file = argv[++index] ?? null;
    else if (argv[index] === "--dry-run") dryRun = true;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  if (!file) throw new TypeError("--file <operator-config-file> is required");
  return Object.freeze({ environment, file, dryRun });
}

async function main(argv) {
  const parsed = parseArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  const operatorConfig = parseOperatorEnv(await readFile(resolve(repoRoot, parsed.file), "utf8"));
  const client = createWranglerAppDeploymentClient({
    cwd: repoRoot,
    accountId: operatorConfig.CLOUDFLARE_ACCOUNT_ID,
    apiToken: operatorConfig.CLOUDFLARE_API_TOKEN,
  });
  const result = await deployCloudflareApps({ repoRoot, environment: parsed.environment, operatorConfig, dryRun: parsed.dryRun, client });
  console.log(`ACCESS ${result.evidence.access.domain} policies=${result.evidence.access.policyCount} allow=${result.evidence.access.allowPolicyCount}`);
  for (const deployment of result.evidence.deployments) console.log(`${parsed.dryRun ? "DRY" : "DEPLOY"} ${deployment.appId} https://${deployment.domain}`);
  console.log(`SOURCE ${result.evidence.sourceGitSha}`);
  console.log(`EVIDENCE ${result.evidencePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
