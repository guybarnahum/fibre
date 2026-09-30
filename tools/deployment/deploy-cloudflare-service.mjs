import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  CLOUDFLARE_SERVICE_CONFIGS,
  normalizeCloudflareEnvironment,
  parseJsonc,
  readCloudflareOperatorState,
  readCloudflareRuntimeConfig,
  repoRootFrom,
  resolveWranglerConfig,
  runWrangler,
} from "./cloudflare-operator.mjs";
import { relocateWranglerMain } from "./wrangler-config-paths.mjs";
import {
  d1BindingsFromConfig,
  ensureCloudflareD1Migrations,
} from "./cloudflare-d1-migrations.mjs";
import {
  createWranglerDeploymentClient,
  healthBaseUrlForDeployment,
} from "./deploy-cloudflare.mjs";

const execFile = promisify(execFileCallback);
const SERVICES = Object.freeze(new Set([
  "asset-generator",
  "thread-presentation",
  "world-kernel",
  "birth-center",
  "fibre-identity-authority",
]));
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function normalizeService(value) {
  const service = nonEmpty("service", value);
  if (!SERVICES.has(service)) {
    throw new TypeError(`unsupported Cloudflare service ${service}; expected ${[...SERVICES].join(", ")}`);
  }
  return service;
}

export async function resolveCleanGitSha(repoRoot, { execFileImpl = execFile } = {}) {
  const cwd = resolve(nonEmpty("repoRoot", repoRoot));
  const [{ stdout: head }, { stdout: status }] = await Promise.all([
    execFileImpl("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }),
    execFileImpl("git", ["status", "--porcelain", "--untracked-files=all"], { cwd, encoding: "utf8" }),
  ]);
  if (status.trim() !== "") {
    throw new Error("Cloud service deployment requires a clean Git working tree");
  }
  const gitSha = head.trim().toLowerCase();
  if (!GIT_SHA_PATTERN.test(gitSha)) throw new TypeError("Git HEAD must resolve to a full 40-character SHA");
  return gitSha;
}

export function prepareResolvedServiceConfig(config, { environment, service, gitSha } = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const serviceId = normalizeService(service);
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new TypeError("resolved Wrangler config is required");
  if (!GIT_SHA_PATTERN.test(gitSha ?? "")) throw new TypeError("gitSha must be a full lowercase 40-character SHA");
  const expectedSuffix = env === "production" ? "" : `-${env}`;
  const name = nonEmpty("resolved Wrangler worker name", config.name);
  if (expectedSuffix && !name.endsWith(expectedSuffix)) {
    throw new Error(`resolved Wrangler config ${name} does not target ${env}`);
  }
  const next = structuredClone(config);
  next.vars ??= {};
  next.vars.FIBRE_DEPLOYMENT_GIT_SHA = gitSha;
  return Object.freeze({ environment: env, serviceId, workerName: name, config: next });
}

export async function resolveCurrentServiceConfig({
  repoRoot,
  environment,
  service,
  readFileImpl = readFile,
  readOperatorState = readCloudflareOperatorState,
  readRuntimeConfig = readCloudflareRuntimeConfig,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const serviceId = normalizeService(service);
  const root = resolve(nonEmpty("repoRoot", repoRoot));
  const sourceConfigPath = CLOUDFLARE_SERVICE_CONFIGS[serviceId];
  if (!sourceConfigPath) throw new TypeError(`Wrangler source config is missing for ${serviceId}`);
  const [sourceText, resourceState, runtimeConfigByService] = await Promise.all([
    readFileImpl(resolve(root, sourceConfigPath), "utf8"),
    readOperatorState({ repoRoot:root, environment:env }),
    readRuntimeConfig({ repoRoot:root, environment:env }),
  ]);
  return Object.freeze({
    sourceConfigPath,
    config:resolveWranglerConfig(parseJsonc(sourceText, sourceConfigPath), {
      environment:env,
      resourceState,
      runtimeConfig:runtimeConfigByService[serviceId] ?? {},
    }),
  });
}

export async function acceptBirthCenterServiceDeployment({
  runner,
  cwd,
  prepared,
  deploymentOutput,
  fetchImpl = globalThis.fetch,
  privateToken = process.env.FIBRE_PRIVATE_TOKEN,
} = {}) {
  const client = createWranglerDeploymentClient({ runner, cwd, fetchImpl, privateToken });
  const baseUrl = healthBaseUrlForDeployment({
    serviceId:"birth-center",
    resolvedConfig:prepared.config,
    deploymentOutput,
  });
  const migration = await client.migrateBirthCenter({ baseUrl });
  const stateHealth = await client.checkStateHealth({ serviceId:"birth-center", baseUrl });
  const runtimeAcceptance = await client.checkBirthCenterRuntime({ baseUrl });
  return Object.freeze({ baseUrl, migration, stateHealth, runtimeAcceptance });
}

export async function deployCloudflareService({
  repoRoot,
  environment,
  service,
  runner = runWrangler,
  resolveSource = resolveCleanGitSha,
  resolveConfig = resolveCurrentServiceConfig,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  ensureD1MigrationsImpl = ensureCloudflareD1Migrations,
  acceptBirthCenterImpl = acceptBirthCenterServiceDeployment,
  print = console.log,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const serviceId = normalizeService(service);
  const root = resolve(nonEmpty("repoRoot", repoRoot));
  const sourceGitSha = await resolveSource(root);
  const current = await resolveConfig({
    repoRoot:root,
    environment:env,
    service:serviceId,
    readFileImpl,
  });
  const prepared = prepareResolvedServiceConfig(current.config, {
    environment:env,
    service:serviceId,
    gitSha:sourceGitSha,
  });
  const deployConfigPath = resolve(root, ".fibre", "cloudflare", env, "service-deploy", `${serviceId}.jsonc`);
  await mkdir(dirname(deployConfigPath), { recursive:true });
  const deployConfig = structuredClone(prepared.config);
  relocateWranglerMain(deployConfig, {
    repoRoot:root,
    sourceConfigPath:current.sourceConfigPath,
    generatedConfigPath:deployConfigPath,
  });
  await writeFileImpl(deployConfigPath, `${JSON.stringify(deployConfig, null, 2)}\n`, { mode:0o600 });
  await ensureD1MigrationsImpl({
    repoRoot:root,
    databases:d1BindingsFromConfig(deployConfig),
    runner,
    print,
  });
  print(`WORKER DEPLOY ${serviceId} -> ${prepared.workerName}`);
  const result = await runner([
    "deploy",
    "--config", deployConfigPath,
    "--experimental-provision=false",
    "--experimental-auto-create=false",
  ], { cwd: root });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const birthCenterAcceptance = serviceId === "birth-center"
    ? await acceptBirthCenterImpl({
        runner,
        cwd:root,
        prepared,
        deploymentOutput:`${stdout}\n${stderr}`,
      })
    : null;
  return Object.freeze({
    environment: env,
    serviceId,
    workerName: prepared.workerName,
    sourceGitSha,
    configPath: deployConfigPath,
    stdout,
    stderr,
    birthCenterAcceptance,
  });
}

function parseArgs(argv) {
  let environment = null;
  let service = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else if (argv[index] === "--service") service = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  if (!service) throw new TypeError("--service <service-id> is required");
  return { environment, service };
}

async function main(argv) {
  const { environment, service } = parseArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  const result = await deployCloudflareService({ repoRoot, environment, service });
  console.log(`Cloudflare service deployed: ${result.serviceId} -> ${result.workerName}`);
  console.log(`SOURCE  ${result.sourceGitSha}`);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (output) console.log(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
