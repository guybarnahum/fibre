import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  environmentResourceName,
  normalizeCloudflareEnvironment,
  parseOperatorEnv,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function optionalNumber(config, name) {
  const raw = config[name];
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a non-negative number`);
  return value;
}

export function buildAdminInfraMonitorConfig({ operatorConfig, resourceState } = {}) {
  const d1Resources = (resourceState?.resources?.d1 ?? []).map((database) => Object.freeze({
    name:nonEmpty("D1 database name", database?.name),
    id:nonEmpty("D1 database id", database?.id),
    binding:typeof database?.binding === "string" ? database.binding : null,
  }));
  if (d1Resources.length === 0) throw new TypeError("Cloudflare operator state contains no D1 resources");
  const ttlSeconds = optionalNumber(operatorConfig, "FIBRE_INFRA_SAMPLE_TTL_SECONDS") ?? 900;
  return Object.freeze({
    accountId:nonEmpty("CLOUDFLARE_ACCOUNT_ID", operatorConfig?.CLOUDFLARE_ACCOUNT_ID),
    apiToken:nonEmpty("FIBRE_CLOUDFLARE_ANALYTICS_TOKEN", operatorConfig?.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN),
    ttlSeconds,
    limits:Object.freeze({
      d1RowsReadDaily:optionalNumber(operatorConfig, "FIBRE_INFRA_D1_ROWS_READ_DAILY_WARN") ?? 500_000,
      d1RowsWrittenDaily:optionalNumber(operatorConfig, "FIBRE_INFRA_D1_ROWS_WRITTEN_DAILY_WARN") ?? 10_000,
      workerRequests15m:optionalNumber(operatorConfig, "FIBRE_INFRA_WORKER_REQUESTS_15M_WARN") ?? 25_000,
      workerErrors15m:optionalNumber(operatorConfig, "FIBRE_INFRA_WORKER_ERRORS_15M_WARN") ?? 100,
    }),
    d1Resources:Object.freeze(d1Resources),
  });
}

export async function configureAdminInfraMonitor({
  repoRoot,
  environment,
  operatorConfig,
  runner = runWrangler,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const resourceState = await readCloudflareOperatorState({ repoRoot, environment:env });
  const config = buildAdminInfraMonitorConfig({ operatorConfig, resourceState });
  const workerName = environmentResourceName("fibre-admin-dashboard", env);
  await runner([
    "secret", "put", "FIBRE_CLOUDFLARE_ANALYTICS_CONFIG",
    "--name", workerName,
  ], { cwd:repoRoot, input:`${JSON.stringify(config)}\n` });
  return Object.freeze({ environment:env, workerName, ttlSeconds:config.ttlSeconds, d1Count:config.d1Resources.length });
}

function parseArgs(argv) {
  let environment = null;
  let file = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else if (argv[index] === "--file") file = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  if (!file) throw new TypeError("--file <operator-config-file> is required");
  return Object.freeze({ environment, file });
}

async function main(argv) {
  const parsed = parseArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  const operatorConfig = parseOperatorEnv(await readFile(resolve(repoRoot, parsed.file), "utf8"));
  const result = await configureAdminInfraMonitor({ repoRoot, environment:parsed.environment, operatorConfig });
  console.log(`ADMIN INFRA ${result.environment} ${result.workerName} ttl=${result.ttlSeconds}s d1=${result.d1Count}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
