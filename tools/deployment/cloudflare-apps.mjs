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
import { resolveCleanGitDeploymentSource } from "./deploy-cloudflare-evidence.mjs";

export const CLOUDFLARE_APP_DEPLOYMENT_VERSION = "fibre-cloudflare-app-deployment-v0.1";
export const CLOUDFLARE_APP_CONFIGS = Object.freeze({
  "admin-dashboard": "infra/deployments/admin-dashboard/cloudflare/wrangler.jsonc",
  "status-page": "infra/deployments/status-page/cloudflare/wrangler.jsonc",
});
export const CLOUDFLARE_APP_DEPLOY_ORDER = Object.freeze(["admin-dashboard", "status-page"]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function cloudflareAppDomain(pattern, environment) {
  const env = normalizeCloudflareEnvironment(environment);
  if (env === "production") return pattern;
  if (pattern === "admin.insidefibre.com") return "admin.staging.insidefibre.com";
  if (pattern === "status.insidefibre.com") return "status.staging.insidefibre.com";
  throw new TypeError(`staging domain mapping is not defined for ${pattern}`);
}

function activityDatabase(resourceState) {
  const matches = (resourceState?.resources?.d1 ?? []).filter((item) => item.binding === "ACTIVITY_LOG");
  if (matches.length !== 1 || !matches[0]?.id || !matches[0]?.name) throw new TypeError("Cloudflare operator state must contain one provisioned ACTIVITY_LOG D1 database");
  return matches[0];
}

function accessConfig(operatorConfig) {
  const teamDomain = nonEmpty("FIBRE_ACCESS_TEAM_DOMAIN", operatorConfig.FIBRE_ACCESS_TEAM_DOMAIN);
  const audience = nonEmpty("FIBRE_ACCESS_AUD", operatorConfig.FIBRE_ACCESS_AUD);
  let normalized;
  try { normalized = new URL(teamDomain.startsWith("https://") ? teamDomain : `https://${teamDomain}`).origin; }
  catch { throw new TypeError("FIBRE_ACCESS_TEAM_DOMAIN must be a valid Cloudflare Access team domain"); }
  if (!normalized.endsWith(".cloudflareaccess.com")) throw new TypeError("FIBRE_ACCESS_TEAM_DOMAIN must be a cloudflareaccess.com origin");
  return Object.freeze({ teamDomain: normalized, audience });
}

export function resolveCloudflareAppConfig(appId, baseConfig, { environment, resourceState, operatorConfig = {} } = {}) {
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
    const access = accessConfig(operatorConfig);
    config.vars.FIBRE_ACCESS_TEAM_DOMAIN = access.teamDomain;
    config.vars.FIBRE_ACCESS_AUD = access.audience;
  }

  if (appId === "status-page") {
    config.vars.VIEWER_ORIGIN = env === "production" ? "https://insidefibre.com" : "https://staging.insidefibre.com";
  }
  return config;
}

export async function loadCloudflareAppConfigs(repoRoot) {
  const configs = {};
  for (const [appId, path] of Object.entries(CLOUDFLARE_APP_CONFIGS)) configs[appId] = parseJsonc(await readFile(resolve(repoRoot, path), "utf8"), path);
  return configs;
}

export async function writeResolvedCloudflareAppConfigs({ repoRoot, environment, configs, resourceState, operatorConfig }) {
  const baseDir = resolve(repoRoot, ".fibre", "cloudflare", environment, "wrangler");
  await mkdir(baseDir, { recursive: true });
  const written = {};
  for (const appId of CLOUDFLARE_APP_DEPLOY_ORDER) {
    const resolvedConfig = resolveCloudflareAppConfig(appId, configs[appId], { environment, resourceState, operatorConfig });
    const path = resolve(baseDir, `${appId}.jsonc`);
    await writeFile(path, `${JSON.stringify(resolvedConfig, null, 2)}\n`, { mode: 0o600 });
    written[appId] = relative(repoRoot, path);
  }
  return Object.freeze(written);
}

export function createWranglerAppDeploymentClient({ runner = runWrangler, cwd = process.cwd() } = {}) {
  return Object.freeze({
    async deploy({ configPath, dryRun = false }) {
      const args = ["deploy"];
      if (dryRun) args.push("--dry-run");
      args.push("--config", configPath, "--experimental-provision=false", "--experimental-auto-create=false");
      return runner(args, { cwd });
    },
  });
}

export async function deployCloudflareApps({ repoRoot, environment, operatorConfig, dryRun = false, client, sourceResolver = resolveCleanGitDeploymentSource } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!client?.deploy) throw new TypeError("Cloudflare app deployment client is required");
  const source = await sourceResolver(repoRoot);
  const resourceState = await readCloudflareOperatorState({ repoRoot, environment: env });
  const configs = await loadCloudflareAppConfigs(repoRoot);
  const written = await writeResolvedCloudflareAppConfigs({ repoRoot, environment: env, configs, resourceState, operatorConfig });
  const deployments = [];
  for (const appId of CLOUDFLARE_APP_DEPLOY_ORDER) {
    const configPath = resolve(repoRoot, written[appId]);
    await client.deploy({ appId, configPath, dryRun });
    const resolved = parseJsonc(await readFile(configPath, "utf8"), configPath);
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
  const client = createWranglerAppDeploymentClient({ cwd: repoRoot });
  const result = await deployCloudflareApps({ repoRoot, environment: parsed.environment, operatorConfig, dryRun: parsed.dryRun, client });
  for (const deployment of result.evidence.deployments) console.log(`${parsed.dryRun ? "DRY" : "DEPLOY"} ${deployment.appId} https://${deployment.domain}`);
  console.log(`SOURCE ${result.evidence.sourceGitSha}`);
  console.log(`EVIDENCE ${result.evidencePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
