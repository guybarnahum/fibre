import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  CLOUDFLARE_SERVICE_CONFIGS,
  createCloudflareResourcePlan,
  loadCloudflareWranglerConfigs,
  parseOperatorEnv,
} from "./cloudflare-operator.mjs";
import { provisionCloudflareResources } from "./provision-cloudflare.mjs";
import { configureCloudflareSecrets, createWranglerSecretWriter } from "./configure-cloudflare-secrets.mjs";

const sourceRoot = resolve(new URL("../..", import.meta.url).pathname);
const SOURCE_SHA = "1234567890abcdef1234567890abcdef12345678";

async function fixtureRepo() {
  const root = await mkdtemp(resolve(tmpdir(), "fibre-cloud-operator-"));
  for (const path of Object.values(CLOUDFLARE_SERVICE_CONFIGS)) {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(resolve(sourceRoot, path), "utf8"));
  }
  return root;
}

function fakeClient() {
  const state = {
    d1: new Map(),
    r2: new Set(),
    queues: new Set(),
    creates: [],
    nextD1: 1,
  };
  return {
    state,
    async findD1(name) { return state.d1.get(name) ?? null; },
    async createD1(name) {
      state.creates.push(["d1", name]);
      state.d1.set(name, { name, id: `d1-${state.nextD1++}` });
    },
    async applyD1Migration(name, filePath) { state.creates.push(["d1-migrate", name, filePath]); },
    async hasR2(name) { return state.r2.has(name); },
    async createR2(name) { state.creates.push(["r2", name]); state.r2.add(name); },
    async hasQueue(name) { return state.queues.has(name); },
    async createQueue(name) { state.creates.push(["queue", name]); state.queues.add(name); },
  };
}

test("Slice E resource plan derives isolated staging names while deploy-managed resources remain explicit", async () => {
  const configs = await loadCloudflareWranglerConfigs(sourceRoot);
  const plan = createCloudflareResourcePlan(configs, { environment: "staging" });
  assert.deepEqual(plan.create.d1, [{ binding: "PRESENTATION_CATALOG", name: "fibre-presentation-catalog-staging" }]);
  assert.deepEqual(plan.create.r2, [{ name: "fibre-presentation-assets-staging" }]);
  assert.deepEqual(plan.create.queues.map((queue) => queue.name), [
    "fibre-asset-completions-staging",
    "fibre-asset-completions-dlq-staging",
  ]);
  assert.equal(plan.deployManaged.workers["world-kernel"], "fibre-world-kernel-staging");
  assert.equal(plan.deployManaged.workflows[0].name, "fibre-asset-generation-staging");
  assert.deepEqual(plan.deployManaged.customDomains, ["api.staging.insidefibre.com"]);
  assert.equal(plan.externalRequired.viewerDomain, "staging.insidefibre.com");
  assert.deepEqual(plan.deployManaged.serviceBindings.find((binding) => binding.binding === "WORLD_KERNEL"), {
    serviceId: "birth-center",
    binding: "WORLD_KERNEL",
    target: "fibre-world-kernel-staging",
  });
});

test("Slice E provision is idempotent and writes resolved D1/resource configuration outside Git", async () => {
  const repoRoot = await fixtureRepo();
  const client = fakeClient();
  const first = await provisionCloudflareResources({ repoRoot, environment: "staging", client, sourceGitSha: SOURCE_SHA, now: () => "2026-08-31T20:20:00.000Z" });
  const createdOnce = [...client.state.creates];
  const second = await provisionCloudflareResources({ repoRoot, environment: "staging", client, sourceGitSha: SOURCE_SHA, now: () => "2026-08-31T20:21:00.000Z" });

  assert.deepEqual(client.state.creates.filter(([kind]) => kind !== "d1-migrate"), createdOnce.filter(([kind]) => kind !== "d1-migrate"));
  assert.equal(client.state.creates.filter(([kind]) => kind === "d1-migrate").length, 4);
  assert.equal(first.resources.d1[0].id, second.resources.d1[0].id);
  assert.equal(first.resources.d1[1].id, second.resources.d1[1].id);
  assert.deepEqual(createdOnce, [
    ["d1", "fibre-presentation-catalog-staging"],
    ["d1-migrate", "fibre-presentation-catalog-staging", "infra/providers/cloudflare/d1/0001_fibre_catalog.sql"],
    ["d1", "fibre-activity-log-staging"],
    ["d1-migrate", "fibre-activity-log-staging", "infra/providers/cloudflare/d1/0001_activity_log.sql"],
    ["r2", "fibre-presentation-assets-staging"],
    ["queue", "fibre-asset-completions-staging"],
    ["queue", "fibre-asset-completions-dlq-staging"],
  ]);

  const presentation = JSON.parse(await readFile(resolve(repoRoot, first.wranglerConfigs["thread-presentation"]), "utf8"));
  assert.equal(presentation.name, "fibre-thread-presentation-staging");
  assert.equal(presentation.d1_databases[0].database_name, "fibre-presentation-catalog-staging");
  assert.equal(presentation.d1_databases[0].database_id, "d1-1");
  assert.equal(presentation.d1_databases[1].binding, "ACTIVITY_LOG");
  assert.equal(presentation.d1_databases[1].database_name, "fibre-activity-log-staging");
  assert.equal(presentation.d1_databases[1].database_id, "d1-2");
  assert.equal(presentation.r2_buckets[0].bucket_name, "fibre-presentation-assets-staging");
  assert.equal(presentation.queues.consumers[0].queue, "fibre-asset-completions-staging");
  assert.equal(presentation.workflows[0].script_name, "fibre-asset-generator-staging");
  assert.equal(presentation.routes[0].pattern, "api.staging.insidefibre.com");
  assert.equal(presentation.vars.VIEWER_ORIGIN, "https://staging.insidefibre.com");
  assert.equal(presentation.vars.FIBRE_ACTIVITY_ENV, "staging");
  assert.equal(presentation.vars.FIBRE_DEPLOYMENT_GIT_SHA, SOURCE_SHA);

  for (const serviceId of ["asset-generator", "birth-center", "world-kernel"]) {
    const config = JSON.parse(await readFile(resolve(repoRoot, first.wranglerConfigs[serviceId]), "utf8"));
    const activity = config.d1_databases.find((database) => database.binding === "ACTIVITY_LOG");
    assert.equal(activity.database_name, "fibre-activity-log-staging");
    assert.equal(activity.database_id, "d1-2");
    assert.equal(config.vars.FIBRE_ACTIVITY_ENV, "staging");
    assert.equal(config.vars.FIBRE_DEPLOYMENT_GIT_SHA, SOURCE_SHA);
  }
});

