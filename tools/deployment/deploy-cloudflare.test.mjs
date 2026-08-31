import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  CLOUDFLARE_DEPLOY_ORDER,
  assertProductionSignerHealth,
  createWranglerDeploymentClient,
  deployCloudflareStack,
  healthBaseUrlForDeployment,
  missingRequiredSecretNames,
} from "./deploy-cloudflare.mjs";
import { CLOUDFLARE_SERVICE_CONFIGS, parseJsonc } from "./cloudflare-operator.mjs";

const sourceRoot = resolve(new URL("../..", import.meta.url).pathname);

async function fixtureRepo() {
  const root = await mkdtemp(resolve(tmpdir(), "fibre-cloud-deploy-"));
  const wranglerConfigs = {};
  for (const [serviceId, path] of Object.entries(CLOUDFLARE_SERVICE_CONFIGS)) {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    const source = await readFile(resolve(sourceRoot, path), "utf8");
    await writeFile(target, source);

    const resolved = parseJsonc(source, path);
    resolved.name = `${resolved.name}-staging`;
    resolved.vars ??= {};
    if (serviceId === "asset-generator") resolved.vars.C2PA_SIGNER_URL = "https://signer.staging.example";
    if (serviceId === "thread-presentation") {
      resolved.vars.C2PA_SIGNER_URL = "https://signer.staging.example";
      resolved.vars.VIEWER_ORIGIN = "https://staging.insidefibre.com";
      resolved.routes[0].pattern = "api.staging.insidefibre.com";
    }
    const resolvedPath = `.fibre/cloudflare/staging/wrangler/${serviceId}.jsonc`;
    const resolvedTarget = resolve(root, resolvedPath);
    await mkdir(dirname(resolvedTarget), { recursive: true });
    await writeFile(resolvedTarget, `${JSON.stringify(resolved, null, 2)}\n`);
    wranglerConfigs[serviceId] = resolvedPath;
  }
  return {
    root,
    state: {
      environment: "staging",
      resources: {
        deployManaged: {
          workers: Object.fromEntries(CLOUDFLARE_DEPLOY_ORDER.map((serviceId) => [serviceId, `fibre-${serviceId}-staging`])),
        },
      },
      wranglerConfigs,
    },
  };
}

function allSecrets() {
  return new Set(["OPENAI_API_KEY", "BFL_API_KEY", "C2PA_SIGNER_TOKEN", "FIBRE_PRIVATE_TOKEN"]);
}

test("Slice F deployment runs validation, auth, secret/signer gates, dependency-ordered deploys, health and acceptance", async () => {
  const { root, state } = await fixtureRepo();
  const calls = [];
  const client = {
    async assertAuthenticated() { calls.push("auth"); return { ok: true }; },
    async listSecretNames(workerName) { calls.push(`secrets:${workerName}`); return allSecrets(); },
    async checkSignerHealth(input) {
      calls.push(`signer:${input.baseUrl}`);
      assert.equal(input.signerId, "fibre-c2pa-production-v1");
      assert.equal(input.trustPolicy, "c2pa_trust_list");
      return { ok: true };
    },
    async deployService({ serviceId }) {
      calls.push(`deploy:${serviceId}`);
      return { output: `Published\nhttps://${serviceId}.account.workers.dev` };
    },
    async checkServiceHealth({ serviceId, baseUrl }) {
      calls.push(`health:${serviceId}:${baseUrl}`);
      return { ok: true, service: serviceId };
    },
    async checkPresentationAcceptance({ baseUrl }) { calls.push(`accept:${baseUrl}`); return { threads: [] }; },
    async checkViewer({ origin }) { calls.push(`viewer:${origin}`); return { ok: true }; },
  };

  const result = await deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client,
    validateRepository: async () => calls.push("validate"),
    provision: async () => { calls.push("provision"); return state; },
    wait: async () => {},
  });

  assert.deepEqual(result.deployments.map((item) => item.serviceId), CLOUDFLARE_DEPLOY_ORDER);
  assert.equal(result.deployments.find((item) => item.serviceId === "thread-presentation").baseUrl, "https://api.staging.insidefibre.com");
  assert.equal(result.externalViewerOrigin, "https://staging.insidefibre.com");
  assert.deepEqual(calls.filter((call) => call.startsWith("deploy:")), [
    "deploy:asset-generator",
    "deploy:thread-presentation",
    "deploy:world-kernel",
    "deploy:birth-center",
  ]);
  assert.deepEqual(calls.slice(0, 3), ["validate", "auth", "provision"]);
  assert.ok(calls.indexOf("signer:https://signer.staging.example") > calls.findLastIndex((call) => call.startsWith("secrets:")));
  assert.ok(calls.indexOf("deploy:asset-generator") > calls.indexOf("signer:https://signer.staging.example"));
  assert.equal(calls.at(-2), "accept:https://api.staging.insidefibre.com");
  assert.equal(calls.at(-1), "viewer:https://staging.insidefibre.com");
});

