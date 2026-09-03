import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  normalizeCloudflareEnvironment,
  parseJsonc,
  repoRootFrom,
  runWrangler,
} from "./cloudflare-operator.mjs";

const execFile = promisify(execFileCallback);
const SERVICES = Object.freeze(new Set([
  "asset-generator",
  "thread-presentation",
  "world-kernel",
  "birth-center",
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

export async function deployCloudflareService({
  repoRoot,
  environment,
  service,
  runner = runWrangler,
  resolveSource = resolveCleanGitSha,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const serviceId = normalizeService(service);
  const root = resolve(nonEmpty("repoRoot", repoRoot));
  const sourceGitSha = await resolveSource(root);
  const resolvedPath = resolve(root, ".fibre", "cloudflare", env, "wrangler", `${serviceId}.jsonc`);
  let raw;
  try {
    raw = await readFileImpl(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(`resolved ${env} Wrangler config is missing for ${serviceId}; run npm run cloud:deploy -- --env ${env} once first`, { cause: error });
  }
  const prepared = prepareResolvedServiceConfig(parseJsonc(raw, resolvedPath), {
    environment: env,
    service: serviceId,
    gitSha: sourceGitSha,
  });
  const deployConfigPath = resolve(root, ".fibre", "cloudflare", env, "service-deploy", `${serviceId}.jsonc`);
  await mkdir(dirname(deployConfigPath), { recursive: true });
  await writeFileImpl(deployConfigPath, `${JSON.stringify(prepared.config, null, 2)}\n`, { mode: 0o600 });
  const result = await runner([
    "deploy",
    "--config", deployConfigPath,
    "--experimental-provision=false",
    "--experimental-auto-create=false",
  ], { cwd: root });
  return Object.freeze({
    environment: env,
    serviceId,
    workerName: prepared.workerName,
    sourceGitSha,
    configPath: deployConfigPath,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
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