test("explicit operator file parser does not infer or import any implicit environment", () => {
  assert.deepEqual(parseOperatorEnv("A=one\nB='two words'\n"), { A: "one", B: "two words" });
  assert.throws(() => parseOperatorEnv("not valid"), /KEY=value/);
});

test("Slice E secret configuration uploads only each service subset and persists only non-secret runtime configuration", async () => {
  const repoRoot = await fixtureRepo();
  const client = fakeClient();
  const state = await provisionCloudflareResources({ repoRoot, environment: "staging", client });
  const operatorFile = resolve(repoRoot, "operator.env");
  await writeFile(operatorFile, [
    "OPENAI_API_KEY=secret-openai",
    "BFL_API_KEY=secret-bfl",
    "FIBRE_PRIVATE_TOKEN=secret-private",
    "C2PA_SIGNER_TOKEN=secret-signer",
    "C2PA_SIGNER_URL=https://signer.staging.example",
  ].join("\n"));

  const uploads = [];
  const result = await configureCloudflareSecrets({
    repoRoot,
    environment: "staging",
    filePath: operatorFile,
    putSecrets: async ({ serviceId, workerName, values }) => uploads.push({ serviceId, workerName, values }),
  });

  assert.deepEqual(uploads.map(({ serviceId, workerName, values }) => [serviceId, workerName, Object.keys(values)]), [
    ["asset-generator", "fibre-asset-generator-staging", ["OPENAI_API_KEY", "BFL_API_KEY", "C2PA_SIGNER_TOKEN", "FIBRE_PRIVATE_TOKEN"]],
    ["thread-presentation", "fibre-thread-presentation-staging", ["C2PA_SIGNER_TOKEN", "FIBRE_PRIVATE_TOKEN"]],
    ["world-kernel", "fibre-world-kernel-staging", ["FIBRE_PRIVATE_TOKEN"]],
    ["birth-center", "fibre-birth-center-staging", ["OPENAI_API_KEY", "FIBRE_PRIVATE_TOKEN"]],
  ]);
  assert.equal(result.runtimeConfigByService["asset-generator"].C2PA_SIGNER_URL, "https://signer.staging.example");
  const asset = await readFile(resolve(repoRoot, state.wranglerConfigs["asset-generator"]), "utf8");
  assert.match(asset, /https:\/\/signer\.staging\.example/);
  assert.doesNotMatch(asset, /secret-openai|secret-bfl|secret-private|secret-signer/);

  const runtimeConfigText = await readFile(resolve(repoRoot, ".fibre/cloudflare/staging/runtime-config.json"), "utf8");
  assert.match(runtimeConfigText, /https:\/\/signer\.staging\.example/);
  assert.doesNotMatch(runtimeConfigText, /secret-openai|secret-bfl|secret-private|secret-signer/);

  await provisionCloudflareResources({ repoRoot, environment: "staging", client });
  const regeneratedAsset = await readFile(resolve(repoRoot, state.wranglerConfigs["asset-generator"]), "utf8");
  assert.match(regeneratedAsset, /https:\/\/signer\.staging\.example/);
});


test("Wrangler secret writer keeps secret values off command arguments and does not deploy traffic", async () => {
  const calls = [];
  const writer = createWranglerSecretWriter({
    runner: async (args, options) => { calls.push({ args, options }); return { stdout: "", stderr: "", exitCode: 0 }; },
    cwd: "/repo",
  });
  await writer({
    workerName: "fibre-world-kernel-staging",
    values: { FIBRE_PRIVATE_TOKEN: "super-secret-value" },
  });
  assert.deepEqual(calls[0].args, [
    "versions", "secret", "bulk", "--name", "fibre-world-kernel-staging",
    "--message", "Fibre operator secret configuration",
  ]);
  assert.equal(calls[0].options.input, JSON.stringify({ FIBRE_PRIVATE_TOKEN: "super-secret-value" }));
  assert.ok(!calls[0].args.join(" ").includes("super-secret-value"));
});

test("Slice E secret configuration fails before any upload when a mandatory value is missing", async () => {
  const repoRoot = await fixtureRepo();
  const client = fakeClient();
  await provisionCloudflareResources({ repoRoot, environment: "staging", client });
  const operatorFile = resolve(repoRoot, "operator.env");
  await writeFile(operatorFile, "FIBRE_PRIVATE_TOKEN=secret-private\n");
  let calls = 0;
  await assert.rejects(
    configureCloudflareSecrets({
      repoRoot,
      environment: "staging",
      filePath: operatorFile,
      putSecrets: async () => { calls += 1; },
    }),
    /Cloudflare configuration is incomplete/,
  );
  assert.equal(calls, 0);
});