test("Slice F fails before signer/deploy when a required remote secret name is absent", async () => {
  const { root, state } = await fixtureRepo();
  let signerCalls = 0;
  let deployCalls = 0;
  const client = {
    async assertAuthenticated() {},
    async listSecretNames(workerName) {
      if (workerName === "fibre-asset-generator-staging") return new Set(["OPENAI_API_KEY", "BFL_API_KEY", "FIBRE_PRIVATE_TOKEN"]);
      return allSecrets();
    },
    async checkSignerHealth() { signerCalls += 1; },
    async deployService() { deployCalls += 1; },
  };
  await assert.rejects(deployCloudflareStack({
    repoRoot: root,
    environment: "staging",
    client,
    validateRepository: async () => {},
    provision: async () => state,
  }), /asset-generator is missing required Cloudflare secrets: C2PA_SIGNER_TOKEN/);
  assert.equal(signerCalls, 0);
  assert.equal(deployCalls, 0);
});

test("Slice F signer health requires exact production signer identity and trust-list policy", () => {
  assert.deepEqual(assertProductionSignerHealth({
    ok: true,
    service: "content-credential-signer",
    format: "c2pa",
    signerId: "fibre-c2pa-production-v1",
    trustPolicy: "c2pa_trust_list",
  }, {
    signerId: "fibre-c2pa-production-v1",
    trustPolicy: "c2pa_trust_list",
  }).ok, true);
  assert.throws(() => assertProductionSignerHealth({
    ok: true,
    service: "content-credential-signer",
    format: "c2pa",
    signerId: "other",
    trustPolicy: "c2pa_trust_list",
  }, {
    signerId: "fibre-c2pa-production-v1",
    trustPolicy: "c2pa_trust_list",
  }), /unexpected signerId/);
});

test("Slice F Wrangler client verifies secret names and deploys with automatic provisioning disabled", async () => {
  const calls = [];
  const runner = async (args) => {
    calls.push(args);
    if (args[0] === "whoami") return { stdout: '{"accounts":[{"id":"acct"}]}', stderr: "", exitCode: 0 };
    if (args[0] === "secret") return { stdout: '[{"name":"FIBRE_PRIVATE_TOKEN","type":"secret_text"}]', stderr: "", exitCode: 0 };
    if (args[0] === "deploy") return { stdout: "https://worker.account.workers.dev", stderr: "", exitCode: 0 };
    throw new Error(`unexpected command ${args.join(" ")}`);
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    async json() {
      if (String(url).endsWith("/healthz")) return { ok: true, service: "world-kernel" };
      return { threads: [] };
    },
  });
  const client = createWranglerDeploymentClient({ runner, cwd: "/repo", fetchImpl });
  await client.assertAuthenticated();
  assert.deepEqual(await client.listSecretNames("fibre-world-kernel-staging"), new Set(["FIBRE_PRIVATE_TOKEN"]));
  await client.deployService({ configPath: "/repo/.fibre/world.jsonc" });
  assert.deepEqual(calls.at(-1), [
    "deploy", "--config", "/repo/.fibre/world.jsonc",
    "--experimental-provision=false",
    "--experimental-auto-create=false",
  ]);
  assert.deepEqual(missingRequiredSecretNames(["FIBRE_PRIVATE_TOKEN", "OTHER"], new Set(["FIBRE_PRIVATE_TOKEN"])), ["OTHER"]);
  assert.equal(healthBaseUrlForDeployment({
    serviceId: "world-kernel",
    resolvedConfig: {},
    deploymentOutput: "Published https://fibre-world-kernel-staging.account.workers.dev",
  }), "https://fibre-world-kernel-staging.account.workers.dev");
});
