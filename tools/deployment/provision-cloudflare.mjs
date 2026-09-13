import {
  CLOUDFLARE_OPERATOR_STATE_VERSION,
  createCloudflareResourcePlan,
  isProviderNotFound,
  loadCloudflareWranglerConfigs,
  normalizeCloudflareEnvironment,
  repoRootFrom,
  runWrangler,
  readCloudflareRuntimeConfig,
  writeCloudflareOperatorState,
  writeResolvedWranglerConfigs,
} from "./cloudflare-operator.mjs";

const D1_MIGRATIONS_BY_BINDING = Object.freeze({
  PRESENTATION_CATALOG: Object.freeze([
    "infra/providers/cloudflare/d1/0001_fibre_catalog.sql",
  ]),
  ACTIVITY_LOG: Object.freeze([
    "infra/providers/cloudflare/d1/0001_activity_log.sql",
    "infra/providers/cloudflare/d1/0002_admin_entitlements.sql",
    "infra/providers/cloudflare/d1/0003_admin_infra_monitor.sql",
  ]),
});
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*m/gu;

function d1Id(database) {
  return database?.uuid ?? database?.id ?? database?.database_id ?? null;
}

function optionalGitSha(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !GIT_SHA_PATTERN.test(value)) {
    throw new TypeError("Cloudflare provision sourceGitSha must be a full lowercase 40-character Git SHA");
  }
  return value;
}

function activityRuntimeConfig(runtimeConfigByService, serviceIds, environment, sourceGitSha) {
  const result = {};
  for (const serviceId of serviceIds) {
    result[serviceId] = {
      ...(runtimeConfigByService[serviceId] ?? {}),
      FIBRE_ACTIVITY_ENV: environment,
      ...(sourceGitSha === null ? {} : { FIBRE_DEPLOYMENT_GIT_SHA: sourceGitSha }),
    };
  }
  return Object.freeze(result);
}

function migrationsFor(database) {
  const migrations = D1_MIGRATIONS_BY_BINDING[database.binding];
  if (!migrations?.length) throw new TypeError(`no D1 migrations registered for binding ${database.binding}`);
  return migrations;
}

function cloudflareFailureText(error) {
  return [error?.message, error?.stdout, error?.stderr]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join("\n")
    .replace(ANSI_ESCAPE_PATTERN, "");
}

export function formatCloudflareProvisionFailure(error, { environment } = {}) {
  const env = typeof environment === "string" && environment.trim() !== "" ? environment.trim() : "requested environment";
  const retry = `npm run cloud:provision -- --env ${env}`;
  const detail = cloudflareFailureText(error);
  if (/invalid (?:api|access) token|code:\s*9109/iu.test(detail)) {
    return `Cloudflare provisioning failed for ${env}: CLOUDFLARE_API_TOKEN is invalid or expired.\nUpdate CLOUDFLARE_API_TOKEN in .env, then rerun: ${retry}`;
  }
  if (/necessary to set a CLOUDFLARE_API_TOKEN|CLOUDFLARE_API_TOKEN environment variable/iu.test(detail)) {
    return `Cloudflare provisioning failed for ${env}: CLOUDFLARE_API_TOKEN is missing.\nAdd CLOUDFLARE_API_TOKEN to .env, then rerun: ${retry}`;
  }
  if (/authentication error|code:\s*10000/iu.test(detail)) {
    return `Cloudflare provisioning failed for ${env}: the API token was rejected for the requested Cloudflare resources.\nVerify the token permissions and account scope, then rerun: ${retry}`;
  }
  const summary = error instanceof Error ? error.message : String(error);
  return `Cloudflare provisioning failed for ${env}: ${summary}\nFix the reported problem, then rerun: ${retry}`;
}

