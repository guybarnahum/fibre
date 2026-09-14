import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  environmentResourceName,
  normalizeCloudflareEnvironment,
  parseOperatorEnv,
  repoRootFrom,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export async function configureAdminThreadRepair({
  repoRoot,
  environment,
  operatorConfig,
  runner = runWrangler,
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", operatorConfig?.FIBRE_PRIVATE_TOKEN);
  if (privateToken.length < 16) throw new TypeError("FIBRE_PRIVATE_TOKEN must be at least 16 characters");
  const workerName = environmentResourceName("fibre-admin-dashboard", env);
  await runner([
    "secret", "put", "FIBRE_PRIVATE_TOKEN",
    "--name", workerName,
  ], { cwd:repoRoot, input:`${privateToken}\n` });
  return Object.freeze({ environment:env, workerName });
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
  const result = await configureAdminThreadRepair({ repoRoot, environment:parsed.environment, operatorConfig });
  console.log(`ADMIN THREAD REPAIR ${result.environment} ${result.workerName}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
