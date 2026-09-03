import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runStagingGenesisDevelopmentE2EWithActivity } from "../genesis/genesis-development-e2e-staging.mjs";

const SUPPORTED_ENVIRONMENTS = Object.freeze(new Set(["staging"]));

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function normalizeCloudE2EEnvironment(value) {
  const environment = nonEmpty("environment", value);
  if (!SUPPORTED_ENVIRONMENTS.has(environment)) {
    throw new TypeError(`unsupported Cloudflare E2E environment ${environment}; expected staging`);
  }
  return environment;
}

export function parseCloudE2EArgs(argv) {
  let environment = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env staging is required");
  return Object.freeze({ environment: normalizeCloudE2EEnvironment(environment) });
}

export async function runCloudflareE2E({
  environment,
  runStaging = runStagingGenesisDevelopmentE2EWithActivity,
} = {}) {
  const env = normalizeCloudE2EEnvironment(environment);
  if (typeof runStaging !== "function") throw new TypeError("runStaging must be a function");
  const result = await runStaging();
  return Object.freeze({ environment: env, ...result });
}

async function main(argv) {
  const { environment } = parseCloudE2EArgs(argv);
  const result = await runCloudflareE2E({ environment });
  console.log(`Cloudflare E2E accepted: ${result.environment}`);
  if (result.evidencePath) console.log(`EVIDENCE ${result.evidencePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
