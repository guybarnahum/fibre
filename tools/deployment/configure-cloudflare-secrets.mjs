import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  loadCloudflareWranglerConfigs,
  normalizeCloudflareEnvironment,
  parseJsonc,
  parseOperatorEnv,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
  runtimeConfigInventory,
  secretInventory,
  writeCloudflareRuntimeConfig,
} from "./cloudflare-operator.mjs";

function present(value) {
  return typeof value === "string" && value.trim() !== "" && !/^<.*>$/u.test(value.trim());
}

export function validateOperatorConfiguration({ values, secrets, runtimeConfig }) {
  const missing = [];
  for (const [serviceId, names] of Object.entries(secrets)) {
    for (const name of names) if (!present(values[name])) missing.push({ serviceId, kind: "secret", name });
  }
  for (const [serviceId, inventory] of Object.entries(runtimeConfig)) {
    for (const name of inventory.required) {
      if (!present(values[name]) && !present(inventory.existing[name])) missing.push({ serviceId, kind: "config", name });
    }
  }
  return Object.freeze(missing);
}

export function serviceConfiguration({ serviceId, values, runtimeConfig }) {
  const result = {};
  for (const name of runtimeConfig[serviceId].allowed) {
    const value = present(values[name]) ? values[name] : runtimeConfig[serviceId].existing[name];
    if (present(value)) result[name] = value;
  }
  return Object.freeze(result);
}

export async function configureCloudflareSecrets({
  repoRoot,
  environment,
  filePath,
  putSecrets,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (typeof filePath !== "string" || filePath.trim() === "") throw new TypeError("--file <path> is required; no implicit .env is read");
  if (typeof putSecrets !== "function") throw new TypeError("putSecrets callback is required");
  const source = await readFile(resolve(process.cwd(), filePath), "utf8");
  const values = parseOperatorEnv(source);
  const configs = await loadCloudflareWranglerConfigs(repoRoot);
  const secrets = secretInventory(configs);
  const runtimeConfig = runtimeConfigInventory(configs);
  const missing = validateOperatorConfiguration({ values, secrets, runtimeConfig });
  if (missing.length > 0) {
    const detail = missing.map((item) => `${item.serviceId}: ${item.kind.toUpperCase()} ${item.name}`).join("\n");
    throw new Error(`Cloudflare configuration is incomplete:\n${detail}`);
  }

  const state = await readCloudflareOperatorState({ repoRoot, environment: env });
  for (const [serviceId, names] of Object.entries(secrets)) {
    const workerName = state.resources.deployManaged.workers[serviceId];
    await putSecrets({
      serviceId,
      workerName,
      values: Object.freeze(Object.fromEntries(names.map((name) => [name, values[name]]))),
    });
  }

  const runtimeConfigByService = {};
  for (const serviceId of Object.keys(configs)) {
    const configPath = resolve(repoRoot, state.wranglerConfigs[serviceId]);
    const resolved = parseJsonc(await readFile(configPath, "utf8"), configPath);
    runtimeConfigByService[serviceId] = serviceConfiguration({ serviceId, values, runtimeConfig });
    resolved.vars ??= {};
    Object.assign(resolved.vars, runtimeConfigByService[serviceId]);
    await writeFile(configPath, `${JSON.stringify(resolved, null, 2)}\n`, { mode: 0o600 });
  }

  await writeCloudflareRuntimeConfig({ repoRoot, environment: env, runtimeConfigByService });
  return Object.freeze({ environment: env, secrets, runtimeConfigByService });
}

export function createWranglerSecretWriter({ runner = runWrangler, cwd = process.cwd() } = {}) {
  return async ({ workerName, values }) => {
    await runner(["versions", "secret", "bulk", "--name", workerName, "--message", "Fibre operator secret configuration"], { input: JSON.stringify(values), cwd });
  };
}

function parseArgs(argv) {
  let environment = null;
  let filePath = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else if (argv[index] === "--file") filePath = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  if (!filePath) throw new TypeError("--file <path> is required; no implicit .env is read");
  return { environment, filePath };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const { environment, filePath } = parseArgs(process.argv.slice(2));
  const repoRoot = repoRootFrom(import.meta.url);
  const result = await configureCloudflareSecrets({
    repoRoot,
    environment,
    filePath,
    putSecrets: createWranglerSecretWriter({ cwd: repoRoot }),
  });
  console.log(`Cloudflare service configuration ready: ${result.environment}`);
  for (const [serviceId, names] of Object.entries(result.secrets)) {
    console.log(serviceId);
    for (const name of names) console.log(`  OK      ${name}`);
    for (const name of Object.keys(result.runtimeConfigByService[serviceId])) console.log(`  CONFIG  ${name}`);
  }
}