export function createWranglerProvisionClient({ runner = runWrangler, cwd = process.cwd() } = {}) {
  return Object.freeze({
    async findD1(name) {
      const { stdout } = await runner(["d1", "list", "--json"], { cwd });
      const databases = JSON.parse(stdout);
      const match = databases.find((database) => database.name === name);
      return match ? { name, id: d1Id(match) } : null;
    },
    async createD1(name) {
      await runner(["d1", "create", name], { cwd });
    },
    async applyD1Migration(name, filePath) {
      await runner(["d1", "execute", name, "--remote", "--file", filePath], { cwd });
    },
    async hasR2(name) {
      try {
        await runner(["r2", "bucket", "info", name, "--json"], { cwd });
        return true;
      } catch (error) {
        if (isProviderNotFound(error)) return false;
        throw error;
      }
    },
    async createR2(name) {
      await runner(["r2", "bucket", "create", name], { cwd });
    },
    async hasQueue(name) {
      try {
        await runner(["queues", "info", name], { cwd });
        return true;
      } catch (error) {
        if (isProviderNotFound(error)) return false;
        throw error;
      }
    },
    async createQueue(name) {
      await runner(["queues", "create", name], { cwd });
    },
  });
}

export async function provisionCloudflare({
  repoRoot,
  environment,
  client,
  runtimeConfig,
  sourceGitSha = null,
  now = () => new Date().toISOString(),
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  if (!client) throw new TypeError("Cloudflare provision client is required");
  const gitSha = optionalGitSha(sourceGitSha);
  const configs = await loadCloudflareWranglerConfigs(repoRoot);
  const plan = createCloudflareResourcePlan(configs, { environment: env });
  const d1 = [];
  for (const database of plan.create.d1) {
    let resource = await client.findD1(database.name);
    let status = "existing";
    if (resource === null) {
      await client.createD1(database.name);
      resource = await client.findD1(database.name);
      if (resource === null) throw new Error(`Cloudflare D1 database ${database.name} was created but could not be resolved`);
      status = "created";
    }
    const migrations = migrationsFor(database);
    for (const migration of migrations) await client.applyD1Migration(database.name, migration);
    d1.push(Object.freeze({ ...database, id:resource.id, status, schema:migrations.at(-1).split("/").at(-1), migrations:migrations.map((item) => item.split("/").at(-1)) }));
  }

  const r2 = [];
  for (const bucket of plan.create.r2) {
    const exists = await client.hasR2(bucket.name);
    if (!exists) await client.createR2(bucket.name);
    r2.push(Object.freeze({ ...bucket, status:exists ? "existing" : "created" }));
  }

  const queues = [];
  for (const queue of plan.create.queues) {
    const exists = await client.hasQueue(queue.name);
    if (!exists) await client.createQueue(queue.name);
    queues.push(Object.freeze({ ...queue, status:exists ? "existing" : "created" }));
  }

  const resolvedRuntimeConfig = activityRuntimeConfig(runtimeConfig, Object.keys(plan.deployManaged.workers), env, gitSha);
  const wranglerConfigs = await writeResolvedWranglerConfigs({ repoRoot, environment:env, configs, plan, runtimeConfig:resolvedRuntimeConfig });
  const state = Object.freeze({
    contract:CLOUDFLARE_OPERATOR_STATE_VERSION,
    environment:env,
    sourceGitSha:gitSha,
    recordedAt:now(),
    resources:Object.freeze({
      d1:Object.freeze(d1),
      r2:Object.freeze(r2),
      queues:Object.freeze(queues),
      deployManaged:plan.deployManaged,
      externalRequired:plan.externalRequired,
    }),
    wranglerConfigs,
  });
  await writeCloudflareOperatorState({ repoRoot, environment:env, state });
  return state;
}

async function main(argv) {
  let environment = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") environment = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${arg}`);
  }
  const repoRoot = repoRootFrom(import.meta.url);
  const runtimeConfig = await readCloudflareRuntimeConfig({ repoRoot, environment });
  const client = createWranglerProvisionClient({ cwd:repoRoot });
  try {
    const state = await provisionCloudflare({ repoRoot, environment, client, runtimeConfig });
    console.log(`Cloudflare provisioned: ${state.environment}`);
    for (const database of state.resources.d1) console.log(`D1      ${database.name} ${database.id} ${database.status}`);
    for (const bucket of state.resources.r2) console.log(`R2      ${bucket.name} ${bucket.status}`);
    for (const queue of state.resources.queues) console.log(`QUEUE   ${queue.name} ${queue.status}`);
    for (const [serviceId, worker] of Object.entries(state.resources.deployManaged.workers)) console.log(`DEPLOY  ${serviceId} -> ${worker}`);
  } catch (error) {
    console.error(formatCloudflareProvisionFailure(error, { environment }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
