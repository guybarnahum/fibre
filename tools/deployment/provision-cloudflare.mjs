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
  ]),
});
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

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

async function ensureD1(client, name) {
  let found = await client.findD1(name);
  if (!found) {
    await client.createD1(name);
    found = await client.findD1(name);
  }
  if (!found?.id) throw new Error(`Cloudflare D1 ${name} did not resolve to a database id after provisioning`);
  return Object.freeze({ name, id: found.id });
}

async function ensureNamed(client, { kind, name }) {
  const has = kind === "r2" ? client.hasR2.bind(client) : client.hasQueue.bind(client);
  const create = kind === "r2" ? client.createR2.bind(client) : client.createQueue.bind(client);
  if (await has(name)) return Object.freeze({ name, status: "existing" });
  await create(name);
  if (!(await has(name))) throw new Error(`Cloudflare ${kind} ${name} was not visible after creation`);
  return Object.freeze({ name, status: "created" });
}

export async function provisionCloudflareResources({
  repoRoot,
  environment,
  client,
  sourceGitSha = null,
  now = () => new Date().toISOString(),
} = {}) {
  const env = normalizeCloudflareEnvironment(environment);
  const source = optionalGitSha(sourceGitSha);
  if (!client) throw new TypeError("Cloudflare provision client is required");
  const configs = await loadCloudflareWranglerConfigs(repoRoot);
  const plan = createCloudflareResourcePlan(configs, { environment: env });

  const d1 = [];
  for (const database of plan.create.d1) {
    const resolved = await ensureD1(client, database.name);
    const migrations = migrationsFor(database);
    for (const migration of migrations) await client.applyD1Migration(database.name, migration);
    d1.push({
      ...resolved,
      binding: database.binding,
      schema: migrations.at(-1).split("/").at(-1),
      migrations: migrations.map((migration) => migration.split("/").at(-1)),
    });
  }
  const r2 = [];
  for (const bucket of plan.create.r2) r2.push(await ensureNamed(client, { kind: "r2", name: bucket.name }));
  const queues = [];
  for (const queue of plan.create.queues) queues.push({ role: queue.role, ...(await ensureNamed(client, { kind: "queue", name: queue.name })) });

  const state = {
    contract: CLOUDFLARE_OPERATOR_STATE_VERSION,
    environment: env,
    recordedAt: now(),
    resources: {
      d1,
      r2,
      queues,
      deployManaged: plan.deployManaged,
      externalRequired: plan.externalRequired,
    },
  };
  const storedRuntimeConfig = await readCloudflareRuntimeConfig({ repoRoot, environment: env });
  const runtimeConfigByService = activityRuntimeConfig(storedRuntimeConfig, Object.keys(configs), env, source);
  state.wranglerConfigs = await writeResolvedWranglerConfigs({
    repoRoot, environment: env, configs, resourceState: state, runtimeConfigByService,
  });
  await writeCloudflareOperatorState({ repoRoot, environment: env, resourceState: state });
  return Object.freeze(state);
}

function parseArgs(argv) {
  let environment = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env <staging|production> is required");
  return { environment };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const { environment } = parseArgs(process.argv.slice(2));
  const repoRoot = repoRootFrom(import.meta.url);
  const client = createWranglerProvisionClient({ cwd: repoRoot });
  const state = await provisionCloudflareResources({ repoRoot, environment, client });
  console.log(`Cloudflare resources ready: ${state.environment}`);
  for (const database of state.resources.d1) console.log(`D1      ${database.name} ${database.id}`);
  for (const bucket of state.resources.r2) console.log(`R2      ${bucket.name} ${bucket.status}`);
  for (const queue of state.resources.queues) console.log(`QUEUE   ${queue.name} ${queue.status}`);
  for (const [serviceId, worker] of Object.entries(state.resources.deployManaged.workers)) console.log(`DEPLOY  ${serviceId} -> ${worker}`);
}
