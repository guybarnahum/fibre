import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  normalizeCloudflareEnvironment,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "./cloudflare-operator.mjs";
import { ensureCloudflareD1Migrations } from "./cloudflare-d1-migrations.mjs";

function parseArgs(argv) {
  let environment = null;
  let binding = null;
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") environment = argv[++index] ?? null;
    else if (arg === "--binding") binding = argv[++index] ?? null;
    else if (arg === "--dry-run") dryRun = true;
    else throw new TypeError(`unsupported argument ${arg}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  return Object.freeze({
    environment:normalizeCloudflareEnvironment(environment),
    binding,
    dryRun,
  });
}

export async function migrateCloudflareD1({
  repoRoot,
  environment,
  binding = null,
  dryRun = false,
  runner = runWrangler,
  print = console.log,
} = {}) {
  const state = await readCloudflareOperatorState({ repoRoot, environment });
  let databases = (state?.resources?.d1 ?? []).map(({ binding:resourceBinding, name }) => ({
    binding:resourceBinding,
    name,
  }));
  if (binding !== null) databases = databases.filter((database) => database.binding === binding);
  if (databases.length === 0) {
    throw new Error(binding === null
      ? `no provisioned D1 databases found for ${environment}`
      : `no provisioned D1 database found for binding ${binding} in ${environment}`);
  }

  print(`D1 MIGRATE ${environment} databases=${databases.length}${dryRun ? " dry-run" : ""}`);
  return ensureCloudflareD1Migrations({
    repoRoot,
    databases,
    runner,
    dryRun,
    print,
  });
}

async function main(argv) {
  const options = parseArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  await migrateCloudflareD1({
    repoRoot,
    ...options,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
