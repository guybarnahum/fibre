import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CLOUDFLARE_WRANGLER_VERSION = "4.126.0";
export const CLOUDFLARE_OPERATOR_STATE_VERSION = "fibre-cloudflare-operator-state-v0.1";
export const CLOUDFLARE_ENVIRONMENTS = Object.freeze(["staging", "production"]);

export const CLOUDFLARE_SERVICE_CONFIGS = Object.freeze({
  "asset-generator": "infra/deployments/asset-generator/cloudflare/wrangler.jsonc",
  "birth-center": "infra/deployments/birth-center/cloudflare/wrangler.jsonc",
  "thread-presentation": "infra/deployments/thread-presentation/cloudflare/wrangler.jsonc",
  "world-kernel": "infra/deployments/world-kernel/cloudflare/wrangler.jsonc",
});

const SERVICE_ORDER = Object.freeze([
  "asset-generator",
  "thread-presentation",
  "world-kernel",
  "birth-center",
]);

const RUNTIME_CONFIG_BY_SERVICE = Object.freeze({
  "asset-generator": Object.freeze(["C2PA_SIGNER_URL", "C2PA_SIGNER_ID", "C2PA_TRUST_POLICY"]),
  "birth-center": Object.freeze([]),
  "thread-presentation": Object.freeze(["C2PA_SIGNER_URL", "C2PA_SIGNER_ID", "C2PA_TRUST_POLICY", "VIEWER_ORIGIN"]),
  "world-kernel": Object.freeze([]),
});

const REQUIRED_RUNTIME_CONFIG_BY_SERVICE = Object.freeze({
  "asset-generator": Object.freeze(["C2PA_SIGNER_URL"]),
  "birth-center": Object.freeze([]),
  "thread-presentation": Object.freeze(["C2PA_SIGNER_URL"]),
  "world-kernel": Object.freeze([]),
});

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function normalizeCloudflareEnvironment(value) {
  const environment = nonEmpty("environment", value);
  if (!CLOUDFLARE_ENVIRONMENTS.includes(environment)) {
    throw new TypeError(`unsupported Cloudflare environment ${environment}; expected staging or production`);
  }
  return environment;
}

function stripJsonComments(text) {
  let output = "";
  let stringQuote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        output += char;
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      } else if (char === "\n") {
        output += char;
      }
      continue;
    }
    if (stringQuote !== null) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (char === '"') {
      stringQuote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    output += char;
  }
  if (blockComment || stringQuote !== null) throw new TypeError("unterminated JSONC content");
  return output;
}

export function parseJsonc(text, name = "JSONC") {
  if (typeof text !== "string") throw new TypeError(`${name} must be text`);
  try {
    return JSON.parse(stripJsonComments(text));
  } catch (error) {
    throw new TypeError(`${name} is invalid JSONC: ${error.message}`);
  }
}

export function environmentResourceName(baseName, environment) {
  const base = nonEmpty("resource name", baseName);
  const env = normalizeCloudflareEnvironment(environment);
  return env === "production" ? base : `${base}-${env}`;
}

function environmentDomain(pattern, environment) {
  const env = normalizeCloudflareEnvironment(environment);
  if (env === "production") return pattern;
  if (pattern === "api.insidefibre.com") return "api.staging.insidefibre.com";
  if (pattern === "insidefibre.com") return "staging.insidefibre.com";
  return pattern;
}

function clone(value) {
  return structuredClone(value);
}

function requireBinding(config, path, label) {
  const value = path.reduce((current, key) => current?.[key], config);
  if (!value) throw new TypeError(`${label} is required in Wrangler configuration`);
  return value;
}

export function createCloudflareResourcePlan(configs, { environment }) {
  const env = normalizeCloudflareEnvironment(environment);
  for (const serviceId of SERVICE_ORDER) {
    if (!configs?.[serviceId]) throw new TypeError(`missing Wrangler configuration for ${serviceId}`);
  }

  const asset = configs["asset-generator"];
  const presentation = configs["thread-presentation"];
  const world = configs["world-kernel"];
  const birth = configs["birth-center"];

  const assetBucket = requireBinding(asset, ["r2_buckets", 0, "bucket_name"], "Asset Generator R2 bucket");
  const presentationBucket = requireBinding(presentation, ["r2_buckets", 0, "bucket_name"], "Thread Presentation R2 bucket");
  if (assetBucket !== presentationBucket) throw new TypeError("Asset Generator and Thread Presentation must share the declared presentation R2 bucket");

  const catalogBinding = requireBinding(presentation, ["d1_databases", 0, "binding"], "Thread Presentation D1 binding");
  const catalogBaseName = presentation.d1_databases[0].database_name ?? "fibre-presentation-catalog";
  const completionQueue = requireBinding(asset, ["queues", "producers", 0, "queue"], "Asset completion queue");
  const presentationQueue = requireBinding(presentation, ["queues", "consumers", 0, "queue"], "Presentation completion queue");
  if (completionQueue !== presentationQueue) throw new TypeError("Asset Generator producer and Thread Presentation consumer must declare the same completion queue");
  const completionDlq = requireBinding(presentation, ["queues", "consumers", 0, "dead_letter_queue"], "Asset completion DLQ");
  const assetWorkflow = requireBinding(asset, ["workflows", 0, "name"], "Asset Generation Workflow");
  const presentationWorkflow = requireBinding(presentation, ["workflows", 0, "name"], "Presentation Workflow binding");
  if (assetWorkflow !== presentationWorkflow) throw new TypeError("Asset Generator and Thread Presentation must declare the same Workflow name");

  const workers = Object.freeze(Object.fromEntries(SERVICE_ORDER.map((serviceId) => [
    serviceId,
    environmentResourceName(configs[serviceId].name, env),
  ])));

  return Object.freeze({
    environment: env,
    create: Object.freeze({
      d1: Object.freeze([{ binding: catalogBinding, name: environmentResourceName(catalogBaseName, env) }]),
      r2: Object.freeze([{ name: environmentResourceName(assetBucket, env) }]),
      queues: Object.freeze([
        { role: "completion", name: environmentResourceName(completionQueue, env) },
        { role: "dead-letter", name: environmentResourceName(completionDlq, env) },
      ]),
    }),
    deployManaged: Object.freeze({
      workers,
      durableObjects: Object.freeze([
        { serviceId: "world-kernel", className: requireBinding(world, ["durable_objects", "bindings", 0, "class_name"], "World Durable Object") },
        { serviceId: "birth-center", className: requireBinding(birth, ["durable_objects", "bindings", 0, "class_name"], "Birth Durable Object") },
        { serviceId: "thread-presentation", className: requireBinding(presentation, ["durable_objects", "bindings", 0, "class_name"], "Presentation Durable Object") },
      ]),
      workflows: Object.freeze([{ name: environmentResourceName(assetWorkflow, env), serviceId: "asset-generator" }]),
      serviceBindings: Object.freeze(SERVICE_ORDER.flatMap((serviceId) => (configs[serviceId].services ?? []).map((binding) => ({
        serviceId,
        binding: binding.binding,
        target: environmentResourceName(binding.service, env),
      })))),
      customDomains: Object.freeze((presentation.routes ?? []).filter((route) => route.custom_domain === true).map((route) => environmentDomain(route.pattern, env))),
    }),
    externalRequired: Object.freeze({
      viewerDomain: env === "production" ? "insidefibre.com" : "staging.insidefibre.com",
    }),
  });
}

export function resolveWranglerConfig(baseConfig, { environment, resourceState, runtimeConfig = {} }) {
  const env = normalizeCloudflareEnvironment(environment);
  const config = clone(baseConfig);
  config.name = environmentResourceName(config.name, env);

  for (const bucket of config.r2_buckets ?? []) bucket.bucket_name = environmentResourceName(bucket.bucket_name, env);
  for (const database of config.d1_databases ?? []) {
    const baseName = database.database_name ?? "fibre-presentation-catalog";
    database.database_name = environmentResourceName(baseName, env);
    const match = resourceState.resources.d1.find((item) => item.name === database.database_name);
    if (!match?.id) throw new TypeError(`missing provisioned D1 id for ${database.database_name}`);
    database.database_id = match.id;
  }
  for (const producer of config.queues?.producers ?? []) producer.queue = environmentResourceName(producer.queue, env);
  for (const consumer of config.queues?.consumers ?? []) {
    consumer.queue = environmentResourceName(consumer.queue, env);
    consumer.dead_letter_queue = environmentResourceName(consumer.dead_letter_queue, env);
  }
  for (const workflow of config.workflows ?? []) {
    workflow.name = environmentResourceName(workflow.name, env);
    if (workflow.script_name) workflow.script_name = environmentResourceName(workflow.script_name, env);
  }
  for (const service of config.services ?? []) service.service = environmentResourceName(service.service, env);
  for (const route of config.routes ?? []) route.pattern = environmentDomain(route.pattern, env);
  if (config.vars?.VIEWER_ORIGIN && env === "staging") config.vars.VIEWER_ORIGIN = "https://staging.insidefibre.com";
  config.vars ??= {};
  for (const [key, value] of Object.entries(runtimeConfig)) config.vars[key] = value;
  return config;
}

export async function loadCloudflareWranglerConfigs(repoRoot) {
  const configs = {};
  for (const [serviceId, path] of Object.entries(CLOUDFLARE_SERVICE_CONFIGS)) {
    configs[serviceId] = parseJsonc(await readFile(resolve(repoRoot, path), "utf8"), path);
  }
  return configs;
}

export function parseOperatorEnv(text) {
  if (typeof text !== "string") throw new TypeError("operator config file must be text");
  const values = {};
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) throw new TypeError(`operator config line ${index + 1} must be KEY=value`);
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key)) throw new TypeError(`operator config line ${index + 1} has invalid key ${key}`);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return Object.freeze(values);
}

export function secretInventory(configs) {
  return Object.freeze(Object.fromEntries(SERVICE_ORDER.map((serviceId) => [
    serviceId,
    Object.freeze([...(configs[serviceId].secrets?.required ?? [])]),
  ])));
}

export function runtimeConfigInventory(configs) {
  return Object.freeze(Object.fromEntries(SERVICE_ORDER.map((serviceId) => {
    const allowed = RUNTIME_CONFIG_BY_SERVICE[serviceId];
    const existing = configs[serviceId].vars ?? {};
    const required = REQUIRED_RUNTIME_CONFIG_BY_SERVICE[serviceId];
    return [serviceId, Object.freeze({
      allowed,
      required,
      existing: Object.freeze(Object.fromEntries(allowed.filter((key) => Object.hasOwn(existing, key)).map((key) => [key, existing[key]]))),
    })];
  })));
}

export async function writeResolvedWranglerConfigs({ repoRoot, environment, configs, resourceState, runtimeConfigByService = {} }) {
  const baseDir = resolve(repoRoot, ".fibre", "cloudflare", environment, "wrangler");
  await mkdir(baseDir, { recursive: true });
  const written = {};
  for (const serviceId of SERVICE_ORDER) {
    const resolvedConfig = resolveWranglerConfig(configs[serviceId], {
      environment,
      resourceState,
      runtimeConfig: runtimeConfigByService[serviceId] ?? {},
    });
    const path = resolve(baseDir, `${serviceId}.jsonc`);
    await writeFile(path, `${JSON.stringify(resolvedConfig, null, 2)}\n`, { mode: 0o600 });
    written[serviceId] = relative(repoRoot, path);
  }
  return Object.freeze(written);
}


export async function writeCloudflareRuntimeConfig({ repoRoot, environment, runtimeConfigByService }) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "runtime-config.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ environment, services: runtimeConfigByService }, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function readCloudflareRuntimeConfig({ repoRoot, environment }) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "runtime-config.json");
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (value.environment !== environment || !value.services || typeof value.services !== "object") {
      throw new TypeError(`Cloudflare runtime config environment mismatch: ${String(value.environment)}`);
    }
    return value.services;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export async function writeCloudflareOperatorState({ repoRoot, environment, resourceState }) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "resources.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(resourceState, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function readCloudflareOperatorState({ repoRoot, environment }) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "resources.json");
  const state = JSON.parse(await readFile(path, "utf8"));
  if (state.contract !== CLOUDFLARE_OPERATOR_STATE_VERSION) throw new TypeError(`unsupported Cloudflare operator state ${String(state.contract)}`);
  if (state.environment !== environment) throw new TypeError(`Cloudflare operator state environment mismatch: ${state.environment}`);
  return state;
}

export class WranglerCommandError extends Error {
  constructor(args, { exitCode, stdout = "", stderr = "" } = {}) {
    super(`Wrangler command failed (${exitCode}): ${args.join(" ")}`);
    this.name = "WranglerCommandError";
    this.args = Object.freeze([...args]);
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export async function runWrangler(args, { input = null, cwd = process.cwd(), env = process.env } = {}) {
  if (!Array.isArray(args) || args.length === 0) throw new TypeError("Wrangler args must be a non-empty array");
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("npx", ["--yes", `wrangler@${CLOUDFLARE_WRANGLER_VERSION}`, ...args], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      if (exitCode === 0) resolvePromise({ stdout, stderr, exitCode: 0 });
      else rejectPromise(new WranglerCommandError(args, { exitCode, stdout, stderr }));
    });
    if (input === null) child.stdin.end();
    else child.stdin.end(input);
  });
}

export function isProviderNotFound(error) {
  if (!(error instanceof WranglerCommandError)) return false;
  return /not found|does not exist|could not find|no such/i.test(`${error.stdout}\n${error.stderr}`);
}

export function repoRootFrom(importMetaUrl) {
  return fileURLToPath(new URL("../..", importMetaUrl));
}
